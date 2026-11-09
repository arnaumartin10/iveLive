import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import { authenticateRequest } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';
import {
  isVenueType,
  musicBrainzSearchUrl,
  parseMusicBrainzEvents,
  parseMusicBrainzPlaces,
  type ExternalVenue,
  type VenueType,
} from '../_shared/venueSearch.ts';

type CachedVenue = {
  id: string;
  name: string;
  venue_type: VenueType;
  city: string | null;
  country: string | null;
  external_id: string | null;
};

class MusicBrainzCooldownError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('MusicBrainz requested a cooldown');
  }
}

function makeCacheKey(query: string, type: VenueType) {
  return `${type}:${query.toLocaleLowerCase()}`;
}

function logSearchIssue(code: string, category: string) {
  console.warn(
    JSON.stringify({
      event: 'venue_search_issue',
      code,
      category,
    }),
  );
}

async function fetchMusicBrainz(
  query: string,
  type: VenueType,
): Promise<ExternalVenue[]> {
  const contactEmail = Deno.env.get('MUSICBRAINZ_CONTACT_EMAIL')?.trim();
  if (!contactEmail || /[\r\n()]/.test(contactEmail)) {
    throw new Error('MUSICBRAINZ_CONTACT_EMAIL is missing or invalid');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(musicBrainzSearchUrl(query, type), {
      headers: {
        Accept: 'application/json',
        'User-Agent': `IveLive/1.0 (${contactEmail})`,
      },
      signal: controller.signal,
    });
    if (response.status === 429 || response.status === 503) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfter = Number(retryAfterHeader);
      const retryDateSeconds = retryAfterHeader
        ? Math.ceil((Date.parse(retryAfterHeader) - Date.now()) / 1000)
        : 0;
      const retryAfterSeconds =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(Math.ceil(retryAfter), 3600)
          : Number.isFinite(retryDateSeconds) && retryDateSeconds > 0
            ? Math.min(retryDateSeconds, 3600)
            : 60;
      throw new MusicBrainzCooldownError(retryAfterSeconds);
    }
    if (!response.ok)
      throw new Error(`MusicBrainz returned ${response.status}`);
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object') {
      throw new Error('MusicBrainz returned invalid data');
    }
    return type === 'festival'
      ? parseMusicBrainzEvents(payload)
      : parseMusicBrainzPlaces(payload);
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const auth = await authenticateRequest(request);
  if ('response' in auth) return auth.response;

  try {
    const input: unknown = await request.json();
    if (!input || typeof input !== 'object') {
      return jsonResponse({ code: 'INVALID_INPUT' }, 400);
    }
    const body = input as Record<string, unknown>;
    const query = typeof body.q === 'string' ? body.q.trim() : '';
    const type = body.type == null ? null : body.type;
    const limit =
      typeof body.limit === 'number' && Number.isInteger(body.limit)
        ? Math.max(1, Math.min(body.limit, 15))
        : 8;
    if (
      query.length < 2 ||
      query.length > 120 ||
      (type !== null && !isVenueType(type))
    ) {
      return jsonResponse({ code: 'INVALID_INPUT' }, 400);
    }
    const venueType = type;
    const database = createClient(
      auth.context.supabaseUrl,
      auth.context.serviceRoleKey,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: localRows, error: localError } = await database.rpc(
      'search_venues',
      { p_query: query, p_type: venueType, p_limit: limit },
    );
    if (localError) {
      logSearchIssue('VENUE_DATABASE_NOT_READY', 'local_lookup');
      return jsonResponse({ code: 'VENUE_DATABASE_NOT_READY' }, 503);
    }

    const typesToSearch: VenueType[] = venueType
      ? [venueType]
      : ['concert_hall_club'];
    const externalRows: CachedVenue[] = [];
    let externalDeferred = false;
    let externalUnavailable = false;

    for (const searchType of typesToSearch) {
      try {
        const cacheKey = makeCacheKey(query, searchType);
        const { data: cached, error: cacheReadError } = await database
          .from('venue_search_cache')
          .select('results')
          .eq('query_key', cacheKey)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (cacheReadError) throw new Error('cache_read');
        if (cached?.results && !Array.isArray(cached.results)) {
          throw new Error('cache_invalid');
        }
        if (cached?.results && Array.isArray(cached.results)) {
          externalRows.push(...(cached.results as CachedVenue[]));
          continue;
        }

        const { data: claimed, error: claimError } = await database.rpc(
          'claim_musicbrainz_search',
          { p_minimum_gap_ms: 1100 },
        );
        if (claimError) throw new Error('rate_gate');
        if (!claimed) {
          externalDeferred = true;
          continue;
        }

        const results = await fetchMusicBrainz(query, searchType);
        let upserted: CachedVenue[] = [];
        if (results.length > 0) {
          const { data, error } = await database
            .from('venues')
            .upsert(results, { onConflict: 'external_id' })
            .select('id,name,venue_type,city,country,external_id');
          if (error) throw new Error('venue_upsert');
          upserted = data ?? [];
        }
        const { error: cacheError } = await database
          .from('venue_search_cache')
          .upsert(
            {
              query_key: cacheKey,
              results: upserted,
              expires_at: new Date(
                Date.now() + 24 * 60 * 60 * 1000,
              ).toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'query_key' },
          );
        if (cacheError) throw new Error('cache_write');
        externalRows.push(...upserted);
      } catch (error) {
        if (error instanceof MusicBrainzCooldownError) {
          const { error: cooldownError } = await database.rpc(
            'defer_musicbrainz_search',
            { p_cooldown_seconds: error.retryAfterSeconds },
          );
          if (cooldownError) {
            logSearchIssue('VENUE_SEARCH_FAILED', 'cooldown_write');
          }
          externalDeferred = true;
          break;
        }
        logSearchIssue(
          'MUSICBRAINZ_UNAVAILABLE',
          error instanceof Error ? error.message : 'unknown',
        );
        externalUnavailable = true;
        break;
      }
    }

    const merged = new Map<string, CachedVenue>();
    for (const venue of [...(localRows ?? []), ...externalRows]) {
      if (!merged.has(venue.id)) merged.set(venue.id, venue);
    }
    const results = [...merged.values()].slice(0, limit).map((venue) => ({
      id: venue.id,
      name: venue.name,
      venueType: venue.venue_type,
      city: venue.city,
      country: venue.country,
      externalId: venue.external_id,
    }));
    return jsonResponse({ results, externalDeferred, externalUnavailable });
  } catch (error) {
    logSearchIssue(
      'VENUE_SEARCH_FAILED',
      error instanceof Error ? error.name : 'unknown',
    );
    return jsonResponse({ code: 'VENUE_SEARCH_FAILED' }, 502);
  }
});

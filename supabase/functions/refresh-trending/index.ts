import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import { authenticateRequest } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';
import { toArtistDTO } from '../_shared/spotifyAdapter.ts';
import { parseLastFmArtistChart } from '../_shared/lastFmChart.ts';
import { utcWeekStartDate } from '../_shared/week.ts';
import {
  SpotifyApiError,
  SpotifyRateLimitedError,
  spotifyGet,
} from '../_shared/spotifyClient.ts';

const chartLimit = 30;
const newArtistLimit = 20;
const lastFmTimeoutMs = 8000;
const lastFmCountryGapMs = 250;
const musicbrainzIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const countryNames: Record<string, string> = {
  AR: 'Argentina',
  AU: 'Australia',
  AT: 'Austria',
  BE: 'Belgium',
  BR: 'Brazil',
  CA: 'Canada',
  CL: 'Chile',
  CO: 'Colombia',
  DK: 'Denmark',
  FI: 'Finland',
  FR: 'France',
  DE: 'Germany',
  IE: 'Ireland',
  IT: 'Italy',
  JP: 'Japan',
  MX: 'Mexico',
  NL: 'Netherlands',
  NZ: 'New Zealand',
  NO: 'Norway',
  PL: 'Poland',
  PT: 'Portugal',
  ES: 'Spain',
  SE: 'Sweden',
  CH: 'Switzerland',
  GB: 'United Kingdom',
  US: 'United States',
};

type LastFmArtist = {
  name: string;
  mbid: string | null;
};

type ArtistRow = {
  id: string;
  spotify_id: string | null;
  musicbrainz_id: string | null;
};

class ProviderFailure extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

function normalizeArtistName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function databaseArtistName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

async function fetchLastFmArtists(
  params: Record<string, string>,
): Promise<LastFmArtist[]> {
  const apiKey = Deno.env.get('LASTFM_API_KEY');
  if (!apiKey) throw new ProviderFailure('MISSING_LASTFM_API_KEY', 500);

  const query = new URLSearchParams({
    ...params,
    api_key: apiKey,
    format: 'json',
    limit: String(chartLimit),
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), lastFmTimeoutMs);
  let response: Response;
  try {
    response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?${query.toString()}`,
      { signal: controller.signal },
    );
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ProviderFailure('LASTFM_TIMEOUT', 504);
    }
    throw new ProviderFailure('LASTFM_REQUEST_FAILED', 502);
  }

  try {
    if (response.status === 429) {
      throw new ProviderFailure('LASTFM_RATE_LIMITED', 429);
    }
    if (!response.ok) {
      throw new ProviderFailure(`LASTFM_HTTP_ERROR_${response.status}`, 502);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderFailure('LASTFM_TIMEOUT', 504);
      }
      throw new ProviderFailure('LASTFM_INVALID_JSON', 502);
    }
    if (typeof payload !== 'object' || payload === null || 'error' in payload) {
      throw new ProviderFailure('LASTFM_API_ERROR', 502);
    }
    const parsed = parseLastFmArtistChart(payload);
    if (!parsed) {
      throw new ProviderFailure('LASTFM_INVALID_RESPONSE', 502);
    }
    return parsed.slice(0, chartLimit).map((artist): LastFmArtist => ({
      ...artist,
      mbid:
        artist.mbid && musicbrainzIdPattern.test(artist.mbid)
          ? artist.mbid
          : null,
    }));
  } finally {
    clearTimeout(timeout);
  }
}

function requestEnrichmentInBackground(
  database: ReturnType<typeof createClient>,
  artistId: string,
) {
  const task = database.functions
    .invoke('enrich-artist', { body: { artistId } })
    .then((result: { error: { message: string } | null }) => {
      const { error } = result;
      if (error) {
        console.warn(
          JSON.stringify({
            event: 'refresh_trending_enrichment_failed',
            artistId,
            message: error.message.slice(0, 160),
          }),
        );
      }
    })
    .catch(() => {
      console.warn(
        JSON.stringify({
          event: 'refresh_trending_enrichment_failed',
          artistId,
        }),
      );
    });
  const runtime = (
    globalThis as typeof globalThis & {
      EdgeRuntime?: { waitUntil(promise: Promise<unknown>): void };
    }
  ).EdgeRuntime;
  if (runtime) runtime.waitUntil(task);
  else void task;
}

async function findArtist(
  database: ReturnType<typeof createClient>,
  candidate: LastFmArtist,
): Promise<ArtistRow | null> {
  if (candidate.mbid) {
    const { data, error } = await database
      .from('artists')
      .select('id, spotify_id, musicbrainz_id')
      .eq('musicbrainz_id', candidate.mbid)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as ArtistRow;
  }

  const { data, error } = await database
    .from('artists')
    .select('id, spotify_id, musicbrainz_id')
    .eq('name_normalized', databaseArtistName(candidate.name))
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ArtistRow | null) ?? null;
}

async function searchAndUpsertArtist(
  database: ReturnType<typeof createClient>,
  candidate: LastFmArtist,
): Promise<{ artist: ArtistRow | null; created: boolean }> {
  const params = new URLSearchParams({
    type: 'artist',
    q: `artist:"${candidate.name}"`,
    limit: '10',
  });
  const payload = (await spotifyGet(`/v1/search?${params}`)) as {
    artists?: { items?: unknown };
  };
  if (!Array.isArray(payload?.artists?.items)) {
    throw new ProviderFailure('SPOTIFY_INVALID_RESPONSE', 502);
  }
  const items = Array.isArray(payload.artists?.items)
    ? payload.artists.items
    : [];
  const match = items
    .map(toArtistDTO)
    .find(
      (artist) =>
        artist.spotifyId &&
        normalizeArtistName(artist.name) ===
          normalizeArtistName(candidate.name),
    );
  if (!match) return { artist: null, created: false };

  const { data: existing, error: existingError } = await database
    .from('artists')
    .select('id, spotify_id, musicbrainz_id')
    .eq('spotify_id', match.spotifyId)
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { artist: existing as ArtistRow, created: false };

  const { data, error } = await database
    .from('artists')
    .upsert(
      {
        spotify_id: match.spotifyId,
        name: match.name,
        image_url_large: match.imageLarge,
        image_url_thumb: match.imageThumb,
        musicbrainz_id: candidate.mbid,
        source: 'spotify',
        created_by: null,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'spotify_id' },
    )
    .select('id, spotify_id, musicbrainz_id')
    .single();
  if (error) throw error;
  return { artist: data as ArtistRow, created: true };
}

function requestedRegions(input: unknown): string[] {
  if (input === undefined) return Object.keys(countryNames);
  if (
    !Array.isArray(input) ||
    input.length === 0 ||
    input.length > Object.keys(countryNames).length ||
    input.some(
      (region) =>
        typeof region !== 'string' ||
        !Object.hasOwn(countryNames, region.trim().toUpperCase()),
    )
  ) {
    throw new ProviderFailure('INVALID_REGIONS', 400);
  }
  return [
    ...new Set(input.map((region: string) => region.trim().toUpperCase())),
  ];
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const auth = await authenticateRequest(request, true);
    if ('response' in auth) return auth.response;
    if (!auth.context.isTrustedServer) {
      return jsonResponse(
        { error: 'Trusted server credentials are required' },
        403,
      );
    }
    const input = await request.json().catch(() => ({}));
    const regions = requestedRegions(input?.regions);
    const missingSecrets = [
      !Deno.env.get('LASTFM_API_KEY') && 'LASTFM_API_KEY',
      !Deno.env.get('SPOTIFY_CLIENT_ID') && 'SPOTIFY_CLIENT_ID',
      !Deno.env.get('SPOTIFY_CLIENT_SECRET') && 'SPOTIFY_CLIENT_SECRET',
    ].filter((value): value is string => !!value);
    if (missingSecrets.length) {
      return jsonResponse(
        {
          code: 'MISSING_REQUIRED_SECRET',
          error: 'Provider credentials are not configured',
          missing: missingSecrets,
        },
        500,
      );
    }

    const database = createClient(
      auth.context.supabaseUrl,
      auth.context.serviceRoleKey,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const charts: { region: string; artists: LastFmArtist[] }[] = [];
    const errors: { region: string; code: string }[] = [];
    try {
      charts.push({
        region: 'global',
        artists: await fetchLastFmArtists({ method: 'chart.getTopArtists' }),
      });
    } catch (error) {
      const code =
        error instanceof ProviderFailure ? error.code : 'LASTFM_REQUEST_FAILED';
      return jsonResponse(
        { code, error: 'Could not load the global Last.fm artist chart' },
        error instanceof ProviderFailure ? error.status : 502,
      );
    }
    for (const region of regions) {
      try {
        await wait(lastFmCountryGapMs);
        charts.push({
          region,
          artists: await fetchLastFmArtists({
            method: 'geo.getTopArtists',
            country: countryNames[region],
          }),
        });
      } catch (error) {
        errors.push({
          region,
          code:
            error instanceof ProviderFailure
              ? error.code
              : 'LASTFM_REQUEST_FAILED',
        });
      }
    }

    let newlyCreated = 0;
    const resolvedByKey = new Map<string, ArtistRow | null>();
    const processedRegions: {
      region: string;
      resolvedCount: number;
      chartCount: number;
    }[] = [];
    const periodStart = utcWeekStartDate();
    for (const chart of charts) {
      const rows: {
        region: string;
        rank: number;
        artist_id: string;
        artist_name: string;
      }[] = [];
      for (const [index, artist] of chart.artists.entries()) {
        const key = artist.mbid
          ? `mbid:${artist.mbid}`
          : `name:${normalizeArtistName(artist.name)}`;
        let resolved = resolvedByKey.get(key);
        if (resolved === undefined) {
          resolved = await findArtist(database, artist);
          if (!resolved && newlyCreated < newArtistLimit) {
            const result = await searchAndUpsertArtist(database, artist);
            resolved = result.artist;
            if (result.created && resolved) {
              newlyCreated += 1;
              requestEnrichmentInBackground(database, resolved.id);
            }
          }
          resolvedByKey.set(key, resolved);
        }
        if (resolved) {
          rows.push({
            region: chart.region,
            rank: index + 1,
            artist_id: resolved.id,
            artist_name: artist.name,
          });
        }
      }

      if (rows.length) {
        const fetchedAt = new Date().toISOString();
        const { error } = await database.from('trending_global').upsert(
          rows.map((row) => ({
            source: 'lastfm',
            region: row.region,
            period_kind: 'weekly',
            period_start: periodStart,
            artist_id: row.artist_id,
            artist_name: row.artist_name,
            rank: row.rank,
            score: chartLimit - row.rank + 1,
            public_show_count: 0,
            public_listener_count: 0,
            public_avg_rating: null,
            fetched_at: fetchedAt,
            calculated_at: fetchedAt,
          })),
          {
            onConflict: 'source,region,period_kind,period_start,artist_id',
          },
        );
        if (error) throw error;
      }
      if (rows.length) {
        const { error: staleError } = await database
          .from('trending_global')
          .delete()
          .eq('source', 'lastfm')
          .eq('region', chart.region)
          .eq('period_kind', 'weekly')
          .eq('period_start', periodStart)
          .not(
            'artist_id',
            'in',
            `(${rows.map((row) => row.artist_id).join(',')})`,
          );
        if (staleError) throw staleError;
      }
      processedRegions.push({
        region: chart.region,
        resolvedCount: rows.length,
        chartCount: chart.artists.length,
      });
    }

    return jsonResponse({
      success: true,
      newArtists: newlyCreated,
      regions: processedRegions,
      errors,
    });
  } catch (error) {
    if (error instanceof SpotifyRateLimitedError) {
      return jsonResponse(
        {
          code: 'SPOTIFY_RATE_LIMITED',
          retryAfter: error.retryAfter,
        },
        429,
      );
    }
    if (error instanceof SpotifyApiError) {
      return jsonResponse({ code: 'SPOTIFY_ERROR', status: error.status }, 502);
    }
    if (error instanceof ProviderFailure) {
      return jsonResponse(
        { code: error.code, error: 'Trending refresh could not be completed' },
        error.status,
      );
    }
    console.error(
      JSON.stringify({
        event: 'refresh_trending_failed',
        message:
          error instanceof Error
            ? error.message.slice(0, 200)
            : 'Unknown error',
      }),
    );
    return jsonResponse(
      { code: 'TRENDING_REFRESH_FAILED', error: 'Trending refresh failed' },
      502,
    );
  }
});

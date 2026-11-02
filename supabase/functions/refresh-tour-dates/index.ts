import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import { authenticateRequest } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';
import {
  isLikelyTributeEvent,
  normalizeTourName,
  parseTicketmasterCoordinates,
  parseTicketmasterStart,
  parseTicketmasterStatus,
} from '../_shared/tourData.ts';
import { utcWeekStartDate } from '../_shared/week.ts';

const candidateLimit = 60;
const defaultCountryCodes = ['ES', 'FR', 'GB', 'DE', 'US'];
const supportedCountryCodes = new Set([
  'AR',
  'AU',
  'AT',
  'BE',
  'BR',
  'CA',
  'CH',
  'CL',
  'CO',
  'DE',
  'DK',
  'ES',
  'FI',
  'FR',
  'GB',
  'IE',
  'IT',
  'JP',
  'MX',
  'NL',
  'NO',
  'NZ',
  'PL',
  'PT',
  'SE',
  'US',
]);
const candidateTtlMs = 24 * 60 * 60 * 1000;
const dateRangeMs = 365 * 24 * 60 * 60 * 1000;
const requestIntervalMs = 260;
const requestTimeoutMs = 8000;
const responsePageSize = 100;
const musicbrainzIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ticketmasterHosts =
  /^(?:[a-z0-9-]+\.)*ticketmaster\.(?:com|es|fr|de|it|co\.uk|com\.mx|com\.br|ca|au|nl|be|dk|se|no|fi|ie|ch|pt|pl|at|nz|jp|sg|hk|ar|cl|co|mx|br|za)$/i;

type ArtistCandidate = {
  id: string;
  name: string;
  spotify_id: string | null;
  musicbrainz_id: string | null;
  tour_last_checked_at: string | null;
  score: number;
};

type CandidateSignals = {
  wishlist: boolean;
  pick: boolean;
  logCount: number;
  ratingTotal: number;
  ratingCount: number;
  trendingRank: number | null;
};

type CandidateCollection = {
  candidates: ArtistCandidate[];
  sources: {
    wishlist: number;
    picks: number;
    recentPublicLogs: number;
    topRated: number;
    externalChart: number;
    eligible: number;
  };
};

type TicketmasterEvent = {
  external_id: string;
  artist_id: string;
  event_name: string;
  venue_name: string | null;
  city: string | null;
  country: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  event_date: string;
  status: string;
  ticket_url: string | null;
  source: 'ticketmaster';
};

class TicketmasterFailure extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

class RequestGate {
  private lastStartedAt = 0;
  private tail: Promise<void> = Promise.resolve();

  async acquire(): Promise<void> {
    let release!: () => void;
    const turn = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.tail;
    this.tail = previous.then(() => turn);
    await previous;
    const wait = Math.max(
      0,
      this.lastStartedAt + requestIntervalMs - Date.now(),
    );
    if (wait > 0) await delay(wait);
    this.lastStartedAt = Date.now();
    release();
  }
}

function retryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

function unwrapArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null,
      )
    : [];
}

async function ticketmasterSearch(
  candidate: ArtistCandidate,
  apiKey: string,
  gate: RequestGate,
  from: string,
  through: string,
  countryCode: string,
): Promise<Record<string, unknown>[]> {
  const endpoint = new URL(
    'https://app.ticketmaster.com/discovery/v2/events.json',
  );
  endpoint.searchParams.set('apikey', apiKey);
  endpoint.searchParams.set('keyword', candidate.name);
  endpoint.searchParams.set('startDateTime', from);
  endpoint.searchParams.set('endDateTime', through);
  endpoint.searchParams.set('countryCode', countryCode);
  endpoint.searchParams.set('sort', 'date,asc');
  endpoint.searchParams.set('size', String(responsePageSize));

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await gate.acquire();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    let response: Response;
    try {
      response = await fetch(endpoint, { signal: controller.signal });
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TicketmasterFailure('TICKETMASTER_TIMEOUT', 504);
      }
      throw new TicketmasterFailure('TICKETMASTER_REQUEST_FAILED', 502);
    }

    if (response.status === 429) {
      clearTimeout(timeout);
      const retryAfter = retryAfterMs(response.headers.get('Retry-After'));
      if (attempt === 3 || (retryAfter !== null && retryAfter > 60_000)) {
        throw new TicketmasterFailure('TICKETMASTER_RATE_LIMITED', 429);
      }
      await delay(retryAfter ?? 1000 * 2 ** attempt);
      continue;
    }
    if (!response.ok) {
      clearTimeout(timeout);
      throw new TicketmasterFailure('TICKETMASTER_HTTP_ERROR', 502);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TicketmasterFailure('TICKETMASTER_TIMEOUT', 504);
      }
      throw new TicketmasterFailure('TICKETMASTER_INVALID_JSON', 502);
    }
    clearTimeout(timeout);
    if (
      typeof payload !== 'object' ||
      payload === null ||
      ('errors' in payload &&
        Array.isArray(payload.errors) &&
        payload.errors.length)
    ) {
      throw new TicketmasterFailure('TICKETMASTER_INVALID_RESPONSE', 502);
    }
    const embedded =
      '_embedded' in payload && typeof payload._embedded === 'object'
        ? payload._embedded
        : null;
    const events =
      embedded && '_embedded' in embedded
        ? unwrapArray(embedded._embedded)
        : embedded && 'events' in embedded
          ? unwrapArray(embedded.events)
          : [];
    return events;
  }
  throw new TicketmasterFailure('TICKETMASTER_RATE_LIMITED', 429);
}

function extractExternalIds(attraction: Record<string, unknown>) {
  const links =
    typeof attraction.externalLinks === 'object' && attraction.externalLinks
      ? (attraction.externalLinks as Record<string, unknown>)
      : {};
  const urls = Object.values(links).flatMap((value) =>
    unwrapArray(value).flatMap((link) =>
      typeof link.url === 'string'
        ? [link.url]
        : typeof link.href === 'string'
          ? [link.href]
          : [],
    ),
  );
  const spotifyIds = new Set<string>();
  const musicbrainzIds = new Set<string>();
  for (const url of urls) {
    const spotifyMatch =
      url.match(/open\.spotify\.com\/artist\/([A-Za-z0-9]+)/i) ??
      url.match(/spotify:artist:([A-Za-z0-9]+)/i);
    if (spotifyMatch) spotifyIds.add(spotifyMatch[1]);
    const musicbrainzMatch = url.match(
      /musicbrainz\.org\/artist\/([0-9a-f-]{36})/i,
    );
    if (musicbrainzMatch && musicbrainzIdPattern.test(musicbrainzMatch[1])) {
      musicbrainzIds.add(musicbrainzMatch[1].toLowerCase());
    }
  }
  return { spotifyIds, musicbrainzIds };
}

function isCandidateAttraction(
  attraction: Record<string, unknown>,
  candidate: ArtistCandidate,
): boolean {
  const name = typeof attraction.name === 'string' ? attraction.name : '';
  const exactName =
    !!name && normalizeTourName(name) === normalizeTourName(candidate.name);
  const externalIds = extractExternalIds(attraction);
  const idMatch =
    (!!candidate.spotify_id &&
      externalIds.spotifyIds.has(candidate.spotify_id)) ||
    (!!candidate.musicbrainz_id &&
      externalIds.musicbrainzIds.has(candidate.musicbrainz_id.toLowerCase()));
  return exactName || idMatch;
}

function isSafeTicketUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !ticketmasterHosts.test(url.hostname)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toTourDate(
  event: Record<string, unknown>,
  candidate: ArtistCandidate,
  fromMs: number,
  throughMs: number,
): TicketmasterEvent | null {
  const eventName = stringValue(event.name);
  if (!eventName) return null;
  const embeddedObject =
    typeof event._embedded === 'object' && event._embedded !== null
      ? (event._embedded as Record<string, unknown>)
      : {};
  const attractions = unwrapArray(embeddedObject.attractions);
  if (
    !attractions.some((attraction) =>
      isCandidateAttraction(attraction, candidate),
    )
  ) {
    return null;
  }
  if (
    isLikelyTributeEvent(
      eventName,
      attractions.map((item) => stringValue(item.name) ?? ''),
      candidate.name,
    )
  ) {
    return null;
  }

  const dates =
    typeof event.dates === 'object' && event.dates !== null
      ? (event.dates as Record<string, unknown>)
      : {};
  const start =
    typeof dates.start === 'object' && dates.start !== null
      ? (dates.start as Record<string, unknown>)
      : {};
  const parsedStart = parseTicketmasterStart(start);
  if (!parsedStart) return null;
  const { timestamp: startMs, eventDate } = parsedStart;
  if (!Number.isFinite(startMs) || startMs < fromMs || startMs > throughMs) {
    return null;
  }
  const externalId = stringValue(event.id);
  if (!externalId) return null;
  const venue = unwrapArray(embeddedObject.venues)[0] ?? {};
  const city =
    typeof venue.city === 'object' && venue.city !== null
      ? stringValue((venue.city as Record<string, unknown>).name)
      : null;
  const country =
    typeof venue.country === 'object' && venue.country !== null
      ? stringValue((venue.country as Record<string, unknown>).name)
      : null;
  const countryCode =
    typeof venue.country === 'object' && venue.country !== null
      ? (stringValue(
          (venue.country as Record<string, unknown>).countryCode,
        )?.toUpperCase() ?? null)
      : null;
  const coordinates = parseTicketmasterCoordinates(venue.location);
  const datesStatus =
    typeof dates.status === 'object' && dates.status !== null
      ? (dates.status as Record<string, unknown>).code
      : null;
  return {
    external_id: externalId,
    artist_id: candidate.id,
    event_name: eventName,
    venue_name: stringValue(venue.name),
    city,
    country,
    country_code: countryCode,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    event_date: eventDate,
    status: parseTicketmasterStatus(datesStatus),
    ticket_url: isSafeTicketUrl(event.url),
    source: 'ticketmaster',
  };
}

function addSignal(
  signals: Map<string, CandidateSignals>,
  artistId: unknown,
  update: (signal: CandidateSignals) => void,
): void {
  if (typeof artistId !== 'string') return;
  const signal = signals.get(artistId) ?? {
    wishlist: false,
    pick: false,
    logCount: 0,
    ratingTotal: 0,
    ratingCount: 0,
    trendingRank: null,
  };
  update(signal);
  signals.set(artistId, signal);
}

function candidateScore(signal: CandidateSignals): number {
  return (
    (signal.wishlist ? 1000 : 0) +
    (signal.pick ? 700 : 0) +
    signal.logCount * 40 +
    (signal.ratingCount ? (signal.ratingTotal / signal.ratingCount) * 20 : 0) +
    (signal.trendingRank === null ? 0 : Math.max(0, 100 - signal.trendingRank))
  );
}

async function collectCandidates(
  database: ReturnType<typeof createClient>,
): Promise<CandidateCollection> {
  const signals = new Map<string, CandidateSignals>();
  const [
    { data: wishlist, error: wishlistError },
    { data: picks, error: picksError },
    { data: logs, error: logsError },
    { data: trending, error: trendingError },
    { data: appPopular, error: appPopularError },
    { data: topRated, error: topRatedError },
  ] = await Promise.all([
    database
      .from('wishlist_items')
      .select('artist_id')
      .order('created_at', { ascending: true })
      .limit(1000),
    database
      .from('profile_picks')
      .select('artist_id')
      .order('created_at', { ascending: true })
      .limit(1000),
    database
      .from('concert_logs')
      .select('artist_id, rating')
      .order('created_at', { ascending: false })
      .limit(5000),
    database
      .from('trending_global')
      .select('artist_id, rank')
      .eq('source', 'lastfm')
      .eq('period_kind', 'weekly')
      .gte('period_start', utcWeekStartDate())
      .order('period_start', { ascending: false })
      .order('rank', { ascending: true })
      .limit(300),
    database.rpc('trending_in_app', {
      p_days: 365,
      p_limit: 100,
    }),
    database.rpc('top_rated_artists', {
      p_venue_type: null,
      p_macro: null,
      p_year: null,
      p_min_raters: 1,
      p_limit: 100,
      p_query: null,
    }),
  ]);
  if (wishlistError) throw wishlistError;
  if (picksError) throw picksError;
  if (logsError) throw logsError;
  if (trendingError) throw trendingError;
  if (appPopularError) throw appPopularError;
  if (topRatedError) throw topRatedError;

  for (const row of wishlist ?? []) {
    addSignal(signals, row.artist_id, (signal) => {
      signal.wishlist = true;
    });
  }
  for (const row of picks ?? []) {
    addSignal(signals, row.artist_id, (signal) => {
      signal.pick = true;
    });
  }
  for (const row of logs ?? []) {
    addSignal(signals, row.artist_id, (signal) => {
      signal.logCount += 1;
      if (typeof row.rating === 'number') {
        signal.ratingTotal += row.rating;
        signal.ratingCount += 1;
      }
    });
  }
  for (const row of trending ?? []) {
    addSignal(signals, row.artist_id, (signal) => {
      const rank = Number(row.rank);
      if (Number.isFinite(rank)) {
        signal.trendingRank =
          signal.trendingRank === null
            ? rank
            : Math.min(signal.trendingRank, rank);
      }
    });
  }
  for (const [index, row] of (appPopular ?? []).entries()) {
    addSignal(signals, row.id, (signal) => {
      signal.logCount = Math.max(
        signal.logCount,
        typeof row.show_count === 'number' ? row.show_count : 0,
      );
      const rank = index + 1;
      signal.trendingRank =
        signal.trendingRank === null
          ? rank
          : Math.min(signal.trendingRank, rank);
    });
  }
  for (const [index, row] of (topRated ?? []).entries()) {
    addSignal(signals, row.id, (signal) => {
      const rating =
        typeof row.weighted_rating === 'number'
          ? row.weighted_rating
          : typeof row.avg_show_rating === 'number'
            ? row.avg_show_rating
            : null;
      if (rating !== null) {
        signal.ratingTotal = Math.max(signal.ratingTotal, rating);
        signal.ratingCount = Math.max(signal.ratingCount, 1);
      }
      const rank = index + 101;
      signal.trendingRank =
        signal.trendingRank === null
          ? rank
          : Math.min(signal.trendingRank, rank);
    });
  }

  const selectedIds = [...signals.entries()]
    .filter(
      ([, signal]) =>
        signal.wishlist ||
        signal.pick ||
        signal.logCount >= 2 ||
        (signal.ratingCount > 0 &&
          signal.ratingTotal / signal.ratingCount >= 4) ||
        signal.trendingRank !== null,
    )
    .map(([artistId]) => artistId);
  const sources = {
    wishlist: wishlist?.length ?? 0,
    picks: picks?.length ?? 0,
    recentPublicLogs: appPopular?.length ?? 0,
    topRated: topRated?.length ?? 0,
    externalChart: trending?.length ?? 0,
    eligible: selectedIds.length,
  };
  if (!selectedIds.length) return { candidates: [], sources };

  const artists: ArtistCandidate[] = [];
  for (let offset = 0; offset < selectedIds.length; offset += 500) {
    const { data, error } = await database
      .from('artists')
      .select('id, name, spotify_id, musicbrainz_id, tour_last_checked_at')
      .in('id', selectedIds.slice(offset, offset + 500));
    if (error) throw error;
    artists.push(...((data ?? []) as ArtistCandidate[]));
  }

  const now = Date.now();
  const candidates = artists
    .filter((artist) => {
      if (!artist.tour_last_checked_at) return true;
      const checkedAt = Date.parse(artist.tour_last_checked_at);
      return !Number.isFinite(checkedAt) || now - checkedAt >= candidateTtlMs;
    })
    .map((artist) => ({
      ...artist,
      score: candidateScore(signals.get(artist.id)!),
    }))
    .sort((left, right) => {
      const parsedLeft = left.tour_last_checked_at
        ? Date.parse(left.tour_last_checked_at)
        : Number.NaN;
      const parsedRight = right.tour_last_checked_at
        ? Date.parse(right.tour_last_checked_at)
        : Number.NaN;
      const leftChecked = Number.isFinite(parsedLeft)
        ? parsedLeft
        : Number.NEGATIVE_INFINITY;
      const rightChecked = Number.isFinite(parsedRight)
        ? parsedRight
        : Number.NEGATIVE_INFINITY;
      return leftChecked - rightChecked || right.score - left.score;
    })
    .slice(0, candidateLimit);
  return { candidates, sources };
}

async function fetchForCandidates(
  candidates: ArtistCandidate[],
  countryCodes: string[],
  apiKey: string,
  gate: RequestGate,
  from: string,
  through: string,
): Promise<
  {
    candidate: ArtistCandidate;
    events: Record<string, unknown>[];
    errors: { countryCode: string; code: string }[];
  }[]
> {
  const results: {
    candidate: ArtistCandidate;
    events: Record<string, unknown>[];
    errors: { countryCode: string; code: string }[];
  }[] = [];
  let nextIndex = 0;
  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= candidates.length) return;
      const candidate = candidates[index];
      const events: Record<string, unknown>[] = [];
      const errors: { countryCode: string; code: string }[] = [];
      for (const countryCode of countryCodes) {
        try {
          events.push(
            ...(await ticketmasterSearch(
              candidate,
              apiKey,
              gate,
              from,
              through,
              countryCode,
            )),
          );
        } catch (error) {
          errors.push({
            countryCode,
            code:
              error instanceof TicketmasterFailure
                ? error.code
                : 'TICKETMASTER_REQUEST_FAILED',
          });
        }
      }
      results.push({ candidate, events, errors });
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(4, candidates.length) }, () => worker()),
  );
  const candidateOrder = new Map(
    candidates.map((candidate, index) => [candidate.id, index]),
  );
  return results.sort(
    (left, right) =>
      candidateOrder.get(left.candidate.id)! -
      candidateOrder.get(right.candidate.id)!,
  );
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
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      return jsonResponse(
        {
          code: 'MISSING_REQUIRED_SECRET',
          error: 'Ticketmaster credentials are not configured',
          missing: ['TICKETMASTER_API_KEY'],
        },
        500,
      );
    }
    const body = await request.json().catch(() => ({}));
    const requestedCountries =
      typeof body === 'object' && body !== null && 'country_codes' in body
        ? body.country_codes
        : (
            Deno.env.get('TOUR_COUNTRY_CODES') ?? defaultCountryCodes.join(',')
          ).split(',');
    if (
      !Array.isArray(requestedCountries) ||
      requestedCountries.length === 0 ||
      requestedCountries.length > 5 ||
      requestedCountries.some(
        (value) =>
          typeof value !== 'string' ||
          !supportedCountryCodes.has(value.trim().toUpperCase()),
      )
    ) {
      return jsonResponse(
        { code: 'INVALID_COUNTRY_CODES', error: 'Invalid tour markets' },
        400,
      );
    }
    const countryCodes = [
      ...new Set(
        requestedCountries.map((value: string) => value.trim().toUpperCase()),
      ),
    ];
    const database = createClient(
      auth.context.supabaseUrl,
      auth.context.serviceRoleKey,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const candidateCollection = await collectCandidates(database);
    const candidates = candidateCollection.candidates;
    const now = Date.now();
    const checkedAt = new Date(now).toISOString();
    const from = new Date(now).toISOString().replace(/\.\d{3}Z$/, 'Z');
    const through = new Date(now + dateRangeMs)
      .toISOString()
      .replace(/\.\d{3}Z$/, 'Z');
    const gate = new RequestGate();
    const fetched = await fetchForCandidates(
      candidates,
      countryCodes,
      apiKey,
      gate,
      from,
      through,
    );

    const today = new Date(now).toISOString().slice(0, 10);
    const { error: deletePastError } = await database
      .from('artist_tour_dates')
      .delete()
      .lt('event_date', today);
    if (deletePastError) throw deletePastError;

    const events = new Map<string, TicketmasterEvent>();
    const successfulArtistIds: string[] = [];
    const failures: {
      artistId: string;
      countryCode: string;
      code: string;
    }[] = [];
    for (const result of fetched) {
      failures.push(
        ...result.errors.map((failure) => ({
          artistId: result.candidate.id,
          ...failure,
        })),
      );
      if (result.errors.length < countryCodes.length) {
        successfulArtistIds.push(result.candidate.id);
      }
      for (const event of result.events) {
        const row = toTourDate(event, result.candidate, now, now + dateRangeMs);
        if (row) {
          events.set(row.external_id, row);
        }
      }
    }

    const mappedStatuses: Record<string, number> = {};
    const upsertRows = [...events.values()].map((event) => {
      mappedStatuses[event.status] = (mappedStatuses[event.status] ?? 0) + 1;
      return event;
    });
    for (let offset = 0; offset < upsertRows.length; offset += 200) {
      const batch = upsertRows.slice(offset, offset + 200);
      const externalIds = batch.map((event) => event.external_id);
      const { data: existingEvents, error: existingError } = await database
        .from('artist_tour_dates')
        .select('id, external_id')
        .eq('source', 'ticketmaster')
        .in('external_id', externalIds);
      if (existingError) throw existingError;
      const existingIdByExternalId = new Map(
        (existingEvents ?? []).map(
          (event: { external_id: string; id: string }) => [
            event.external_id,
            event.id,
          ],
        ),
      );
      const rows = batch.map((event) => {
        const existingId = existingIdByExternalId.get(event.external_id);
        return existingId ? { ...event, id: existingId } : event;
      });
      const { error } = await database
        .from('artist_tour_dates')
        .upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }
    if (successfulArtistIds.length) {
      const { error } = await database
        .from('artists')
        .update({ tour_last_checked_at: checkedAt })
        .in('id', successfulArtistIds);
      if (error) throw error;
    }

    return jsonResponse({
      success: true,
      candidates: candidates.length,
      candidateSources: candidateCollection.sources,
      countryCodes,
      checked: successfulArtistIds.length,
      upsertedEvents: upsertRows.length,
      mappedStatuses,
      failures,
    });
  } catch (error) {
    if (error instanceof TicketmasterFailure) {
      return jsonResponse(
        { code: error.code, error: 'Tour-date refresh could not be completed' },
        error.status,
      );
    }
    console.error(
      JSON.stringify({
        event: 'refresh_tour_dates_failed',
        message:
          error instanceof Error
            ? error.message.slice(0, 200)
            : 'Unknown error',
      }),
    );
    return jsonResponse(
      {
        code: 'TOUR_DATES_REFRESH_FAILED',
        error: 'Tour-date refresh failed',
        diagnostic:
          error instanceof Error ? error.message.slice(0, 200) : undefined,
      },
      502,
    );
  }
});

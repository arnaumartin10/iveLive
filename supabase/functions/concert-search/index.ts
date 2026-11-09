import { authenticateRequest } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';
import {
  findExactTicketmasterAttraction,
  normalizeConcertArtistName,
  parseTicketmasterConcerts,
  type ParsedTicketmasterConcert,
} from '../_shared/concertSearch.ts';

const cacheDurationMs = 60_000;
const dateRangeMs = 365 * 24 * 60 * 60 * 1000;
const ticketmasterCountries = new Set([
  'AR',
  'AU',
  'AT',
  'BE',
  'BR',
  'CA',
  'CL',
  'CO',
  'CZ',
  'DK',
  'FI',
  'FR',
  'DE',
  'HK',
  'HU',
  'IE',
  'IL',
  'IT',
  'JP',
  'MX',
  'NL',
  'NZ',
  'NO',
  'PL',
  'PT',
  'SG',
  'ZA',
  'KR',
  'ES',
  'SE',
  'CH',
  'TW',
  'TR',
  'AE',
  'GB',
  'US',
]);
const searchCache = new Map<
  string,
  { expiresAt: number; results: ParsedTicketmasterConcert[] }
>();

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function dateTime(value: Date) {
  return value.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function dateBounds(dateFrom: string | null, dateTo: string | null) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const firstLocalDate = dateFrom ?? today;
  const lastLocalDate = dateTo ?? addDays(firstLocalDate, 365);
  const start = dateFrom
    ? new Date(`${dateFrom}T00:00:00.000Z`)
    : new Date(now);
  const end = dateTo
    ? new Date(`${dateTo}T23:59:59.000Z`)
    : new Date(start.getTime() + dateRangeMs);
  start.setUTCDate(start.getUTCDate() - 1);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end, firstLocalDate, lastLocalDate };
}

async function fetchTicketmaster(
  endpoint: URL,
  apiKey: string,
  controller: AbortController,
): Promise<{ response: Response; payload: unknown }> {
  endpoint.searchParams.set('apikey', apiKey);
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) return { response, payload: null };
    return { response, payload: await response.json() };
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
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return jsonResponse({ code: 'INVALID_INPUT' }, 400);
    }
    const body = input as Record<string, unknown>;
    const artistId = typeof body.artistId === 'string' ? body.artistId : '';
    const artistName =
      typeof body.artistName === 'string' ? body.artistName.trim() : '';
    const countryCode =
      typeof body.countryCode === 'string'
        ? body.countryCode.trim().toUpperCase()
        : null;
    const dateFrom = body.dateFrom == null ? null : body.dateFrom;
    const dateTo = body.dateTo == null ? null : body.dateTo;
    const limit =
      typeof body.limit === 'number' && Number.isInteger(body.limit)
        ? Math.max(1, Math.min(body.limit, 20))
        : 20;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        artistId,
      ) ||
      artistName.length < 1 ||
      artistName.length > 200 ||
      (countryCode !== null && !ticketmasterCountries.has(countryCode)) ||
      (dateFrom !== null && !isDate(dateFrom)) ||
      (dateTo !== null && !isDate(dateTo))
    ) {
      return jsonResponse({ code: 'INVALID_INPUT' }, 400);
    }

    const normalizedName = normalizeConcertArtistName(artistName);
    if (!normalizedName) {
      return jsonResponse({ code: 'INVALID_INPUT' }, 400);
    }
    const from = dateFrom as string | null;
    const through = dateTo as string | null;
    const today = new Date().toISOString().slice(0, 10);
    if (
      (from !== null && from < today) ||
      (through !== null && through < today) ||
      (from !== null && through !== null && from > through)
    ) {
      return jsonResponse({ code: 'INVALID_DATE_RANGE' }, 400);
    }

    const { start, end, firstLocalDate, lastLocalDate } = dateBounds(
      from,
      through,
    );
    if (start > end) {
      return jsonResponse({ code: 'INVALID_DATE_RANGE' }, 400);
    }
    const cacheKey = [
      normalizedName,
      countryCode ?? '',
      from ?? '',
      through ?? '',
    ].join(':');
    const cached = searchCache.get(cacheKey);
    let concerts: ParsedTicketmasterConcert[] | null =
      cached && cached.expiresAt > Date.now() ? cached.results : null;

    if (!concerts) {
      const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
      if (!apiKey) {
        return jsonResponse({ code: 'CONCERT_SEARCH_NOT_CONFIGURED' }, 503);
      }

      const attractionsUrl = new URL(
        'https://app.ticketmaster.com/discovery/v2/attractions.json',
      );
      attractionsUrl.searchParams.set('keyword', artistName);
      attractionsUrl.searchParams.set('size', '50');
      attractionsUrl.searchParams.set('sort', 'relevance,desc');
      const attractionResponse = await fetchTicketmaster(
        attractionsUrl,
        apiKey,
        new AbortController(),
      );
      if (!attractionResponse.response.ok) {
        return jsonResponse(
          {
            code:
              attractionResponse.response.status === 429
                ? 'CONCERT_SEARCH_RATE_LIMITED'
                : 'CONCERT_SEARCH_UNAVAILABLE',
          },
          attractionResponse.response.status === 429 ? 429 : 502,
        );
      }
      const attraction = findExactTicketmasterAttraction(
        attractionResponse.payload,
        artistName,
      );
      if (!attraction) {
        return jsonResponse({ results: [], artistMatched: false });
      }

      const eventsUrl = new URL(
        'https://app.ticketmaster.com/discovery/v2/events.json',
      );
      eventsUrl.searchParams.set('attractionId', attraction.id);
      eventsUrl.searchParams.set('startDateTime', dateTime(start));
      eventsUrl.searchParams.set('endDateTime', dateTime(end));
      eventsUrl.searchParams.set('sort', 'date,asc');
      eventsUrl.searchParams.set('size', '50');
      if (countryCode) eventsUrl.searchParams.set('countryCode', countryCode);
      const eventsResponse = await fetchTicketmaster(
        eventsUrl,
        apiKey,
        new AbortController(),
      );
      if (!eventsResponse.response.ok) {
        return jsonResponse(
          {
            code:
              eventsResponse.response.status === 429
                ? 'CONCERT_SEARCH_RATE_LIMITED'
                : 'CONCERT_SEARCH_UNAVAILABLE',
          },
          eventsResponse.response.status === 429 ? 429 : 502,
        );
      }

      concerts = parseTicketmasterConcerts(
        eventsResponse.payload,
        attraction.name,
        attraction.id,
      ).filter(
        (concert) =>
          concert.eventDate >= firstLocalDate &&
          concert.eventDate <= lastLocalDate,
      );
      for (const [key, entry] of searchCache) {
        if (entry.expiresAt <= Date.now()) searchCache.delete(key);
      }
      if (searchCache.size >= 100) {
        const oldestKey = searchCache.keys().next().value;
        if (oldestKey) searchCache.delete(oldestKey);
      }
      searchCache.set(cacheKey, {
        expiresAt: Date.now() + cacheDurationMs,
        results: concerts,
      });
    }

    return jsonResponse({
      results: concerts.slice(0, limit).map((concert) => ({
        ...concert,
        artistId,
      })),
      artistMatched: true,
    });
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: 'concert_search_failed',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      }),
    );
    return jsonResponse({ code: 'CONCERT_SEARCH_FAILED' }, 502);
  }
});

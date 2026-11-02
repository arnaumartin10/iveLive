import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import { authenticateRequest } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';
import { toArtistDTO } from '../_shared/spotifyAdapter.ts';
import {
  SpotifyApiError,
  SpotifyRateLimitedError,
  spotifyGet,
} from '../_shared/spotifyClient.ts';

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const auth = await authenticateRequest(request);
    if ('response' in auth) return auth.response;

    const input = await request.json().catch(() => null);
    if (typeof input?.q !== 'string' || input.q.trim().length === 0) {
      return jsonResponse({ error: 'A search query is required' }, 400);
    }
    const requestedLimit =
      typeof input.limit === 'number' && Number.isFinite(input.limit)
        ? Math.floor(input.limit)
        : 10;
    const limit = Math.min(10, Math.max(1, requestedLimit));
    const query = new URLSearchParams({
      type: 'artist',
      q: input.q.trim(),
      limit: String(limit),
    });
    const payload = (await spotifyGet(`/v1/search?${query}`)) as {
      artists?: { items?: unknown };
    };
    const items = Array.isArray(payload.artists?.items)
      ? payload.artists.items
      : [];
    const artists = items
      .map(toArtistDTO)
      .filter((artist) => artist.spotifyId.length > 0);

    console.log(
      JSON.stringify({
        event: 'spotify_search_success',
        query: input.q.trim(),
        resultCount: artists.length,
      }),
    );

    const database = createClient(
      auth.context.supabaseUrl,
      auth.context.serviceRoleKey,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const spotifyIds = artists.map((artist) => artist.spotifyId);
    const { data: existingArtists, error: existingError } = spotifyIds.length
      ? await database
          .from('artists')
          .select('id, spotify_id, macro_genres')
          .in('spotify_id', spotifyIds)
      : { data: [], error: null };
    if (existingError) throw existingError;

    const existingBySpotifyId = new Map(
      (existingArtists ?? []).map((artist) => [artist.spotify_id, artist]),
    );
    return jsonResponse({
      results: artists.map((artist) => {
        const existing = existingBySpotifyId.get(artist.spotifyId);
        return {
          ...artist,
          existingArtistId: existing?.id ?? null,
          macroGenres: existing?.macro_genres ?? [],
        };
      }),
    });
  } catch (error) {
    if (error instanceof SpotifyRateLimitedError) {
      return jsonResponse(
        { code: 'RATE_LIMITED', retryAfter: error.retryAfter },
        429,
      );
    }
    if (error instanceof SpotifyApiError) {
      return jsonResponse(
        {
          code: 'SPOTIFY_ERROR',
          status: error.status,
          message: error.responseBody || error.message,
        },
        error.status,
      );
    }
    console.error('[spotify-search]', error);
    return jsonResponse(
      {
        code: 'SPOTIFY_SEARCH_FAILED',
        error: error instanceof Error ? error.message : 'Could not search Spotify',
      },
      502,
    );
  }
});

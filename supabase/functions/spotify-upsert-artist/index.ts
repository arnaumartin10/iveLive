import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import { authenticateRequest } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';
import { toArtistDTO } from '../_shared/spotifyAdapter.ts';
import {
  SpotifyRateLimitedError,
  spotifyGet,
} from '../_shared/spotifyClient.ts';

const refreshAgeMs = 30 * 24 * 60 * 60 * 1000;

function requestEnrichmentInBackground(
  database: ReturnType<typeof createClient>,
  serviceRoleKey: string,
  artist: {
    id: string;
    enrichment_status?: string | null;
    enriched_at?: string | null;
  },
) {
  const enrichedAt = artist.enriched_at
    ? Date.parse(artist.enriched_at)
    : Number.NaN;
  const staleDone =
    artist.enrichment_status === 'done' &&
    (!Number.isFinite(enrichedAt) ||
      Date.now() - enrichedAt >= 90 * 24 * 60 * 60 * 1000);
  if (artist.enrichment_status === 'done' && !staleDone) return;

  const task = database.functions
    .invoke('enrich-artist', {
      body: { artistId: artist.id },
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'x-internal-secret': Deno.env.get('INTERNAL_FUNCTION_SECRET')!,
      },
    })
    .then(({ error }) => {
      if (error) {
        console.warn(
          JSON.stringify({
            event: 'enrich_artist_invocation_failed',
            message: error.message.slice(0, 200),
          }),
        );
      }
    })
    .catch(() => {
      console.warn(
        JSON.stringify({ event: 'enrich_artist_invocation_failed' }),
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

    const missingSpotifySecrets = [
      !Deno.env.get('SPOTIFY_CLIENT_ID') && 'SPOTIFY_CLIENT_ID',
      !Deno.env.get('SPOTIFY_CLIENT_SECRET') && 'SPOTIFY_CLIENT_SECRET',
      !Deno.env.get('INTERNAL_FUNCTION_SECRET') && 'INTERNAL_FUNCTION_SECRET',
    ].filter((value): value is string => !!value);
    if (missingSpotifySecrets.length) {
      return jsonResponse(
        {
          code: 'MISSING_REQUIRED_SECRET',
          error: 'Spotify credentials are not configured',
          missing: missingSpotifySecrets,
        },
        500,
      );
    }

    const input = await request.json().catch(() => null);
    if (typeof input?.spotifyId !== 'string' || !input.spotifyId.trim()) {
      return jsonResponse({ error: 'spotifyId is required' }, 400);
    }

    const spotifyId = input.spotifyId.trim();
    const database = createClient(
      auth.context.supabaseUrl,
      auth.context.serviceRoleKey,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data: existing, error: lookupError } = await database
      .from('artists')
      .select('*')
      .eq('spotify_id', spotifyId)
      .maybeSingle();
    if (lookupError) throw lookupError;

    const lastSyncedAt = existing?.last_synced_at
      ? Date.parse(existing.last_synced_at)
      : Number.NaN;
    if (
      existing &&
      Number.isFinite(lastSyncedAt) &&
      Date.now() - lastSyncedAt < refreshAgeMs
    ) {
      requestEnrichmentInBackground(
        database,
        auth.context.serviceRoleKey,
        existing,
      );
      return jsonResponse(existing);
    }

    const payload = await spotifyGet(
      `/v1/artists/${encodeURIComponent(spotifyId)}`,
    );
    const artist = toArtistDTO(payload);
    if (!artist.spotifyId) {
      return jsonResponse({ error: 'Spotify returned an invalid artist' }, 502);
    }

    const { data, error } = await database
      .from('artists')
      .upsert(
        {
          spotify_id: artist.spotifyId,
          name: artist.name,
          image_url_large: artist.imageLarge,
          image_url_thumb: artist.imageThumb,
          source: 'spotify',
          created_by: null,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'spotify_id' },
      )
      .select('*')
      .single();
    if (error) throw error;
    requestEnrichmentInBackground(database, auth.context.serviceRoleKey, data);
    return jsonResponse(data);
  } catch (error) {
    if (error instanceof SpotifyRateLimitedError) {
      return jsonResponse(
        { code: 'RATE_LIMITED', retryAfter: error.retryAfter },
        429,
      );
    }
    console.error('[spotify-upsert-artist]', error);
    return jsonResponse(
      { code: 'SPOTIFY_UPSERT_FAILED', error: 'Could not save Spotify artist' },
      502,
    );
  }
});

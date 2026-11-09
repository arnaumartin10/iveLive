import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import { authenticateRequest } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';
import {
  CatalogSearchInProgressError,
  CatalogUserRateLimitError,
  SpotifyCircuitOpenError,
  SpotifyCooldownError,
  normalizeArtistName,
  resolveCatalogArtist,
  type CatalogQueueRow,
} from '../_shared/artistCatalog.ts';

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const auth = await authenticateRequest(request);
  if ('response' in auth) return auth.response;

  try {
    const input = await request.json().catch(() => null);
    if (!input || typeof input !== 'object') {
      return jsonResponse({ code: 'INVALID_INPUT' }, 400);
    }

    const database = createClient(
      auth.context.supabaseUrl,
      auth.context.serviceRoleKey,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    if (
      input.report === true &&
      typeof input.queueId === 'string' &&
      input.queueId.length <= 80
    ) {
      const { error } = await database
        .from('catalog_queue')
        .update({
          last_error: 'User reported this catalog entry.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.queueId);
      if (error) throw new Error('Could not record the catalog report.');
      return jsonResponse({ reported: true });
    }

    let queue: CatalogQueueRow | null = null;
    if (typeof input.queueId === 'string' && input.queueId.length <= 80) {
      const { data, error } = await database
        .from('catalog_queue')
        .select('id,name,name_normalized,search_key,status,attempts,aliases')
        .eq('id', input.queueId)
        .maybeSingle();
      if (error) throw new Error('Could not load the catalog entry.');
      queue = data;
    }

    const name =
      typeof input.name === 'string' ? input.name.trim() : (queue?.name ?? '');
    if (!name || name.length > 200) {
      return jsonResponse({ code: 'INVALID_INPUT' }, 400);
    }

    if (!queue && typeof input.genreSlug === 'string') {
      const { data, error } = await database
        .from('catalog_queue')
        .select('id,name,name_normalized,search_key,status,attempts,aliases')
        .eq('genre_slug', input.genreSlug)
        .eq('name_normalized', normalizeArtistName(name))
        .maybeSingle();
      if (error) throw new Error('Could not find the catalog entry.');
      queue = data;
    }

    if (
      typeof input.queueId === 'string' &&
      input.queueId.length <= 80 &&
      !queue
    ) {
      return jsonResponse({ code: 'CATALOG_ENTRY_NOT_FOUND' }, 404);
    }

    const result = await resolveCatalogArtist(database, name, {
      queue,
      userId: auth.context.userId,
      serviceRoleKey: auth.context.serviceRoleKey,
    });
    if (result.status === 'resolved') {
      return jsonResponse({
        status: result.status,
        artistId: result.artist.id,
        cacheHit: result.cacheHit,
      });
    }
    return jsonResponse(result);
  } catch (error) {
    if (error instanceof SpotifyCooldownError) {
      return jsonResponse(
        {
          code: 'SPOTIFY_COOLDOWN',
          retryAfterSeconds: error.retryAfterSeconds,
        },
        429,
      );
    }
    if (error instanceof SpotifyCircuitOpenError) {
      return jsonResponse(
        {
          code: 'SPOTIFY_COOLDOWN',
          retryAfterSeconds: error.retryAfterSeconds,
        },
        503,
      );
    }
    if (error instanceof CatalogUserRateLimitError) {
      return jsonResponse({ code: 'CATALOG_RATE_LIMIT' }, 429);
    }
    if (error instanceof CatalogSearchInProgressError) {
      return jsonResponse({ code: 'RESOLUTION_IN_PROGRESS' }, 409);
    }
    console.error(
      JSON.stringify({
        event: 'resolve_artist_failed',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      }),
    );
    return jsonResponse({ code: 'CATALOG_RESOLUTION_FAILED' }, 502);
  }
});

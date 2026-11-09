import { toArtistDTO } from './spotifyAdapter.ts';
import {
  SpotifyApiError,
  SpotifyRateLimitedError,
  spotifyGet,
} from './spotifyClient.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import {
  findExactSpotifyArtist,
  normalizeSpotifyArtistName,
} from './artistName.ts';
import { catalogStatusAfterAttempt } from './catalogQueueLogic.ts';

type CatalogArtist = {
  id: string;
  name: string;
  spotify_id: string | null;
  image_url_large: string | null;
  image_url_thumb: string | null;
  popularity?: number | null;
  enrichment_status?: string | null;
  enriched_at?: string | null;
};

type SpotifySearchArtist = {
  spotifyId: string;
  name: string;
  imageLarge: string | null;
  imageThumb: string | null;
  popularity: number | null;
};

type CatalogQueueRow = {
  id: string;
  name: string;
  name_normalized: string;
  search_key: string;
  status: string;
  attempts: number;
  aliases?: string[];
  genre_slug?: string;
  role?: 'pillar' | 'example';
  position?: number;
  why?: string | null;
  note?: string | null;
};

type SupabaseDatabase = ReturnType<typeof createClient>;

export class SpotifyCooldownError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Spotify is cooling down');
  }
}

export class SpotifyCircuitOpenError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Spotify circuit breaker is open');
  }
}

export class CatalogSearchInProgressError extends Error {
  constructor() {
    super('A search for this artist is already in progress');
  }
}

export class CatalogUserRateLimitError extends Error {
  constructor() {
    super('Artist catalog resolution limit reached');
  }
}

function secondsUntil(value: string | null | undefined): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? Math.max(0, Math.ceil((timestamp - Date.now()) / 1000))
    : 0;
}

async function getSpotifyStopReason(
  database: SupabaseDatabase,
): Promise<SpotifyCooldownError | SpotifyCircuitOpenError | null> {
  const { data, error } = await database
    .from('spotify_state')
    .select('cooldown_until,circuit_open_until')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error('Could not read Spotify cooldown state.');
  const cooldown = secondsUntil(data?.cooldown_until);
  if (cooldown > 0) return new SpotifyCooldownError(cooldown);
  const circuit = secondsUntil(data?.circuit_open_until);
  return circuit > 0 ? new SpotifyCircuitOpenError(circuit) : null;
}

async function recordSpotifySuccess(database: SupabaseDatabase) {
  const { error } = await database.rpc('record_spotify_success');
  if (error) throw new Error('Could not reset Spotify circuit state.');
}

async function recordSpotifyFailure(database: SupabaseDatabase) {
  const { error } = await database.rpc('record_spotify_failure');
  if (error) throw new Error('Could not update Spotify circuit state.');
}

async function recordSpotifyCooldown(
  database: SupabaseDatabase,
  retryAfterSeconds: number,
) {
  const { error } = await database.rpc('record_spotify_cooldown', {
    p_retry_after_seconds: Math.ceil(Math.max(1, retryAfterSeconds)),
  });
  if (error) throw new Error('Could not persist Spotify Retry-After state.');
}

function parseCachedResults(value: unknown): SpotifySearchArtist[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.spotifyId !== 'string' ||
      typeof candidate.name !== 'string'
    ) {
      return [];
    }
    return [
      {
        spotifyId: candidate.spotifyId,
        name: candidate.name,
        imageLarge:
          typeof candidate.imageLarge === 'string'
            ? candidate.imageLarge
            : null,
        imageThumb:
          typeof candidate.imageThumb === 'string'
            ? candidate.imageThumb
            : null,
        popularity:
          typeof candidate.popularity === 'number'
            ? candidate.popularity
            : null,
      },
    ];
  });
}

export async function searchSpotifyArtistCatalog(
  database: SupabaseDatabase,
  name: string,
  beforeSearch?: () => Promise<void>,
): Promise<{ results: SpotifySearchArtist[]; cacheHit: boolean }> {
  const key = normalizeSpotifyArtistName(name);
  const { data: cached, error: cacheError } = await database
    .from('spotify_search_cache')
    .select('results,expires_at')
    .eq('name_normalized', key)
    .maybeSingle();
  if (cacheError) throw new Error('Could not read the Spotify search cache.');
  if (
    cached?.expires_at &&
    Date.parse(cached.expires_at) > Date.now() &&
    Array.isArray(cached.results)
  ) {
    return {
      results: parseCachedResults(cached.results) ?? [],
      cacheHit: true,
    };
  }

  const stopReason = await getSpotifyStopReason(database);
  if (stopReason) throw stopReason;

  const { data: claimed, error: claimError } = await database.rpc(
    'claim_spotify_search',
    { p_name_normalized: key, p_lease_seconds: 120 },
  );
  if (claimError) throw new Error('Could not claim the Spotify search.');
  if (claimed !== true) throw new CatalogSearchInProgressError();

  try {
    await beforeSearch?.();
    const params = new URLSearchParams({
      type: 'artist',
      q: name,
      limit: '5',
    });
    const payload = (await spotifyGet(`/v1/search?${params}`)) as {
      artists?: { items?: unknown };
    };
    const items = Array.isArray(payload.artists?.items)
      ? payload.artists.items
      : [];
    const results = items
      .map((item) => {
        const dto = toArtistDTO(item);
        const record =
          typeof item === 'object' && item !== null
            ? (item as Record<string, unknown>)
            : {};
        return {
          spotifyId: dto.spotifyId,
          name: dto.name,
          imageLarge: dto.imageLarge,
          imageThumb: dto.imageThumb,
          popularity:
            typeof record.popularity === 'number' ? record.popularity : null,
        };
      })
      .filter((artist) => artist.spotifyId.length > 0);

    const { error: saveError } = await database
      .from('spotify_search_cache')
      .upsert(
        {
          name_normalized: key,
          results,
          expires_at: new Date(
            Date.now() + (results.length ? 30 : 1) * 24 * 60 * 60 * 1000,
          ).toISOString(),
          lock_expires_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'name_normalized' },
      );
    if (saveError) throw new Error('Could not save the Spotify search cache.');
    await recordSpotifySuccess(database);
    return { results, cacheHit: false };
  } catch (error) {
    const { error: unlockError } = await database
      .from('spotify_search_cache')
      .update({ lock_expires_at: null, updated_at: new Date().toISOString() })
      .eq('name_normalized', key);
    if (unlockError) {
      console.error(JSON.stringify({ event: 'spotify_search_unlock_failed' }));
    }
    if (error instanceof CatalogUserRateLimitError) throw error;
    if (error instanceof SpotifyRateLimitedError) {
      try {
        await recordSpotifyCooldown(database, error.retryAfter);
      } catch {
        console.error(
          JSON.stringify({ event: 'spotify_cooldown_persist_failed' }),
        );
      }
      throw new SpotifyCooldownError(error.retryAfter);
    }
    await recordSpotifyFailure(database);
    if (error instanceof SpotifyApiError) throw error;
    throw error;
  }
}

export async function findExistingCatalogArtist(
  database: SupabaseDatabase,
  name: string,
): Promise<CatalogArtist | null> {
  const { data, error } = await database.rpc('find_catalog_artist', {
    p_name: name,
  });
  if (error) throw new Error('Could not look up an existing artist.');
  return Array.isArray(data) && data.length ? (data[0] as CatalogArtist) : null;
}

export async function setCatalogQueueResult(
  database: SupabaseDatabase,
  name: string,
  status: 'resolved' | 'pending' | 'not_found' | 'error',
  options: { artistId?: string; error?: string; attempts?: number } = {},
) {
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    ...(options.artistId ? { resolved_artist_id: options.artistId } : {}),
    ...(options.error ? { last_error: options.error.slice(0, 240) } : {}),
    ...(options.attempts !== undefined ? { attempts: options.attempts } : {}),
    ...(status === 'resolved' ? { last_error: null } : {}),
  };
  const { error } = await database
    .from('catalog_queue')
    .update(update)
    .eq('search_key', normalizeSpotifyArtistName(name));
  if (error) throw new Error('Could not update the artist catalog queue.');

  if (status !== 'resolved' || !options.artistId) return;
  const { data: queueRows, error: queueError } = await database
    .from('catalog_queue')
    .select('genre_slug,role,position,why,note')
    .eq('search_key', normalizeSpotifyArtistName(name))
    .eq('status', 'resolved');
  if (queueError) throw new Error('Could not load resolved genre entries.');

  for (const row of queueRows ?? []) {
    if (
      typeof row.genre_slug !== 'string' ||
      typeof row.position !== 'number' ||
      (row.role !== 'pillar' && row.role !== 'example')
    ) {
      continue;
    }
    const table = row.role === 'pillar' ? 'genre_pillars' : 'genre_examples';
    const values = {
      genre_slug: row.genre_slug,
      position: row.position,
      artist_id: options.artistId,
      ...(row.role === 'pillar'
        ? { why: typeof row.why === 'string' ? row.why : name }
        : { note: typeof row.note === 'string' ? row.note : null }),
    };
    const { error: syncError } = await database
      .from(table)
      .upsert(values, { onConflict: 'genre_slug,position' });
    if (syncError) throw new Error('Could not sync resolved genre entries.');
  }
}

export async function incrementCatalogAttempts(
  database: SupabaseDatabase,
  queue: CatalogQueueRow,
  message: string,
): Promise<'pending' | 'not_found'> {
  const attempts = queue.attempts + 1;
  const status = catalogStatusAfterAttempt(attempts);
  await setCatalogQueueResult(database, queue.name, status, {
    attempts,
    error: message,
  });
  return status;
}

export function requestArtistEnrichment(
  database: SupabaseDatabase,
  serviceRoleKey: string,
  artist: CatalogArtist,
) {
  if (artist.enrichment_status === 'done') return;
  const internalSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET');
  if (!internalSecret) {
    console.warn(
      JSON.stringify({ event: 'catalog_enrichment_not_configured' }),
    );
    return;
  }
  const task = database.functions
    .invoke('enrich-artist', {
      body: { artistId: artist.id },
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'x-internal-secret': internalSecret,
      },
    })
    .then(({ error }) => {
      if (error) {
        console.warn(
          JSON.stringify({ event: 'catalog_enrichment_invoke_failed' }),
        );
      }
    });
  const runtime = (
    globalThis as typeof globalThis & {
      EdgeRuntime?: { waitUntil(promise: Promise<unknown>): void };
    }
  ).EdgeRuntime;
  if (runtime) runtime.waitUntil(task);
  else void task;
}

export async function resolveCatalogArtist(
  database: SupabaseDatabase,
  name: string,
  options: {
    queue?: CatalogQueueRow | null;
    userId?: string;
    serviceRoleKey: string;
  },
): Promise<
  | { status: 'resolved'; artist: CatalogArtist; cacheHit: boolean }
  | { status: 'not_found'; attempts: number }
  | { status: 'pending' }
> {
  const existing = await findExistingCatalogArtist(database, name);
  if (existing) {
    await setCatalogQueueResult(database, name, 'resolved', {
      artistId: existing.id,
      attempts: 0,
    });
    return { status: 'resolved', artist: existing, cacheHit: true };
  }

  if (options.queue?.status === 'not_found' && options.queue.attempts >= 2) {
    return { status: 'not_found', attempts: options.queue.attempts };
  }

  const { results, cacheHit } = await searchSpotifyArtistCatalog(
    database,
    name,
    options.userId
      ? async () => {
          const { data: permitted, error } = await database.rpc(
            'consume_catalog_resolution_limit',
            { p_user_id: options.userId, p_limit: 10 },
          );
          if (error) {
            throw new Error('Could not check the catalog request limit.');
          }
          if (permitted !== true) throw new CatalogUserRateLimitError();
        }
      : undefined,
  );
  const match = findExactSpotifyArtist(
    name,
    results,
    options.queue?.aliases ?? [],
  );
  if (!match) {
    if (!options.queue) return { status: 'not_found', attempts: 1 };
    const status = await incrementCatalogAttempts(
      database,
      options.queue,
      'No exact Spotify artist match was found.',
    );
    return {
      status,
      attempts: Math.min(options.queue.attempts + 1, 2),
    };
  }

  const { data: existingSpotifyArtist, error: existingSpotifyError } =
    await database
      .from('artists')
      .select('id')
      .eq('spotify_id', match.spotifyId)
      .maybeSingle();
  if (existingSpotifyError) {
    throw new Error('Could not check the Spotify artist record.');
  }
  const { data: artist, error: upsertError } = await database
    .from('artists')
    .upsert(
      {
        spotify_id: match.spotifyId,
        name: match.name,
        image_url_large: match.imageLarge,
        image_url_thumb: match.imageThumb,
        popularity: match.popularity,
        source: 'spotify',
        created_by: null,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'spotify_id' },
    )
    .select(
      'id,name,spotify_id,image_url_large,image_url_thumb,popularity,enrichment_status,enriched_at',
    )
    .single();
  if (upsertError || !artist) {
    throw new Error('Could not save the Spotify artist.');
  }
  await setCatalogQueueResult(database, name, 'resolved', {
    artistId: artist.id,
    attempts: 0,
  });
  if (!existingSpotifyArtist) {
    requestArtistEnrichment(database, options.serviceRoleKey, artist);
  }
  return { status: 'resolved', artist, cacheHit };
}

export type {
  CatalogArtist,
  CatalogQueueRow,
  SpotifySearchArtist,
  SupabaseDatabase,
};

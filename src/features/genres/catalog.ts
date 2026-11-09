import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export type CatalogResolutionResult =
  | { status: 'resolved'; artistId: string; cacheHit: boolean }
  | { status: 'not_found'; attempts: number }
  | { status: 'pending' };

export class CatalogResolutionError extends Error {
  constructor(
    readonly code: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(code);
  }
}

async function functionErrorCode(error: unknown): Promise<{
  code: string;
  retryAfterSeconds?: number;
}> {
  if (
    typeof error === 'object' &&
    error !== null &&
    'context' in error &&
    error.context instanceof Response
  ) {
    try {
      const body: unknown = await error.context.clone().json();
      if (typeof body === 'object' && body !== null && 'code' in body) {
        const retryAfterSeconds =
          'retryAfterSeconds' in body &&
          typeof body.retryAfterSeconds === 'number'
            ? body.retryAfterSeconds
            : undefined;
        return {
          code: typeof body.code === 'string' ? body.code : 'CATALOG_FAILED',
          ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
        };
      }
    } catch {
      return { code: 'CATALOG_OFFLINE' };
    }
  }
  return { code: 'CATALOG_OFFLINE' };
}

export async function resolveGenreArtist(input: {
  queueId: string | null;
  name: string;
  genreSlug: string;
}): Promise<CatalogResolutionResult> {
  const { data, error } = await supabase.functions.invoke(
    'resolve-artist',
    { body: input },
  );
  if (error) {
    const detail = await functionErrorCode(error);
    throw new CatalogResolutionError(
      detail.code,
      detail.retryAfterSeconds,
    );
  }
  if (!data || typeof data !== 'object' || !('status' in data)) {
    throw new CatalogResolutionError('CATALOG_INVALID_RESPONSE');
  }
  if (
    data.status === 'resolved' &&
    'artistId' in data &&
    typeof data.artistId === 'string'
  ) {
    return {
      status: 'resolved',
      artistId: data.artistId,
      cacheHit: data.cacheHit === true,
    };
  }
  if (data.status === 'not_found') {
    return {
      status: 'not_found',
      attempts:
        'attempts' in data && typeof data.attempts === 'number'
          ? data.attempts
          : 1,
    };
  }
  if (data.status === 'pending') return { status: 'pending' };
  throw new CatalogResolutionError('CATALOG_INVALID_RESPONSE');
}

export async function reportGenreArtist(queueId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('resolve-artist', {
    body: { queueId, report: true },
  });
  if (error) {
    const detail = await functionErrorCode(error);
    throw new CatalogResolutionError(detail.code);
  }
  if (!data || typeof data !== 'object' || !('reported' in data) || data.reported !== true) {
    throw new CatalogResolutionError('CATALOG_INVALID_RESPONSE');
  }
}

export type GenreCatalogEntry = {
  slug: string;
  label: string;
  parent_slug: string | null;
  level: 1 | 2 | 3;
  aliases: string[];
  wikipedia_title: string | null;
  lastfm_tag: string | null;
  origin_years: string | null;
  has_editorial: boolean;
  artist_count: number;
  viewer_seen_count: number;
};

export const genreCatalogKey = ['genre-catalog'] as const;

export async function fetchGenreCatalog(): Promise<GenreCatalogEntry[]> {
  const { data, error } = await supabase.rpc('get_genre_catalog');
  if (error) throw new Error(error.message);
  return (data ?? []).map((entry) => {
    if (entry.level !== 1 && entry.level !== 2 && entry.level !== 3) {
      throw new Error(`Unknown genre level: ${entry.level}`);
    }
    return {
      ...entry,
      level: entry.level,
      aliases: entry.aliases ?? [],
      artist_count: Number(entry.artist_count),
      viewer_seen_count: Number(entry.viewer_seen_count),
    };
  });
}

export function useGenreCatalog(enabled = true) {
  return useQuery({
    queryKey: genreCatalogKey,
    queryFn: fetchGenreCatalog,
    enabled,
    staleTime: 6 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
  });
}

export function normalizeGenreLookup(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findGenreCatalogEntry(
  catalog: GenreCatalogEntry[],
  value: string,
): GenreCatalogEntry | null {
  const normalized = normalizeGenreLookup(value);
  return (
    catalog.find(
      (entry) =>
        normalizeGenreLookup(entry.slug) === normalized ||
        normalizeGenreLookup(entry.label) === normalized ||
        entry.aliases.some(
          (alias) => normalizeGenreLookup(alias) === normalized,
        ),
    ) ?? null
  );
}

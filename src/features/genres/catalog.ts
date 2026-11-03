import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

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

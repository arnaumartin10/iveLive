import { supabase } from '../../lib/supabase';
import type { MusicIdentityData } from './types';

// ---------------------------------------------------------------------------
// Raw shape returned by the user_music_identity RPC (JSONB object from SQL)
// ---------------------------------------------------------------------------
type RawRpcResponse = {
  shows?: number;
  unique_artists?: number;
  repeat_artist_ratio?: number;
  diversity_score?: number;
  venue_distribution?: Record<string, { count: number; share: number }>;
  // SQL uses 'macro_genre_distribution' key
  macro_genre_distribution?: Record<string, { count: number; share: number }>;
  genre_distribution?: Record<string, { count: number; share: number }>;
  // SQL returns era_distribution as a keyed object { "70s": {count, share}, ... }
  era_distribution?: Record<string, { count: number; share: number }>;
  era_coverage?: { known_artists: number; total_artists: number; percentage: number };
  musical_age?: number | null;
  weighted_median_begin_year?: number | null;
  share_of_new_artists?: number;
  average_rating_by_venue?: Record<string, number>;
  // SQL uses 'year', type uses 'begin_year'
  oldest_artist?: { name: string; begin_year?: number; year?: number } | null;
  newest_artist?: { name: string; begin_year?: number; year?: number } | null;
};

/**
 * Normalise the raw JSONB object from user_music_identity into the
 * MusicIdentityData shape expected by the client logic.
 */
function normalizeResponse(raw: RawRpcResponse): MusicIdentityData {
  // era_distribution: JSONB object → EraDecade array
  const eraObj = raw.era_distribution ?? {};
  const eraDistribution: MusicIdentityData['era_distribution'] = Object.entries(eraObj).map(
    ([bucket, entry]) => ({
      bucket: bucket as MusicIdentityData['era_distribution'][number]['bucket'],
      decade: null,
      count: entry.count ?? 0,
      share: Number(entry.share ?? 0),
    }),
  );

  // Derive era_coverage from the distribution if the RPC didn't return it
  const knownEraCount = eraDistribution
    .filter((e) => e.bucket !== 'unknown')
    .reduce((sum, e) => sum + e.count, 0);
  const totalEraCount = eraDistribution.reduce((sum, e) => sum + e.count, 0);
  const eraCoverage = raw.era_coverage ?? {
    known_artists: knownEraCount,
    total_artists: totalEraCount,
    percentage:
      totalEraCount > 0 ? Math.round((knownEraCount / totalEraCount) * 100) : 0,
  };

  // genre_distribution: SQL may return it as macro_genre_distribution
  const genreRaw =
    raw.genre_distribution ?? raw.macro_genre_distribution ?? {};
  const genreDistribution: Record<string, { count: number; share: number }> = {};
  for (const [key, val] of Object.entries(genreRaw)) {
    genreDistribution[key] = { count: val.count ?? 0, share: Number(val.share ?? 0) };
  }

  // venue_distribution: normalise share values (SQL returns numeric)
  const venueDistribution: MusicIdentityData['venue_distribution'] = {};
  for (const [key, val] of Object.entries(raw.venue_distribution ?? {})) {
    (venueDistribution as Record<string, { count: number; share: number }>)[key] = {
      count: val.count ?? 0,
      share: Number(val.share ?? 0),
    };
  }

  // Artist refs: SQL uses 'year', type uses 'begin_year'
  const normalizeArtistRef = (
    ref: RawRpcResponse['oldest_artist'],
  ): { name: string; begin_year: number } | null => {
    if (!ref) return null;
    return { name: ref.name, begin_year: ref.begin_year ?? ref.year ?? 0 };
  };

  return {
    shows: raw.shows ?? 0,
    unique_artists: raw.unique_artists ?? 0,
    repeat_artist_ratio: Number(raw.repeat_artist_ratio ?? 0),
    diversity_score: Number(raw.diversity_score ?? 0),
    venue_distribution: venueDistribution,
    genre_distribution: genreDistribution,
    era_distribution: eraDistribution,
    era_coverage: eraCoverage,
    musical_age: raw.musical_age ?? null,
    weighted_median_begin_year: raw.weighted_median_begin_year ?? null,
    oldest_artist: normalizeArtistRef(raw.oldest_artist),
    newest_artist: normalizeArtistRef(raw.newest_artist),
    share_of_new_artists: Number(raw.share_of_new_artists ?? 0),
    average_rating_by_venue: raw.average_rating_by_venue ?? {},
  };
}

export async function fetchMusicIdentity(
  userId: string,
  year?: number | null,
): Promise<MusicIdentityData> {
  const { data, error } = await supabase.rpc('user_music_identity', {
    p_user: userId,
    p_year: year ?? null,
  });
  if (error) throw new Error(error.message);
  return normalizeResponse((data ?? {}) as RawRpcResponse);
}

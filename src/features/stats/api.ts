import { supabase } from '@lib/supabase';
import type { VenueType } from '../venues/venueTypes';
import type {
  DiversityStats,
  VenueDeepStats,
  VenueMapPoint,
  ExclusiveArtist,
  GenreStat,
  HeatmapDay,
  LeaderboardRow,
  StatsOverview,
  StatsScope,
  StatsArtist,
  VenueStat,
} from './types';

export async function fetchStatsOverview(userId: string, year: StatsScope) {
  const { data, error } = await supabase.rpc('user_stats_overview', {
    p_user: userId,
    p_year: year ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as unknown as StatsOverview;
}

export async function fetchGenreStats(userId: string, year: StatsScope) {
  const { data, error } = await supabase.rpc('user_genre_stats', {
    p_user: userId,
    p_year: year ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as GenreStat[];
}

export type SubgenreStat = {
  sub_genre: string;
  parent_macro: string;
  log_count: number;
  artist_count: number;
  avg_rating: number | null;
};

export async function fetchSubgenreStats(userId: string, year: StatsScope) {
  const { data, error } = await supabase.rpc('user_subgenre_stats', {
    p_user: userId,
    p_year: year ?? undefined,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    avg_rating: row.avg_rating == null ? null : Number(row.avg_rating),
    log_count: Number(row.log_count),
    artist_count: Number(row.artist_count),
  })) as SubgenreStat[];
}

export async function fetchVenueStats(userId: string, year: StatsScope) {
  const { data, error } = await supabase.rpc('user_venue_stats', {
    p_user: userId,
    p_year: year ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as VenueStat[];
}

export async function fetchVenueDeepStats(
  userId: string,
): Promise<VenueDeepStats> {
  const { data, error } = await supabase.rpc('user_venue_deep_stats', {
    p_user: userId,
  });
  if (error) throw new Error(error.message);
  return data as unknown as VenueDeepStats;
}

export async function fetchVenueMapPoints(
  userId: string,
): Promise<VenueMapPoint[]> {
  const { data, error } = await supabase.rpc('user_venue_map_points', {
    p_user: userId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((point) => ({
    ...point,
    lat: Number(point.lat),
    lng: Number(point.lng),
    log_count: Number(point.log_count),
  })) as VenueMapPoint[];
}

export async function fetchExclusiveArtists(
  userId: string,
  type: VenueType,
  year: StatsScope,
) {
  const { data, error } = await supabase.rpc(
    'artists_exclusive_to_venue_type',
    {
      p_user: userId,
      p_type: type,
      p_year: year ?? undefined,
    },
  );
  if (error) throw new Error(error.message);
  return data as ExclusiveArtist[];
}

export async function fetchHeatmap(userId: string, year: StatsScope) {
  const { data, error } = await supabase.rpc('user_calendar_heatmap', {
    p_user: userId,
    p_year: year ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as unknown as HeatmapDay[];
}

export async function fetchDiversity(userId: string, year: StatsScope) {
  const { data, error } = await supabase.rpc('user_taste_diversity', {
    p_user: userId,
    p_year: year ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as unknown as DiversityStats;
}

export async function fetchLeaderboard(year: StatsScope) {
  const { data, error } = await supabase.rpc('friends_leaderboard', {
    p_year: year ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as LeaderboardRow[];
}

export async function fetchArtistsByGenre(
  userId: string,
  genre: string,
  year: StatsScope,
) {
  const { data, error } = await supabase.rpc('user_artists_by_genre', {
    p_user: userId,
    p_genre: genre,
    p_year: year ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as StatsArtist[];
}

export async function fetchArtistsByVenue(
  userId: string,
  venue: VenueType,
  year: StatsScope,
) {
  const { data, error } = await supabase.rpc('user_artists_by_venue_type', {
    p_user: userId,
    p_type: venue,
    p_year: year ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as StatsArtist[];
}

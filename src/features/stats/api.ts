import { supabase } from '@lib/supabase';
import type { VenueType } from '../venues/venueTypes';
import type {
  DiversityStats,
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
    p_year: year,
  });
  if (error) throw new Error(error.message);
  return data as unknown as StatsOverview;
}

export async function fetchGenreStats(userId: string, year: StatsScope) {
  const { data, error } = await supabase.rpc('user_genre_stats', {
    p_user: userId,
    p_year: year,
  });
  if (error) throw new Error(error.message);
  return data as GenreStat[];
}

export async function fetchVenueStats(userId: string, year: StatsScope) {
  const { data, error } = await supabase.rpc('user_venue_stats', {
    p_user: userId,
    p_year: year,
  });
  if (error) throw new Error(error.message);
  return data as VenueStat[];
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
      p_year: year,
    },
  );
  if (error) throw new Error(error.message);
  return data as ExclusiveArtist[];
}

export async function fetchHeatmap(userId: string, year: StatsScope) {
  const { data, error } = await supabase.rpc('user_calendar_heatmap', {
    p_user: userId,
    p_year: year,
  });
  if (error) throw new Error(error.message);
  return data as unknown as HeatmapDay[];
}

export async function fetchDiversity(userId: string, year: StatsScope) {
  const { data, error } = await supabase.rpc('user_taste_diversity', {
    p_user: userId,
    p_year: year,
  });
  if (error) throw new Error(error.message);
  return data as unknown as DiversityStats;
}

export async function fetchLeaderboard(year: StatsScope) {
  const { data, error } = await supabase.rpc('friends_leaderboard', {
    p_year: year,
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
    p_year: year,
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
    p_year: year,
  });
  if (error) throw new Error(error.message);
  return data as StatsArtist[];
}

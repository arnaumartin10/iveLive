import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store';
import type { VenueType } from '../venues/venueTypes';
import {
  fetchDiversity,
  fetchArtistsByGenre,
  fetchArtistsByVenue,
  fetchExclusiveArtists,
  fetchGenreStats,
  fetchHeatmap,
  fetchLeaderboard,
  fetchStatsOverview,
  fetchVenueStats,
} from './api';
import { useStatsScopeStore } from './store';
import type { StatsScope } from './types';

const STALE_TIME = 2 * 60 * 1000;

export const statsQueryKeys = {
  all: ['stats'] as const,
  overview: (userId: string, year: StatsScope) =>
    ['stats', 'overview', userId, year] as const,
  genres: (userId: string, year: StatsScope) =>
    ['stats', 'genres', userId, year] as const,
  venues: (userId: string, year: StatsScope) =>
    ['stats', 'venues', userId, year] as const,
  exclusiveArtists: (userId: string, type: VenueType, year: StatsScope) =>
    ['stats', 'exclusive-artists', userId, type, year] as const,
  heatmap: (userId: string, year: StatsScope) =>
    ['stats', 'heatmap', userId, year] as const,
  diversity: (userId: string, year: StatsScope) =>
    ['stats', 'diversity', userId, year] as const,
  artistsByGenre: (userId: string, genre: string, year: StatsScope) =>
    ['stats', 'artists-by-genre', userId, genre, year] as const,
  artistsByVenue: (userId: string, venue: VenueType, year: StatsScope) =>
    ['stats', 'artists-by-venue', userId, venue, year] as const,
  leaderboard: (year: StatsScope) => ['stats', 'leaderboard', year] as const,
};

function useStatsContext(userId?: string, yearOverride?: StatsScope) {
  const signedInUserId = useAuthStore((state) => state.user?.id ?? '');
  const selectedYear = useStatsScopeStore((state) => state.scope);
  const year = yearOverride === undefined ? selectedYear : yearOverride;
  return { userId: userId ?? signedInUserId, year };
}

export function useStatsOverview(userId?: string, year?: StatsScope) {
  const context = useStatsContext(userId, year);
  return useQuery({
    queryKey: statsQueryKeys.overview(context.userId, context.year),
    queryFn: () => fetchStatsOverview(context.userId, context.year),
    enabled: !!context.userId,
    staleTime: STALE_TIME,
  });
}

export function useGenreStats(userId?: string, year?: StatsScope) {
  const context = useStatsContext(userId, year);
  return useQuery({
    queryKey: statsQueryKeys.genres(context.userId, context.year),
    queryFn: () => fetchGenreStats(context.userId, context.year),
    enabled: !!context.userId,
    staleTime: STALE_TIME,
  });
}

export function useVenueStats(userId?: string, year?: StatsScope) {
  const context = useStatsContext(userId, year);
  return useQuery({
    queryKey: statsQueryKeys.venues(context.userId, context.year),
    queryFn: () => fetchVenueStats(context.userId, context.year),
    enabled: !!context.userId,
    staleTime: STALE_TIME,
  });
}

export function useExclusiveArtists(type: VenueType, userId?: string) {
  const context = useStatsContext(userId);
  return useQuery({
    queryKey: statsQueryKeys.exclusiveArtists(
      context.userId,
      type,
      context.year,
    ),
    queryFn: () => fetchExclusiveArtists(context.userId, type, context.year),
    enabled: !!context.userId,
    staleTime: STALE_TIME,
  });
}

export function useHeatmap(userId?: string) {
  const context = useStatsContext(userId);
  return useQuery({
    queryKey: statsQueryKeys.heatmap(context.userId, context.year),
    queryFn: () => fetchHeatmap(context.userId, context.year),
    enabled: !!context.userId,
    staleTime: STALE_TIME,
  });
}

export function useDiversity(userId?: string, year?: StatsScope) {
  const context = useStatsContext(userId, year);
  return useQuery({
    queryKey: statsQueryKeys.diversity(context.userId, context.year),
    queryFn: () => fetchDiversity(context.userId, context.year),
    enabled: !!context.userId,
    staleTime: STALE_TIME,
  });
}

export function useArtistsByGenre(genre: string | null, userId?: string) {
  const context = useStatsContext(userId);
  return useQuery({
    queryKey: statsQueryKeys.artistsByGenre(
      context.userId,
      genre ?? '',
      context.year,
    ),
    queryFn: () =>
      fetchArtistsByGenre(context.userId, genre ?? '', context.year),
    enabled: !!context.userId && !!genre,
    staleTime: STALE_TIME,
  });
}

export function useArtistsByVenue(venue: VenueType, userId?: string) {
  const context = useStatsContext(userId);
  return useQuery({
    queryKey: statsQueryKeys.artistsByVenue(
      context.userId,
      venue,
      context.year,
    ),
    queryFn: () => fetchArtistsByVenue(context.userId, venue, context.year),
    enabled: !!context.userId,
    staleTime: STALE_TIME,
  });
}

export function useLeaderboard() {
  const year = useStatsScopeStore((state) => state.scope);
  return useQuery({
    queryKey: statsQueryKeys.leaderboard(year),
    queryFn: () => fetchLeaderboard(year),
    staleTime: STALE_TIME,
  });
}

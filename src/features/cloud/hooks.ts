import { useQuery } from '@tanstack/react-query';
import {
  fetchTerritoryDiscoveries,
  fetchUserCloudData,
  fetchUserTerritoryStats,
} from './api';

export function useUserCloudData(userId: string, year: number | null = null) {
  return useQuery({
    queryKey: ['cloud-data', userId, year],
    queryFn: () => fetchUserCloudData(userId, year),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export const cloudTerritoryStatsKey = (userId: string) =>
  ['cloud', 'territory-stats', userId] as const;

export const cloudTerritoryBeforeLogKey = (concertId: string) =>
  ['cloud', 'territory-stats-before-log', concertId] as const;

export function useUserTerritoryStats(userId: string) {
  return useQuery({
    queryKey: cloudTerritoryStatsKey(userId),
    queryFn: () => fetchUserTerritoryStats(userId),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useTerritoryDiscoveries(macroSlug: string | null) {
  return useQuery({
    queryKey: ['cloud', 'discoveries', macroSlug],
    queryFn: () => fetchTerritoryDiscoveries(macroSlug ?? ''),
    enabled: !!macroSlug,
    staleTime: 5 * 60_000,
  });
}

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store';
import type { VenueType } from '../venues/venueTypes';
import { searchOfficialConcerts } from './concertSearchApi';
import {
  fetchArtistRatingSummary,
  fetchArtistTourDates,
  fetchArtistsOnTour,
  fetchTopRatedArtists,
  fetchTrendingGlobal,
  fetchTrendingInApp,
} from './api';
import type { TourScope } from './types';

const STALE_TIME = 5 * 60 * 1000;
const TRENDING_REFRESH_INTERVAL = 6 * 60 * 60 * 1000;

export const homeKeys = {
  all: ['home'] as const,
  trendingGlobal: (region: string) =>
    ['home', 'trending-global', region] as const,
  trendingInApp: (days: number) => ['home', 'trending-in-app', days] as const,
  tour: (
    scope: TourScope,
    country: string | null,
    latitude: number | null,
    longitude: number | null,
    radiusKm: number | null,
  ) => ['home', 'tour', scope, country, latitude, longitude, radiusKm] as const,
  topRated: (
    venueType: VenueType | null,
    macroGenre: string | null,
    year: number | null,
  ) => ['home', 'top-rated', venueType, macroGenre, year] as const,
  artistRating: (artistId: string) =>
    ['home', 'artist-rating', artistId] as const,
  artistTourDates: (artistId: string) =>
    ['home', 'artist-tour-dates', artistId] as const,
  concertSearch: (query: string) =>
    ['home', 'official-concert-search', query] as const,
};

export function useTrendingGlobal(region = 'global', enabled = true) {
  return useQuery({
    queryKey: homeKeys.trendingGlobal(region),
    queryFn: () => fetchTrendingGlobal(region),
    enabled,
    staleTime: STALE_TIME,
    refetchInterval: TRENDING_REFRESH_INTERVAL,
    refetchOnWindowFocus: true,
  });
}

export function useTrendingInApp(days = 30) {
  return useQuery({
    queryKey: homeKeys.trendingInApp(days),
    queryFn: () => fetchTrendingInApp(days),
    staleTime: STALE_TIME,
  });
}

export function useArtistsOnTour(
  scope: TourScope,
  country: string | null,
  latitude: number | null,
  longitude: number | null,
  radiusKm: number | null,
  enabled = true,
) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: homeKeys.tour(scope, country, latitude, longitude, radiusKm),
    queryFn: () =>
      fetchArtistsOnTour(scope, country, latitude, longitude, radiusKm),
    enabled: enabled && (scope !== 'mine' || !!userId),
    staleTime: STALE_TIME,
  });
}

export function useTopRated(
  venueType: VenueType | null,
  macroGenre: string | null,
  year: number | null,
) {
  return useQuery({
    queryKey: homeKeys.topRated(venueType, macroGenre, year),
    queryFn: () => fetchTopRatedArtists(venueType, macroGenre, year),
    staleTime: STALE_TIME,
  });
}

export function useArtistRatingSummary(artistId: string) {
  return useQuery({
    queryKey: homeKeys.artistRating(artistId),
    queryFn: () => fetchArtistRatingSummary(artistId),
    enabled: !!artistId,
    staleTime: STALE_TIME,
  });
}

export function useArtistTourDates(artistId: string) {
  return useQuery({
    queryKey: homeKeys.artistTourDates(artistId),
    queryFn: () => fetchArtistTourDates(artistId),
    enabled: !!artistId,
    staleTime: STALE_TIME,
  });
}

export function useConcertSearch(input: {
  artistId: string | null;
  artistName: string | null;
  countryCode: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  isValid: boolean;
}) {
  const [debouncedInput, setDebouncedInput] = useState(input);
  const { artistId, artistName, countryCode, dateFrom, dateTo, isValid } =
    input;

  useEffect(() => {
    const timeout = setTimeout(
      () =>
        setDebouncedInput({
          artistId,
          artistName,
          countryCode,
          dateFrom,
          dateTo,
          isValid,
        }),
      300,
    );
    return () => clearTimeout(timeout);
  }, [artistId, artistName, countryCode, dateFrom, dateTo, isValid]);

  const search = useQuery({
    queryKey: homeKeys.concertSearch(JSON.stringify(debouncedInput)),
    queryFn: () =>
      searchOfficialConcerts({
        artistId: debouncedInput.artistId!,
        artistName: debouncedInput.artistName!,
        countryCode: debouncedInput.countryCode,
        dateFrom: debouncedInput.dateFrom,
        dateTo: debouncedInput.dateTo,
      }),
    enabled:
      !!debouncedInput.artistId &&
      !!debouncedInput.artistName &&
      debouncedInput.isValid,
    staleTime: 30_000,
    retry: 1,
  });
  return {
    ...search,
    isDebouncing:
      input.artistId !== debouncedInput.artistId ||
      input.artistName !== debouncedInput.artistName ||
      input.countryCode !== debouncedInput.countryCode ||
      input.dateFrom !== debouncedInput.dateFrom ||
      input.dateTo !== debouncedInput.dateTo ||
      input.isValid !== debouncedInput.isValid,
  };
}

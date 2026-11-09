import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchVenues } from './api';
import type { VenueType } from './venueTypes';

export function useVenueSearch(query: string, venueType: VenueType | null) {
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return useQuery({
    queryKey: ['venues', 'search', debouncedQuery, venueType],
    queryFn: () => searchVenues(debouncedQuery, venueType),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

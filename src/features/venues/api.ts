import { supabase } from '@lib/supabase';
import type { VenueSearchResult } from './types';
import { VENUE_TYPES, type VenueType } from './venueTypes';

export interface VenueSearchResponse {
  results: VenueSearchResult[];
  externalDeferred: boolean;
  externalUnavailable: boolean;
}

function isVenueSearchResult(value: unknown): value is VenueSearchResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.id === 'string' &&
    typeof result.name === 'string' &&
    typeof result.venueType === 'string' &&
    Object.prototype.hasOwnProperty.call(VENUE_TYPES, result.venueType) &&
    (result.city === null || typeof result.city === 'string') &&
    (result.country === null || typeof result.country === 'string') &&
    (result.externalId === null || typeof result.externalId === 'string')
  );
}

export async function searchVenues(
  query: string,
  venueType: VenueType | null,
): Promise<VenueSearchResponse> {
  const { data, error } = await supabase.functions.invoke('venue-search', {
    body: { q: query, type: venueType, limit: 8 },
  });
  if (error) throw new Error(error.message);
  if (
    !data ||
    !Array.isArray(data.results) ||
    !data.results.every(isVenueSearchResult)
  ) {
    throw new Error('Venue search returned an invalid response.');
  }
  return {
    results: data.results,
    externalDeferred: data.externalDeferred === true,
    externalUnavailable: data.externalUnavailable === true,
  };
}

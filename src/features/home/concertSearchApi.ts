import { supabase } from '../../lib/supabase';
import type { OfficialConcertSearchResult } from './concertSearch';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isConcertResult(value: unknown): value is OfficialConcertSearchResult {
  if (!isRecord(value)) return false;
  return (
    typeof value.eventId === 'string' &&
    typeof value.eventName === 'string' &&
    typeof value.artistName === 'string' &&
    typeof value.artistId === 'string' &&
    Array.isArray(value.lineup) &&
    value.lineup.every((name) => typeof name === 'string') &&
    typeof value.eventDate === 'string' &&
    (value.venueName === null || typeof value.venueName === 'string') &&
    (value.city === null || typeof value.city === 'string') &&
    (value.country === null || typeof value.country === 'string') &&
    (value.ticketUrl === null || typeof value.ticketUrl === 'string')
  );
}

export async function searchOfficialConcerts(input: {
  artistId: string;
  artistName: string;
  countryCode: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}): Promise<OfficialConcertSearchResult[]> {
  const { data, error } = await supabase.functions.invoke('concert-search', {
    body: { ...input, limit: 20 },
  });
  if (error) throw new Error(error.message);
  if (!isRecord(data) || !Array.isArray(data.results)) {
    throw new Error('Concert search returned an invalid response.');
  }
  if (!data.results.every(isConcertResult)) {
    throw new Error('Concert search returned invalid event details.');
  }
  return data.results;
}

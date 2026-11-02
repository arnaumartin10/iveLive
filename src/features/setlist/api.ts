import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import type { ParsedSetlist } from './parse';

export type ConcertSetlist =
  Database['public']['Tables']['concert_setlists']['Row'];

export async function fetchConcertSetlist(
  logId: string,
): Promise<ConcertSetlist | null> {
  const { data, error } = await supabase
    .from('concert_setlists')
    .select('*')
    .eq('log_id', logId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function saveConcertSetlist(
  logId: string,
  userId: string,
  setlist: ParsedSetlist,
): Promise<void> {
  const { error } = await supabase.from('concert_setlists').upsert(
    {
      log_id: logId,
      user_id: userId,
      source: setlist.source,
      source_url: setlist.sourceUrl,
      setlistfm_id: setlist.setlistId,
      artist: setlist.artist,
      venue: setlist.venue,
      city: setlist.city,
      event_date: setlist.eventDate,
      event_year: setlist.eventYear,
      songs: setlist.songs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'log_id' },
  );
  if (error) throw new Error(error.message);
}

export async function fetchSetlistFmById(setlistId: string): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke('setlistfm-fetch', {
    body: { setlistId },
  });
  if (error) {
    throw new Error(await describeFunctionError(error));
  }
  if (!data || typeof data !== 'object' || !('setlist' in data)) {
    throw new Error('Setlist.fm lookup returned an unexpected response.');
  }
  return data.setlist;
}

async function describeFunctionError(error: Error): Promise<string> {
  const context = (error as Error & { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      const body: unknown = await context.clone().json();
      if (
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        typeof body.error === 'string'
      ) {
        return body.error;
      }
    } catch {
      // Fall back to the HTTP status when the function response is not JSON.
    }
    return `Setlist lookup failed (HTTP ${context.status}).`;
  }
  return error.message || 'Setlist.fm lookup could not be completed.';
}

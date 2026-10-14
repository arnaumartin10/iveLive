import { supabase } from '@lib/supabase';
import type { ConcertWithRelations, LogConcertFormData, UserStats } from './types';

// ─── Concerts ────────────────────────────────────────────────────────────────

/** Fetch all concerts for a user with joined artist + venue */
export async function fetchUserConcerts(userId: string): Promise<ConcertWithRelations[]> {
  const { data, error } = await supabase
    .from('concerts')
    .select(
      `
      *,
      artist:artists(*),
      venue:venues(*)
    `,
    )
    .eq('user_id', userId)
    .order('concert_date', { ascending: false });

  if (error) throw new Error(error.message);
  // Type assertion: Supabase returns `any` for joined shapes
  return (data as unknown as ConcertWithRelations[]) ?? [];
}

/** Fetch a single concert by ID */
export async function fetchConcertById(id: string): Promise<ConcertWithRelations> {
  const { data, error } = await supabase
    .from('concerts')
    .select(
      `
      *,
      artist:artists(*),
      venue:venues(*)
    `,
    )
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as ConcertWithRelations;
}

// ─── Upsert ──────────────────────────────────────────────────────────────────

/**
 * Log a new concert.
 * Upserts the artist and venue first, then inserts the concert row.
 */
export async function logConcert(
  userId: string,
  formData: LogConcertFormData,
): Promise<ConcertWithRelations> {
  // 1. Upsert artist
  const { data: artistData, error: artistError } = await supabase
    .from('artists')
    .upsert(
      {
        name: formData.artist_name,
        spotify_id: formData.spotify_artist_id ?? null,
      },
      { onConflict: 'spotify_id', ignoreDuplicates: false },
    )
    .select()
    .single();

  if (artistError) throw new Error(artistError.message);

  // 2. Upsert venue
  let venueId: string | null = null;
  if (formData.venue_name) {
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .upsert(
        {
          name: formData.venue_name,
          city: formData.venue_city,
          country: formData.venue_country,
        },
        { onConflict: 'name,city,country', ignoreDuplicates: false },
      )
      .select()
      .single();

    if (venueError) throw new Error(venueError.message);
    venueId = venueData.id as string;
  }

  // 3. Insert concert
  const { data: concertData, error: concertError } = await supabase
    .from('concerts')
    .insert({
      user_id: userId,
      artist_id: artistData.id as string,
      venue_id: venueId,
      concert_date: formData.concert_date,
      notes: formData.notes || null,
      rating: formData.rating ?? null,
    })
    .select(
      `
      *,
      artist:artists(*),
      venue:venues(*)
    `,
    )
    .single();

  if (concertError) throw new Error(concertError.message);
  return concertData as unknown as ConcertWithRelations;
}

/** Delete a concert by ID (RLS ensures ownership) */
export async function deleteConcert(id: string): Promise<void> {
  const { error } = await supabase.from('concerts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Stats ───────────────────────────────────────────────────────────────────

/** Fetch user stats from DB view or edge function */
export async function fetchUserStats(userId: string): Promise<UserStats> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as UserStats;
}

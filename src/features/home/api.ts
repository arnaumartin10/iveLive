import { supabase } from '../../lib/supabase';
import type { VenueType } from '../venues/venueTypes';
import type { ArtistRatingSummary, HomeArtist, TourScope } from './types';

function currentWeekStart() {
  const date = new Date();
  const weekday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekday);
  return date.toISOString().slice(0, 10);
}

export async function fetchTrendingGlobal(
  region: string,
): Promise<HomeArtist[]> {
  const periodStart = currentWeekStart();
  const { data, error } = await supabase
    .from('trending_global')
    .select('id, source, region, rank, artist_id, artist_name, fetched_at')
    .eq('source', 'lastfm')
    .eq('region', region)
    .eq('period_kind', 'weekly')
    .eq('period_start', periodStart)
    .order('rank', { ascending: true })
    .limit(30);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const artistIds = rows.flatMap((row) =>
    row.artist_id ? [row.artist_id] : [],
  );
  if (!artistIds.length) return [] as HomeArtist[];

  const { data: artists, error: artistsError } = await supabase
    .from('artists')
    .select(
      'id, name, image_url_large, image_url_thumb, primary_macro, macro_genres',
    )
    .in('id', artistIds);
  if (artistsError) throw new Error(artistsError.message);
  const byId = new Map((artists ?? []).map((artist) => [artist.id, artist]));

  return rows.flatMap<HomeArtist>((row) => {
    if (!row.artist_id) return [];
    const artist = byId.get(row.artist_id);
    if (!artist) return [];
    return [{ ...artist, rank: row.rank }];
  });
}

export async function fetchTrendingInApp(days = 30): Promise<HomeArtist[]> {
  const { data, error } = await supabase.rpc('trending_in_app', {
    p_days: days,
    p_limit: 20,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchArtistsOnTour(
  scope: TourScope,
  country: string | null,
  latitude: number | null,
  longitude: number | null,
  radiusKm: number | null,
): Promise<HomeArtist[]> {
  const { data, error } = await supabase.rpc('artists_on_tour', {
    p_scope: scope,
    p_country: radiusKm === null ? country : null,
    p_lat: latitude,
    p_lng: longitude,
    p_radius_km: radiusKm,
    p_limit: 100,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export const TOUR_WINDOW_DAYS = 14;
export const TOUR_HOME_LIMIT = 5;

export type UpcomingTourSelection = {
  artists: HomeArtist[];
  includesDatesBeyondWindow: boolean;
};

function sortUpcomingArtists(artists: HomeArtist[]): HomeArtist[] {
  return artists.sort((left, right) => {
    const byDate = left.next_date!.localeCompare(right.next_date!);
    if (byDate) return byDate;
    const leftDistance = left.distance_km ?? Number.POSITIVE_INFINITY;
    const rightDistance = right.distance_km ?? Number.POSITIVE_INFINITY;
    return leftDistance - rightDistance || left.name.localeCompare(right.name);
  });
}

export function selectUpcomingTourArtists(
  artists: HomeArtist[],
  now = new Date(),
): UpcomingTourSelection {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const lastDay = new Date(today);
  lastDay.setUTCDate(lastDay.getUTCDate() + TOUR_WINDOW_DAYS);
  const todayKey = today.toISOString().slice(0, 10);
  const lastDayKey = lastDay.toISOString().slice(0, 10);

  const futureArtists = sortUpcomingArtists(
    artists.filter(
      (artist) =>
        typeof artist.next_date === 'string' && artist.next_date >= todayKey,
    ),
  );
  const inWindow = futureArtists.filter(
    (artist) => artist.next_date! <= lastDayKey,
  );
  if (inWindow.length) {
    return {
      artists: inWindow.slice(0, TOUR_HOME_LIMIT),
      includesDatesBeyondWindow: false,
    };
  }
  return {
    artists: futureArtists.slice(0, TOUR_HOME_LIMIT),
    includesDatesBeyondWindow: futureArtists.length > 0,
  };
}

export async function fetchTopRatedArtists(
  venueType: VenueType | null,
  macroGenre: string | null,
  year: number | null,
): Promise<HomeArtist[]> {
  const { data, error } = await supabase.rpc('top_rated_artists', {
    p_venue_type: venueType,
    p_macro: macroGenre,
    p_year: year,
    p_min_raters: 3,
    p_limit: 20,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchArtistRatingSummary(
  artistId: string,
): Promise<ArtistRatingSummary | null> {
  const { data, error } = await supabase.rpc('artist_rating_summary', {
    p_artist: artistId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchArtistTourDates(artistId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('artist_tour_dates')
    .select(
      'id, event_name, venue_name, city, region, country, event_date, event_end_date, ticket_url, status',
    )
    .eq('artist_id', artistId)
    .gte('event_date', today)
    .neq('status', 'cancelled')
    .order('event_date', { ascending: true })
    .limit(8);
  if (error) throw new Error(error.message);
  return data ?? [];
}

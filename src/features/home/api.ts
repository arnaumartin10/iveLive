import { supabase } from '../../lib/supabase';
import type { VenueType } from '../venues/venueTypes';
import type { ArtistRatingSummary, HomeArtist, TourScope } from './types';

export async function fetchTrendingGlobal(
  region: string,
): Promise<HomeArtist[]> {
  const { data, error } = await supabase
    .from('trending_global')
    .select(
      'id, source, region, period_start, rank, artist_id, artist_name, fetched_at',
    )
    .eq('source', 'lastfm')
    .eq('region', region)
    .eq('period_kind', 'weekly')
    .order('period_start', { ascending: false })
    .order('rank', { ascending: true })
    .limit(30);
  if (error) throw new Error(error.message);

  const allRows = data ?? [];
  const latestPeriod = allRows[0]?.period_start;
  const rows = latestPeriod
    ? allRows.filter((row) => row.period_start === latestPeriod)
    : [];
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
    p_country: radiusKm === null ? (country ?? undefined) : undefined,
    p_lat: latitude ?? undefined,
    p_lng: longitude ?? undefined,
    p_radius_km: radiusKm ?? undefined,
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
    p_venue_type: venueType ?? undefined,
    p_macro: macroGenre ?? undefined,
    p_year: year ?? undefined,
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
  if (data === null) return null;
  return normalizeArtistRatingSummary(data);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function nullableNumber(value: unknown, field: string): number | null {
  if (value === null || isNumber(value)) return value;
  throw new Error(`The artist rating endpoint returned an invalid ${field}.`);
}

function normalizeArtistRatingSummary(value: unknown): ArtistRatingSummary {
  if (!isRecord(value)) {
    throw new Error('The artist rating endpoint returned an invalid response.');
  }
  const { histogram, venue_averages: venueAverages } = value;
  if (!Array.isArray(histogram) || !Array.isArray(venueAverages)) {
    throw new Error(
      'The artist rating endpoint returned invalid rating lists.',
    );
  }
  const normalizedHistogram = histogram.map((entry) => {
    if (!isRecord(entry) || !isNumber(entry.rating) || !isNumber(entry.count)) {
      throw new Error(
        'The artist rating endpoint returned an invalid histogram.',
      );
    }
    return { rating: entry.rating, count: entry.count };
  });
  const normalizedVenueAverages = venueAverages.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.venue_type !== 'string' ||
      !isNumber(entry.average) ||
      !isNumber(entry.count) ||
      !Object.hasOwn(VENUE_TYPE_KEYS, entry.venue_type)
    ) {
      throw new Error(
        'The artist rating endpoint returned invalid venue averages.',
      );
    }
    return {
      venue_type: entry.venue_type as VenueType,
      average: entry.average,
      count: entry.count,
    };
  });
  const ratingCount = value.rating_count;
  const raterCount = value.rater_count;
  const viewerCount = value.viewer_count;
  if (
    !isNumber(ratingCount) ||
    !isNumber(raterCount) ||
    !isNumber(viewerCount)
  ) {
    throw new Error(
      'The artist rating endpoint returned invalid rating counts.',
    );
  }
  return {
    avg_rating: nullableNumber(value.avg_rating, 'average rating'),
    weighted_rating: nullableNumber(value.weighted_rating, 'weighted rating'),
    rating_count: ratingCount,
    rater_count: raterCount,
    histogram: normalizedHistogram,
    venue_averages: normalizedVenueAverages,
    viewer_average: nullableNumber(value.viewer_average, 'viewer average'),
    viewer_count: viewerCount,
  };
}

const VENUE_TYPE_KEYS: Record<VenueType, true> = {
  festival: true,
  concert_hall_club: true,
  stadium: true,
  indoor_arena: true,
  festa_major: true,
  other: true,
};

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

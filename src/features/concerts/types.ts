import type { Database } from '../../lib/database.types';
import type { VenueType } from '../venues/venueTypes';
import type { SignedLogMedia } from '../media/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Artist = Database['public']['Tables']['artists']['Row'];
export type ConcertLog = Database['public']['Tables']['concert_logs']['Row'];
export type ConcertLogUpdate =
  Database['public']['Tables']['concert_logs']['Update'];
export type ConcertWithRelations = ConcertLog & {
  artist: Artist | null;
  media?: SignedLogMedia[];
};

type UserArtistSummaryRow =
  Database['public']['Functions']['user_artist_summary']['Returns'][number];
export type UserArtistSummary = Omit<
  UserArtistSummaryRow,
  | 'created_by'
  | 'avg_rating'
  | 'max_rating'
  | 'spotify_id'
  | 'name_normalized'
  | 'image_url_large'
  | 'image_url_thumb'
  | 'primary_macro'
  | 'popularity'
  | 'last_synced_at'
> & {
  created_by: string | null;
  avg_rating: number | null;
  max_rating: number | null;
  spotify_id: string | null;
  name_normalized: string | null;
  image_url_large: string | null;
  image_url_thumb: string | null;
  primary_macro: string | null;
  popularity: number | null;
  last_synced_at: string | null;
};
type UserGenreStatsRow =
  Database['public']['Functions']['user_genre_stats']['Returns'][number];
export type UserGenreStats = Omit<UserGenreStatsRow, 'avg_rating'> & {
  avg_rating: number | null;
  percentage?: number;
};
type UserVenueStatsRow =
  Database['public']['Functions']['user_venue_stats']['Returns'][number];
export type UserVenueStats = Omit<UserVenueStatsRow, 'avg_rating'> & {
  avg_rating: number | null;
  percentage?: number;
};

export interface LogConcertFormData {
  artist_id?: string;
  artist_name: string;
  spotify_artist_id: string | null;
  venue_type: VenueType;
  venue_name: string;
  concert_date: string;
  notes: string;
  rating: number | null;
}

export type TimelineOrder = 'newest' | 'oldest';

export interface TimelineFilters {
  venueTypes?: VenueType[];
  genres?: string[];
  minRating?: number | null;
  maxRating?: number | null;
  year?: number;
  eventDate?: string;
  onlyMedia?: boolean;
}

export interface FetchMyLogsParams {
  userId: string;
  order?: TimelineOrder;
  cursor?: { event_date: string; id: string } | null;
  limit?: number;
  filters?: TimelineFilters;
}

export interface UpdateConcertInput {
  id: string;
  formData: Partial<LogConcertFormData>;
}

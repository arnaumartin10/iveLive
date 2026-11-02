import type { Database } from '../../lib/database.types';
import type { VenueType } from '../venues/venueTypes';
import type { SignedLogMedia } from '../media/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Artist = Database['public']['Tables']['artists']['Row'];
export type ConcertLog = Database['public']['Tables']['concert_logs']['Row'];
export type ConcertLogUpdate = Database['public']['Tables']['concert_logs']['Update'];
export type ConcertWithRelations = ConcertLog & {
  artist: Artist | null;
  media?: SignedLogMedia[];
};

export type UserArtistSummary =
  Database['public']['Functions']['user_artist_summary']['Returns'][number];
export type UserGenreStats =
  Database['public']['Functions']['user_genre_stats']['Returns'][number] & {
    percentage?: number;
  };
export type UserVenueStats =
  Database['public']['Functions']['user_venue_stats']['Returns'][number] & {
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

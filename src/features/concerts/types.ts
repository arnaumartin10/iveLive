/**
 * Core domain types for IveLive.
 * These mirror the Supabase DB schema exactly.
 */

export interface Profile {
  id: string; // UUID, matches auth.users.id
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string; // ISO 8601
  updated_at: string;
}

export interface Artist {
  id: string; // UUID
  name: string;
  spotify_id: string | null;
  image_url: string | null;
  genres: string[];
  created_at: string;
}

export interface Venue {
  id: string; // UUID
  name: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface Concert {
  id: string; // UUID
  user_id: string; // FK -> profiles.id
  artist_id: string; // FK -> artists.id
  venue_id: string | null; // FK -> venues.id
  concert_date: string; // ISO 8601 date (YYYY-MM-DD)
  notes: string | null;
  setlist: string[] | null; // ordered song names
  rating: 1 | 2 | 3 | 4 | 5 | null;
  ticket_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined from related tables (view)
  artist?: Artist;
  venue?: Venue | null;
}

/** Concert with all relations eagerly loaded */
export interface ConcertWithRelations extends Concert {
  artist: Artist;
  venue: Venue | null;
}

/** Stats aggregates (computed view / edge function) */
export interface UserStats {
  total_concerts: number;
  unique_artists: number;
  unique_venues: number;
  unique_countries: number;
  top_artist: Artist | null;
  top_genre: string | null;
  first_concert_date: string | null;
  concerts_this_year: number;
}

/** Form data shapes — separate from DB types to allow partial/draft states */
export interface LogConcertFormData {
  artist_name: string;
  spotify_artist_id: string | null;
  venue_name: string;
  venue_city: string;
  venue_country: string;
  concert_date: string;
  notes: string;
  rating: number | null;
}

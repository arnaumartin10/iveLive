import type { VenueType } from '../venues/venueTypes';

export type HomeArtist = {
  id: string;
  name: string;
  image_url_large: string | null;
  image_url_thumb: string | null;
  primary_macro: string | null;
  macro_genres: string[];
  rank?: number;
  delta?: number;
  show_count?: number;
  rating_count?: number;
  rater_count?: number;
  avg_show_rating?: number | null;
  weighted_rating?: number | null;
  last_logged_at?: string | null;
  next_date?: string | null;
  dates_count?: number;
  nearest_venue?: string | null;
  nearest_city?: string | null;
  nearest_country?: string | null;
  ticket_url?: string | null;
  distance_km?: number | null;
  in_wishlist?: boolean;
};

export type TrendingGlobalRow = {
  id: string;
  source: string;
  region: string;
  rank: number;
  artist_id: string | null;
  artist_name: string;
  fetched_at: string;
};

export type ArtistRatingSummary = {
  avg_rating: number | null;
  weighted_rating: number | null;
  rating_count: number;
  rater_count: number;
  histogram: { rating: number; count: number }[];
  venue_averages: { venue_type: VenueType; average: number; count: number }[];
  viewer_average: number | null;
  viewer_count: number;
};

export type HomeTourDate = {
  id: string;
  event_name: string | null;
  venue_name: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  event_date: string;
  event_end_date: string | null;
  ticket_url: string | null;
  status: string;
};

export type TourScope = 'mine' | 'popular' | 'top_rated' | 'all';

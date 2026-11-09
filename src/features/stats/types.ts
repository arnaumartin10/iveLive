import type { VenueType } from '../venues/venueTypes';

export type StatsScope = number | null;

export type ArtistCount = {
  artist_id: string;
  artist: string;
  image_url?: string | null;
  count: number;
  avg_rating?: number | null;
  first_seen?: string | null;
  last_seen?: string | null;
};

export type CountBucket = { count: number };

export type StatsOverview = {
  total_shows: number;
  unique_artists: number;
  unique_venues: number;
  active_years: number;
  avg_rating: number | null;
  five_star_count: number;
  first_show: { date: string; artist: string } | null;
  latest_show: { date: string; artist: string } | null;
  most_seen_artist: {
    artist: string;
    image_url: string | null;
    count: number;
  } | null;
  top_artists_by_count: ArtistCount[];
  top_artists_by_rating: ArtistCount[];
  most_visited_venue: { name: string; count: number } | null;
  top_venues_by_name: { name: string; venue_type: VenueType; count: number }[];
  repeat_artists: number;
  one_time_artists: number;
  busiest_month: { month: number; count: number } | null;
  busiest_weekday: { weekday: number; count: number } | null;
  busiest_year: { year: number; count: number } | null;
  shows_by_month: { month: number; count: number }[];
  shows_by_weekday: { weekday: number; count: number }[];
  shows_by_year: { year: number; count: number }[];
  years: number[];
  longest_streak_weeks: number;
  longest_gap_days: number;
  most_shows_in_one_week: number;
  most_shows_in_one_day: number;
  rating_histogram: { rating: number; count: number }[];
  rating_by_venue_type: {
    venue_type: VenueType;
    avg_rating: number | null;
    rated_count: number;
  }[];
  best_rated_venue_type: { venue_type: VenueType; avg_rating: number } | null;
  best_rated_year: { year: number; avg_rating: number } | null;
};

export type GenreStat = {
  macro_genre: string;
  log_count: number;
  artist_count: number;
  avg_rating: number | null;
  top_artist: {
    id: string;
    name: string;
    image_url: string | null;
    count: number;
  } | null;
};

export type VenueStat = {
  venue_type: VenueType;
  log_count: number;
  artist_count: number;
  avg_rating: number | null;
  top_artist: {
    id: string;
    name: string;
    image_url: string | null;
    count: number;
  } | null;
};

export type DeepVenueStat = {
  venue_id: string | null;
  name: string;
  venue_type: VenueType;
  log_count: number;
  first_seen: string;
  last_seen: string;
  lat: number | null;
  lng: number | null;
  city: string | null;
  country: string | null;
};

export type VenueCityStat = {
  city: string;
  country: string | null;
  log_count: number;
  venue_count: number;
};

export type VenueCountryStat = {
  country: string;
  log_count: number;
  city_count: number;
};

export type VenueFestivalStats = {
  distinct_festivals: number;
  top_recurring_festival: {
    venue_id: string | null;
    name: string;
    log_count: number;
  } | null;
  avg_bands_per_festival_day: number | null;
  festival_logs: number;
  club_logs: number;
};

export type VenueDeepStats = {
  venues: DeepVenueStat[];
  cities: VenueCityStat[];
  countries: VenueCountryStat[];
  festivals: VenueFestivalStats;
};

export type VenueMapPoint = {
  lat: number;
  lng: number;
  venue_name: string;
  city: string | null;
  log_count: number;
};

export type ExclusiveArtist = {
  artist_id: string;
  name: string;
  image_url: string | null;
  times_seen: number;
};

export type StatsArtist = {
  artist_id: string;
  name: string;
  image_url: string | null;
  times_seen: number;
};

export type HeatmapDay = { date: string; count: number };
export type DiversityStats = {
  score: number;
  dominant_genre_share: number;
  dominant_genre: string | null;
};

export type LeaderboardRow = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  show_count: number;
  artist_count: number;
  avg_rating: number | null;
  rank: number;
};

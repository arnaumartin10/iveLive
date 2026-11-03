import type { VenueType } from '../venues/venueTypes';

export type CloudLogTuple = [
  date: string,
  venueType: VenueType,
  rating: number | null,
];

export type CloudArtistData = {
  id: string;
  name: string;
  image_url_thumb: string | null;
  image_url_large: string | null;
  primary_macro: string | null;
  macro_genres: string[];
  sub_genres?: string[];
  genres: string[];
  begin_year: number | null;
  log_count: number;
  avg_rating: number | null;
  max_rating: number | null;
  first_seen: string | null;
  last_seen: string | null;
  venue_type_counts: Partial<Record<VenueType, number>>;
  logs: CloudLogTuple[];
};

export type CloudCoattendanceLink = {
  source_id: string;
  target_id: string;
  weight: number;
  shared_dates: string[];
  venue_names: string[];
};

export type UserCloudData = {
  artists: CloudArtistData[];
  links: CloudCoattendanceLink[];
};

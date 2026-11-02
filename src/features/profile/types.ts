import type { VenueType } from '../venues/venueTypes';

export type ProfileBasics = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_image_url?: string | null;
  bio: string | null;
  is_private: boolean;
};

export type ProfilePick = {
  id: string;
  name: string;
  image_url: string | null;
  macro_genres: string[];
  primary_macro: string | null;
  position: number;
  updated_at: string;
};

export type ProfileLog = {
  id: string;
  artist_id: string;
  artist_name: string;
  image_url: string | null;
  event_date: string;
  venue_name: string | null;
  rating: number | null;
};

export type WishlistStatus = 'wanted' | 'going' | 'seen';

export type WishlistItem = {
  id: string;
  artist_id: string;
  artist_name: string;
  image_url: string | null;
  primary_macro: string | null;
  event_name: string | null;
  venue_name: string | null;
  city: string | null;
  target_date: string | null;
  date_flexible: boolean;
  venue_type: VenueType | null;
  priority: number;
  note: string | null;
  status: WishlistStatus;
  ticket_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileFriend = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type ProfileOverview = {
  restricted: boolean;
  profile: ProfileBasics;
  counts?: {
    shows: number;
    artists: number;
    followers: number;
    following: number;
  };
  top_genres?: {
    macro_genre: string;
    show_count: number;
    percentage: number;
  }[];
  last_logs?: ProfileLog[];
  five_star_count?: number;
  recent_picks?: ProfilePick[];
  favourite_picks?: ProfilePick[];
  wishlist?: { total: number; items: WishlistItem[] };
  wall_of_fame?: ProfileLog[];
  friends?: {
    followers: number;
    following: number;
    preview: ProfileFriend[];
  };
};

export type WishlistDraft = {
  artist_id: string;
  event_name: string;
  venue_name: string;
  city: string;
  target_date: string | null;
  date_flexible: boolean;
  venue_type: VenueType | null;
  priority: number;
  note: string;
  status: WishlistStatus;
  ticket_url: string | null;
};

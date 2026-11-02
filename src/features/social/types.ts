import type { VenueType } from '../venues/venueTypes';
import type { FeedMedia } from '../media/types';

export type FollowStatus = 'accepted' | 'pending' | null;

export type ProfileSearchResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  follower_count: number;
  is_following: boolean;
  follow_status: FollowStatus;
};

export type FollowListUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_following: boolean;
  follow_status: FollowStatus;
};

export type FeedItem = {
  id: string;
  user_id: string;
  artist_id: string;
  event_date: string;
  venue_type: VenueType;
  venue_name: string | null;
  rating: number | null;
  review: string | null;
  created_at: string;
  updated_at: string;
  artist: {
    id: string;
    name: string;
    image_url_large: string | null;
    image_url_thumb: string | null;
    group_image_url?: string | null;
    banner_image_url?: string | null;
    primary_macro: string | null;
    macro_genres: string[];
  };
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  media: FeedMedia[];
  media_count: number;
  setlist: FeedSetlist | null;
};

export type FeedSetlist = {
  source: string;
  source_url: string | null;
  artist: string | null;
  venue: string | null;
  city: string | null;
  event_date: string | null;
  event_year: number | null;
  songs: {
    title: string;
    setName: string | null;
    encore: boolean;
    medal?: 'gold' | 'silver' | 'bronze' | null;
  }[];
};

export type FollowRequest = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  requested_at: string;
};

export type Comment = {
  id: string;
  log_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
};

export type NotificationItem = {
  id: string;
  type:
    'new_follower' | 'like' | 'comment' | 'follow_request' | 'follow_accepted';
  read: boolean;
  created_at: string;
  actor_id: string;
  actor_username: string;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  log_id: string | null;
  comment_id: string | null;
};

export type CommonArtist = {
  artist_id: string;
  name: string;
  image_url: string | null;
  primary_macro: string | null;
  macro_genres: string[];
  times_seen_a: number;
  times_seen_b: number;
  shared_dates: string[];
  shared_venues: string[];
};

import type { Database } from '../../lib/database.types';

export type ArtistRow = Database['public']['Tables']['artists']['Row'];
export type ArtistAlbumRow =
  Database['public']['Tables']['artist_albums']['Row'];
export type ArtistWithAlbums = ArtistRow & { albums: ArtistAlbumRow[] };

export type UserArtistImageOverride = {
  artist_id: string;
  banner_image_url: string | null;
  profile_image_url: string | null;
  updated_at: string;
  user_id: string;
};

export type ArtistImageGalleryRow =
  Database['public']['Tables']['artist_image_gallery']['Row'];

export interface ArtistFriendLog {
  id: string;
  event_date: string;
  venue_type: string;
  venue_name: string | null;
  rating: number | null;
  review: string | null;
  media_count: number;
  has_setlist: boolean;
  top_song: string | null;
}

export interface ArtistFriend {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  logs_count: number;
  logs: ArtistFriendLog[];
}

export interface ArtistSearchResult {
  artistId: string | null;
  spotifyId: string | null;
  name: string;
  imageLarge: string | null;
  imageThumb: string | null;
  genres: string[];
  macroGenres: string[];
  popularity: number | null;
  source: 'manual' | 'spotify';
  existingArtistId: string | null;
  artist: ArtistRow | null;
}

export interface ArtistSearchResponse {
  results: ArtistSearchResult[];
  rateLimited: boolean;
  error?: string | null;
}

export interface SimilarArtistMatch {
  id: string;
  spotifyId?: string | null;
  name: string;
  source: 'manual' | 'spotify';
  imageUrlThumb: string | null;
  imageUrlLarge: string | null;
  genres: string[];
  macroGenres: string[];
  similarity: number;
}

export interface UploadArtistImagesResult {
  imageUrlLarge: string;
  imageUrlThumb: string;
}

export interface CreateManualArtistInput {
  name: string;
  genres: string[];
  photoUri?: string | null;
  beginYear?: number | null;
}

export interface UpdateManualArtistInput {
  id: string;
  name: string;
  genres: string[];
  photoUri?: string | null;
  keepExistingPhoto?: boolean;
  beginYear?: number | null;
}

export interface ArtistManagePermissions {
  isCreator: boolean;
  canEdit: boolean;
  canDelete: boolean;
  otherUserLogCount: number;
}

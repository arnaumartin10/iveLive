export type MediaSlot = 'concert_photo' | 'companions_photo' | 'concert_video';

export type LogMedia = {
  id: string;
  log_id: string;
  user_id: string;
  slot: MediaSlot;
  kind: 'image' | 'video';
  storage_path: string;
  thumb_path: string;
  poster_path: string | null;
  width: number;
  height: number;
  duration_ms: number | null;
  size_bytes: number;
  mime: string;
  caption: string | null;
  created_at: string;
};

export type SignedLogMedia = LogMedia & {
  thumb_url?: string;
  poster_url?: string | null;
};

export type FeedMedia = Pick<
  LogMedia,
  | 'slot'
  | 'kind'
  | 'thumb_path'
  | 'poster_path'
  | 'storage_path'
  | 'width'
  | 'height'
  | 'duration_ms'
  | 'caption'
> & {
  thumb_url?: string;
  poster_url?: string | null;
};

export type ProcessedKeepsake = {
  slot: MediaSlot;
  kind: 'image' | 'video';
  localPath: string;
  thumbLocalPath: string;
  posterLocalPath: string | null;
  width: number;
  height: number;
  durationMs: number | null;
  sizeBytes: number;
  mime: 'image/jpeg' | 'video/mp4' | 'video/quicktime';
  caption: string | null;
};

export type MediaQueueItem = ProcessedKeepsake & {
  id: string;
  logId: string;
  userId: string;
  createdAt: number;
  status: 'queued' | 'uploading' | 'failed';
  progress: number;
  attempts: number;
  error?: string;
};

export const MEDIA_BUCKET_LIMIT_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_DURATION_MS = 60_000;
export const THUMBNAIL_LIMIT_BYTES = 60 * 1024;

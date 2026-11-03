import * as Crypto from 'expo-crypto';
import { supabase } from '../../lib/supabase';
import { env } from '../../lib/env';
import { deleteLocalFile, getLocalBlob } from './localFiles';
import type { LogMedia, MediaQueueItem } from './types';
import { resolveSignedMediaUrls } from './signedUrls';
import { type SupportedVideoMime } from './inspection';
import {
  KeepsakeMediaError,
  keepsakeError,
  type KeepsakeFailureContext,
} from './errors';

export async function fetchLogMedia(logId: string): Promise<LogMedia[]> {
  const { data, error } = await supabase
    .from('log_media')
    .select('*')
    .eq('log_id', logId)
    .order('slot');
  if (error) throw new Error(error.message);
  return (data ?? []) as LogMedia[];
}

export async function signMediaRows<T extends LogMedia>(
  rows: T[],
): Promise<(T & { thumb_url: string; poster_url: string | null })[]> {
  const paths = rows.flatMap((row) => [
    row.thumb_path,
    ...(row.poster_path ? [row.poster_path] : []),
  ]);
  if (paths.length === 0) return [];
  const urls = await resolveSignedMediaUrls(paths);
  return rows.map((row) => {
    const thumbUrl = urls[row.thumb_path];
    if (!thumbUrl) throw new Error('Could not sign keepsake thumbnail.');
    let posterUrl: string | null = null;
    if (row.poster_path) {
      posterUrl = urls[row.poster_path] ?? null;
      if (!posterUrl) throw new Error('Could not sign keepsake poster.');
    }
    return { ...row, thumb_url: thumbUrl, poster_url: posterUrl };
  });
}

export async function uploadMediaItem(
  item: MediaQueueItem,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
): Promise<void> {
  const extension =
    item.kind === 'image'
      ? 'jpg'
      : extensionFromVideoMime(item.mime as SupportedVideoMime);
  const failureContext: KeepsakeFailureContext = {
    mimeType: item.mime,
    extension,
    sizeBytes: item.sizeBytes,
    width: item.width,
    height: item.height,
  };
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw keepsakeError(
      'upload',
      'Could not verify your account before uploading.',
      failureContext,
      userError,
    );
  }
  const user = userData.user;
  if (!user || user.id !== item.userId) {
    throw keepsakeError(
      'upload',
      'Sign in again to finish uploading this keepsake.',
      failureContext,
    );
  }

  const root = `${user.id}/${item.logId}`;
  const id = Crypto.randomUUID();
  const storagePath = `${root}/${item.slot}-${id}.${extension}`;
  const thumbPath = `${root}/${item.slot}-${id}-thumb.jpg`;
  const posterPath = item.posterLocalPath
    ? `${root}/${item.slot}-${id}-poster.jpg`
    : null;
  const newPaths = [
    storagePath,
    thumbPath,
    ...(posterPath ? [posterPath] : []),
  ];

  const { data: existing, error: existingError } = await supabase
    .from('log_media')
    .select('storage_path,thumb_path,poster_path')
    .eq('log_id', item.logId)
    .eq('slot', item.slot)
    .maybeSingle();
  if (existingError) {
    throw keepsakeError(
      'db-insert',
      'Could not check the existing keepsake. Try uploading again.',
      failureContext,
      existingError,
    );
  }

  try {
    await uploadWithCode(
      storagePath,
      item.localPath,
      item.mime,
      signal,
      (value) => onProgress(Math.round(value * 0.7)),
      failureContext,
    );
    await uploadWithCode(
      thumbPath,
      item.thumbLocalPath,
      'image/jpeg',
      signal,
      (value) => onProgress(70 + Math.round(value * 0.15)),
      { ...failureContext, mimeType: 'image/jpeg', extension: 'jpg' },
    );
    if (posterPath && item.posterLocalPath) {
      await uploadWithCode(
        posterPath,
        item.posterLocalPath,
        'image/jpeg',
        signal,
        (value) => onProgress(85 + Math.round(value * 0.15)),
        { ...failureContext, mimeType: 'image/jpeg', extension: 'jpg' },
      );
    } else {
      onProgress(100);
    }

    const { error: saveError } = await supabase.from('log_media').upsert(
      {
        log_id: item.logId,
        user_id: user.id,
        slot: item.slot,
        kind: item.kind,
        storage_path: storagePath,
        thumb_path: thumbPath,
        poster_path: posterPath,
        width: item.width,
        height: item.height,
        duration_ms: item.durationMs,
        size_bytes: item.sizeBytes,
        mime: item.mime,
        codec: item.codec,
        caption: item.caption,
      },
      { onConflict: 'log_id,slot' },
    );
    if (saveError) {
      throw keepsakeError(
        'db-insert',
        'The media uploaded, but its log entry could not be saved.',
        failureContext,
        saveError,
      );
    }
  } catch (error) {
    try {
      await removeStoragePaths(newPaths);
    } catch (cleanupError) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[keepsake-media] Partial upload cleanup failed.', {
          code: 'KEEPSAKE_UPLOAD_FAILED',
          step: 'upload',
          ...failureContext,
        });
      }
      if (!(error instanceof KeepsakeMediaError)) throw cleanupError;
    }
    if (error instanceof KeepsakeMediaError) throw error;
    throw keepsakeError(
      'upload',
      'Could not upload this keepsake. Check your connection and retry.',
      failureContext,
      error,
    );
  }

  async function uploadWithCode(
    path: string,
    localPath: string,
    mime: string,
    signal: AbortSignal,
    onProgress: (progress: number) => void,
    context: KeepsakeFailureContext,
  ): Promise<void> {
    try {
      await uploadObject(path, localPath, mime, signal, onProgress);
    } catch (error) {
      throw keepsakeError(
        'upload',
        error instanceof Error
          ? error.message
          : 'Could not upload this keepsake. Check your connection and retry.',
        context,
        error,
      );
    }
  }

  function extensionFromVideoMime(mime: SupportedVideoMime): string {
    switch (mime) {
      case 'video/quicktime':
        return 'mov';
      case 'video/x-m4v':
        return 'm4v';
      case 'video/webm':
        return 'webm';
      case 'video/3gpp':
        return '3gp';
      default:
        return 'mp4';
    }
  }

  if (existing) {
    await removeStoragePaths(
      [existing.storage_path, existing.thumb_path, existing.poster_path].filter(
        (path): path is string => path !== null,
      ),
    );
  }
  await deleteLocalFiles([
    item.localPath,
    item.thumbLocalPath,
    item.posterLocalPath,
  ]);
}

export async function removeLogMedia(media: LogMedia): Promise<void> {
  await removeStoragePaths(
    [media.storage_path, media.thumb_path, media.poster_path].filter(
      (path): path is string => path !== null,
    ),
  );
  const { error } = await supabase
    .from('log_media')
    .delete()
    .eq('id', media.id);
  if (error) throw new Error(error.message);
}

export async function updateMediaCaption(
  mediaId: string,
  caption: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('log_media')
    .update({ caption: caption?.trim().slice(0, 120) || null })
    .eq('id', mediaId);
  if (error) throw new Error(error.message);
}

export async function removeStoragePaths(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await supabase.storage.from('log-media').remove(paths);
  if (error) throw new Error(error.message);
}

export async function deleteLocalFiles(
  paths: (string | null)[],
): Promise<void> {
  for (const path of paths) {
    await deleteLocalFile(path);
  }
}

function uploadObject(
  path: string,
  localPath: string,
  mime: string,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    void Promise.all([getLocalBlob(localPath), supabase.auth.getSession()])
      .then(([file, { data, error }]) => {
        if (error) {
          reject(new Error(error.message));
          return;
        }
        const token = data.session?.access_token;
        if (!token) {
          reject(new Error('Sign in again to upload this keepsake.'));
          return;
        }

        const xhr = new XMLHttpRequest();
        const encodedPath = path.split('/').map(encodeURIComponent).join('/');
        xhr.open(
          'POST',
          `${env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/log-media/${encodedPath}`,
        );
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('apikey', env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Content-Type', mime);
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress(
              Math.min(100, Math.round((event.loaded / event.total) * 100)),
            );
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(readUploadError(xhr.responseText, xhr.status)));
        };
        xhr.onerror = () =>
          reject(new Error('Network trouble interrupted the upload.'));
        xhr.ontimeout = () =>
          reject(new Error('The upload timed out. Try again on Wi-Fi.'));
        xhr.onabort = () => reject(new Error('Upload canceled.'));
        const abort = () => xhr.abort();
        signal.addEventListener('abort', abort, { once: true });
        xhr.onloadend = () => signal.removeEventListener('abort', abort);
        xhr.timeout = 120_000;
        xhr.send(file);
      })
      .catch(reject);
  });
}

function readUploadError(responseText: string, status: number): string {
  try {
    const result = JSON.parse(responseText) as {
      message?: string;
      error?: string;
    };
    return result.message ?? result.error ?? `Upload failed (${status}).`;
  } catch {
    return `Upload failed (${status}).`;
  }
}

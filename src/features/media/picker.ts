import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createVideoPlayer } from 'expo-video';
import type { ProcessedKeepsake } from './types';
import { MEDIA_BUCKET_LIMIT_BYTES, THUMBNAIL_LIMIT_BYTES } from './types';
import { deleteLocalFile, localFileSize, persistWebBlob } from './localFiles';
import {
  copyToDocument,
  processPhoto,
  processVideoPoster,
  videoRejectionMessage,
} from './processing';

export async function pickKeepsakePhoto(
  slot: 'concert_photo' | 'companions_photo',
  source: 'library' | 'camera',
): Promise<ProcessedKeepsake | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      'A little help from your phone',
      source === 'camera'
        ? 'Allow camera access in Settings to take a keepsake.'
        : 'Allow photo access in Settings to choose a keepsake.',
    );
    return null;
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 1,
          allowsMultipleSelection: false,
        });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return processPhoto(asset.uri, asset.width, asset.height, slot);
}

export async function pickKeepsakeVideo(): Promise<ProcessedKeepsake | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      'A little help from your phone',
      'Allow photo library access in Settings to choose a concert reel.',
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    videoMaxDuration: 60,
    allowsMultipleSelection: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];

  const mime =
    asset.mimeType === 'video/quicktime' ||
    asset.uri.toLowerCase().endsWith('.mov')
      ? 'video/quicktime'
      : 'video/mp4';
  if (Platform.OS === 'web') {
    const source: Blob = asset.file
      ? asset.file
      : await (async () => {
          const response = await fetch(asset.uri);
          if (!response.ok) throw new Error('Could not read the selected video.');
          return response.blob();
        })();
    const sizeBytes = asset.fileSize ?? source.size;
    const sourceMime = source.type || asset.mimeType;
    if (!sourceMime) {
      throw new Error('Choose an MP4 or QuickTime video so this browser can verify its format.');
    }
    if (sourceMime && !['video/mp4', 'video/quicktime'].includes(sourceMime)) {
      throw new Error(
        'Choose an MP4 or QuickTime video. This browser cannot convert video formats yet.',
      );
    }
    if (sizeBytes > MEDIA_BUCKET_LIMIT_BYTES) {
      throw new Error(videoRejectionMessage(sizeBytes, 1) ?? 'Choose a smaller clip.');
    }
    const webMime =
      sourceMime === 'video/quicktime' ? 'video/quicktime' : 'video/mp4';
    return prepareWebVideo(source, webMime, sizeBytes);
  }

  const sizeBytes = asset.fileSize ?? await localFileSize(asset.uri);
  const durationMs = asset.duration ?? 0;
  const rejection = videoRejectionMessage(sizeBytes, durationMs);
  if (rejection) throw new Error(rejection);
  const localPath = await copyToDocument(asset.uri, mime === 'video/mp4' ? 'mp4' : 'mov');
  const player = createVideoPlayer(localPath);
  let prepared = false;
  try {
    const [thumbnail] = await player.generateThumbnailsAsync(0.5, {
      maxWidth: 480,
      maxHeight: 480,
    });
    if (!thumbnail) throw new Error('Could not make a poster for that reel.');
    // Both modules wrap the same native image reference with separate TS declarations.
    const processedPoster = await processVideoPoster(
      thumbnail as unknown as import('expo-image-manipulator').ImageRef,
      durationMs,
      sizeBytes,
      mime,
    );
    const keepsake: ProcessedKeepsake = {
      slot: 'concert_video',
      kind: 'video',
      localPath,
      thumbLocalPath: processedPoster.thumbLocalPath,
      posterLocalPath: processedPoster.posterLocalPath,
      width: processedPoster.width,
      height: processedPoster.height,
      durationMs: processedPoster.durationMs,
      sizeBytes,
      mime,
      caption: null,
    };
    prepared = true;
    return keepsake;
  } finally {
    player.release();
    if (!prepared) {
      await deleteLocalFile(localPath);
    }
  }
}

async function prepareWebVideo(
  source: Blob,
  mime: 'video/mp4' | 'video/quicktime',
  sizeBytes: number,
): Promise<ProcessedKeepsake> {
  const sourceUrl = URL.createObjectURL(source);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.src = sourceUrl;
  let localPath: string | null = null;
  let posterPath: string | null = null;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('This browser could not read that video.'));
      video.load();
    });
    const durationMs = Math.round(video.duration * 1000);
    const rejection = videoRejectionMessage(sizeBytes, durationMs);
    if (rejection) throw new Error(rejection);

    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error('Could not prepare a preview for that reel.'));
      video.currentTime = Math.min(0.25, video.duration / 2);
    });
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('This browser could not read the reel dimensions.');
    }
    const scale = Math.min(1, 480 / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare a preview for that reel.');
    context.drawImage(video, 0, 0, width, height);
    const poster = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not prepare a preview for that reel.'))),
        'image/jpeg',
        0.68,
      );
    });
    if (poster.size > THUMBNAIL_LIMIT_BYTES) {
      throw new Error('The reel preview is too large to upload. Try another clip.');
    }

    localPath = await persistWebBlob(source);
    posterPath = await persistWebBlob(poster);
    return {
      slot: 'concert_video',
      kind: 'video',
      localPath,
      thumbLocalPath: posterPath,
      posterLocalPath: posterPath,
      width,
      height,
      durationMs,
      sizeBytes,
      mime,
      caption: null,
    };
  } catch (error) {
    await deleteLocalFile(localPath);
    await deleteLocalFile(posterPath);
    throw error;
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(sourceUrl);
  }
}

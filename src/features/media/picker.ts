import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createVideoPlayer } from 'expo-video';
import type { KeepsakeSelection, ProcessedKeepsake } from './types';
import { THUMBNAIL_LIMIT_BYTES } from './types';
import { deleteLocalFile, getLocalBlob, persistWebBlob } from './localFiles';
import {
  copyToCache,
  copyToDocument,
  createVideoPlaceholder,
  processPhoto,
  processVideoPoster,
  videoRejectionMessage,
} from './processing';
import {
  extensionFromName,
  mimeFromExtension,
  sniffKeepsakeMime,
  type KeepsakeMime,
  type SupportedVideoMime,
} from './inspection';
import {
  KeepsakeMediaError,
  keepsakeError,
  type KeepsakeFailureContext,
} from './errors';

type PreparationCallback = (message: string) => void;
const THUMBNAIL_EDGE = 480;

export async function pickKeepsakePhoto(
  slot: 'concert_photo' | 'companions_photo',
  source: 'library' | 'camera',
  onPreparing?: PreparationCallback,
): Promise<ProcessedKeepsake | null> {
  try {
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
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 1,
            allowsMultipleSelection: false,
            preferredAssetRepresentationMode:
              ImagePicker.UIImagePickerPreferredAssetRepresentationMode
                .Compatible,
          });
    if (result.canceled || !result.assets[0]) return null;
    const selection = await keepPickerAsset(result.assets[0], 'image');
    onPreparing?.('Preparing photo');
    try {
      const processed = await processPhoto(selection, slot);
      await releaseKeepsakeSelection(selection);
      return processed;
    } catch (error) {
      throw attachRetrySelection(error, selection);
    }
  } catch (error) {
    throw keepsakeError(
      'pick',
      'Could not open that photo. Try another image.',
      { platform: Platform.OS },
      error,
    );
  }
}

export async function pickKeepsakeVideo(
  onPreparing?: PreparationCallback,
): Promise<ProcessedKeepsake | null> {
  try {
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
      videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];
    const earlyRejection = videoRejectionMessage(
      asset.fileSize && asset.fileSize > 0 ? asset.fileSize : 0,
      typeof asset.duration === 'number' && asset.duration > 0
        ? asset.duration
        : 0,
    );
    if (earlyRejection) {
      throw keepsakeError('compress', earlyRejection, {
        mimeType: asset.mimeType,
        extension:
          extensionFromName(asset.fileName) ?? extensionFromName(asset.uri),
        sizeBytes: asset.fileSize,
        width: asset.width,
        height: asset.height,
      });
    }
    const selection = await keepPickerAsset(asset, 'video');
    onPreparing?.('Preparing video');
    try {
      const processed = await prepareVideo(selection);
      await releaseKeepsakeSelection(selection);
      return processed;
    } catch (error) {
      throw attachRetrySelection(error, selection);
    }
  } catch (error) {
    throw keepsakeError(
      'pick',
      'Could not open that video. Choose an MP4, MOV, M4V, WebM, or 3GP file.',
      { platform: Platform.OS },
      error,
    );
  }
}

export async function retryKeepsakeSelection(
  selection: KeepsakeSelection,
  slot: 'concert_photo' | 'companions_photo' | 'concert_video',
): Promise<ProcessedKeepsake> {
  if (selection.kind === 'image') {
    if (slot === 'concert_video') {
      throw new Error('A photo cannot be retried in the video slot.');
    }
    return processPhoto(selection, slot);
  }
  if (slot !== 'concert_video') {
    throw new Error('A video cannot be retried in a photo slot.');
  }
  return prepareVideo(selection);
}

export async function releaseKeepsakeSelection(
  selection: KeepsakeSelection,
): Promise<void> {
  await deleteLocalFile(selection.sourcePath);
}

async function keepPickerAsset(
  asset: ImagePicker.ImagePickerAsset,
  kind: KeepsakeSelection['kind'],
): Promise<KeepsakeSelection> {
  const extension =
    extensionFromName(asset.fileName) ?? extensionFromName(asset.uri);
  const context: KeepsakeFailureContext = {
    mimeType: asset.mimeType,
    extension,
    sizeBytes: asset.fileSize,
    width: asset.width,
    height: asset.height,
  };
  let failureContext = context;
  let sourcePath: string | null = null;
  try {
    if (Platform.OS === 'web') {
      let blob: Blob | null = asset.file ?? null;
      if (!blob && asset.uri) {
        const response = await fetch(asset.uri);
        if (!response.ok)
          throw new Error('Browser could not read the selected file.');
        blob = await response.blob();
      }
      if (!blob) throw new Error('The picker returned no readable file.');
      sourcePath = await persistWebBlob(blob);
    } else {
      if (!asset.uri) throw new Error('The picker returned no file URI.');
      sourcePath = await copyToCache(asset.uri, extension ?? 'bin');
    }

    const blob = await getLocalBlob(sourcePath);
    const header = new Uint8Array(
      await blob.slice(0, 256 * 1024).arrayBuffer(),
    );
    const sniffedMime = sniffKeepsakeMime(header);
    failureContext = {
      ...context,
      mimeType: sniffedMime ?? context.mimeType,
      sizeBytes:
        asset.fileSize && asset.fileSize > 0 ? asset.fileSize : blob.size,
    };
    const fallbackMime =
      normalizeMime(asset.mimeType) ?? mimeFromExtension(extension);
    const sourceMime = sniffedMime ?? fallbackMime;
    if (kind === 'image' && sourceMime && !sourceMime.startsWith('image/')) {
      throw new Error('The selected file is not a photo.');
    }
    if (kind === 'video' && sourceMime && !sourceMime.startsWith('video/')) {
      throw new Error('The selected file is not a video.');
    }
    return {
      kind,
      sourcePath,
      sourceMime,
      extension,
      sizeBytes:
        asset.fileSize && asset.fileSize > 0 ? asset.fileSize : blob.size,
      width: asset.width > 0 ? asset.width : null,
      height: asset.height > 0 ? asset.height : null,
      durationMs:
        typeof asset.duration === 'number' && asset.duration > 0
          ? asset.duration
          : null,
      codec: null,
    };
  } catch (error) {
    await deleteLocalFile(sourcePath);
    throw keepsakeError(
      'pick',
      kind === 'image'
        ? 'Could not read the selected photo.'
        : 'Could not read the selected video.',
      failureContext,
      error,
    );
  }
}

async function prepareVideo(
  selection: KeepsakeSelection,
): Promise<ProcessedKeepsake> {
  const context = selectionContext(selection);
  let localPath: string | null = null;
  let posterPath: string | null = null;
  try {
    const blob = await getLocalBlob(selection.sourcePath);
    const header = new Uint8Array(
      await blob.slice(0, 256 * 1024).arrayBuffer(),
    );
    const sniffed = sniffKeepsakeMime(header);
    const mime = (
      sniffed?.startsWith('video/') ? sniffed : selection.sourceMime
    ) as SupportedVideoMime | null;
    if (!mime || !SUPPORTED_VIDEO_MIMES.has(mime)) {
      throw keepsakeError(
        'decode',
        'This video format is not supported. Choose an MP4, MOV, M4V, WebM, or 3GP video.',
        { ...context, mimeType: mime },
      );
    }
    const sizeBytes = blob.size || selection.sizeBytes;
    const initialDuration = selection.durationMs ?? 0;
    const rejection = videoRejectionMessage(sizeBytes, initialDuration);
    if (rejection)
      throw keepsakeError('compress', rejection, { ...context, sizeBytes });

    localPath =
      Platform.OS === 'web'
        ? await persistWebBlob(blob)
        : await copyToDocument(
            selection.sourcePath,
            extensionForVideoMime(mime),
          );
    if (Platform.OS === 'web') {
      const result = await prepareWebVideo(
        localPath,
        mime,
        sizeBytes,
        context,
        initialDuration,
      );
      posterPath = result.thumbLocalPath;
      return result;
    }

    let player: ReturnType<typeof createVideoPlayer> | null = null;
    let durationMs = initialDuration;
    let poster: Awaited<ReturnType<typeof processVideoPoster>> | null = null;
    try {
      player = createVideoPlayer(localPath);
      const [thumbnail] = await player.generateThumbnailsAsync(0.5, {
        maxWidth: THUMBNAIL_EDGE,
        maxHeight: THUMBNAIL_EDGE,
      });
      if (durationMs <= 0 && player.duration > 0) {
        durationMs = Math.round(player.duration * 1000);
      }
      if (durationMs <= 0) {
        throw keepsakeError('decode', 'Could not read this video’s duration.', {
          ...context,
          mimeType: mime,
          sizeBytes,
        });
      }
      poster = thumbnail
        ? await processVideoPoster(
            thumbnail as unknown as ImageRefLike,
            durationMs,
            sizeBytes,
            mime,
            selection.codec,
          )
        : null;
    } catch (error) {
      if (error instanceof KeepsakeMediaError && error.step === 'decode') {
        throw error;
      }
      if (!(error instanceof KeepsakeMediaError)) {
        keepsakeError(
          'poster',
          'Could not make a video preview; using a placeholder instead.',
          {
            ...context,
            mimeType: mime,
            sizeBytes,
            width: selection.width,
            height: selection.height,
          },
          error,
        );
      }
      poster = null;
    } finally {
      player?.release();
    }
    if (durationMs <= 0) {
      throw keepsakeError('decode', 'Could not read this video’s duration.', {
        ...context,
        mimeType: mime,
        sizeBytes,
      });
    }

    if (poster) {
      posterPath = poster.posterLocalPath;
      return {
        slot: 'concert_video',
        kind: 'video',
        localPath,
        thumbLocalPath: poster.thumbLocalPath,
        posterLocalPath: poster.posterLocalPath,
        width: poster.width,
        height: poster.height,
        durationMs,
        sizeBytes,
        mime,
        codec: selection.codec,
        caption: null,
      };
    }

    const placeholder = await createVideoPlaceholder();
    posterPath = placeholder.path;
    return {
      slot: 'concert_video',
      kind: 'video',
      localPath,
      thumbLocalPath: placeholder.path,
      posterLocalPath: placeholder.path,
      width: placeholder.width,
      height: placeholder.height,
      durationMs,
      sizeBytes,
      mime,
      codec: selection.codec,
      caption: null,
    };
  } catch (error) {
    await deleteLocalFile(localPath);
    if (posterPath && posterPath !== localPath) {
      await deleteLocalFile(posterPath);
    }
    if (error instanceof KeepsakeMediaError) throw error;
    throw keepsakeError(
      'decode',
      'Could not prepare this video.',
      context,
      error,
    );
  }
}

async function prepareWebVideo(
  localPath: string,
  mime: SupportedVideoMime,
  sizeBytes: number,
  context: KeepsakeFailureContext,
  fallbackDurationMs: number,
): Promise<ProcessedKeepsake> {
  const source = await getLocalBlob(localPath);
  const sourceUrl = URL.createObjectURL(source);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.src = sourceUrl;
  let posterPath: string | null = null;
  try {
    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () =>
          reject(new Error('Browser could not read video metadata.'));
        video.load();
      });
    } catch (error) {
      if (fallbackDurationMs <= 0) {
        throw keepsakeError(
          'decode',
          'This browser could not read the video duration. Try the app or a browser that supports this video.',
          context,
          error,
        );
      }
      keepsakeError(
        'poster',
        'This browser cannot preview the video; using a placeholder instead.',
        { ...context, mimeType: mime, sizeBytes },
        error,
      );
      const placeholder = await createVideoPlaceholder();
      return {
        slot: 'concert_video',
        kind: 'video',
        localPath,
        thumbLocalPath: placeholder.path,
        posterLocalPath: placeholder.path,
        width: placeholder.width,
        height: placeholder.height,
        durationMs: fallbackDurationMs,
        sizeBytes,
        mime,
        codec: null,
        caption: null,
      };
    }

    const durationMs = Math.round(video.duration * 1000);
    const rejection = videoRejectionMessage(sizeBytes, durationMs);
    if (rejection)
      throw keepsakeError('compress', rejection, { ...context, sizeBytes });
    if (!video.videoWidth || !video.videoHeight) {
      throw keepsakeError(
        'decode',
        'This browser could not read the video dimensions.',
        context,
      );
    }

    const target = dimensionsForPoster(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) throw new Error('Canvas is not available.');
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Video poster generation timed out.')),
          10_000,
        );
        video.onseeked = () => {
          clearTimeout(timeout);
          resolve();
        };
        video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Could not seek to a poster frame.'));
        };
        video.currentTime = Math.min(0.25, video.duration / 2);
      });
      canvasContext.drawImage(video, 0, 0, target.width, target.height);
      const poster = await canvasToJpeg(canvas, 0.68);
      if (poster.size > THUMBNAIL_LIMIT_BYTES) {
        throw new Error('The generated preview is too large.');
      }
      posterPath = await persistWebBlob(poster);
    } catch (error) {
      keepsakeError(
        'poster',
        'Could not make a video preview; using a placeholder instead.',
        { ...context, mimeType: mime, sizeBytes },
        error,
      );
      const placeholder = await createVideoPlaceholder();
      posterPath = placeholder.path;
      return {
        slot: 'concert_video',
        kind: 'video',
        localPath,
        thumbLocalPath: placeholder.path,
        posterLocalPath: placeholder.path,
        width: placeholder.width,
        height: placeholder.height,
        durationMs,
        sizeBytes,
        mime,
        codec: null,
        caption: null,
      };
    }

    return {
      slot: 'concert_video',
      kind: 'video',
      localPath,
      thumbLocalPath: posterPath,
      posterLocalPath: posterPath,
      width: target.width,
      height: target.height,
      durationMs,
      sizeBytes,
      mime,
      codec: null,
      caption: null,
    };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(sourceUrl);
  }
}

function attachRetrySelection(
  error: unknown,
  selection: KeepsakeSelection,
): KeepsakeMediaError {
  const wrapped =
    error instanceof KeepsakeMediaError
      ? error
      : keepsakeError(
          selection.kind === 'image' ? 'decode' : 'poster',
          'Could not prepare this keepsake.',
          selectionContext(selection),
          error,
        );
  wrapped.selection = selection;
  return wrapped;
}

function selectionContext(
  selection: KeepsakeSelection,
): KeepsakeFailureContext {
  return {
    mimeType: selection.sourceMime,
    extension: selection.extension,
    sizeBytes: selection.sizeBytes,
    width: selection.width,
    height: selection.height,
    platform: Platform.OS,
  };
}

function normalizeMime(mime: string | null | undefined): KeepsakeMime | null {
  if (mime === 'image/jpg') return 'image/jpeg';
  if (mime === 'video/3gpp2') return 'video/3gpp';
  const known = new Set<KeepsakeMime>([
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
    'image/webp',
    'image/avif',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'video/mp4',
    'video/quicktime',
    'video/x-m4v',
    'video/webm',
    'video/3gpp',
  ]);
  return mime && known.has(mime as KeepsakeMime)
    ? (mime as KeepsakeMime)
    : null;
}

function extensionForVideoMime(mime: SupportedVideoMime): string {
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

function dimensionsForPoster(
  width: number,
  height: number,
): { width: number; height: number } {
  const scale = Math.min(1, THUMBNAIL_EDGE / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not encode the video preview.'));
      },
      'image/jpeg',
      quality,
    );
  });
}

const SUPPORTED_VIDEO_MIMES = new Set<SupportedVideoMime>([
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/webm',
  'video/3gpp',
]);

type ImageRefLike = Parameters<typeof processVideoPoster>[0];

import { File, Paths } from 'expo-file-system';
import {
  ImageManipulator,
  SaveFormat,
  type ImageRef,
} from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import type { ProcessedKeepsake } from './types';
import {
  deleteLocalFile,
  localFileSize,
  persistWebBlob,
  readLocalBytes,
} from './localFiles';
import {
  MEDIA_BUCKET_LIMIT_BYTES,
  MAX_VIDEO_DURATION_MS,
  THUMBNAIL_LIMIT_BYTES,
} from './types';

export function dimensionsForLongEdge(
  width: number,
  height: number,
  longEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, longEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function containsExifGps(data: Uint8Array): boolean {
  for (let offset = 2; offset + 4 < data.length; ) {
    if (data[offset] !== 0xff) break;
    const marker = data[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const length = ((data[offset + 2] ?? 0) << 8) | (data[offset + 3] ?? 0);
    if (length < 2 || offset + 2 + length > data.length) break;
    if (
      marker === 0xe1 &&
      data[offset + 4] === 0x45 &&
      data[offset + 5] === 0x78 &&
      data[offset + 6] === 0x69 &&
      data[offset + 7] === 0x66 &&
      data[offset + 8] === 0 &&
      data[offset + 9] === 0
    ) {
      return true;
    }
    offset += 2 + length;
  }
  return false;
}

export function videoRejectionMessage(
  sizeBytes: number,
  durationMs: number,
): string | null {
  if (durationMs <= 0 || durationMs > MAX_VIDEO_DURATION_MS) {
    return 'Keep the reel under 60 seconds and try again.';
  }
  if (sizeBytes > MEDIA_BUCKET_LIMIT_BYTES) {
    return 'This reel is over 50 MB. This build cannot compress video yet, so trim it or choose a smaller clip.';
  }
  return null;
}

export async function processPhoto(
  uri: string,
  width: number,
  height: number,
  slot: 'concert_photo' | 'companions_photo',
  caption: string | null = null,
): Promise<ProcessedKeepsake> {
  let localPath: string | null = null;
  let thumbLocalPath: string | null = null;
  try {
    const imageDimensions = dimensionsForLongEdge(width, height, 1600);
    const imageRef = await ImageManipulator.manipulate(uri)
      .resize(imageDimensions)
      .renderAsync();
    const image = await imageRef.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.8,
    });
    const exifBytes = new Uint8Array(await readLocalBytes(image.uri));
    if (containsExifGps(exifBytes)) {
      throw new Error('Photo metadata could not be removed. Choose another photo.');
    }
    localPath = await copyToDocument(image.uri, 'jpg');

    const thumb = await createJpegAtLimit(uri, width, height, 480);
    thumbLocalPath = await copyToDocument(thumb.uri, 'jpg');
    const sizeBytes = await localFileSize(localPath);
    if (sizeBytes > MEDIA_BUCKET_LIMIT_BYTES) {
      throw new Error('This photo is over 50 MB after processing. Choose another photo.');
    }
    return {
      slot,
      kind: 'image',
      localPath,
      thumbLocalPath,
      posterLocalPath: null,
      width: image.width,
      height: image.height,
      durationMs: null,
      sizeBytes,
      mime: 'image/jpeg',
      caption: normalizeCaption(caption),
    };
  } catch (error) {
    await deleteLocalIfPresent(localPath);
    await deleteLocalIfPresent(thumbLocalPath);
    throw error;
  }
}

export async function processVideoPoster(
  imageRef: ImageRef,
  durationMs: number,
  sizeBytes: number,
  mime: 'video/mp4' | 'video/quicktime',
): Promise<Pick<
  ProcessedKeepsake,
  'posterLocalPath' | 'thumbLocalPath' | 'width' | 'height' | 'durationMs' | 'sizeBytes' | 'mime'
>> {
  const rejection = videoRejectionMessage(sizeBytes, durationMs);
  if (rejection) throw new Error(rejection);

  const poster = await ImageManipulator.manipulate(imageRef)
    .resize({ width: 480 })
    .renderAsync()
    .then((ref) =>
      ref.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.68,
      }),
    );
  const posterBytes = new Uint8Array(await readLocalBytes(poster.uri));
  if (containsExifGps(posterBytes)) {
    throw new Error('Reel poster metadata could not be removed. Choose another clip.');
  }
  const posterLocalPath = await copyToDocument(poster.uri, 'jpg');
  if (await localFileSize(posterLocalPath) > THUMBNAIL_LIMIT_BYTES) {
    await deleteLocalIfPresent(posterLocalPath);
    throw new Error('The reel poster is too large to upload. Try another clip.');
  }
  return {
    posterLocalPath,
    thumbLocalPath: posterLocalPath,
    width: poster.width,
    height: poster.height,
    durationMs,
    sizeBytes,
    mime,
  };
}

async function deleteLocalIfPresent(path: string | null): Promise<void> {
  await deleteLocalFile(path);
}

export async function copyToDocument(
  uri: string,
  extension: string,
): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Could not prepare this keepsake for upload.');
    return persistWebBlob(await response.blob());
  }
  const destination = new File(
    Paths.document,
    `keepsake-${Crypto.randomUUID()}.${extension}`,
  );
  await new File(uri).copy(destination);
  return destination.uri;
}

function normalizeCaption(caption: string | null): string | null {
  const value = caption?.trim().slice(0, 120);
  return value || null;
}

async function createJpegAtLimit(
  uri: string,
  width: number,
  height: number,
  edge: number,
) {
  const dimensions = dimensionsForLongEdge(width, height, edge);
  const source = ImageManipulator.manipulate(uri).resize(dimensions);
  let quality = 0.7;
  let result = await (await source.renderAsync()).saveAsync({
    format: SaveFormat.JPEG,
    compress: quality,
  });
  while (await localFileSize(result.uri) > THUMBNAIL_LIMIT_BYTES && quality > 0.4) {
    quality -= 0.1;
    result = await ImageManipulator.manipulate(uri)
      .resize(dimensions)
      .renderAsync()
      .then((ref) =>
        ref.saveAsync({
          format: SaveFormat.JPEG,
          compress: quality,
        }),
      );
  }
  if (await localFileSize(result.uri) > THUMBNAIL_LIMIT_BYTES) {
    throw new Error('The keepsake preview could not be made small enough. Try another photo.');
  }
  const thumbnailBytes = new Uint8Array(await readLocalBytes(result.uri));
  if (containsExifGps(thumbnailBytes)) {
    throw new Error('Photo preview metadata could not be removed. Choose another photo.');
  }
  return result;
}

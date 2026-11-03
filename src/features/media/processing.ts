import { File, Paths } from 'expo-file-system';
import {
  ImageManipulator,
  SaveFormat,
  type ImageRef,
} from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { ImageFormat, Skia } from '@shopify/react-native-skia';
import { Platform } from 'react-native';
import type { KeepsakeSelection, ProcessedKeepsake } from './types';
import {
  deleteLocalFile,
  getLocalBlob,
  localFileSize,
  persistWebBlob,
  readLocalBytes,
} from './localFiles';
import {
  MEDIA_BUCKET_LIMIT_BYTES,
  MAX_VIDEO_DURATION_MS,
  THUMBNAIL_LIMIT_BYTES,
} from './types';
import {
  containsGpsExif,
  containsJpegMetadata,
  imageDimensionsFromBytes,
  sniffKeepsakeMime,
} from './inspection';
import {
  KeepsakeMediaError,
  keepsakeError,
  type KeepsakeFailureContext,
  type KeepsakeStep,
} from './errors';
import { RAW } from '../../theme/palette';

const MAIN_IMAGE_EDGE = 1600;
const THUMBNAIL_EDGE = 480;
const MAX_BROWSER_IMAGE_PIXELS = 25_000_000;

function blobFromBytes(bytes: Uint8Array): Blob {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: 'image/jpeg' });
}

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

export { containsGpsExif };

export function videoRejectionMessage(
  sizeBytes: number,
  durationMs: number,
): string | null {
  if (durationMs > MAX_VIDEO_DURATION_MS) {
    return 'This video is longer than 60 seconds. Trim it to 60 seconds or less and try again.';
  }
  if (sizeBytes > MEDIA_BUCKET_LIMIT_BYTES) {
    const megabytes = Math.ceil(sizeBytes / 1_000_000);
    return `This video is ${megabytes}MB; the limit is 50MB. Trim it or record at a lower quality.`;
  }
  return null;
}

export async function processPhoto(
  selection: KeepsakeSelection,
  slot: 'concert_photo' | 'companions_photo',
  caption: string | null = null,
): Promise<ProcessedKeepsake> {
  const context = selectionContext(selection);
  let localPath: string | null = null;
  let thumbLocalPath: string | null = null;

  try {
    const sourceBytes = await runStep(
      'decode',
      'Could not open this photo. Try exporting it as JPEG.',
      context,
      async () =>
        new Uint8Array(
          await (
            await getLocalBlob(selection.sourcePath)
          )
            .slice(0, 256 * 1024)
            .arrayBuffer(),
        ),
    );
    const image = await renderVerifiedJpeg(
      selection.sourcePath,
      MAIN_IMAGE_EDGE,
      0.8,
      context,
      sourceBytes,
    );
    localPath = await runStep(
      'compress',
      'Could not save the prepared photo.',
      { ...context, width: image.width, height: image.height },
      () => writeOutput(image.blob, image.bytes, 'photo.jpg'),
    );

    let thumb: RenderedJpeg | null = null;
    for (const quality of [0.68, 0.58, 0.48, 0.38, 0.28]) {
      thumb = await renderVerifiedJpeg(
        localPath,
        THUMBNAIL_EDGE,
        quality,
        context,
      );
      if (thumb.bytes.byteLength <= THUMBNAIL_LIMIT_BYTES) break;
    }
    if (!thumb || thumb.bytes.byteLength > THUMBNAIL_LIMIT_BYTES) {
      throw keepsakeError(
        'thumbnail',
        'Could not make a small preview for this photo.',
        context,
      );
    }
    const thumbnail = thumb;
    thumbLocalPath = await runStep(
      'thumbnail',
      'Could not save the photo preview.',
      { ...context, width: thumbnail.width, height: thumbnail.height },
      () => writeOutput(thumbnail.blob, thumbnail.bytes, 'photo-thumb.jpg'),
    );
    const sizeBytes = await localFileSize(localPath);
    if (sizeBytes > MEDIA_BUCKET_LIMIT_BYTES) {
      throw keepsakeError(
        'compress',
        'This photo is still too large after resizing. Choose a smaller image.',
        { ...context, sizeBytes, width: image.width, height: image.height },
      );
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
      codec: null,
      caption: normalizeCaption(caption),
    };
  } catch (error) {
    await deleteLocalFile(localPath);
    await deleteLocalFile(thumbLocalPath);
    if (error instanceof KeepsakeMediaError) throw error;
    throw keepsakeError(
      'decode',
      'Could not prepare this photo.',
      context,
      error,
    );
  }
}

export async function processVideoPoster(
  imageRef: ImageRef,
  durationMs: number,
  sizeBytes: number,
  mime: ProcessedKeepsake['mime'],
  codec: string | null = null,
): Promise<
  Pick<
    ProcessedKeepsake,
    | 'posterLocalPath'
    | 'thumbLocalPath'
    | 'width'
    | 'height'
    | 'durationMs'
    | 'sizeBytes'
    | 'mime'
    | 'codec'
  >
> {
  const context = { mimeType: mime, sizeBytes };
  const rejection = videoRejectionMessage(sizeBytes, durationMs);
  if (rejection) throw keepsakeError('compress', rejection, context);

  const poster = await encodeNativeImageRef(
    imageRef,
    THUMBNAIL_EDGE,
    0.68,
    context,
  );
  if (poster.bytes.byteLength > THUMBNAIL_LIMIT_BYTES) {
    throw keepsakeError(
      'poster',
      'The reel preview is too large to upload.',
      context,
    );
  }
  const posterLocalPath = await writeOutput(
    poster.blob,
    poster.bytes,
    'poster.jpg',
  );
  return {
    posterLocalPath,
    thumbLocalPath: posterLocalPath,
    width: poster.width,
    height: poster.height,
    durationMs,
    sizeBytes,
    mime,
    codec,
  };
}

export async function createVideoPlaceholder(): Promise<{
  path: string;
  width: number;
  height: number;
}> {
  const width = THUMBNAIL_EDGE;
  const height = 270;
  if (Platform.OS === 'web') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not create a reel placeholder.');
    }
    context.fillStyle = RAW.wheat;
    context.fillRect(0, 0, width, height);
    context.fillStyle = RAW.violet;
    context.beginPath();
    context.moveTo(width * 0.46, height * 0.34);
    context.lineTo(width * 0.46, height * 0.66);
    context.lineTo(width * 0.64, height * 0.5);
    context.closePath();
    context.fill();
    const blob = await canvasToJpeg(canvas, 0.68);
    return { path: await persistWebBlob(blob), width, height };
  }

  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error('Could not create a reel placeholder.');
  try {
    const canvas = surface.getCanvas();
    canvas.drawColor(Skia.Color(RAW.wheat));
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(RAW.violet));
    canvas.drawPath(
      Skia.Path.MakeFromSVGString(
        `M ${width * 0.46} ${height * 0.34} L ${width * 0.46} ${height * 0.66} L ${width * 0.64} ${height * 0.5} Z`,
      )!,
      paint,
    );
    const image = surface.makeImageSnapshot();
    try {
      const bytes = image.encodeToBytes(ImageFormat.JPEG, 68);
      return {
        path: await writeOutput(
          blobFromBytes(bytes),
          bytes,
          'poster-placeholder.jpg',
        ),
        width,
        height,
      };
    } finally {
      image.dispose();
      paint.dispose();
    }
  } finally {
    surface.dispose();
  }
}

export async function copyToDocument(
  uri: string,
  extension: string,
): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok)
      throw new Error('Could not prepare this keepsake for upload.');
    return persistWebBlob(await response.blob());
  }
  const destination = new File(
    Paths.document,
    `keepsake-${Crypto.randomUUID()}.${extension}`,
  );
  await new File(uri).copy(destination);
  return destination.uri;
}

export async function copyToCache(
  uri: string,
  extension: string,
): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok)
      throw new Error('Could not prepare this keepsake for upload.');
    return persistWebBlob(await response.blob());
  }
  const destination = new File(
    Paths.cache,
    `keepsake-source-${Crypto.randomUUID()}.${extension || 'bin'}`,
  );
  await new File(uri).copy(destination);
  return destination.uri;
}

async function renderVerifiedJpeg(
  sourcePath: string,
  edge: number,
  quality: number,
  context: KeepsakeFailureContext,
  knownSourceBytes?: Uint8Array,
): Promise<RenderedJpeg> {
  let result = await renderJpeg(
    sourcePath,
    edge,
    quality,
    context,
    false,
    knownSourceBytes,
  );
  if (containsJpegMetadata(result.bytes)) {
    result = await renderJpeg(
      sourcePath,
      edge,
      quality,
      context,
      true,
      undefined,
      result.sourceBlob,
    );
    if (containsGpsExif(result.bytes)) {
      throw keepsakeError(
        'strip-metadata',
        'Location metadata is still present in the prepared file. Try another export.',
        context,
      );
    }
  }
  return result;
}

type RenderedJpeg = {
  bytes: Uint8Array;
  blob: Blob;
  width: number;
  height: number;
  sourceBlob?: Blob;
};

async function renderJpeg(
  sourcePath: string,
  edge: number,
  quality: number,
  context: KeepsakeFailureContext,
  alternateRoute: boolean,
  knownSourceBytes?: Uint8Array,
  overrideSourceBlob?: Blob,
): Promise<RenderedJpeg> {
  if (Platform.OS === 'web') {
    const original = overrideSourceBlob ?? (await getLocalBlob(sourcePath));
    const bytes =
      knownSourceBytes ?? new Uint8Array(await original.arrayBuffer());
    const decoded = await runStep(
      'decode',
      'This browser could not open this photo.',
      {
        ...context,
        width: context.width ?? imageDimensionsFromBytes(bytes)?.width,
        height: context.height ?? imageDimensionsFromBytes(bytes)?.height,
      },
      () =>
        decodeWebImage(original, bytes, edge, alternateRoute, {
          width: context.width ?? null,
          height: context.height ?? null,
        }).catch((error: unknown) => {
          if (
            error instanceof Error &&
            error.message.startsWith('This browser cannot open HEIC photos.')
          ) {
            throw keepsakeError('decode', error.message, context, error);
          }
          throw error;
        }),
    );
    const oriented = await runStep(
      'orient',
      'Could not orient this photo for display.',
      context,
      async () => {
        const dimensions = imageElementDimensions(decoded.image);
        if (!dimensions.width || !dimensions.height) {
          throw new Error('Image decoder returned empty dimensions.');
        }
        return { ...decoded, ...dimensions };
      },
    );
    const target = dimensionsForLongEdge(oriented.width, oriented.height, edge);
    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) {
      closeDecoded(oriented.image);
      throw keepsakeError('resize', 'Could not resize this photo.', context);
    }
    canvasContext.fillStyle = RAW.wheat;
    canvasContext.fillRect(0, 0, target.width, target.height);
    canvasContext.drawImage(oriented.image, 0, 0, target.width, target.height);
    closeDecoded(oriented.image);
    const blob = await runStep(
      'strip-metadata',
      'Could not re-encode this photo.',
      context,
      () => canvasToJpeg(canvas, quality),
    );
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      blob,
      width: target.width,
      height: target.height,
      sourceBlob: oriented.sourceBlob,
    };
  }

  const decoded = await runStep(
    'decode',
    'This device could not open this photo format.',
    context,
    () => ImageManipulator.manipulate(sourcePath).renderAsync(),
  );
  const oriented = await runStep(
    'orient',
    'Could not orient this photo for display.',
    context,
    async () => {
      if (decoded.width <= 0 || decoded.height <= 0) {
        throw new Error('Image decoder returned empty dimensions.');
      }
      return decoded;
    },
  );
  const target = dimensionsForLongEdge(oriented.width, oriented.height, edge);
  const resized = await runStep(
    'resize',
    'Could not resize this photo.',
    { ...context, width: target.width, height: target.height },
    () => ImageManipulator.manipulate(oriented).resize(target).renderAsync(),
  );
  const staged = await runStep(
    'strip-metadata',
    'Could not prepare a clean JPEG copy.',
    context,
    () => resized.saveAsync({ format: SaveFormat.PNG }),
  );
  try {
    const stagedBytes = new Uint8Array(await readLocalBytes(staged.uri));
    const bytes = await runStep(
      'strip-metadata',
      'Could not create a clean JPEG copy.',
      context,
      () =>
        flattenNativeImage(stagedBytes, resized.width, resized.height, quality),
    );
    return {
      bytes,
      blob: blobFromBytes(bytes),
      width: resized.width,
      height: resized.height,
    };
  } finally {
    await deleteLocalFile(staged.uri);
  }
}

type DecodedWebImage = {
  image: ImageBitmap | HTMLImageElement;
  sourceBlob?: Blob;
};

async function decodeWebImage(
  blob: Blob,
  bytes: Uint8Array,
  edge: number,
  preferImageElement: boolean,
  knownDimensions?: { width: number | null; height: number | null },
): Promise<DecodedWebImage> {
  const detectedMime = sniffKeepsakeMime(bytes);
  let decodingBlob = blob;
  try {
    return await decodeBrowserImage(
      decodingBlob,
      bytes,
      edge,
      preferImageElement,
      knownDimensions,
    );
  } catch (error) {
    if (detectedMime !== 'image/heic' && detectedMime !== 'image/heif') {
      throw error;
    }
  }

  try {
    const { heicTo } = await import('heic-to');
    decodingBlob = await heicTo({
      blob,
      type: 'image/jpeg',
      quality: 0.95,
    });
    const convertedBytes = new Uint8Array(await decodingBlob.arrayBuffer());
    return {
      ...(await decodeBrowserImage(
        decodingBlob,
        convertedBytes,
        edge,
        preferImageElement,
        knownDimensions,
      )),
      sourceBlob: decodingBlob,
    };
  } catch {
    throw new Error(
      'This browser cannot open HEIC photos. Export it as JPEG or try Safari or the app.',
    );
  }
}

async function decodeBrowserImage(
  blob: Blob,
  bytes: Uint8Array,
  edge: number,
  preferImageElement: boolean,
  knownDimensions?: { width: number | null; height: number | null },
): Promise<DecodedWebImage> {
  const dimensions =
    imageDimensionsFromBytes(bytes) ??
    (knownDimensions?.width && knownDimensions.height
      ? { width: knownDimensions.width, height: knownDimensions.height }
      : null);
  const isVeryLarge =
    dimensions !== null &&
    dimensions.width * dimensions.height > MAX_BROWSER_IMAGE_PIXELS;
  const resize = isVeryLarge
    ? dimensionsForLongEdge(dimensions.width, dimensions.height, edge)
    : dimensions && Math.max(dimensions.width, dimensions.height) > edge
      ? dimensionsForLongEdge(dimensions.width, dimensions.height, edge)
      : null;

  if (
    (!preferImageElement || isVeryLarge) &&
    typeof createImageBitmap === 'function'
  ) {
    const options: ImageBitmapOptions = {
      imageOrientation: 'from-image',
      ...(resize
        ? {
            ...(resize.width >= resize.height
              ? { resizeWidth: edge }
              : { resizeHeight: edge }),
            resizeQuality: 'high' as const,
          }
        : {}),
    };
    return { image: await createImageBitmap(blob, options) };
  }
  if (isVeryLarge) {
    throw new Error(
      'This browser cannot safely resize this very large photo. Try the app or export a smaller copy.',
    );
  }

  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Browser image decode failed.'));
      element.src = url;
    });
    return { image };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function imageElementDimensions(image: ImageBitmap | HTMLImageElement): {
  width: number;
  height: number;
} {
  return image instanceof HTMLImageElement
    ? { width: image.naturalWidth, height: image.naturalHeight }
    : { width: image.width, height: image.height };
}

function closeDecoded(image: ImageBitmap | HTMLImageElement): void {
  if ('close' in image && typeof image.close === 'function') image.close();
}

async function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas did not return JPEG data.'));
      },
      'image/jpeg',
      quality,
    );
  });
}

async function flattenNativeImage(
  encoded: Uint8Array,
  width: number,
  height: number,
  quality: number,
): Promise<Uint8Array> {
  const data = Skia.Data.fromBytes(encoded);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('Skia could not decode the prepared image.');
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) {
    image.dispose();
    throw new Error('Skia could not allocate the resized image surface.');
  }
  try {
    const canvas = surface.getCanvas();
    canvas.drawColor(Skia.Color(RAW.wheat));
    const paint = Skia.Paint();
    canvas.drawImageRect(
      image,
      Skia.XYWHRect(0, 0, image.width(), image.height()),
      Skia.XYWHRect(0, 0, width, height),
      paint,
    );
    surface.flush();
    const output = surface.makeImageSnapshot();
    try {
      return output.encodeToBytes(ImageFormat.JPEG, Math.round(quality * 100));
    } finally {
      output.dispose();
      paint.dispose();
    }
  } finally {
    surface.dispose();
    image.dispose();
    data.dispose();
  }
}

async function encodeNativeImageRef(
  imageRef: ImageRef,
  edge: number,
  quality: number,
  context: KeepsakeFailureContext,
): Promise<RenderedJpeg> {
  const target = dimensionsForLongEdge(imageRef.width, imageRef.height, edge);
  const resized = await runStep(
    'resize',
    'Could not resize the reel preview.',
    context,
    () => ImageManipulator.manipulate(imageRef).resize(target).renderAsync(),
  );
  const staged = await runStep(
    'poster',
    'Could not prepare the reel preview.',
    context,
    () => resized.saveAsync({ format: SaveFormat.PNG }),
  );
  try {
    const bytes = await runStep(
      'poster',
      'Could not encode the reel preview.',
      context,
      async () =>
        flattenNativeImage(
          new Uint8Array(await readLocalBytes(staged.uri)),
          resized.width,
          resized.height,
          quality,
        ),
    );
    return {
      bytes,
      blob: blobFromBytes(bytes),
      width: resized.width,
      height: resized.height,
    };
  } finally {
    await deleteLocalFile(staged.uri);
  }
}

async function writeOutput(
  blob: Blob,
  bytes: Uint8Array,
  name: string,
): Promise<string> {
  if (Platform.OS === 'web') return persistWebBlob(blob);
  const file = new File(
    Paths.document,
    `keepsake-${Crypto.randomUUID()}-${name}`,
  );
  file.write(bytes);
  return file.uri;
}

async function runStep<T>(
  step: KeepsakeStep,
  message: string,
  context: KeepsakeFailureContext,
  task: () => Promise<T>,
): Promise<T> {
  try {
    return await task();
  } catch (error) {
    throw keepsakeError(step, message, context, error);
  }
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
  };
}

function normalizeCaption(caption: string | null): string | null {
  const value = caption?.trim().slice(0, 120);
  return value || null;
}

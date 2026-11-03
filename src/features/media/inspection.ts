export type SupportedPhotoMime =
  | 'image/jpeg'
  | 'image/png'
  | 'image/heic'
  | 'image/heif'
  | 'image/webp'
  | 'image/avif'
  | 'image/gif'
  | 'image/bmp'
  | 'image/tiff';

export type SupportedVideoMime =
  'video/mp4' | 'video/quicktime' | 'video/x-m4v' | 'video/webm' | 'video/3gpp';

export type KeepsakeMime = SupportedPhotoMime | SupportedVideoMime;

const MIME_BY_EXTENSION: Record<string, KeepsakeMime> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
  '3gp': 'video/3gpp',
};

export function extensionFromName(
  name: string | null | undefined,
): string | null {
  if (!name) return null;
  const cleanName = name.split(/[?#]/, 1)[0] ?? '';
  const dot = cleanName.lastIndexOf('.');
  return dot >= 0 ? cleanName.slice(dot + 1).toLowerCase() || null : null;
}

export function mimeFromExtension(
  extension: string | null,
): KeepsakeMime | null {
  return extension
    ? (MIME_BY_EXTENSION[extension.toLowerCase()] ?? null)
    : null;
}

export function sniffKeepsakeMime(bytes: Uint8Array): KeepsakeMime | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') {
    return 'image/gif';
  }
  if (ascii(bytes, 0, 2) === 'BM') return 'image/bmp';
  if (
    (bytes[0] === 0x49 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x2a &&
      bytes[3] === 0) ||
    (bytes[0] === 0x4d &&
      bytes[1] === 0x4d &&
      bytes[2] === 0 &&
      bytes[3] === 0x2a)
  ) {
    return 'image/tiff';
  }
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return 'image/webp';
  }
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return 'video/webm';
  }
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brands = ascii(bytes, 8, Math.min(64, bytes.length - 8));
    if (/\b(?:avif|avis)\b/.test(brands)) return 'image/avif';
    if (/\b(?:heic|heix|hevc|hevx|mif1|msf1)\b/.test(brands)) {
      return brands.includes('heic') || brands.includes('heix')
        ? 'image/heic'
        : 'image/heif';
    }
    if (/\b3gp[0-9a-z ]\b/i.test(brands)) return 'video/3gpp';
    if (brands.includes('qt  ')) return 'video/quicktime';
    if (brands.includes('M4V ')) return 'video/x-m4v';
    if (/\b(?:isom|iso2|mp41|mp42|avc1|M4V)\b/.test(brands)) {
      return 'video/mp4';
    }
  }
  return null;
}

export function containsJpegMetadata(bytes: Uint8Array): boolean {
  return jpegSegments(bytes, (marker, start, end) => {
    if (marker !== 0xe1) return false;
    return isExifSegment(bytes, start, end) || isXmpSegment(bytes, start, end);
  });
}

export function containsGpsExif(bytes: Uint8Array): boolean {
  return jpegSegments(bytes, (marker, start, end) => {
    if (marker !== 0xe1) return false;
    if (isExifSegment(bytes, start, end)) {
      return hasGpsIfd(bytes, start + 6, end);
    }
    if (isXmpSegment(bytes, start, end)) {
      return /\b(?:GPSLatitude|GPSLongitude|GPSPosition|GPSAltitude|GPSImgDirection)\b/i.test(
        ascii(bytes, start, end - start),
      );
    }
    return false;
  });
}

export function jpegOrientation(bytes: Uint8Array): number {
  let orientation = 1;
  jpegSegments(bytes, (marker, start, end) => {
    if (marker !== 0xe1 || !isExifSegment(bytes, start, end)) return false;
    orientation = readExifOrientation(bytes, start + 6, end);
    return orientation !== 1;
  });
  return orientation;
}

export function imageDimensionsFromBytes(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  let width = 0;
  let height = 0;
  if (ascii(bytes, 0, 8) === '\u0089PNG\r\n\u001a\n' && bytes.length >= 24) {
    width = readU32BE(bytes, 16);
    height = readU32BE(bytes, 20);
  } else if (
    ascii(bytes, 0, 6) === 'GIF87a' ||
    ascii(bytes, 0, 6) === 'GIF89a'
  ) {
    width = readU16LE(bytes, 6);
    height = readU16LE(bytes, 8);
  } else if (ascii(bytes, 0, 2) === 'BM' && bytes.length >= 26) {
    width = readU32LE(bytes, 18);
    height = Math.abs(readI32LE(bytes, 22));
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    jpegSegments(bytes, (marker, start, end) => {
      if (!isJpegStartOfFrame(marker) || start + 5 > end) return false;
      height = ((bytes[start + 1] ?? 0) << 8) | (bytes[start + 2] ?? 0);
      width = ((bytes[start + 3] ?? 0) << 8) | (bytes[start + 4] ?? 0);
      return true;
    });
    if ([5, 6, 7, 8].includes(jpegOrientation(bytes))) {
      [width, height] = [height, width];
    }
  } else if (
    ascii(bytes, 0, 4) === 'RIFF' &&
    ascii(bytes, 8, 4) === 'WEBP' &&
    bytes.length >= 30
  ) {
    const chunk = ascii(bytes, 12, 4);
    if (chunk === 'VP8X') {
      width = 1 + readU24LE(bytes, 24);
      height = 1 + readU24LE(bytes, 27);
    } else if (chunk === 'VP8 ' && bytes.length >= 30) {
      width = (((bytes[27] ?? 0) & 0x3f) << 8) | (bytes[26] ?? 0);
      height = (((bytes[29] ?? 0) & 0x3f) << 8) | (bytes[28] ?? 0);
    } else if (chunk === 'VP8L' && bytes.length >= 25) {
      width = 1 + (((bytes[22] ?? 0) & 0x3f) << 8) + (bytes[21] ?? 0);
      height =
        1 +
        (((bytes[24] ?? 0) & 0x0f) << 10) +
        (((bytes[23] ?? 0) & 0xff) << 2) +
        (((bytes[22] ?? 0) & 0xc0) >> 6);
    }
  }
  return width > 0 && height > 0 ? { width, height } : null;
}

function jpegSegments(
  bytes: Uint8Array,
  visit: (marker: number, dataStart: number, dataEnd: number) => boolean,
): boolean {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let offset = 2;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xda || marker === 0xd9) return false;
    const length = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
    const dataStart = offset + 4;
    const dataEnd = offset + 2 + length;
    if (length < 2 || dataEnd > bytes.length) return false;
    if (visit(marker, dataStart, dataEnd)) return true;
    offset = dataEnd;
  }
  return false;
}

function isExifSegment(bytes: Uint8Array, start: number, end: number): boolean {
  return end - start >= 6 && ascii(bytes, start, 6) === 'Exif\u0000\u0000';
}

function isXmpSegment(bytes: Uint8Array, start: number, end: number): boolean {
  return (
    end - start >= 29 &&
    ascii(bytes, start, 29) === 'http://ns.adobe.com/xap/1.0/\u0000'
  );
}

function hasGpsIfd(bytes: Uint8Array, tiffStart: number, end: number): boolean {
  if (tiffStart + 8 > end) return false;
  const littleEndian =
    bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49;
  if (
    !littleEndian &&
    !(bytes[tiffStart] === 0x4d && bytes[tiffStart + 1] === 0x4d)
  ) {
    return false;
  }
  const read16 = (offset: number) =>
    littleEndian
      ? (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8)
      : ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
  const read32 = (offset: number) =>
    littleEndian
      ? ((bytes[offset] ?? 0) |
          ((bytes[offset + 1] ?? 0) << 8) |
          ((bytes[offset + 2] ?? 0) << 16) |
          ((bytes[offset + 3] ?? 0) << 24)) >>>
        0
      : (((bytes[offset] ?? 0) << 24) |
          ((bytes[offset + 1] ?? 0) << 16) |
          ((bytes[offset + 2] ?? 0) << 8) |
          (bytes[offset + 3] ?? 0)) >>>
        0;
  if (read16(tiffStart + 2) !== 42) return false;
  const ifdOffset = read32(tiffStart + 4);
  const ifd = tiffStart + ifdOffset;
  if (ifd + 2 > end) return false;
  const count = read16(ifd);
  for (let index = 0; index < count; index += 1) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > end) return false;
    if (read16(entry) === 0x8825) return true;
  }
  return false;
}

function readExifOrientation(
  bytes: Uint8Array,
  tiffStart: number,
  end: number,
): number {
  if (tiffStart + 8 > end) return 1;
  const littleEndian =
    bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49;
  if (
    !littleEndian &&
    !(bytes[tiffStart] === 0x4d && bytes[tiffStart + 1] === 0x4d)
  ) {
    return 1;
  }
  const read16 = (offset: number) =>
    littleEndian
      ? (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8)
      : ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
  const read32 = (offset: number) =>
    littleEndian
      ? ((bytes[offset] ?? 0) |
          ((bytes[offset + 1] ?? 0) << 8) |
          ((bytes[offset + 2] ?? 0) << 16) |
          ((bytes[offset + 3] ?? 0) << 24)) >>>
        0
      : (((bytes[offset] ?? 0) << 24) |
          ((bytes[offset + 1] ?? 0) << 16) |
          ((bytes[offset + 2] ?? 0) << 8) |
          (bytes[offset + 3] ?? 0)) >>>
        0;
  if (read16(tiffStart + 2) !== 42) return 1;
  const ifd = tiffStart + read32(tiffStart + 4);
  if (ifd + 2 > end) return 1;
  const count = read16(ifd);
  for (let index = 0; index < count; index += 1) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > end) return 1;
    if (read16(entry) === 0x0112) {
      const value = read16(entry + 8);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let value = '';
  for (
    let index = start;
    index < start + length && index < bytes.length;
    index += 1
  ) {
    value += String.fromCharCode(bytes[index] ?? 0);
  }
  return value;
}

function isJpegStartOfFrame(marker: number): boolean {
  return (
    marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
  );
}

function readU16LE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) |
      ((bytes[offset + 1] ?? 0) << 8) |
      ((bytes[offset + 2] ?? 0) << 16) |
      ((bytes[offset + 3] ?? 0) << 24)) >>>
    0
  );
}

function readI32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) |
    ((bytes[offset + 1] ?? 0) << 8) |
    ((bytes[offset + 2] ?? 0) << 16) |
    ((bytes[offset + 3] ?? 0) << 24)
  );
}

function readU32BE(bytes: Uint8Array, offset: number): number {
  return (
    (((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0)) >>>
    0
  );
}

function readU24LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) |
    ((bytes[offset + 1] ?? 0) << 8) |
    ((bytes[offset + 2] ?? 0) << 16)
  );
}

import { describe, expect, it } from '@jest/globals';
import {
  containsGpsExif,
  containsJpegMetadata,
  imageDimensionsFromBytes,
  jpegOrientation,
  mimeFromExtension,
  sniffKeepsakeMime,
} from '../src/features/media/inspection';
import {
  dimensionsForLongEdge,
  videoRejectionMessage,
} from '../src/features/media/processing';
import { MEDIA_BUCKET_LIMIT_BYTES } from '../src/features/media/types';

function jpegWithExif(tag: number, value: number): Uint8Array {
  const tiff = new Uint8Array([
    0x49,
    0x49,
    0x2a,
    0x00,
    0x08,
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    tag & 0xff,
    tag >> 8,
    tag === 0x0112 ? 0x03 : 0x04,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    tag === 0x0112 ? value : 0x1a,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
  ]);
  const payload = new Uint8Array(6 + tiff.length);
  payload.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);
  payload.set(tiff, 6);
  const segmentLength = payload.length + 2;
  const jpeg = new Uint8Array(2 + 2 + 2 + payload.length + 2);
  jpeg.set([0xff, 0xd8, 0xff, 0xe1, segmentLength >> 8, segmentLength & 0xff]);
  jpeg.set(payload, 6);
  jpeg.set([0xff, 0xd9], 6 + payload.length);
  return jpeg;
}

function jpegWithXmp(value: string): Uint8Array {
  const identifier = 'http://ns.adobe.com/xap/1.0/\u0000';
  const payload = new TextEncoder().encode(identifier + value);
  const segmentLength = payload.length + 2;
  const jpeg = new Uint8Array(2 + 2 + 2 + payload.length + 2);
  jpeg.set([0xff, 0xd8, 0xff, 0xe1, segmentLength >> 8, segmentLength & 0xff]);
  jpeg.set(payload, 6);
  jpeg.set([0xff, 0xd9], 6 + payload.length);
  return jpeg;
}

describe('keepsake format inspection', () => {
  it('sniffs common photo/video types independent of filename extensions', () => {
    expect(sniffKeepsakeMime(jpegWithExif(0x0112, 1))).toBe('image/jpeg');
    expect(
      sniffKeepsakeMime(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe('image/png');
    expect(
      sniffKeepsakeMime(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ]),
      ),
    ).toBe('image/webp');
    expect(
      sniffKeepsakeMime(
        new Uint8Array([
          0, 0, 0, 16, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
        ]),
      ),
    ).toBe('image/heic');
    expect(sniffKeepsakeMime(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]))).toBe(
      'video/webm',
    );
    expect(mimeFromExtension('mov')).toBe('video/quicktime');
    expect(mimeFromExtension('png')).toBe('image/png');
    expect(sniffKeepsakeMime(jpegWithExif(0x0112, 1))).toBe('image/jpeg');
    expect(sniffKeepsakeMime(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });

  it('identifies GPS in EXIF and XMP while allowing safe EXIF orientation', () => {
    const gpsJpeg = jpegWithExif(0x8825, 26);
    const orientationJpeg = jpegWithExif(0x0112, 6);
    const gpsXmpJpeg = jpegWithXmp(
      '<exif:GPSLatitude>37, 46, 30N</exif:GPSLatitude>',
    );
    expect(containsJpegMetadata(gpsJpeg)).toBe(true);
    expect(containsGpsExif(gpsJpeg)).toBe(true);
    expect(containsGpsExif(gpsXmpJpeg)).toBe(true);
    expect(containsGpsExif(orientationJpeg)).toBe(false);
    expect(jpegOrientation(orientationJpeg)).toBe(6);
  });

  it('uses image dimensions to cap very large browser sources before canvas draw', () => {
    const jpegHeader = new Uint8Array(21);
    jpegHeader.set([
      0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x13, 0x88, 0x13, 0x88,
    ]);
    expect(imageDimensionsFromBytes(jpegHeader)).toEqual({
      width: 5000,
      height: 5000,
    });
    expect(dimensionsForLongEdge(5000, 5000, 1600)).toEqual({
      width: 1600,
      height: 1600,
    });
  });

  it('reads lossy WebP dimensions without treating the RIFF header as dimensions', () => {
    const webp = new Uint8Array(30);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    webp.set([0x56, 0x50, 0x38, 0x20], 12);
    webp.set([0x9d, 0x01, 0x2a], 23);
    webp.set([0x80, 0x07, 0xe0, 0x04], 26);
    expect(imageDimensionsFromBytes(webp)).toEqual({
      width: 1920,
      height: 1248,
    });
  });

  it('returns exact video duration and file-size guidance', () => {
    expect(videoRejectionMessage(1024, 60_001)).toContain(
      'longer than 60 seconds',
    );
    expect(videoRejectionMessage(74_000_000, 10_000)).toBe(
      'This video is 74MB; the limit is 50MB. Trim it or record at a lower quality.',
    );
    expect(videoRejectionMessage(MEDIA_BUCKET_LIMIT_BYTES, 60_000)).toBeNull();
  });
});

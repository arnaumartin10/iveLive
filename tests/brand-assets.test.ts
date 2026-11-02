import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, expect, it } from '@jest/globals';
import {
  MACRO_GENRE_ORDER,
  MACRO_GENRES,
} from '../src/features/genres/macroGenres';
import {
  getMascotTilt,
  isMacroGenre,
  MASCOT_MOODS,
  resolveMascotColors,
  resolveMascotMood,
} from '../src/components/brand/mascotColors';
import { getContrastRatio, RAW } from '../src/theme/palette';
import { colors as themeColors } from '../src/theme/tokens';

describe('brand mascot color roles', () => {
  const genres = [...MACRO_GENRE_ORDER, 'unclassified'] as const;

  it.each(genres)('%s maps to palette role colors in both themes', (genre) => {
    const roles = MACRO_GENRES[genre];

    for (const theme of [themeColors.light, themeColors.dark]) {
      const actual = resolveMascotColors(genre, theme.bg);
      expect(actual.body).toBe(RAW[roles.inkA]);
      expect(actual.accent).toBe(RAW[roles.inkB]);
      expect(getContrastRatio(actual.outline, theme.bg)).toBeGreaterThanOrEqual(
        3,
      );
      expect(getContrastRatio(actual.feature, theme.bg)).toBeGreaterThanOrEqual(
        3,
      );
    }
  });

  it('recognizes only declared macro genres', () => {
    expect(isMacroGenre('rock')).toBe(true);
    expect(isMacroGenre('unclassified')).toBe(true);
    expect(isMacroGenre('unknown')).toBe(false);
  });

  it('keeps unsupported moods neutral without distorting the source drawing', () => {
    for (const mood of MASCOT_MOODS) {
      expect(resolveMascotMood(mood)).toBe('neutral');
    }
  });

  it('chooses a deterministic sticker tilt', () => {
    expect(getMascotTilt('indie')).toBe(getMascotTilt('indie'));
    expect(getMascotTilt('rock')).toBeGreaterThanOrEqual(-3);
    expect(getMascotTilt('rock')).toBeLessThanOrEqual(3);
  });

  it('maps every SVG fill and stroke color to a role in the generated artwork', async () => {
    const source = await readFile('assets/icon.svg', 'utf8');
    const artwork = await readFile(
      'src/components/brand/MascotArtwork.tsx',
      'utf8',
    );
    const fills = [...source.matchAll(/fill="([^"]+)"/g)].map(
      (match) => match[1],
    );
    const strokes = [...source.matchAll(/stroke="([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(new Set(fills)).toEqual(new Set(['#000000', '#ffffff', 'none']));
    expect(new Set(strokes)).toEqual(new Set(['#ffffff']));
    expect(artwork).toContain('fill={colors.body}');
    expect(artwork).toContain('fill={colors.accent}');
    expect(artwork).toContain('stroke={colors.outline}');
  });
});

describe('generated iOS icon', () => {
  it('is 1024 square and has no alpha channel', async () => {
    const metadata = await sharp(
      'assets/generated/icon-ios-1024.png',
    ).metadata();

    expect(metadata.width).toBe(1024);
    expect(metadata.height).toBe(1024);
    expect(metadata.hasAlpha).toBe(false);
    expect(metadata.channels).toBe(3);
  });
});

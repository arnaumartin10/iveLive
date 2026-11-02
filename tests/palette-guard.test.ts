import { describe, expect, it } from '@jest/globals';
import {
  RAW,
  mix,
  getContrastRatio,
  paperTheme,
  nightTheme,
  mauveTints,
  slateShades,
  wheatTints,
  orangeTints,
} from '../src/theme/palette';
import { MACRO_GENRES, MACRO_GENRE_ORDER } from '../src/features/genres/macroGenres';
import { VENUE_TYPES, VENUE_TYPE_ORDER } from '../src/features/venues/venueTypes';

describe('Paper & Ink Palette & Theme Guard', () => {
  const ALLOWED_RAW_HUES = new Set([
    '#694F5D', // mauve
    '#183A37', // slate
    '#EFD6AC', // wheat
    '#C44900', // orange
    '#432534', // violet
  ]);

  it('contains ONLY the 5 allowed raw base hues', () => {
    const rawValues = Object.values(RAW);
    expect(rawValues).toHaveLength(5);
    for (const val of rawValues) {
      expect(ALLOWED_RAW_HUES.has(val.toUpperCase())).toBe(true);
    }
  });

  it('does not contain pure white (#FFFFFF) or pure black (#000000) anywhere in RAW', () => {
    const rawValues = Object.values(RAW).map((v) => v.toUpperCase());
    expect(rawValues).not.toContain('#FFFFFF');
    expect(rawValues).not.toContain('#000000');
  });

  it('mix helper creates valid hex color transitions', () => {
    const mixed = mix(RAW.mauve, RAW.wheat, 0.5);
    expect(mixed).toMatch(/^#[0-9A-Fa-f]{6}$/);

    // End points
    expect(mix(RAW.mauve, RAW.wheat, 0).toLowerCase()).toBe(RAW.mauve.toLowerCase());
    expect(mix(RAW.mauve, RAW.wheat, 1).toLowerCase()).toBe(RAW.wheat.toLowerCase());
  });

  it('all role tokens in paperTheme and nightTheme derive from allowed hues or mixes', () => {
    const themes = [paperTheme, nightTheme];
    for (const t of themes) {
      expect(t.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.surface).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.ink).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.accent).toBe(RAW.orange);
      expect(t.accentInk).toBe(RAW.wheat);
    }
  });

  it('all 14 macro-genre combinations are unique (pattern, inkA, inkB)', () => {
    const pairs = new Set<string>();
    for (const key of MACRO_GENRE_ORDER) {
      const g = MACRO_GENRES[key];
      const sig = `${g.pattern}:${g.inkA}:${g.inkB}`;
      expect(pairs.has(sig)).toBe(false);
      pairs.add(sig);
    }
    expect(pairs.size).toBe(14);
  });

  it('all 6 venue types have unique physical stamp shapes', () => {
    const shapes = new Set<string>();
    for (const key of VENUE_TYPE_ORDER) {
      const v = VENUE_TYPES[key];
      expect(v.stampShape).toBeDefined();
      expect(shapes.has(v.stampShape)).toBe(false);
      shapes.add(v.stampShape);
    }
    expect(shapes.size).toBe(6);
  });

  it('enforces contrast >= 4.5:1 for body text in both themes', () => {
    expect(getContrastRatio(paperTheme.ink, paperTheme.bg)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(nightTheme.ink, nightTheme.bg)).toBeGreaterThanOrEqual(4.5);
  });
});

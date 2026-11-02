import { describe, expect, it } from '@jest/globals';
import {
  MACRO_GENRE_ORDER,
  MACRO_GENRES,
} from '../src/features/genres/macroGenres';
import {
  VENUE_TYPE_ORDER,
  VENUE_TYPES,
} from '../src/features/venues/venueTypes';
import { RAW } from '../src/theme/palette';

describe('venue type registry', () => {
  it('covers the complete ordered venue type set with display metadata', () => {
    const expectedKeys = [
      'festival',
      'concert_hall_club',
      'stadium',
      'indoor_arena',
      'festa_major',
      'other',
    ];

    expect(VENUE_TYPE_ORDER).toEqual(expectedKeys);
    expect(Object.keys(VENUE_TYPES)).toEqual(expectedKeys);

    for (const key of VENUE_TYPE_ORDER) {
      const venue = VENUE_TYPES[key];
      expect(venue.key).toBe(key);
      expect(venue.label).not.toBe('');
      expect(venue.shortLabel).not.toBe('');
      expect(venue.description).not.toBe('');
      expect(Array.isArray(venue.examples)).toBe(true);
      expect(venue.icon).toBeDefined();
      expect(venue.stampShape).toBeDefined();
      expect(Object.values(RAW)).toContain(venue.primaryColor);
    }

    expect(VENUE_TYPES.festa_major.description).toBe(
      'Town festivals and open-air street shows',
    );
  });
});

describe('macro genre registry', () => {
  it('covers every requested genre with a unique (pattern, inkA, inkB) encoding', () => {
    const expectedKeys = [
      'rock',
      'indie',
      'pop',
      'electronic',
      'hip_hop',
      'rnb_soul',
      'metal',
      'punk',
      'folk_acoustic',
      'jazz_blues',
      'latin',
      'classical',
      'world',
      'other',
    ];
    const allKeys = [...expectedKeys, 'unclassified'];

    expect(MACRO_GENRE_ORDER).toEqual(expectedKeys);
    expect(Object.keys(MACRO_GENRES)).toEqual(allKeys);

    const signatures = Object.entries(MACRO_GENRES).map(([slug, genre]) => {
      expect(genre.slug).toBe(slug);
      expect(genre.label).not.toBe('');
      expect(genre.pattern).toBeDefined();
      expect(genre.inkA).toBeDefined();
      expect(genre.inkB).toBeDefined();
      expect(genre.color).toMatch(/^#[0-9A-F]{6}$/i);
      return `${genre.pattern}:${genre.inkA}:${genre.inkB}`;
    });

    expect(MACRO_GENRES.unclassified.label).toBe('Unclassified');
    // All 14 macro-genres + unclassified have unique pattern + ink encoding
    expect(new Set(signatures).size).toBe(allKeys.length);
  });
});

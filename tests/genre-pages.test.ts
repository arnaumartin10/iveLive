import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MACRO_GENRES } from '../src/features/genres/macroGenres';
import {
  calculateGenreProgress,
  filterGenreArtists,
  getEditorialArtistFallbacks,
  getGenreContent,
  normalizeGenreTag,
  resolveGenreParentFromRules,
  type GenreEditorialContent,
} from '../src/features/genres/content';
import {
  findGenreCatalogEntry,
  normalizeGenreLookup,
  type GenreCatalogEntry,
} from '../src/features/genres/catalog';

const genreSlugs = [
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
] as const;

const contents = genreSlugs.map(
  (slug) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'src/content/genres', `${slug}.json`),
        'utf8',
      ),
    ) as GenreEditorialContent,
);
const subGenreDirectory = join(process.cwd(), 'src/content/genres/sub');
const subGenreContents = readdirSync(subGenreDirectory)
  .filter((name) => name.endsWith('.json'))
  .map(
    (name) =>
      JSON.parse(
        readFileSync(join(subGenreDirectory, name), 'utf8'),
      ) as GenreEditorialContent & { parent_slug: string },
  );

describe('genre page content registry', () => {
  it('has a complete, original, unreviewed content file for every routable macro genre', () => {
    expect(contents.map((content) => content.slug).sort()).toEqual(
      [...genreSlugs].sort(),
    );
    for (const content of contents) {
      expect(content.title.trim()).not.toBe('');
      expect(content.tagline.trim()).not.toBe('');
      expect(content.origin_place.trim()).not.toBe('');
      expect(content.origin_years.trim()).not.toBe('');
      expect(content.content_version).toBeGreaterThan(0);
      expect(content.reviewed).toBe(false);
      expect(content.sources_to_verify.length).toBeGreaterThan(0);
      expect(content.sources_to_verify.every((source) => source.trim())).toBe(
        true,
      );
      const summaryWords = content.summary.trim().split(/\s+/).length;
      expect(summaryWords).toBeGreaterThanOrEqual(60);
      expect(summaryWords).toBeLessThanOrEqual(90);
      expect(content.history.length).toBeGreaterThanOrEqual(4);
      expect(content.history.length).toBeLessThanOrEqual(5);
      for (const era of content.history) {
        expect(era.years.trim()).not.toBe('');
        expect(era.heading.trim()).not.toBe('');
        const words = era.text.trim().split(/\s+/).length;
        expect(words).toBeGreaterThanOrEqual(35);
        expect(words).toBeLessThanOrEqual(50);
      }
      expect(content.pillars).toHaveLength(3);
      expect(content.examples).toHaveLength(20);
      const names = [...content.pillars, ...content.examples].map((artist) =>
        normalizeArtistName(artist.name),
      );
      expect(new Set(names).size).toBe(names.length);
      expect(
        [...content.pillars, ...content.examples].every((artist) =>
          artist.name.trim(),
        ),
      ).toBe(true);
      expect(
        content.pillars.every((artist) => (artist.why ?? '').trim().length > 0),
      ).toBe(true);
      expect(content.pillars.every((artist) => artist.why!.length <= 220)).toBe(
        true,
      );
      expect(
        content.examples.every(
          (artist) => !artist.note || !artist.note.includes('\n'),
        ),
      ).toBe(true);
      expect(content.related_slugs.length).toBeGreaterThan(0);
      expect(content.related_slugs.every((slug) => slug in MACRO_GENRES)).toBe(
        true,
      );
    }

    for (const slug of ['classical', 'world', 'folk_acoustic', 'jazz_blues']) {
      const content = contents.find((item) => item.slug === slug);
      expect(content?.summary.toLowerCase()).toMatch(/broad|umbrella/);
    }
  });

  it('keeps content files aligned with the route registry', () => {
    expect(genreSlugs.every((slug) => slug in MACRO_GENRES)).toBe(true);
    expect('other' in MACRO_GENRES).toBe(true);
    expect('unclassified' in MACRO_GENRES).toBe(true);
  });
});

describe('genre page helpers', () => {
  it('guards bundled editorial content for curated subgenres', () => {
    expect(subGenreContents.length).toBeGreaterThan(0);
    for (const content of subGenreContents) {
      expect(content.slug.trim()).not.toBe('');
      expect(content.parent_slug in MACRO_GENRES).toBe(true);
      expect(content.title.trim()).not.toBe('');
      expect(content.tagline.trim()).not.toBe('');
      expect(content.origin_place.trim()).not.toBe('');
      expect(content.origin_years.trim()).not.toBe('');
      expect(content.summary.trim().split(/\s+/).length).toBeGreaterThanOrEqual(
        40,
      );
      expect(content.summary.trim().split(/\s+/).length).toBeLessThanOrEqual(
        60,
      );
      expect(content.reviewed).toBe(false);
      expect(content.sources_to_verify.length).toBeGreaterThan(0);
      expect(content.pillars).toHaveLength(3);
      expect(content.examples.length).toBeGreaterThanOrEqual(12);
      expect(content.examples.length).toBeLessThanOrEqual(20);
      const artists = [...content.pillars, ...content.examples];
      const names = artists.map((artist) => normalizeArtistName(artist.name));
      expect(new Set(names).size).toBe(names.length);
      expect(artists.every((artist) => artist.name.trim())).toBe(true);
      expect(content.pillars.every((artist) => artist.why?.trim())).toBe(true);
    }
  });

  it('resolves an accented subgenre alias to the catalog entry and parent', () => {
    const catalog: GenreCatalogEntry[] = [
      {
        slug: 'post-punk',
        label: 'Post-Punk',
        parent_slug: 'punk',
        level: 2,
        aliases: ['post punk'],
        wikipedia_title: 'Post-punk',
        lastfm_tag: 'post-punk',
        origin_years: 'late 1970s',
        has_editorial: true,
        artist_count: 12,
        viewer_seen_count: 3,
      },
    ];
    expect(normalizeGenreLookup('Póst Pünk')).toBe('post punk');
    expect(findGenreCatalogEntry(catalog, 'Póst Pünk')).toMatchObject({
      slug: 'post-punk',
      parent_slug: 'punk',
    });
  });

  it('uses existing artist profile images for bundled editorial picks', () => {
    const rock = getGenreContent('rock');
    expect(rock).not.toBeNull();
    const profiles = getEditorialArtistFallbacks(rock!, [
      {
        id: 'beatles-id',
        name: 'The Beatles',
        image_url_thumb: 'https://example.test/beatles-thumb.jpg',
        image_url_large: 'https://example.test/beatles-large.jpg',
        primary_macro: 'rock',
      },
    ]);

    const beatlesPillar = profiles.pillars.find(
      (artist) => artist.name === 'The Beatles',
    );
    expect(beatlesPillar).toMatchObject({
      id: 'beatles-id',
      image_url_thumb: 'https://example.test/beatles-thumb.jpg',
      image_url_large: 'https://example.test/beatles-large.jpg',
      isArtistLinked: true,
    });
  });

  it('resolves detailed and accented tags to their most-specific macro parent', () => {
    const rules = [
      { keyword: 'punk', macro_slug: 'rock', priority: 10 },
      { keyword: 'post-punk', macro_slug: 'indie', priority: 20 },
    ];
    expect(normalizeGenreTag('Post-Pünk')).toBe('post punk');
    expect(resolveGenreParentFromRules('Post-Pünk', rules)).toBe('indie');
    expect(resolveGenreParentFromRules('rock', rules)).toBe('rock');
    expect(resolveGenreParentFromRules('unknown microgenre', rules)).toBeNull();
  });

  it('filters seen and unseen artists and clamps progress to the feature count', () => {
    const artists = [
      { id: 'one', seen_count: 2 },
      { id: 'two', seen_count: 0 },
      { id: 'three', seen_count: 1 },
    ];
    expect(filterGenreArtists(artists, 'all')).toHaveLength(3);
    expect(
      filterGenreArtists(artists, 'seen').map((artist) => artist.id),
    ).toEqual(['one', 'three']);
    expect(
      filterGenreArtists(artists, 'unseen').map((artist) => artist.id),
    ).toEqual(['two']);
    expect(calculateGenreProgress(4, 23)).toBe(4);
    expect(calculateGenreProgress(24, 23)).toBe(23);
    expect(calculateGenreProgress(-1, 23)).toBe(0);
  });
});

function normalizeArtistName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

import { describe, expect, it } from '@jest/globals';
import {
  atlasPictureCacheKey,
  buildAtlasSteps,
  buildDensityGrid,
  buildTourStops,
  detectNewTerritories,
  filterTilt,
  getNewArrivals,
  touchFieldForces,
} from '../src/features/cloud/experience';
import type { CloudArtistData } from '../src/features/cloud/types';

const artist = (overrides: Partial<CloudArtistData> = {}): CloudArtistData => ({
  id: 'artist-1',
  name: 'Artist One',
  image_url_thumb: null,
  image_url_large: null,
  primary_macro: 'rock',
  macro_genres: ['rock'],
  genres: ['rock'],
  begin_year: 2000,
  log_count: 2,
  avg_rating: 4.5,
  max_rating: 5,
  first_seen: '2010-01-01',
  last_seen: '2020-01-01',
  venue_type_counts: {},
  logs: [],
  ...overrides,
});

describe('Cloud experience helpers', () => {
  it('detects only newly explored territories from the prior stats snapshot', () => {
    expect(
      detectNewTerritories(
        [
          {
            macro_slug: 'rock',
            concert_count: 1,
            artist_count: 1,
            average_rating: null,
            first_seen: null,
            last_seen: null,
          },
        ],
        [
          {
            macro_slug: 'rock',
            concert_count: 2,
            artist_count: 1,
            average_rating: null,
            first_seen: null,
            last_seen: null,
          },
          {
            macro_slug: 'jazz_blues',
            concert_count: 1,
            artist_count: 1,
            average_rating: null,
            first_seen: null,
            last_seen: null,
          },
        ],
      ).map(({ macro_slug }) => macro_slug),
    ).toEqual(['jazz_blues']);
  });

  it('only considers artists first logged after the last Cloud visit', () => {
    const artists = [artist(), artist({ id: 'artist-2', name: 'New' })];
    expect(
      getNewArrivals(
        artists,
        [
          { artist_id: 'artist-1', created_at: '2024-01-01T00:00:00Z' },
          { artist_id: 'artist-2', created_at: '2024-02-01T00:00:00Z' },
        ],
        '2024-01-15T00:00:00Z',
      ).map(({ id }) => id),
    ).toEqual(['artist-2']);
  });

  it('builds a concise tour for thin and one-genre users', () => {
    expect(buildTourStops([], null, []).map(({ id }) => id)).toEqual([
      'overview',
      'closing',
    ]);
    const oneGenre = buildTourStops(
      [
        {
          macro_slug: 'rock',
          concert_count: 2,
          artist_count: 1,
          average_rating: 4.5,
          first_seen: null,
          last_seen: null,
        },
      ],
      null,
      [artist()],
    );
    expect(oneGenre.map(({ id }) => id)).toContain('biggest-territory');
    expect(oneGenre.map(({ id }) => id)).toContain('most-seen-artist');
    expect(oneGenre.map(({ id }) => id)).toContain('highest-rated-artist');
  });

  it('includes optional identity and rare territory stops for richer data', () => {
    const stops = buildTourStops(
      [
        {
          macro_slug: 'rock',
          concert_count: 8,
          artist_count: 3,
          average_rating: 4,
          first_seen: null,
          last_seen: null,
        },
        {
          macro_slug: 'jazz_blues',
          concert_count: 1,
          artist_count: 1,
          average_rating: 5,
          first_seen: null,
          last_seen: null,
        },
      ],
      {
        musicalAge: {
          year: 1970,
          formattedText: 'A 70s soul',
          sublabel: 'Decade',
          coveragePercent: 100,
        },
        eraLabel: null,
        prototype: null,
        thinEraData: false,
        thinShowData: false,
        showsNeededForPrototype: 0,
      },
      [artist({ last_seen: '2024-01-01' })],
      'The Pioneer',
    );
    expect(stops.map(({ id }) => id)).toEqual(
      expect.arrayContaining(['rarest-territory', 'musical-age', 'closing']),
    );
  });

  it('builds a full nine-stop flight for a normal multi-genre log history', () => {
    const artists = [
      artist({
        id: 'a',
        name: 'First',
        log_count: 4,
        first_seen: '2001-01-01',
        last_seen: '2019-01-01',
      }),
      artist({
        id: 'b',
        name: 'Highest',
        log_count: 2,
        avg_rating: 5,
        first_seen: '2008-01-01',
        last_seen: '2022-01-01',
      }),
      artist({
        id: 'c',
        name: 'Recent',
        log_count: 1,
        avg_rating: 3.5,
        first_seen: '2012-01-01',
        last_seen: '2024-01-01',
      }),
    ];
    const stops = buildTourStops(
      [
        {
          macro_slug: 'rock',
          concert_count: 4,
          artist_count: 2,
          average_rating: 4.5,
          first_seen: '2001-01-01',
          last_seen: '2024-01-01',
        },
        {
          macro_slug: 'jazz_blues',
          concert_count: 2,
          artist_count: 1,
          average_rating: 5,
          first_seen: '2008-01-01',
          last_seen: '2022-01-01',
        },
        {
          macro_slug: 'pop',
          concert_count: 1,
          artist_count: 1,
          average_rating: 3.5,
          first_seen: '2012-01-01',
          last_seen: '2024-01-01',
        },
      ],
      {
        musicalAge: {
          year: 1980,
          formattedText: 'A new wave soul',
          sublabel: 'Decade',
          coveragePercent: 100,
        },
        eraLabel: '80s',
        prototype: null,
        thinEraData: false,
        thinShowData: false,
        showsNeededForPrototype: 0,
      },
      artists,
      'The Omnivore',
    );
    expect(stops).toHaveLength(9);
    expect(stops.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        'most-seen-artist',
        'highest-rated-artist',
        'oldest-artist',
        'most-recent-show',
        'rarest-territory',
        'musical-age',
      ]),
    );
  });

  it('filters and clamps tilt input', () => {
    expect(
      filterTilt({ pitch: 0, roll: 0 }, { pitch: 1, roll: -1 }, 0.5),
    ).toEqual({ pitch: 0.35, roll: -0.35 });
  });

  it('computes a quadratic radial force and caps affected nodes', () => {
    const forces = touchFieldForces(
      [
        { id: 'near', x: 10, y: 0 },
        { id: 'far', x: 89, y: 0 },
        { id: 'hub', x: 1, y: 0, type: 'hub' },
      ],
      { x: 0, y: 0 },
    );
    expect(forces).toHaveLength(2);
    expect(forces[0]?.id).toBe('near');
    expect(forces[0]?.dx).toBeGreaterThan(forces[1]?.dx ?? 1);
    expect(
      touchFieldForces(
        Array.from({ length: 100 }, (_, index) => ({
          id: `${index}`,
          x: index + 1,
          y: 0,
        })),
        { x: 0, y: 0 },
      ),
    ).toHaveLength(60);
  });

  it('steps annually for shorter histories and in capped quarters for long histories', () => {
    expect(
      buildAtlasSteps(['2019-01-01', '2020-01-01']).map(({ year }) => year),
    ).toEqual([2019, 2020]);
    const steps = buildAtlasSteps(['1990-01-01', '2024-01-01']);
    expect(steps).toHaveLength(30);
    expect(steps[0]?.quarter).toBeDefined();
    expect(steps.at(-1)?.cutoff).toBe('2024-12-31');
    expect(atlasPictureCacheKey('u1', steps[0]!)).toContain(
      'cloud-atlas:u1:v1:',
    );
  });

  it('builds the fixed low-resolution density grid', () => {
    const grid = buildDensityGrid([
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.5 },
    ]);
    expect(grid).toHaveLength(48 * 48);
    expect(Math.max(...grid)).toBe(255);
  });
});

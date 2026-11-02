import { describe, expect, it } from '@jest/globals';
import {
  buildTimelineItems,
  getPrimaryGenreInfo,
} from '../src/components/timeline/timelineGrouping';
import { useTimelineStore } from '../src/features/concerts/timelineStore';
import type { ConcertWithRelations } from '../src/features/concerts/types';

const enrichmentFields = {
  bio: null,
  bio_source: null,
  bio_url: null,
  bio_lang: null,
  bio_attribution: null,
  group_image_url: null,
  banner_image_url: null,
  musicbrainz_id: null,
  wikidata_id: null,
  wikipedia_title: null,
  lastfm_tags: [],
  enrichment_status: 'pending' as const,
  enrichment_error: null,
  enriched_at: null,
  last_enrichment_requested_at: null,
  user_edited_fields: [],
  begin_year: null,
  begin_year_source: null,
  is_on_tour: false,
  public_avg_rating: null,
  public_rating_count: 0,
  public_weighted_rating: null,
  tour_end_date: null,
  tour_last_checked_at: null,
  tour_start_date: null,
};

function createMockLog(
  overrides: Partial<ConcertWithRelations> = {},
): ConcertWithRelations {
  const id = overrides.id || `log-${Math.random().toString(36).slice(2, 9)}`;
  const date = overrides.event_date || '2026-10-15';
  const macroGenre = overrides.artist?.primary_macro || 'rock';

  return {
    id,
    user_id: 'user-1',
    artist_id: `artist-${id}`,
    event_date: date,
    venue_type: 'concert_hall_club',
    venue_name: 'Sala Razzmatazz',
    rating: 4.5,
    review: 'Incredible atmosphere and encore.',
    created_at: '2026-10-15T22:00:00Z',
    updated_at: '2026-10-15T22:00:00Z',
    artist: {
      id: `artist-${id}`,
      spotify_id: null,
      name: `Artist ${id}`,
      name_normalized: `artist ${id}`,
      image_url_large: null,
      image_url_thumb: null,
      genres: ['rock'],
      macro_genres: [macroGenre],
      primary_macro: macroGenre,
      popularity: 75,
      source: 'manual',
      created_by: 'user-1',
      last_synced_at: null,
      created_at: '2026-01-01T00:00:00Z',
      ...enrichmentFields,
    },
    ...overrides,
  };
}

describe('Timeline Grouping & Performance', () => {
  it('groups 1,000 seeded logs smoothly under 50ms', () => {
    // Generate 1,000 logs spanning multiple years and months
    const thousandLogs: ConcertWithRelations[] = [];
    const genres = ['rock', 'indie', 'pop', 'electronic', 'metal', 'punk'];

    const startTime = Date.now();
    for (let i = 1000; i >= 1; i--) {
      const year = 2020 + Math.floor(i / 150); // 2020 - 2026
      const monthNum = 1 + (i % 12);
      const dayNum = 1 + (i % 28);
      const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
      const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
      const genre = genres[i % genres.length] ?? 'rock';

      thousandLogs.push(
        createMockLog({
          id: `seed-${i}`,
          event_date: `${year}-${monthStr}-${dayStr}`,
          artist: {
            id: `artist-${i}`,
            spotify_id: null,
            name: `Seeded Band ${i}`,
            name_normalized: `seeded band ${i}`,
            image_url_large: null,
            image_url_thumb: null,
            genres: [genre],
            macro_genres: [genre],
            primary_macro: genre,
            popularity: 80,
            source: 'manual',
            created_by: 'user-1',
            last_synced_at: null,
            created_at: '2025-01-01T00:00:00Z',
            ...enrichmentFields,
          },
        }),
      );
    }

    const { items, stickyHeaderIndices } = buildTimelineItems(thousandLogs);
    const duration = Date.now() - startTime;

    // Must process 1,000 items in well under 50ms (acceptance criteria)
    expect(duration).toBeLessThan(50);
    expect(items.length).toBeGreaterThan(1000);
    expect(stickyHeaderIndices.length).toBeGreaterThan(0);

    // Verify indices are strictly increasing
    for (let j = 1; j < stickyHeaderIndices.length; j++) {
      expect(stickyHeaderIndices[j]!).toBeGreaterThan(
        stickyHeaderIndices[j - 1]!,
      );
    }
  });

  it('correctly creates Year and Month sticky headers for Newest first (descending)', () => {
    const logs = [
      createMockLog({ id: '1', event_date: '2026-10-15' }),
      createMockLog({ id: '2', event_date: '2026-10-12' }),
      createMockLog({ id: '3', event_date: '2026-09-04' }),
      createMockLog({ id: '4', event_date: '2025-12-31' }),
    ];

    const { items, stickyHeaderIndices } = buildTimelineItems(logs);

    expect(items[0]).toEqual({
      type: 'year-header',
      id: 'year-2026',
      year: '2026',
    });
    expect(items[1]).toEqual({
      type: 'month-header',
      id: 'month-2026-10',
      year: '2026',
      month: 'October',
      monthKey: '2026-10',
    });
    expect(items[2]?.type).toBe('log');
    expect(items[3]?.type).toBe('log');
    expect(items[4]).toEqual({
      type: 'month-header',
      id: 'month-2026-09',
      year: '2026',
      month: 'September',
      monthKey: '2026-09',
    });
    expect(items[5]?.type).toBe('log');
    expect(items[6]).toEqual({
      type: 'year-header',
      id: 'year-2025',
      year: '2025',
    });
    expect(items[7]).toEqual({
      type: 'month-header',
      id: 'month-2025-12',
      year: '2025',
      month: 'December',
      monthKey: '2025-12',
    });

    expect(stickyHeaderIndices).toEqual([0, 1, 4, 6, 7]);
  });

  it('correctly creates Year and Month sticky headers for Oldest first (ascending)', () => {
    const logs = [
      createMockLog({ id: '1', event_date: '2024-03-10' }),
      createMockLog({ id: '2', event_date: '2024-05-20' }),
      createMockLog({ id: '3', event_date: '2025-01-15' }),
    ];

    const { items, stickyHeaderIndices } = buildTimelineItems(logs);

    expect(items[0]).toEqual({
      type: 'year-header',
      id: 'year-2024',
      year: '2024',
    });
    expect(items[1]).toEqual({
      type: 'month-header',
      id: 'month-2024-03',
      year: '2024',
      month: 'March',
      monthKey: '2024-03',
    });
    expect(items[2]?.type).toBe('log');
    expect(items[3]).toEqual({
      type: 'month-header',
      id: 'month-2024-05',
      year: '2024',
      month: 'May',
      monthKey: '2024-05',
    });
    expect(items[4]?.type).toBe('log');
    expect(items[5]).toEqual({
      type: 'year-header',
      id: 'year-2025',
      year: '2025',
    });
    expect(items[6]).toEqual({
      type: 'month-header',
      id: 'month-2025-01',
      year: '2025',
      month: 'January',
      monthKey: '2025-01',
    });

    expect(stickyHeaderIndices).toEqual([0, 1, 3, 5, 6]);
  });

  it('calculates adjacent genre gradient colors between consecutive entries', () => {
    const rockLog = createMockLog({
      id: 'rock',
      event_date: '2026-10-15',
      artist: {
        id: 'a1',
        spotify_id: null,
        name: 'The Strokes',
        name_normalized: 'the strokes',
        image_url_large: null,
        image_url_thumb: null,
        genres: ['rock'],
        macro_genres: ['rock'],
        primary_macro: 'rock',
        popularity: 90,
        source: 'manual',
        created_by: null,
        last_synced_at: null,
        created_at: '2025-01-01',
        ...enrichmentFields,
      },
    });

    const indieLog = createMockLog({
      id: 'indie',
      event_date: '2026-10-10',
      artist: {
        id: 'a2',
        spotify_id: null,
        name: 'Arctic Monkeys',
        name_normalized: 'arctic monkeys',
        image_url_large: null,
        image_url_thumb: null,
        genres: ['indie'],
        macro_genres: ['indie'],
        primary_macro: 'indie',
        popularity: 95,
        source: 'manual',
        created_by: null,
        last_synced_at: null,
        created_at: '2025-01-01',
        ...enrichmentFields,
      },
    });

    const rockColor = getPrimaryGenreInfo(rockLog).color;
    const indieColor = getPrimaryGenreInfo(indieLog).color;

    const { items } = buildTimelineItems([rockLog, indieLog]);

    const logItems = items.filter(
      (item): item is Extract<typeof item, { type: 'log' }> =>
        item.type === 'log',
    );
    expect(logItems).toHaveLength(2);

    // First log gradients to indie
    expect(logItems[0]?.currentColor).toBe(rockColor);
    expect(logItems[0]?.adjacentColor).toBe(indieColor);

    // Last log falls back to its own color
    expect(logItems[1]?.currentColor).toBe(indieColor);
    expect(logItems[1]?.adjacentColor).toBe(indieColor);
  });
});

describe('Timeline Zustand Store', () => {
  it('toggles order and handles filters', () => {
    const store = useTimelineStore.getState();
    store.resetFilters();
    store.setOrder('newest');

    expect(useTimelineStore.getState().order).toBe('newest');
    store.setOrder('oldest');
    expect(useTimelineStore.getState().order).toBe('oldest');

    expect(store.hasActiveFilters()).toBe(false);
    expect(store.activeFilterCount()).toBe(0);

    store.toggleVenueType('festival');
    expect(useTimelineStore.getState().filters.venueTypes).toContain(
      'festival',
    );
    expect(useTimelineStore.getState().activeFilterCount()).toBe(1);

    store.toggleGenre('rock');
    expect(useTimelineStore.getState().filters.genres).toContain('rock');
    expect(useTimelineStore.getState().activeFilterCount()).toBe(2);

    store.setMinRating(4.5);
    expect(useTimelineStore.getState().filters.minRating).toBe(4.5);
    expect(useTimelineStore.getState().activeFilterCount()).toBe(3);
    store.setFilters({ maxRating: 4.75 });
    expect(useTimelineStore.getState().filters.maxRating).toBe(4.75);
    expect(useTimelineStore.getState().activeFilterCount()).toBe(4);
    expect(useTimelineStore.getState().hasActiveFilters()).toBe(true);

    store.resetFilters();
    expect(useTimelineStore.getState().hasActiveFilters()).toBe(false);
    expect(useTimelineStore.getState().filters.venueTypes).toHaveLength(0);
    expect(useTimelineStore.getState().filters.genres).toHaveLength(0);
    expect(useTimelineStore.getState().filters.minRating).toBeNull();
    expect(useTimelineStore.getState().filters.maxRating).toBeNull();
  });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { supabase } from '@lib/supabase';
import {
  fetchArtistsOnTour,
  fetchTrendingGlobal,
  selectUpcomingTourArtists,
} from '../src/features/home/api';
import type { HomeArtist } from '../src/features/home/types';

jest.mock('@lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

const rpc = jest.mocked(supabase.rpc);
const from = jest.mocked(supabase.from);

function queryBuilder(result: { data: unknown; error: null }) {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(async () => result),
    in: jest.fn(async () => result),
  };
  return builder;
}

describe('Home tour query', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: [], error: null } as never);
    from.mockReset();
  });

  it('does not restrict nearby results to the saved country', async () => {
    await fetchArtistsOnTour('all', 'ES', 41.39, 2.17, 150);

    expect(rpc).toHaveBeenCalledWith(
      'artists_on_tour',
      expect.objectContaining({
        p_country: undefined,
        p_lat: 41.39,
        p_lng: 2.17,
        p_radius_km: 150,
        p_limit: 100,
      }),
    );
  });

  it('uses the latest available weekly chart rather than requiring this week', async () => {
    const trendQuery = queryBuilder({
      data: [
        {
          id: 'latest-row',
          source: 'lastfm',
          region: 'GB',
          period_start: '2026-11-02',
          rank: 1,
          artist_id: 'latest-artist',
          artist_name: 'Latest Artist',
          fetched_at: '2026-11-09T04:17:00.000Z',
        },
        {
          id: 'old-row',
          source: 'lastfm',
          region: 'GB',
          period_start: '2026-10-26',
          rank: 1,
          artist_id: 'old-artist',
          artist_name: 'Old Artist',
          fetched_at: '2026-11-02T04:17:00.000Z',
        },
      ],
      error: null,
    });
    const artistsQuery = queryBuilder({
      data: [
        {
          id: 'latest-artist',
          name: 'Latest Artist',
          image_url_large: null,
          image_url_thumb: null,
          primary_macro: null,
          macro_genres: [],
        },
        {
          id: 'old-artist',
          name: 'Old Artist',
          image_url_large: null,
          image_url_thumb: null,
          primary_macro: null,
          macro_genres: [],
        },
      ],
      error: null,
    });
    from.mockImplementation(
      (table: string) =>
        (table === 'trending_global' ? trendQuery : artistsQuery) as never,
    );

    await expect(fetchTrendingGlobal('GB')).resolves.toEqual([
      expect.objectContaining({ id: 'latest-artist', rank: 1 }),
    ]);
    expect(trendQuery.eq).toHaveBeenCalledWith('region', 'GB');
    expect(trendQuery.order).toHaveBeenCalledWith('period_start', {
      ascending: false,
    });
  });

  it('keeps the country filter for non-radius tour browsing', async () => {
    await fetchArtistsOnTour('popular', 'ES', null, null, null);

    expect(rpc).toHaveBeenCalledWith(
      'artists_on_tour',
      expect.objectContaining({
        p_scope: 'popular',
        p_country: 'ES',
        p_radius_km: undefined,
      }),
    );
  });

  it('only shows up to five artists with events in the next 14 days, soonest first', () => {
    const now = new Date('2026-11-02T12:00:00.000Z');
    const artists: HomeArtist[] = Array.from({ length: 7 }, (_, index) => ({
      id: `artist-${index}`,
      name: `Artist ${index}`,
      image_url_large: null,
      image_url_thumb: null,
      primary_macro: null,
      macro_genres: [],
      next_date: `2026-11-${String(4 + index).padStart(2, '0')}`,
      distance_km: 25 + index,
    }));
    artists.push(
      {
        ...artists[0]!,
        id: 'later',
        next_date: '2026-11-17',
      },
      {
        ...artists[0]!,
        id: 'no-date',
        next_date: null,
      },
    );

    const selected = selectUpcomingTourArtists(artists, now);
    expect(selected.includesDatesBeyondWindow).toBe(false);
    expect(selected.artists).toHaveLength(5);
    expect(selected.artists.map((artist) => artist.next_date)).toEqual([
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ]);
  });

  it('uses distance as a tie-breaker for same-day events', () => {
    const now = new Date('2026-11-02T12:00:00.000Z');
    const artists = [
      {
        id: 'far',
        name: 'Far Artist',
        image_url_large: null,
        image_url_thumb: null,
        primary_macro: null,
        macro_genres: [],
        next_date: '2026-11-03',
        distance_km: 100,
      },
      {
        id: 'near',
        name: 'Near Artist',
        image_url_large: null,
        image_url_thumb: null,
        primary_macro: null,
        macro_genres: [],
        next_date: '2026-11-03',
        distance_km: 10,
      },
    ] satisfies HomeArtist[];

    expect(
      selectUpcomingTourArtists(artists, now).artists.map(({ id }) => id),
    ).toEqual(['near', 'far']);
  });

  it('shows the next available future dates when the 14-day window has no results', () => {
    const now = new Date('2026-11-02T12:00:00.000Z');
    const artists = [
      {
        id: 'later',
        name: 'Later Artist',
        image_url_large: null,
        image_url_thumb: null,
        primary_macro: null,
        macro_genres: [],
        next_date: '2026-12-10',
        distance_km: 15,
      },
      {
        id: 'sooner',
        name: 'Sooner Artist',
        image_url_large: null,
        image_url_thumb: null,
        primary_macro: null,
        macro_genres: [],
        next_date: '2026-11-25',
        distance_km: 35,
      },
    ] satisfies HomeArtist[];

    const selected = selectUpcomingTourArtists(artists, now);
    expect(selected.includesDatesBeyondWindow).toBe(true);
    expect(selected.artists.map(({ id }) => id)).toEqual(['sooner', 'later']);
  });
});

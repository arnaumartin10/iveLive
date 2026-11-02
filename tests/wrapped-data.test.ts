import { describe, expect, it } from '@jest/globals';
import { buildWrappedData } from '../src/features/wrapped/buildWrappedData';
import type {
  GenreStat,
  StatsOverview,
  VenueStat,
} from '../src/features/stats/types';

function makeOverview(total: number): StatsOverview {
  const hasShows = total > 0;
  const has200 = total >= 200;
  const topArtistCount = hasShows ? (has200 ? 12 : 1) : 0;
  return {
    total_shows: total,
    unique_artists: hasShows ? (has200 ? 42 : 1) : 0,
    unique_venues: hasShows ? (has200 ? 8 : 1) : 0,
    active_years: hasShows ? (has200 ? 4 : 1) : 0,
    avg_rating: hasShows ? (has200 ? 4.2 : 4) : null,
    five_star_count: has200 ? 14 : 0,
    first_show: hasShows ? { date: '2022-02-03', artist: 'Live Artist' } : null,
    latest_show: hasShows
      ? { date: has200 ? '2026-08-10' : '2026-08-10', artist: 'Live Artist' }
      : null,
    most_seen_artist: hasShows
      ? {
          artist: 'Live Artist',
          image_url: 'https://images.test/artist.jpg',
          count: topArtistCount,
        }
      : null,
    top_artists_by_count: hasShows
      ? [
          {
            artist_id: 'a1',
            artist: 'Live Artist',
            image_url: 'https://images.test/artist.jpg',
            count: topArtistCount,
            avg_rating: 4.2,
            first_seen: '2022-02-03',
            last_seen: '2026-08-10',
          },
          ...(has200
            ? [
                {
                  artist_id: 'a2',
                  artist: 'Second Artist',
                  count: 9,
                  first_seen: '2024-01-01',
                  last_seen: '2025-01-01',
                },
              ]
            : []),
        ]
      : [],
    top_artists_by_rating: hasShows
      ? [
          {
            artist_id: 'a1',
            artist: 'Live Artist',
            count: topArtistCount,
            avg_rating: 4.2,
          },
        ]
      : [],
    most_visited_venue: hasShows
      ? { name: 'Big Room', count: has200 ? 20 : 1 }
      : null,
    top_venues_by_name: hasShows
      ? [{ name: 'Big Room', venue_type: 'festival', count: has200 ? 20 : 1 }]
      : [],
    repeat_artists: has200 ? 12 : 0,
    one_time_artists: has200 ? 30 : hasShows ? 1 : 0,
    busiest_month: hasShows ? { month: 7, count: has200 ? 26 : 1 } : null,
    busiest_weekday: hasShows ? { weekday: 6, count: has200 ? 55 : 1 } : null,
    busiest_year: hasShows ? { year: 2025, count: 80 } : null,
    shows_by_month: Array.from({ length: 12 }, (_item, index) => ({
      month: index + 1,
      count: has200 ? index + 1 : index === 6 && hasShows ? 1 : 0,
    })),
    shows_by_weekday: Array.from({ length: 7 }, (_item, index) => ({
      weekday: index + 1,
      count: 0,
    })),
    shows_by_year: hasShows ? [{ year: 2025, count: total }] : [],
    years: hasShows ? [2025] : [],
    longest_streak_weeks: has200 ? 9 : hasShows ? 1 : 0,
    longest_gap_days: has200 ? 140 : 0,
    most_shows_in_one_week: has200 ? 8 : hasShows ? 1 : 0,
    most_shows_in_one_day: has200 ? 5 : hasShows ? 1 : 0,
    rating_histogram: Array.from({ length: 10 }, (_item, index) => ({
      rating: (index + 1) / 2,
      count: has200 ? (index === 8 ? 40 : 2) : index === 7 && hasShows ? 1 : 0,
    })),
    rating_by_venue_type: [],
    best_rated_venue_type: null,
    best_rated_year: null,
  };
}

function makeGenres(total: number): GenreStat[] {
  if (total === 0) return [];
  return [
    {
      macro_genre: 'rock',
      log_count: total >= 200 ? 100 : 1,
      artist_count: total >= 200 ? 20 : 1,
      avg_rating: 4.3,
      top_artist: null,
    },
    ...(total >= 200
      ? [
          {
            macro_genre: 'indie',
            log_count: 70,
            artist_count: 14,
            avg_rating: 4.1,
            top_artist: null,
          },
          {
            macro_genre: 'pop',
            log_count: 30,
            artist_count: 8,
            avg_rating: 4.2,
            top_artist: null,
          },
        ]
      : []),
  ];
}

function makeVenues(total: number): VenueStat[] {
  if (total === 0) return [];
  return [
    {
      venue_type: 'festival',
      log_count: total >= 200 ? 110 : 1,
      artist_count: total >= 200 ? 30 : 1,
      avg_rating: 4.2,
      top_artist: null,
    },
    ...(total >= 200
      ? [
          {
            venue_type: 'concert_hall_club' as const,
            log_count: 70,
            artist_count: 25,
            avg_rating: 4.4,
            top_artist: null,
          },
          {
            venue_type: 'stadium' as const,
            log_count: 20,
            artist_count: 15,
            avg_rating: 4,
            top_artist: null,
          },
        ]
      : []),
  ];
}

describe('buildWrappedData', () => {
  it('builds ordered complete slides with exact percentage totals for a large recap', () => {
    const data = buildWrappedData(
      makeOverview(200),
      makeGenres(200),
      makeVenues(200),
      null,
    );
    expect(data.slides).toEqual([
      'intro',
      'total',
      'top-artist',
      'top-artists',
      'genres',
      'venues',
      'month',
      'records',
      'taste',
      'ratings',
      'wall-of-fame',
      'badges',
      'outro',
    ]);
    expect(
      data.topGenres.reduce((sum, genre) => sum + genre.percentage, 0),
    ).toBe(100);
    expect(
      data.venueMix.reduce((sum, venue) => sum + venue.percentage, 0),
    ).toBe(100);
    expect(data.topArtist).toMatchObject({
      firstSeen: '2022-02-03',
      lastSeen: '2026-08-10',
    });
  });

  it('keeps a one-show story short and skips sections without enough data', () => {
    const data = buildWrappedData(
      makeOverview(1),
      makeGenres(1),
      makeVenues(1),
      2026,
    );
    expect(data.year).toBe(2026);
    expect(data.slides).toEqual(['intro', 'total', 'badges', 'outro']);
    expect(data.earnedBadges).toContain('First Festival');
  });

  it('retains only safe intro/outro slides for an empty scope', () => {
    const data = buildWrappedData(
      makeOverview(0),
      makeGenres(0),
      makeVenues(0),
      2030,
    );
    expect(data.slides).toEqual(['intro', 'outro']);
    expect(data.topArtist).toBeNull();
    expect(data.topGenres).toEqual([]);
    expect(data.venueMix).toEqual([]);
  });
});

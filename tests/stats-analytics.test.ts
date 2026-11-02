import { describe, expect, it } from '@jest/globals';
import {
  buildInsights,
  computeBadges,
  genreSharesExcludingUnclassified,
  getConcertArchetype,
  largestRemainder,
} from '../src/features/stats/analytics';

describe('largestRemainder', () => {
  it('allocates exactly 100 points and breaks equal remainders by input order', () => {
    expect(largestRemainder([1, 1, 1])).toEqual([34, 33, 33]);
    expect(
      largestRemainder([2, 3, 5]).reduce((sum, value) => sum + value, 0),
    ).toBe(100);
  });

  it('handles empty and zero-weight input deterministically', () => {
    expect(largestRemainder([])).toEqual([]);
    expect(largestRemainder([0, 0, 0])).toEqual([100, 0, 0]);
    expect(
      largestRemainder([1, 2], 7).reduce((sum, value) => sum + value, 0),
    ).toBe(7);
  });
});

describe('genreSharesExcludingUnclassified', () => {
  it('keeps unclassified visible at zero percent without diluting genre shares', () => {
    expect(
      genreSharesExcludingUnclassified(
        [6, 4, 10],
        ['rock', 'indie', 'unclassified'],
      ),
    ).toEqual([60, 40, 0]);
    expect(genreSharesExcludingUnclassified([4], ['unclassified'])).toEqual([
      0,
    ]);
  });
});

describe('buildInsights', () => {
  it('suppresses all insights when the sample is too small', () => {
    expect(
      buildInsights({
        total_shows: 2,
        busiest_month: { month: 7, count: 2 },
        most_seen_artist: { artist: 'Artist', count: 2 },
        longest_streak_weeks: 2,
      }),
    ).toEqual([]);
  });

  it('orders available insights by priority', () => {
    const insights = buildInsights({
      total_shows: 5,
      busiest_month: { month: 7, count: 3 },
      most_seen_artist: { artist: 'Manel', count: 2 },
      longest_streak_weeks: 3,
    });
    expect(insights.map((insight) => insight.id)).toEqual([
      'most-seen-artist',
      'busiest-month',
      'longest-streak',
    ]);
  });
});

describe('computeBadges', () => {
  it('returns earned milestones and capped progress for the next target', () => {
    const badges = computeBadges({
      total_shows: 12,
      five_star_count: 2,
      active_years: 1,
      genre_count: 2,
      venue_counts: { festival: 1 },
    });
    expect(badges.find((badge) => badge.id === 'shows-10')?.earned).toBe(true);
    expect(badges.find((badge) => badge.id === 'shows-25')).toMatchObject({
      progress: 12,
      target: 25,
      earned: false,
    });
  });

  it('awards Completionist only after all fourteen recognized genres are explored', () => {
    const makeBadges = (genre_count: number) =>
      computeBadges({
        total_shows: 14,
        five_star_count: 0,
        active_years: 1,
        genre_count,
        venue_counts: {},
      });
    expect(
      makeBadges(13).find((badge) => badge.id === 'completionist'),
    ).toMatchObject({
      progress: 13,
      target: 14,
      earned: false,
    });
    expect(
      makeBadges(14).find((badge) => badge.id === 'completionist')?.earned,
    ).toBe(true);
  });
});

describe('getConcertArchetype', () => {
  it('is deterministic and prioritizes local and exploration traits', () => {
    expect(
      getConcertArchetype({ festa_major: 5, festival: 10 }, 20).title,
    ).toBe('The Local Hero');
    expect(
      getConcertArchetype({ festival: 3, concert_hall_club: 1 }, 70).title,
    ).toBe('The Explorer');
    expect(getConcertArchetype({ stadium: 2 }, 20)).toEqual(
      getConcertArchetype({ stadium: 2 }, 20),
    );
  });
});

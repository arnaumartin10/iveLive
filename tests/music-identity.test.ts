import { describe, expect, it } from '@jest/globals';
import {
  computeIdentity,
  computeMusicalAge,
  computePrototype,
  computeEraLabel,
  getPre2000sShare,
  get2010sPlusShare,
  getActiveErasCount,
  getMaxSingleEraShare,
  MIN_SHOWS_FOR_PROTOTYPE,
  MIN_SHOWS_WITH_ERA_FOR_MUSICAL_AGE,
} from '../src/features/identity/logic';
import type { MusicIdentityData } from '../src/features/identity/types';

function makeMockData(overrides: Partial<MusicIdentityData> = {}): MusicIdentityData {
  return {
    shows: 10,
    unique_artists: 8,
    venue_distribution: {
      concert_hall_club: { count: 3, share: 30 },
      indoor_arena: { count: 3, share: 30 },
      festival: { count: 4, share: 40 },
    },
    genre_distribution: {
      rock: { count: 4, share: 40 },
      indie: { count: 3, share: 30 },
      electronic: { count: 3, share: 30 },
    },
    repeat_artist_ratio: 20,
    diversity_score: 55,
    era_distribution: [
      { bucket: 'pre-70s', decade: 1960, count: 0, share: 0 },
      { bucket: '70s', decade: 1970, count: 0, share: 0 },
      { bucket: '80s', decade: 1980, count: 0, share: 0 },
      { bucket: '90s', decade: 1990, count: 0, share: 0 },
      { bucket: '00s', decade: 2000, count: 5, share: 50 },
      { bucket: '10s', decade: 2010, count: 5, share: 50 },
      { bucket: '20s', decade: 2020, count: 0, share: 0 },
      { bucket: 'unknown', decade: null, count: 0, share: 0 },
    ],
    era_coverage: {
      known_artists: 8,
      total_artists: 8,
      percentage: 100,
    },
    musical_age: 1998,
    weighted_median_begin_year: 2000,
    oldest_artist: { name: 'Pink Floyd', begin_year: 1965 },
    newest_artist: { name: 'Fontaines D.C.', begin_year: 2017 },
    share_of_new_artists: 15,
    average_rating_by_venue: {
      concert_hall_club: 4.5,
      festival: 4.0,
    },
    ...overrides,
  };
}

describe('Music Identity Logic', () => {
  describe('Empty and Thin Data Handling', () => {
    it('returns Emerging Taste when shows < 3', () => {
      const data = makeMockData({ shows: 2 });
      const prototype = computePrototype(data);
      expect(prototype.id).toBe('emerging_taste');
      expect(prototype.title).toBe('Emerging Taste');

      const fullIdentity = computeIdentity(data);
      expect(fullIdentity.thinShowData).toBe(true);
      expect(fullIdentity.showsNeededForPrototype).toBe(1);
    });

    it('identifies thin era data when known artists < 3', () => {
      const data = makeMockData({
        era_coverage: { known_artists: 1, total_artists: 5, percentage: 20 },
      });
      const fullIdentity = computeIdentity(data);
      expect(fullIdentity.thinEraData).toBe(true);
      expect(fullIdentity.musicalAge).toBeNull();
    });
  });

  describe('The 10 Prototypes', () => {
    it('1. classifies The Vault when >=50% shows are from pre-2000s', () => {
      const data = makeMockData({
        era_distribution: [
          { bucket: 'pre-70s', decade: 1960, count: 1, share: 10 },
          { bucket: '70s', decade: 1970, count: 2, share: 20 },
          { bucket: '80s', decade: 1980, count: 2, share: 20 },
          { bucket: '90s', decade: 1990, count: 1, share: 10 },
          { bucket: '00s', decade: 2000, count: 2, share: 20 },
          { bucket: '10s', decade: 2010, count: 2, share: 20 },
          { bucket: '20s', decade: 2020, count: 0, share: 0 },
        ],
      });
      // pre-2000s share is 10 + 20 + 20 + 10 = 60% >= 50%
      const prototype = computePrototype(data);
      expect(prototype.id).toBe('the_vault');
      expect(prototype.title).toBe('The Vault');
    });

    it('2. classifies The Timeless when balanced across 3+ eras with no era >40%', () => {
      const data = makeMockData({
        era_distribution: [
          { bucket: 'pre-70s', decade: 1960, count: 0, share: 0 },
          { bucket: '70s', decade: 1970, count: 2, share: 20 },
          { bucket: '80s', decade: 1980, count: 2, share: 20 },
          { bucket: '90s', decade: 1990, count: 0, share: 0 },
          { bucket: '00s', decade: 2000, count: 3, share: 30 },
          { bucket: '10s', decade: 2010, count: 3, share: 30 },
          { bucket: '20s', decade: 2020, count: 0, share: 0 },
        ],
      });
      // 4 active eras, max share is 30% <= 40%
      const prototype = computePrototype(data);
      expect(prototype.id).toBe('the_timeless');
      expect(prototype.title).toBe('The Timeless');
    });

    it('3. classifies The Modernist when >=70% shows are from 2010s+', () => {
      const data = makeMockData({
        era_distribution: [
          { bucket: 'pre-70s', decade: 1960, count: 0, share: 0 },
          { bucket: '70s', decade: 1970, count: 0, share: 0 },
          { bucket: '80s', decade: 1980, count: 0, share: 0 },
          { bucket: '90s', decade: 1990, count: 1, share: 10 },
          { bucket: '00s', decade: 2000, count: 1, share: 10 },
          { bucket: '10s', decade: 2010, count: 4, share: 40 },
          { bucket: '20s', decade: 2020, count: 4, share: 40 },
        ],
      });
      // 10s + 20s = 80% >= 70%
      const prototype = computePrototype(data);
      expect(prototype.id).toBe('the_modernist');
      expect(prototype.title).toBe('The Modernist');
    });

    it('4. classifies The Pioneer when share of new artists is >= 40%', () => {
      const data = makeMockData({
        share_of_new_artists: 65,
      });
      const prototype = computePrototype(data);
      expect(prototype.id).toBe('the_pioneer');
      expect(prototype.title).toBe('The Pioneer');
    });

    it('5. classifies The Devotee when repeat_artist_ratio > 0.45 (or > 45%)', () => {
      const data = makeMockData({
        repeat_artist_ratio: 0.55,
      });
      const prototype = computePrototype(data);
      expect(prototype.id).toBe('the_devotee');
      expect(prototype.title).toBe('The Devotee');
    });

    it('6. classifies The Omnivore when diversity >= 80 and >= 4 macro-genres', () => {
      const data = makeMockData({
        diversity_score: 88,
        genre_distribution: {
          rock: { count: 3, share: 25 },
          electronic: { count: 3, share: 25 },
          hip_hop: { count: 2, share: 25 },
          jazz_blues: { count: 2, share: 25 },
        },
      });
      const prototype = computePrototype(data);
      expect(prototype.id).toBe('the_omnivore');
      expect(prototype.title).toBe('The Omnivore');
    });

    it('7. classifies The Specialist when single genre > 60%', () => {
      const data = makeMockData({
        genre_distribution: {
          metal: { count: 8, share: 80 },
          rock: { count: 2, share: 20 },
        },
      });
      const prototype = computePrototype(data);
      expect(prototype.id).toBe('the_specialist');
      expect(prototype.title).toBe('The Specialist');
    });

    it('8. classifies The Club Rat when club venue share > 70%', () => {
      const data = makeMockData({
        venue_distribution: {
          concert_hall_club: { count: 8, share: 80 },
          festival: { count: 2, share: 20 },
        },
      });
      const prototype = computePrototype(data);
      expect(prototype.id).toBe('the_club_rat');
      expect(prototype.title).toBe('The Club Rat');
    });

    it('9. classifies The Stadium Chaser when stadium/arena/festival > 70%', () => {
      const data = makeMockData({
        venue_distribution: {
          stadium: { count: 5, share: 50 },
          festival: { count: 4, share: 40 },
          concert_hall_club: { count: 1, share: 10 },
        },
      });
      // 50 + 40 = 90% > 70%
      const prototype = computePrototype(data);
      expect(prototype.id).toBe('the_stadium_chaser');
      expect(prototype.title).toBe('The Stadium Chaser');
    });

    it('10. falls back to Eclectic Listener when no specific threshold met', () => {
      const data = makeMockData({
        diversity_score: 50,
        repeat_artist_ratio: 10,
        share_of_new_artists: 10,
        venue_distribution: {
          concert_hall_club: { count: 4, share: 40 },
          stadium: { count: 3, share: 30 },
          other: { count: 3, share: 30 },
        },
        genre_distribution: {
          rock: { count: 5, share: 50 },
          pop: { count: 5, share: 50 },
        },
        era_distribution: [
          { bucket: '90s', decade: 1990, count: 4, share: 45 },
          { bucket: '00s', decade: 2000, count: 5, share: 55 },
        ],
      });
      const prototype = computePrototype(data);
      expect(prototype.id).toBe('eclectic_listener');
      expect(prototype.title).toBe('Eclectic Listener');
    });
  });

  describe('Deterministic Tie-breaking & Runner-up', () => {
    it('picks higher margin and populates runner-up correctly when two qualify', () => {
      // Qualifies for both The Vault (60% vs 50% => margin 10)
      // and The Specialist (80% vs 60% => margin 20)
      const data = makeMockData({
        era_distribution: [
          { bucket: '80s', decade: 1980, count: 3, share: 30 },
          { bucket: '90s', decade: 1990, count: 3, share: 30 },
          { bucket: '00s', decade: 2000, count: 4, share: 40 },
        ],
        genre_distribution: {
          rock: { count: 8, share: 80 },
          indie: { count: 2, share: 20 },
        },
      });
      const prototype = computePrototype(data);
      expect(prototype.id).toBe('the_specialist');
      expect(prototype.runnerUp).toBeDefined();
      expect(prototype.runnerUp?.id).toBe('the_vault');
      expect(prototype.runnerUp?.title).toBe('The Vault');
    });
  });

  describe('Musical Age Calculation', () => {
    it('calculates musical age year directly without birth year', () => {
      const age = computeMusicalAge({
        rawMusicalAge: 1984.4,
        showsWithKnownEra: 5,
      });
      expect(age).toBeDefined();
      expect(age?.year).toBe(1984);
      expect(age?.formattedText).toBe('Musical age: 1984');
    });

    it('calculates offset vs birth year when birth year is known', () => {
      const age = computeMusicalAge({
        rawMusicalAge: 1984,
        showsWithKnownEra: 5,
        birthYear: 1970,
      });
      expect(age?.differenceFromBirthYear).toBe(14);
      expect(age?.formattedText).toBe('+14 years vs your birth year');
    });

    it('calculates negative offset when musical age is newer than birth year', () => {
      const age = computeMusicalAge({
        rawMusicalAge: 2005,
        showsWithKnownEra: 5,
        birthYear: 2000,
      });
      expect(age?.differenceFromBirthYear).toBe(5);
      expect(age?.formattedText).toBe('+5 years vs your birth year');
    });

    it('returns null if fewer than 3 shows have known debut years', () => {
      const age = computeMusicalAge({
        rawMusicalAge: 1984,
        showsWithKnownEra: 2,
      });
      expect(age).toBeNull();
    });
  });

  describe('Era Labels', () => {
    it('creates 90s Alt-Rock leaning label', () => {
      const eraDist = [
        { bucket: '90s' as const, decade: 1990, count: 8, share: 80 },
        { bucket: '00s' as const, decade: 2000, count: 2, share: 20 },
      ];
      const genreDist = {
        rock: { count: 8, share: 80 },
      };
      expect(computeEraLabel(eraDist, genreDist)).toBe('90s Alt-Rock leaning');
    });

    it('creates Golden-era Hip-Hop label', () => {
      const eraDist = [
        { bucket: '90s' as const, decade: 1990, count: 8, share: 80 },
      ];
      const genreDist = {
        hip_hop: { count: 8, share: 80 },
      };
      expect(computeEraLabel(eraDist, genreDist)).toBe('Golden-era Hip-Hop');
    });

    it('creates Contemporary Electronic label', () => {
      const eraDist = [
        { bucket: '20s' as const, decade: 2020, count: 8, share: 80 },
      ];
      const genreDist = {
        electronic: { count: 8, share: 80 },
      };
      expect(computeEraLabel(eraDist, genreDist)).toBe('Contemporary Electronic');
    });

    it('creates Classic 70s Rock label', () => {
      const eraDist = [
        { bucket: '70s' as const, decade: 1970, count: 8, share: 80 },
      ];
      const genreDist = {
        rock: { count: 8, share: 80 },
      };
      expect(computeEraLabel(eraDist, genreDist)).toBe('Classic 70s Rock');
    });

    it('creates 80s Retro-Pop label', () => {
      const eraDist = [
        { bucket: '80s' as const, decade: 1980, count: 8, share: 80 },
      ];
      const genreDist = {
        pop: { count: 8, share: 80 },
      };
      expect(computeEraLabel(eraDist, genreDist)).toBe('80s Retro-Pop');
    });

    it('creates 2000s Indie Revival label', () => {
      const eraDist = [
        { bucket: '00s' as const, decade: 2000, count: 8, share: 80 },
      ];
      const genreDist = {
        indie: { count: 8, share: 80 },
      };
      expect(computeEraLabel(eraDist, genreDist)).toBe('2000s Indie Revival');
    });

    it('falls back to Eclectic Mix when empty', () => {
      expect(computeEraLabel([], {})).toBe('Eclectic Mix');
    });
  });

  describe('Era Helper Metrics', () => {
    const eraDist = [
      { bucket: '70s' as const, decade: 1970, count: 2, share: 20 },
      { bucket: '90s' as const, decade: 1990, count: 3, share: 30 },
      { bucket: '10s' as const, decade: 2010, count: 5, share: 50 },
    ];

    it('computes pre-2000s share correctly', () => {
      expect(getPre2000sShare(eraDist)).toBe(50);
    });

    it('computes 2010s+ share correctly', () => {
      expect(get2010sPlusShare(eraDist)).toBe(50);
    });

    it('computes active eras count correctly', () => {
      expect(getActiveErasCount(eraDist)).toBe(3);
    });

    it('computes max single era share correctly', () => {
      expect(getMaxSingleEraShare(eraDist)).toBe(50);
    });
  });
});

import { describe, expect, it } from '@jest/globals';
import {
  isLikelyTributeEvent,
  normalizeTourName,
  parseTicketmasterCoordinates,
  parseTicketmasterStart,
  parseTicketmasterStatus,
} from '../supabase/functions/_shared/tourData';
import { parseLastFmArtistChart } from '../supabase/functions/_shared/lastFmChart';
import { utcWeekStartDate } from '../supabase/functions/_shared/week';

describe('home tour provider parsing', () => {
  it('normalizes accented names and punctuation before exact matching', () => {
    expect(normalizeTourName('Beyoncé & The Band!')).toBe(
      'beyonce and the band',
    );
  });

  describe('Last.fm chart response parsing', () => {
    it('parses the global chart response shape', () => {
      expect(
        parseLastFmArtistChart({
          artists: { artist: [{ name: 'Global Artist', mbid: 'abc-123' }] },
        }),
      ).toEqual([{ name: 'Global Artist', mbid: 'abc-123' }]);
    });

    describe('UTC week start helper', () => {
      it('returns Monday as the start of the UTC week', () => {
        expect(utcWeekStartDate(new Date('2026-10-27T14:00:00.000Z'))).toBe(
          '2026-10-26',
        );
        expect(utcWeekStartDate(new Date('2026-11-01T23:59:00.000Z'))).toBe(
          '2026-10-26',
        );
      });
    });

    it('parses the country chart response shape', () => {
      expect(
        parseLastFmArtistChart({
          topartists: { artist: [{ name: 'Country Artist', mbid: '' }] },
        }),
      ).toEqual([{ name: 'Country Artist', mbid: null }]);
    });

    it('skips malformed entries and distinguishes invalid response shapes', () => {
      expect(
        parseLastFmArtistChart({
          topartists: {
            artist: [null, { name: '  ' }, { name: 'Valid Artist' }],
          },
        }),
      ).toEqual([{ name: 'Valid Artist', mbid: null }]);
      expect(
        parseLastFmArtistChart({ message: 'unexpected response' }),
      ).toBeNull();
    });
  });

  it('filters tribute and cover events for an exact artist', () => {
    expect(
      isLikelyTributeEvent(
        'The Taylor Swift Experience',
        ['Taylor Swift Tribute'],
        'Taylor Swift',
      ),
    ).toBe(true);
    expect(
      isLikelyTributeEvent(
        'Taylor Swift: The Eras Tour',
        ['Taylor Swift'],
        'Taylor Swift',
      ),
    ).toBe(false);
  });

  it('parses provider statuses into stable application values', () => {
    expect(parseTicketmasterStatus('onsale')).toBe('on_sale');
    expect(parseTicketmasterStatus('CANCELLED')).toBe('cancelled');
    expect(parseTicketmasterStatus('not-a-status')).toBe('unknown');
  });

  it('parses venue coordinates for distance-based tour results', () => {
    expect(
      parseTicketmasterCoordinates({
        latitude: '41.3851',
        longitude: '2.1734',
      }),
    ).toEqual({ latitude: 41.3851, longitude: 2.1734 });
    expect(
      parseTicketmasterCoordinates({ latitude: 91, longitude: 2 }),
    ).toBeNull();
    expect(
      parseTicketmasterCoordinates({ latitude: 'nope', longitude: 2 }),
    ).toBeNull();
  });

  it('parses valid local dates and rejects malformed provider dates', () => {
    expect(
      parseTicketmasterStart({
        localDate: '2027-06-12',
        localTime: '20:30:00',
      })?.eventDate,
    ).toBe('2027-06-12');
    expect(parseTicketmasterStart({ localDate: 'not-a-date' })).toBeNull();
  });
});

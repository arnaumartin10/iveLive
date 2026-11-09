import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { supabase } from '@lib/supabase';
import {
  normalizeConcertArtistName,
  findExactTicketmasterAttraction,
  parseTicketmasterConcerts,
} from '../supabase/functions/_shared/concertSearch';
import {
  concertDateRangeError,
  concertWishlistDraft,
  findWishlistConcert,
  type OfficialConcertSearchResult,
} from '../src/features/home/concertSearch';
import { searchOfficialConcerts } from '../src/features/home/concertSearchApi';
import type { WishlistItem } from '../src/features/profile/types';

jest.mock('@lib/supabase', () => ({
  supabase: {
    functions: { invoke: jest.fn() },
  },
}));

const invoke = jest.mocked(supabase.functions.invoke);

describe('Ticketmaster concert normalization', () => {
  it('only resolves a Ticketmaster artist whose normalized name is exact', () => {
    const attractions = {
      _embedded: {
        attractions: [
          { id: 'tribute', name: 'Oasis Tribute' },
          { id: 'official-oasis', name: 'Oasis' },
        ],
      },
    };

    expect(findExactTicketmasterAttraction(attractions, 'Oasis')).toEqual({
      id: 'official-oasis',
      name: 'Oasis',
    });
    expect(
      findExactTicketmasterAttraction(
        {
          _embedded: {
            attractions: [{ id: 'tribute', name: 'Oasis Tribute' }],
          },
        },
        'Oasis',
      ),
    ).toBeNull();
  });

  it('keeps upcoming matching artist events with venue, lineup and safe links', () => {
    const results = parseTicketmasterConcerts(
      {
        _embedded: {
          events: [
            {
              id: 'event-2',
              name: 'Björk — Cornucopia',
              url: 'https://tickets.example.com/event-2',
              dates: { start: { localDate: '2027-06-02' } },
              _embedded: {
                attractions: [
                  { id: 'bjork-id', name: 'Bjork' },
                  { id: 'guest-id', name: 'Special Guest' },
                ],
                venues: [
                  {
                    name: 'O2 Arena',
                    city: { name: 'London' },
                    country: { name: 'United Kingdom' },
                  },
                ],
              },
            },
            {
              id: 'event-1',
              name: 'Björk — Live',
              url: 'http://tickets.example.com/event-1',
              dates: { start: { localDate: '2027-05-01' } },
              _embedded: {
                attractions: [{ id: 'bjork-id', name: 'Björk' }],
                venues: [],
              },
            },
          ],
        },
      },
      'Björk',
      'bjork-id',
    );

    expect(normalizeConcertArtistName('Björk')).toBe('bjork');
    expect(results).toEqual([
      expect.objectContaining({
        eventId: 'event-1',
        artistName: 'Björk',
        ticketUrl: null,
      }),
      expect.objectContaining({
        eventId: 'event-2',
        artistName: 'Björk',
        lineup: ['Bjork', 'Special Guest'],
        venueName: 'O2 Arena',
        city: 'London',
        country: 'United Kingdom',
        ticketUrl: 'https://tickets.example.com/event-2',
      }),
    ]);
  });

  it('ignores malformed events, unmatched artists and duplicate event IDs', () => {
    expect(
      parseTicketmasterConcerts(
        {
          _embedded: {
            events: [
              null,
              { id: 'wrong', name: 'Other', _embedded: { attractions: [] } },
              {
                id: 'tribute-event',
                name: 'Oasis Tribute Night',
                dates: { start: { localDate: '2027-01-01' } },
                _embedded: {
                  attractions: [{ id: 'tribute', name: 'Oasis Tribute' }],
                },
              },
              {
                id: 'same',
                name: 'Artist A',
                dates: { start: { localDate: '2027-01-01' } },
                _embedded: { attractions: [{ id: 'a', name: 'Artist A' }] },
              },
              {
                id: 'same',
                name: 'Artist A duplicate',
                dates: { start: { localDate: '2027-01-02' } },
                _embedded: { attractions: [{ id: 'a', name: 'Artist A' }] },
              },
            ],
          },
        },
        'Artist A',
        'a',
      ),
    ).toHaveLength(1);
    expect(parseTicketmasterConcerts(null, 'Artist A', 'a')).toEqual([]);
  });
});

describe('official concert search client', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('calls the authenticated search function and validates result fields', async () => {
    const result: OfficialConcertSearchResult = {
      eventId: 'ticketmaster-1',
      eventName: 'Radiohead — Live',
      artistName: 'Radiohead',
      artistId: '11111111-1111-4111-8111-111111111111',
      lineup: ['Radiohead'],
      eventDate: '2027-06-02',
      venueName: 'O2 Arena',
      city: 'London',
      country: 'United Kingdom',
      ticketUrl: 'https://tickets.example.com/show',
    };
    invoke.mockResolvedValue({
      data: { results: [result] },
      error: null,
    } as never);

    const searchInput = {
      artistId: result.artistId,
      artistName: 'Radiohead',
      countryCode: 'GB',
      dateFrom: '2027-01-01',
      dateTo: '2027-12-31',
    };
    await expect(searchOfficialConcerts(searchInput)).resolves.toEqual([
      result,
    ]);
    expect(invoke).toHaveBeenCalledWith('concert-search', {
      body: { ...searchInput, limit: 20 },
    });
  });

  it('rejects malformed endpoint results', async () => {
    invoke.mockResolvedValue({
      data: { results: [{ eventId: 'missing-fields' }] },
      error: null,
    } as never);

    await expect(
      searchOfficialConcerts({
        artistId: '11111111-1111-4111-8111-111111111111',
        artistName: 'Radiohead',
        countryCode: null,
        dateFrom: null,
        dateTo: null,
      }),
    ).rejects.toThrow('Concert search returned invalid event details.');
  });
});

describe('official concert Wishlist matching', () => {
  const concert: OfficialConcertSearchResult = {
    eventId: 'ticketmaster-1',
    eventName: 'Radiohead — Live',
    artistName: 'Radiohead',
    artistId: '11111111-1111-4111-8111-111111111111',
    lineup: ['Radiohead'],
    eventDate: '2027-06-02',
    venueName: 'O2 Arena',
    city: 'London',
    country: 'United Kingdom',
    ticketUrl: 'https://tickets.example.com/show',
  };
  const item: WishlistItem = {
    id: 'wishlist-1',
    artist_id: '11111111-1111-4111-8111-111111111111',
    artist_name: 'Radiohead',
    image_url: null,
    primary_macro: null,
    event_name: 'Radiohead — Live',
    venue_name: 'O2 Arena',
    city: 'London',
    target_date: '2027-06-02',
    date_flexible: false,
    venue_type: null,
    priority: 2,
    note: null,
    status: 'wanted',
    ticket_url: null,
    created_at: '',
    updated_at: '',
  };

  it('finds an existing saved event to toggle it off', () => {
    expect(findWishlistConcert(concert, [item])).toBe(item);
  });

  describe('concert date range validation', () => {
    it('accepts empty dates and a valid upcoming range', () => {
      expect(concertDateRangeError('', '', '2026-11-09')).toBeNull();
      expect(
        concertDateRangeError('2027-01-01', '2027-12-31', '2026-11-09'),
      ).toBeNull();
    });

    it('rejects invalid dates, past dates, and reversed ranges', () => {
      expect(concertDateRangeError('2027-02-30', '', '2026-11-09')).toMatch(
        /YYYY-MM-DD/,
      );
      expect(concertDateRangeError('2026-11-08', '', '2026-11-09')).toMatch(
        /today or later/,
      );
      expect(
        concertDateRangeError('2027-02-01', '2027-01-31', '2026-11-09'),
      ).toMatch(/on or after/);
    });
  });

  it('does not treat a different date or venue as the same event', () => {
    expect(
      findWishlistConcert(concert, [
        { ...item, target_date: '2027-06-03' },
        { ...item, id: 'another-venue', venue_name: 'Wembley Stadium' },
      ]),
    ).toBeNull();
  });

  it('creates a wanted Wishlist draft containing the official event details', () => {
    expect(concertWishlistDraft(concert, concert.artistId)).toEqual({
      artist_id: concert.artistId,
      event_name: 'Radiohead — Live',
      venue_name: 'O2 Arena',
      city: 'London',
      target_date: '2027-06-02',
      date_flexible: false,
      venue_type: null,
      priority: 2,
      note: '',
      status: 'wanted',
      ticket_url: 'https://tickets.example.com/show',
    });
  });
});

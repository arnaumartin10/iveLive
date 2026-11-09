import { describe, expect, it } from '@jest/globals';
import {
  musicBrainzSearchUrl,
  parseMusicBrainzEvents,
  parseMusicBrainzPlaces,
} from '../supabase/functions/_shared/venueSearch';

describe('MusicBrainz venue result normalization', () => {
  it('normalizes places with venue types, area and coordinates', () => {
    expect(
      parseMusicBrainzPlaces({
        places: [
          {
            id: 'mbid-razzmatazz',
            name: 'Razzmatazz',
            type: 'Venue',
            area: { name: 'Barcelona' },
            coordinates: { latitude: 41.397, longitude: 2.19 },
          },
          { id: 'mbid-stadium', name: 'Olympic Stadium', type: 'Stadium' },
          { id: 'missing-name' },
        ],
      }),
    ).toEqual([
      {
        external_id: 'mbid-razzmatazz',
        name: 'Razzmatazz',
        venue_type: 'concert_hall_club',
        city: 'Barcelona',
        country: null,
        lat: 41.397,
        lng: 2.19,
        source: 'musicbrainz',
      },
      {
        external_id: 'mbid-stadium',
        name: 'Olympic Stadium',
        venue_type: 'stadium',
        city: null,
        country: null,
        lat: null,
        lng: null,
        source: 'musicbrainz',
      },
    ]);
  });

  it('normalizes festivals and escapes query syntax', () => {
    expect(
      parseMusicBrainzEvents({
        events: [
          {
            id: 'mbid-primavera',
            name: 'Primavera Sound',
            relations: [
              {
                place: { name: 'Parc del Fòrum', area: { name: 'Barcelona' } },
              },
            ],
          },
        ],
      })[0],
    ).toMatchObject({
      external_id: 'mbid-primavera',
      name: 'Primavera Sound',
      venue_type: 'festival',
      city: 'Barcelona',
    });

    const url = new URL(musicBrainzSearchUrl('Primavera Sound', 'festival'));
    expect(url.pathname).toBe('/ws/2/event/');
    expect(url.searchParams.get('query')).toBe('event:"Primavera Sound"');
    expect(url.searchParams.has('inc')).toBe(false);
  });

  it('uses the place index for concert venues without unsupported include parameters', () => {
    const url = new URL(
      musicBrainzSearchUrl('Razzmatazz', 'concert_hall_club'),
    );
    expect(url.pathname).toBe('/ws/2/place/');
    expect(url.searchParams.get('query')).toBe('place:"Razzmatazz"');
    expect(url.searchParams.has('inc')).toBe(false);
  });

  it('ignores malformed provider responses', () => {
    expect(parseMusicBrainzPlaces(null)).toEqual([]);
    expect(
      parseMusicBrainzEvents({ events: [null, {}, { name: 'No ID' }] }),
    ).toEqual([]);
  });
});

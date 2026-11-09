import { describe, expect, it } from '@jest/globals';
import {
  findExactSpotifyArtist,
  normalizeSpotifyArtistName,
} from '../supabase/functions/_shared/artistName';
import {
  catalogStatusAfterAttempt,
  orderUniqueCatalogCandidates,
} from '../supabase/functions/_shared/catalogQueueLogic';

describe('catalog artist matching', () => {
  it('matches The, accents, and punctuation without fuzzy matching', () => {
    expect(normalizeSpotifyArtistName('The Béatles!')).toBe('beatles');
    expect(
      findExactSpotifyArtist('Beyoncé', [
        { name: 'Beyonce', imageLarge: null },
      ]),
    ).toEqual({ name: 'Beyonce', imageLarge: null });
    expect(
      findExactSpotifyArtist('AC/DC', [
        { name: 'AC DC', imageLarge: 'photo.jpg' },
      ]),
    ).toEqual({ name: 'AC DC', imageLarge: 'photo.jpg' });
    expect(
      findExactSpotifyArtist('The Cure', [{ name: 'Cure-ish' }]),
    ).toBeNull();
  });

  it('prefers an exact result with an image and allows only known-alias similarity', () => {
    const matches = [
      { name: 'The Cure', imageLarge: null },
      { name: 'The Cure', imageLarge: 'cover.jpg' },
    ];
    expect(findExactSpotifyArtist('Cure', matches)).toBe(matches[1]);
    expect(
      findExactSpotifyArtist(
        'Jonny Greenwood',
        [{ name: 'Johnny Greenwood', imageLarge: 'photo.jpg' }],
        ['Jonny Greenwood'],
      ),
    ).toEqual({ name: 'Johnny Greenwood', imageLarge: 'photo.jpg' });
  });
});

describe('catalog queue ordering', () => {
  it('processes the highest priority and deduplicates names across genres', () => {
    const candidates = [
      {
        id: 'sub-example',
        search_key: 'shared artist',
        priority: 4,
        position: 1,
      },
      {
        id: 'macro-pillar',
        search_key: 'shared artist',
        priority: 1,
        position: 2,
      },
      {
        id: 'macro-example',
        search_key: 'another artist',
        priority: 2,
        position: 1,
      },
    ];
    expect(
      orderUniqueCatalogCandidates(candidates, 10).map((item) => item.id),
    ).toEqual(['macro-pillar', 'macro-example']);
  });

  it('marks no-match entries not found after the second attempt', () => {
    expect(catalogStatusAfterAttempt(1)).toBe('pending');
    expect(catalogStatusAfterAttempt(2)).toBe('not_found');
  });
});

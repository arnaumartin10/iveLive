import { describe, expect, it } from '@jest/globals';
import { toArtistDTO } from '../supabase/functions/_shared/spotifyAdapter';

describe('toArtistDTO', () => {
  it('chooses profile images and ignores Spotify genre/popularity metadata', () => {
    expect(
      toArtistDTO({
        id: 'artist-1',
        name: 'Arctic Monkeys',
        images: [
          { url: 'small.jpg', width: 64, height: 64 },
          { url: 'thumb.jpg', width: 160, height: 160 },
          { url: 'large.jpg', width: 640, height: 640 },
        ],
        genres: ['indie rock'],
        popularity: 87,
      }),
    ).toEqual({
      spotifyId: 'artist-1',
      name: 'Arctic Monkeys',
      imageLarge: 'large.jpg',
      imageThumb: 'thumb.jpg',
      genres: [],
      popularity: null,
    });
  });

  it('tolerates missing genres, images, and popularity', () => {
    expect(toArtistDTO({ id: 'artist-2', name: 'No Metadata' })).toEqual({
      spotifyId: 'artist-2',
      name: 'No Metadata',
      imageLarge: null,
      imageThumb: null,
      genres: [],
      popularity: null,
    });
  });

  it('normalizes malformed artist fields without throwing', () => {
    expect(toArtistDTO(null)).toEqual({
      spotifyId: '',
      name: 'Unknown artist',
      imageLarge: null,
      imageThumb: null,
      genres: [],
      popularity: null,
    });
  });

  it('handles realistic Spotify API fixture with null/missing genres, popularity, and images', () => {
    // Realistic Spotify /v1/search item fixture where metadata is omitted or null
    const spotifyArtistFixture = {
      external_urls: {
        spotify: 'https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb',
      },
      followers: { href: null, total: 42 },
      genres: null, // missing/null genres
      href: 'https://api.spotify.com/v1/artists/4Z8W4fKeB5YxbusRsdQVPb',
      id: '4Z8W4fKeB5YxbusRsdQVPb',
      images: null, // missing/null images
      name: 'Underground Indie Act',
      popularity: undefined, // missing popularity
      type: 'artist',
      uri: 'spotify:artist:4Z8W4fKeB5YxbusRsdQVPb',
    };

    const result = toArtistDTO(spotifyArtistFixture);
    expect(result).toEqual({
      spotifyId: '4Z8W4fKeB5YxbusRsdQVPb',
      name: 'Underground Indie Act',
      imageLarge: null,
      imageThumb: null,
      genres: [],
      popularity: null,
    });
  });

  it('handles partial images fixture where width and height are null or omitted', () => {
    const fixtureWithPartialImages = {
      id: 'partial-img-artist',
      name: 'Lo-Fi Ensemble',
      images: [
        { url: 'https://i.scdn.co/image/abc' }, // no width/height
        { url: 'https://i.scdn.co/image/def', width: null, height: null },
      ],
      genres: ['lo-fi'],
      popularity: 30,
    };

    const result = toArtistDTO(fixtureWithPartialImages);
    expect(result.spotifyId).toBe('partial-img-artist');
    expect(result.name).toBe('Lo-Fi Ensemble');
    expect(result.genres).toEqual([]);
    expect(result.popularity).toBeNull();
    expect(result.imageLarge).toBe('https://i.scdn.co/image/abc');
    expect(result.imageThumb).toBe('https://i.scdn.co/image/abc');
  });
});

import { describe, expect, it } from '@jest/globals';
import { buildCloudNodes } from '../src/features/cloud/simulation';
import { normalizeCloudArtists, normalizeUserCloudData } from '../src/features/cloud/normalize';
import type { ConcertWithRelations } from '../src/features/concerts/types';

describe('Cloud response normalization', () => {
  it('fills missing arrays on the legacy artist-summary fallback', () => {
    const artists = normalizeCloudArtists([
      {
        id: 'legacy-artist',
        name: 'Legacy Artist',
        primary_macro: 'rock',
        genres: null,
        macro_genres: null,
        log_count: 1,
      },
    ]);

    expect(artists).toHaveLength(1);
    expect(artists[0]).toMatchObject({
      id: 'legacy-artist',
      logs: [],
      genres: [],
      macro_genres: [],
      venue_type_counts: {},
    });
    expect(() => buildCloudNodes(artists, 'genre')).not.toThrow();
    expect(() => buildCloudNodes(artists, 'year')).not.toThrow();
  });

  it('supplies legacy logs from concerts when summary rows omit them', () => {
    const concerts = [
      {
        id: 'show-1',
        user_id: 'user-1',
        artist_id: 'legacy-artist',
        event_date: '2025-06-10',
        venue_type: 'concert_hall_club',
        venue_name: 'Local Club',
        rating: 5,
        review: null,
        created_at: '2025-06-11T00:00:00.000Z',
        updated_at: '2025-06-11T00:00:00.000Z',
        artist: null,
      },
    ] satisfies ConcertWithRelations[];

    const artists = normalizeCloudArtists(
      [{ id: 'legacy-artist', name: 'Legacy Artist', log_count: 1 }],
      concerts,
    );

    expect(artists[0]?.logs).toEqual([
      ['2025-06-10', 'concert_hall_club', 5],
    ]);
    expect(buildCloudNodes(artists, 'year').nodes.length).toBeGreaterThan(0);
  });

  it('normalizes missing or malformed cloud query fields to empty collections', () => {
    expect(normalizeUserCloudData({ artists: undefined, links: undefined })).toEqual({
      artists: [],
      links: [],
    });
    expect(normalizeUserCloudData(undefined)).toBeNull();
    expect(
      normalizeCloudArtists([{ id: null, name: 'Missing ID', logs: undefined }]),
    ).toEqual([]);
  });
});

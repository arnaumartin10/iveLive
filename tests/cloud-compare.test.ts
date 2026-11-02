import { describe, expect, it, jest } from '@jest/globals';
import {
  buildCompareAtlas,
  loadCompareAtlasWhenEnabled,
} from '../src/features/cloud/compare';
import type { CloudArtistData } from '../src/features/cloud/types';

const makeArtist = (
  id: string,
  macro: string,
): CloudArtistData => ({
  id,
  name: id,
  image_url_thumb: null,
  image_url_large: null,
  primary_macro: macro,
  macro_genres: [macro],
  genres: [macro],
  begin_year: null,
  log_count: 1,
  avg_rating: null,
  max_rating: null,
  first_seen: null,
  last_seen: null,
  venue_type_counts: {},
  logs: [],
});

describe('Compare Atlas guard and calculations', () => {
  it('does not call the comparison loader when the feature flag is off', async () => {
    const load = jest.fn(async () => ({ artists: [] }));
    await expect(loadCompareAtlasWhenEnabled(false, load)).resolves.toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it('calculates overlap and exclusive territories from authorized inputs', () => {
    const result = buildCompareAtlas({
      friendId: 'friend-1',
      yourArtists: [makeArtist('one', 'rock'), makeArtist('two', 'pop')],
      friendArtists: [makeArtist('one', 'rock'), makeArtist('three', 'jazz_blues')],
      commonArtistIds: ['one', 'unknown'],
    });
    expect(result.tasteOverlapPercent).toBe(33);
    expect(result.commonArtistIds).toEqual(['one']);
    expect(result.territoriesOnlyYou).toEqual(['pop']);
    expect(result.territoriesOnlyFriend).toEqual(['jazz_blues']);
  });
});

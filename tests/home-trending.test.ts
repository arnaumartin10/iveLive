import { describe, expect, it } from '@jest/globals';
import { selectTrendingDisplay } from '../src/features/home/trending';
import type { HomeArtist } from '../src/features/home/types';

const communityArtist = {
  id: 'public-log-artist',
  name: 'Popular from public logs',
  image_url_large: null,
  image_url_thumb: null,
  primary_macro: null,
  macro_genres: [],
} satisfies HomeArtist;

const providerArtist = {
  ...communityArtist,
  id: 'provider-artist',
  name: 'Provider chart artist',
} satisfies HomeArtist;

describe('Home trending chart source', () => {
  it('does not substitute the IveLive chart for an empty external chart', () => {
    expect(selectTrendingDisplay('global', [], [communityArtist])).toEqual({
      artists: [],
      source: 'primary',
    });
  });

  it('prefers the requested chart when it has artists', () => {
    expect(
      selectTrendingDisplay('global', [providerArtist], [communityArtist]),
    ).toEqual({ artists: [providerArtist], source: 'primary' });
  });

  it('uses the IveLive chart only when that tab is selected', () => {
    expect(selectTrendingDisplay('app', [], [communityArtist])).toEqual({
      artists: [communityArtist],
      source: 'app',
    });
  });

  it('does not substitute IveLive data for an empty country chart', () => {
    expect(selectTrendingDisplay('country', [], [communityArtist])).toEqual({
      artists: [],
      source: 'primary',
    });
  });
});

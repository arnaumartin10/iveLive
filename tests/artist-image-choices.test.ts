import { describe, expect, it } from '@jest/globals';
import { getArtistImageChoices } from '../src/features/artists/imageChoices';

const artist = {
  image_url_large: 'https://example.test/portrait.jpg',
  image_url_thumb: 'https://example.test/thumb.jpg',
  group_image_url: 'https://example.test/group.jpg',
  banner_image_url: 'https://example.test/banner.jpg',
};

describe('getArtistImageChoices', () => {
  it('orders wide images first for banners and portraits first for profiles', () => {
    expect(
      getArtistImageChoices(artist, 'banner').map((choice) => choice.label),
    ).toEqual([
      'Wide banner',
      'Group photo',
      'Artist portrait',
      'Square portrait',
    ]);
    expect(
      getArtistImageChoices(artist, 'profile').map((choice) => choice.label),
    ).toEqual([
      'Artist portrait',
      'Square portrait',
      'Group photo',
      'Wide banner',
    ]);
  });

  it('deduplicates repeated URLs while preserving the preferred label', () => {
    const choices = getArtistImageChoices(
      {
        ...artist,
        image_url_thumb: artist.image_url_large,
        group_image_url: artist.banner_image_url,
      },
      'banner',
    );

    expect(choices.map((choice) => choice)).toEqual([
      { label: 'Wide banner', uri: artist.banner_image_url },
      { label: 'Artist portrait', uri: artist.image_url_large },
    ]);
  });

  it('adds provider gallery photos after the preferred built-in source URLs', () => {
    const choices = getArtistImageChoices(artist, 'banner', [
      {
        artist_id: 'artist-1',
        image_role: 'banner',
        image_url: 'https://example.test/fanart.jpg',
        label: 'Fan art 2',
        sort_order: 2,
        source: 'theaudiodb',
      },
      {
        artist_id: 'artist-1',
        image_role: 'profile',
        image_url: 'https://example.test/portrait-extra.jpg',
        label: 'Artist portrait',
        sort_order: 3,
        source: 'theaudiodb',
      },
    ]);

    expect(choices.map(({ label }) => label)).toContain(
      'Fan art 2 · TheAudioDB',
    );
    expect(choices.map(({ uri }) => uri)).not.toContain(
      'https://example.test/portrait-extra.jpg',
    );
  });
});

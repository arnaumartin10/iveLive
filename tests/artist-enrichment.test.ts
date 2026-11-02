import { describe, expect, it, jest } from '@jest/globals';
import {
  albumsProvider,
  parseCoverArt,
  selectAlbumReleaseGroups,
} from '../supabase/functions/enrich-artist/src/providers/albums';
import {
  parseLastFmBio,
  parseLastFmTags,
} from '../supabase/functions/enrich-artist/src/providers/lastfm';
import {
  parseMusicBrainzArtist,
  parseMusicBrainzArtistSearch,
} from '../supabase/functions/enrich-artist/src/providers/musicbrainz';
import {
  collectProviderResults,
  mergeWeightedTags,
  runIsolatedProvider,
  resolveEnrichmentStatus,
} from '../supabase/functions/enrich-artist/src/providers/merge';
import {
  createIveLiveUserAgent,
  safeRequestEndpoint,
} from '../supabase/functions/enrich-artist/src/providers/http';
import { parseWikipediaSummary } from '../supabase/functions/enrich-artist/src/providers/wikipedia';
import { parseTheAudioDbArtist } from '../supabase/functions/enrich-artist/src/providers/theaudiodb';
import type { ProviderContext } from '../supabase/functions/enrich-artist/src/providers/types';
import {
  coverArtArchiveFixture,
  lastFmInfoFixture,
  lastFmTagsFixture,
  musicBrainzArtistFixture,
  musicBrainzSearchFixture,
  genreClassificationFixtures,
  wikipediaSummaryFixture,
} from './fixtures/artist-enrichment';

describe('artist enrichment provider parsers', () => {
  it('prefers a name-equal MusicBrainz result and parses tags, links, and releases', () => {
    expect(
      parseMusicBrainzArtistSearch(musicBrainzSearchFixture, 'Arctic Monkeys')
        ?.id,
    ).toBe('00000000-0000-4000-8000-000000000002');
    expect(parseMusicBrainzArtist(musicBrainzArtistFixture)).toMatchObject({
      patch: {
        musicbrainz_id: '00000000-0000-4000-8000-000000000002',
        wikidata_id: 'Q484245',
        wikipedia_title: 'Arctic Monkeys',
      },
      tags: [
        { name: 'indie rock', weight: 24 },
        { name: 'seen live', weight: 19 },
        { name: 'rock', weight: 11 },
      ],
      releaseGroups: [{ title: 'AM', primaryType: 'Album' }],
    });
  });

  it('keeps the top ten Last.fm tags and extracts the bio summary', () => {
    expect(parseLastFmTags(lastFmTagsFixture)).toEqual([
      { name: 'indie', weight: 100 },
      { name: 'british', weight: 50 },
      { name: 'dream pop', weight: 30 },
    ]);
    expect(parseLastFmBio(lastFmInfoFixture)?.bio).toBe(
      'An English rock band.',
    );
  });

  it('parses recorded genre tags for representative artists', () => {
    for (const fixture of genreClassificationFixtures) {
      expect(
        parseLastFmTags({ toptags: { tag: [...fixture.tags] } }).map(
          ({ name }) => name,
        ),
      ).toEqual(fixture.tags.map(({ name }) => name));
    }
  });

  it('parses Wikipedia attribution and the Cover Art Archive image variants', () => {
    expect(parseWikipediaSummary(wikipediaSummaryFixture)).toMatchObject({
      bio_source: 'wikipedia',
      bio_attribution: 'CC BY-SA',
      group_image_url: 'https://upload.wikimedia.org/arctic-monkeys.jpg',
    });
    expect(parseCoverArt(coverArtArchiveFixture)).toEqual({
      cover_url:
        'https://coverartarchive.org/release-group/example/front-500.jpg',
      cover_thumb_url:
        'https://coverartarchive.org/release-group/example/front-250.jpg',
    });
  });

  it('collects and deduplicates available TheAudioDB artist images by use', () => {
    const result = parseTheAudioDbArtist({
      artists: [
        {
          strArtistFanart: 'https://images.test/fanart-1.jpg',
          strArtistFanart2: 'https://images.test/fanart-2.jpg',
          strArtistFanart3: 'https://images.test/fanart-2.jpg',
          strArtistBanner: 'https://images.test/banner.jpg',
          strArtistThumb: 'https://images.test/portrait.jpg',
        },
      ],
    });

    expect(result.images).toEqual([
      {
        image_url: 'https://images.test/fanart-1.jpg',
        image_role: 'banner',
        label: 'Fan art 1',
        sort_order: 1,
        source: 'theaudiodb',
      },
      {
        image_url: 'https://images.test/fanart-2.jpg',
        image_role: 'banner',
        label: 'Fan art 2',
        sort_order: 2,
        source: 'theaudiodb',
      },
      {
        image_url: 'https://images.test/banner.jpg',
        image_role: 'banner',
        label: 'Artist banner',
        sort_order: 5,
        source: 'theaudiodb',
      },
      {
        image_url: 'https://images.test/portrait.jpg',
        image_role: 'profile',
        label: 'Artist portrait',
        sort_order: 7,
        source: 'theaudiodb',
      },
    ]);
  });

  it('redacts path credentials and query strings from provider log endpoints', () => {
    expect(
      safeRequestEndpoint(
        'https://www.theaudiodb.com/api/v1/json/test-key/search.php?s=Artist',
      ),
    ).toBe('www.theaudiodb.com/api/v1/json/[redacted]/search.php');
    expect(
      safeRequestEndpoint(
        'https://ws.audioscrobbler.com/2.0/?api_key=test-key&format=json',
      ),
    ).toBe('ws.audioscrobbler.com/2.0/');
  });

  it('builds a provider User-Agent with the configured contact email', () => {
    expect(createIveLiveUserAgent('music@example.test')).toBe(
      'IveLive/1.0 (music@example.test)',
    );
    expect(() => createIveLiveUserAgent(undefined)).toThrow(
      'MUSICBRAINZ_CONTACT_EMAIL is not configured correctly',
    );
  });

  it('limits albums to album/EP releases and excludes live, compilation, and remix types', () => {
    const groups = [
      {
        id: 'a',
        title: 'Live',
        primaryType: 'Album',
        firstReleaseDate: '2024',
        secondaryTypes: ['Live'],
      },
      { id: 'b', title: 'EP', primaryType: 'EP', firstReleaseDate: '2022' },
      {
        id: 'c',
        title: 'Single',
        primaryType: 'Single',
        firstReleaseDate: '2025',
      },
      {
        id: 'd',
        title: 'Album',
        primaryType: 'Album',
        firstReleaseDate: '2020',
      },
    ];
    expect(selectAlbumReleaseGroups(groups).map((group) => group.id)).toEqual([
      'b',
      'd',
    ]);
  });
});

describe('provider merging and failure isolation', () => {
  const context: ProviderContext = {
    artist: {
      id: 'artist-id',
      name: 'Arctic Monkeys',
      spotify_id: null,
      genres: [],
      user_edited_fields: [],
      lastfm_tags: [],
      musicbrainz_id: null,
      wikidata_id: null,
      wikipedia_title: null,
      begin_year: null,
      begin_year_source: null,
    },
    tags: [],
    releaseGroups: [],
    musicbrainzId: null,
    wikidataId: null,
    wikipediaTitle: null,
    lastfmApiKey: null,
    language: 'en',
  };

  it('sums equivalent weighted tags across sources', () => {
    expect(
      mergeWeightedTags(
        [{ name: 'Indie', weight: 3 }],
        [
          { name: 'indíe', weight: 5 },
          { name: 'rock', weight: 2 },
        ],
      ),
    ).toEqual([
      { name: 'Indie', weight: 8 },
      { name: 'rock', weight: 2 },
    ]);
  });

  it('returns partial provider results when one source responds with HTTP 500', async () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const result = await collectProviderResults(
      [
        {
          name: 'broken-provider',
          timeoutMs: 5000,
          async run() {
            throw new Error('HTTP 500');
          },
        },
        {
          name: 'working-provider',
          timeoutMs: 5000,
          async run() {
            return { tags: [{ name: 'indie', weight: 7 }] };
          },
        },
      ],
      context,
    );
    expect(result.errors).toEqual(['broken-provider: HTTP 500']);
    expect(result.tags).toEqual([{ name: 'indie', weight: 7 }]);
    expect(result.successfulProviders).toEqual(['working-provider']);
    expect(resolveEnrichmentStatus(result.tags.length > 0, result.errors)).toBe(
      'partial',
    );
    warn.mockRestore();
  });

  it('keeps album metadata when Cover Art Archive stalls', async () => {
    jest.useFakeTimers();
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation((_input, options) => {
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener(
            'abort',
            () => reject(new Error('request aborted')),
            { once: true },
          );
        });
      });
    try {
      const resultPromise = runIsolatedProvider(albumsProvider, {
        ...context,
        releaseGroups: [
          {
            id: 'release-group-1',
            title: 'Test Album',
            firstReleaseDate: '2024-05-01',
            primaryType: 'Album',
          },
        ],
      });
      await jest.advanceTimersByTimeAsync(3000);
      await expect(resultPromise).resolves.toMatchObject({
        albums: [
          {
            title: 'Test Album',
            year: 2024,
            cover_url: null,
          },
        ],
      });
    } finally {
      fetchSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('resolves completed, partial, and empty enrichment runs', () => {
    expect(resolveEnrichmentStatus(true, [], true)).toBe('done');
    expect(resolveEnrichmentStatus(true, ['wikipedia: HTTP 500'])).toBe(
      'partial',
    );
    expect(resolveEnrichmentStatus(false, [])).toBe('failed');
  });
});

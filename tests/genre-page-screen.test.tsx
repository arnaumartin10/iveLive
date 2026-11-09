import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { ArtistCardProvider } from '../src/features/artists/ArtistCardProvider';
import { GenrePageRoute } from '../src/features/genres/GenrePageScreen';
import { useGenrePage } from '../src/features/genres/hooks';
import type { GenrePageData } from '../src/features/genres/content';
import {
  CatalogResolutionError,
  resolveGenreArtist,
  useGenreCatalog,
} from '../src/features/genres/catalog';
import { ThemeProvider } from '../src/theme/ThemeProvider';

const mockOpenArtistCard = jest.fn();

jest.mock('../src/features/artists/ArtistCardProvider', () => ({
  ArtistCardProvider: ({ children }: { children: React.ReactNode }) => children,
  useArtistCard: () => ({ openArtistCard: mockOpenArtistCard }),
}));
jest.mock('../src/features/genres/hooks', () => ({
  useGenrePage: jest.fn(),
}));
jest.mock('../src/features/genres/catalog', () => ({
  ...jest.requireActual<typeof import('../src/features/genres/catalog')>(
    '../src/features/genres/catalog',
  ),
  useGenreCatalog: jest.fn(),
  resolveGenreArtist: jest.fn(),
}));

const artist = (id: string, index: number) => ({
  id,
  name: `Example Artist ${index}`,
  image_url_thumb: null,
  image_url_large: null,
  primary_macro: 'rock',
  position: index,
  note: null,
  why: `Foundational contribution ${index}.`,
  seen_count: 0,
  in_wishlist: false,
  isArtistLinked: true,
});

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ArtistCardProvider>
          <GenrePageRoute />
        </ArtistCardProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

function pressFindArtist(name: string) {
  const buttons = screen.getAllByLabelText(`Find ${name} artist page`);
  const button = buttons[0];
  if (!button) throw new Error(`Find button for ${name} was not rendered.`);
  fireEvent.press(button);
}

function setPageData(
  exampleCount: number,
  shows = 0,
  pillarCount = 3,
  slug = 'rock',
  title = 'Rock',
): GenrePageData {
  const examples = Array.from({ length: exampleCount }, (_, index) =>
    artist(`example-${index + 1}`, index + 1),
  );
  const data: GenrePageData = {
    found: true,
    page: {
      slug,
      title,
      tagline: 'A test tagline.',
      summary: 'A test summary.',
      origin_place: 'United States',
      origin_years: '1950s',
      history: [],
      related_slugs: [],
      wikipedia_title: null,
      content_version: 1,
      reviewed: false,
    },
    pillars: Array.from({ length: pillarCount }, (_, index) =>
      artist(`pillar-${index + 1}`, index + 1),
    ),
    examples,
    viewer: {
      shows,
      unique_artists: shows ? 1 : 0,
      average_rating: shows ? 4.5 : null,
      most_seen_artist: null,
      seen_feature_count: shows ? 1 : 0,
    },
  };
  jest.mocked(useGenrePage).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  } as never);
  return data;
}

describe('GenrePageRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenArtistCard.mockReset();
    jest.mocked(resolveGenreArtist).mockReset();
    jest.mocked(useGenreCatalog).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as never);
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ slug: 'rock' } as never);
  });

  it('renders all 20 essential artist tiles when content is seeded', () => {
    setPageData(20);
    renderScreen();

    expect(screen.getByText('Example Artist 20')).toBeTruthy();
    expect(screen.getByText('The three pillars')).toBeTruthy();
    expect(screen.getByText('Essential artists')).toBeTruthy();
    expect(screen.getByText('Log a show')).toBeTruthy();
  });

  it('renders a shortened seeded grid without breaking the page', () => {
    setPageData(15, 2);
    renderScreen();

    expect(screen.getByText('Example Artist 15')).toBeTruthy();
    expect(screen.getByText('15 NAMES')).toBeTruthy();
    expect(screen.getByText('SEEN 1 OF 18')).toBeTruthy();
  });

  it('renders bundled artist names when the genre seed has not been applied', () => {
    setPageData(0, 0, 0);
    renderScreen();

    expect(screen.getByText('Chuck Berry')).toBeTruthy();
    expect(screen.getByText('Sister Rosetta Tharpe')).toBeTruthy();
    expect(screen.getByText('20 NAMES')).toBeTruthy();
    expect(
      screen.getByText(
        'Artist photos and cards load from existing profiles when available. Live marks appear after genre content is seeded.',
      ),
    ).toBeTruthy();
  });

  it('shows the friendly stub for other', () => {
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ slug: 'other' } as never);
    renderScreen();

    expect(screen.getByText('Not placed yet')).toBeTruthy();
    expect(screen.getByText('We could not place this one yet.')).toBeTruthy();
    fireEvent.press(screen.getByText('Back to music'));
  });

  it('renders a curated subgenre page under its macro breadcrumb', () => {
    const subgenre = {
      slug: 'post-punk',
      label: 'Post-Punk',
      parent_slug: 'punk',
      level: 2 as const,
      aliases: ['post punk'],
      wikipedia_title: 'Post-punk',
      lastfm_tag: 'post-punk',
      origin_years: 'late 1970s',
      has_editorial: true,
      artist_count: 12,
      viewer_seen_count: 2,
    };
    jest.mocked(useGenreCatalog).mockReturnValue({
      data: [
        subgenre,
        {
          ...subgenre,
          slug: 'punk',
          label: 'Punk',
          parent_slug: null,
          level: 1 as const,
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as never);
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ slug: 'post-punk' } as never);
    setPageData(12, 0, 3, 'post-punk', 'Post-Punk');
    renderScreen();

    expect(screen.getAllByText('Post-Punk').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Punk').length).toBeGreaterThan(0);
    expect(screen.getByText('The three pillars')).toBeTruthy();
  });

  it('renders an unresolved artist as a tappable paper tile', () => {
    const data = setPageData(1);
    data.examples = [{
      ...artist('unresolved-example', 1),
      name: 'Unresolved Example',
      id: null,
      catalogQueueId: 'queue-artist-1',
      isArtistLinked: false,
    }];
    renderScreen();

    expect(screen.getByText('Unresolved Example')).toBeTruthy();
    expect(
      screen.getAllByLabelText('Find Unresolved Example artist page'),
    ).toHaveLength(2);
  });

  it('shows the cooldown state and lets the visitor retry', async () => {
    const data = setPageData(1);
    data.examples = [{
      ...artist('unresolved-example', 1),
      name: 'Unresolved Example',
      id: null,
      catalogQueueId: 'queue-artist-1',
      isArtistLinked: false,
    }];
    jest
      .mocked(resolveGenreArtist)
      .mockRejectedValue(new CatalogResolutionError('SPOTIFY_COOLDOWN', 180));
    renderScreen();

    pressFindArtist('Unresolved Example');
    expect(
      await screen.findByText(
        'Spotify needs a short break, try again in a few minutes.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
  });

  it('shows the manual artist option when Spotify has no exact match', async () => {
    const data = setPageData(1);
    data.examples = [{
      ...artist('unresolved-example', 1),
      name: 'Unresolved Example',
      id: null,
      catalogQueueId: 'queue-artist-1',
      isArtistLinked: false,
    }];
    jest.mocked(resolveGenreArtist).mockResolvedValue({
      status: 'not_found',
      attempts: 2,
    });
    renderScreen();

    pressFindArtist('Unresolved Example');
    expect(
      await screen.findByText('We could not find this artist on Spotify.'),
    ).toBeTruthy();
    expect(screen.getByText('Add manually')).toBeTruthy();
    expect(screen.getByText('Report this listing')).toBeTruthy();
  });

  it('shows a clear message when the per-user catalog limit is reached', async () => {
    const data = setPageData(1);
    data.examples = [{
      ...artist('unresolved-example', 1),
      name: 'Unresolved Example',
      id: null,
      catalogQueueId: 'queue-artist-1',
      isArtistLinked: false,
    }];
    jest
      .mocked(resolveGenreArtist)
      .mockRejectedValue(new CatalogResolutionError('CATALOG_RATE_LIMIT'));
    renderScreen();

    pressFindArtist('Unresolved Example');
    expect(
      await screen.findByText(
        'You have reached the artist lookup limit. Try again later.',
      ),
    ).toBeTruthy();
  });

  it('opens the artist card after a successful resolution', async () => {
    const data = setPageData(1);
    data.examples = [{
      ...artist('unresolved-example', 1),
      name: 'Unresolved Example',
      id: null,
      catalogQueueId: 'queue-artist-1',
      isArtistLinked: false,
    }];
    jest.mocked(resolveGenreArtist).mockResolvedValue({
      status: 'resolved',
      artistId: 'resolved-artist-id',
      cacheHit: false,
    });
    renderScreen();

    pressFindArtist('Unresolved Example');
    await waitFor(() => expect(resolveGenreArtist).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockOpenArtistCard).toHaveBeenCalledWith('resolved-artist-id'),
    );
    expect(resolveGenreArtist).toHaveBeenCalledWith({
      queueId: 'queue-artist-1',
      name: 'Unresolved Example',
      genreSlug: 'rock',
    });
  });

  it('keeps the tile responsive while a lookup is running', async () => {
    const data = setPageData(1);
    data.examples = [{
      ...artist('unresolved-example', 1),
      name: 'Unresolved Example',
      id: null,
      catalogQueueId: 'queue-artist-1',
      isArtistLinked: false,
    }];
    let finishLookup: (() => void) | undefined;
    jest.mocked(resolveGenreArtist).mockReturnValue(
      new Promise((resolve) => {
        finishLookup = () => resolve({ status: 'pending' });
      }) as never,
    );
    renderScreen();

    pressFindArtist('Unresolved Example');
    expect(await screen.findByLabelText('Resolving artist')).toBeTruthy();
    finishLookup?.();
    await waitFor(() => expect(resolveGenreArtist).toHaveBeenCalledTimes(1));
  });
});

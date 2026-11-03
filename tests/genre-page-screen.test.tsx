import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { ArtistCardProvider } from '../src/features/artists/ArtistCardProvider';
import { GenrePageRoute } from '../src/features/genres/GenrePageScreen';
import { useGenrePage } from '../src/features/genres/hooks';
import { useGenreCatalog } from '../src/features/genres/catalog';
import { ThemeProvider } from '../src/theme/ThemeProvider';

jest.mock('../src/features/genres/hooks', () => ({
  useGenrePage: jest.fn(),
}));
jest.mock('../src/features/genres/catalog', () => ({
  ...jest.requireActual<typeof import('../src/features/genres/catalog')>(
    '../src/features/genres/catalog',
  ),
  useGenreCatalog: jest.fn(),
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

function setPageData(
  exampleCount: number,
  shows = 0,
  pillarCount = 3,
  slug = 'rock',
  title = 'Rock',
) {
  const examples = Array.from({ length: exampleCount }, (_, index) =>
    artist(`example-${index + 1}`, index + 1),
  );
  const data = {
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
}

describe('GenrePageRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});

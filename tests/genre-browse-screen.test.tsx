import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';
import { GenreBrowseScreen } from '../src/features/genres/GenreBrowseScreen';
import { useGenreCatalog } from '../src/features/genres/catalog';
import { ThemeProvider } from '../src/theme/ThemeProvider';

jest.mock('../src/features/genres/catalog', () => ({
  ...jest.requireActual<typeof import('../src/features/genres/catalog')>(
    '../src/features/genres/catalog',
  ),
  useGenreCatalog: jest.fn(),
}));

jest.mock('../src/navigation/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

const catalog = [
  {
    slug: 'rock',
    label: 'Rock',
    parent_slug: null,
    level: 1 as const,
    aliases: ['rock music'],
    wikipedia_title: 'Rock music',
    lastfm_tag: 'rock',
    origin_years: '1950s',
    has_editorial: true,
    artist_count: 25,
    viewer_seen_count: 3,
  },
  {
    slug: 'post-punk',
    label: 'Post-Punk',
    parent_slug: 'rock',
    level: 2 as const,
    aliases: ['post punk'],
    wikipedia_title: 'Post-punk',
    lastfm_tag: 'post-punk',
    origin_years: '1970s',
    has_editorial: true,
    artist_count: 8,
    viewer_seen_count: 1,
  },
];

function renderScreen() {
  return render(
    <ThemeProvider>
      <GenreBrowseScreen />
    </ThemeProvider>,
  );
}

describe('GenreBrowseScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useGenreCatalog).mockReturnValue({
      data: catalog,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as never);
  });

  it('offers the Open macro row above sub-genres', () => {
    renderScreen();
    fireEvent.press(screen.getAllByLabelText('Browse Rock sub-genres')[0]!);
    expect(screen.getByText('Open Rock')).toBeTruthy();
    expect(
      screen.getByText('The whole genre, history and essential artists'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Open Post-Punk genre page')).toBeTruthy();
  });

  it('opens a macro genre page directly from its search result', async () => {
    renderScreen();
    fireEvent.changeText(screen.getByLabelText('Search genres and aliases'), 'rock');
    await waitFor(() =>
      expect(screen.getByText('MATCHING GENRES')).toBeTruthy(),
    );
    fireEvent.press(screen.getByLabelText('Open Rock genre page'));
    expect(router.navigate).toHaveBeenCalledWith({
      pathname: '/genre/[slug]',
      params: { slug: 'rock' },
    });
  });

  it('expands a macro even when the catalog has no macro row', () => {
    jest.mocked(useGenreCatalog).mockReturnValue({
      data: catalog.filter((genre) => genre.level !== 1),
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as never);

    renderScreen();
    fireEvent.press(screen.getAllByLabelText('Browse Rock sub-genres')[0]!);

    expect(screen.getByText('Open Rock')).toBeTruthy();
    expect(screen.getByLabelText('Open Post-Punk genre page')).toBeTruthy();
  });

  it('finds and opens a macro genre when its catalog row is missing', async () => {
    jest.mocked(useGenreCatalog).mockReturnValue({
      data: catalog.filter((genre) => genre.level !== 1),
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as never);

    renderScreen();
    fireEvent.changeText(screen.getByLabelText('Search genres and aliases'), 'rock');
    await waitFor(() =>
      expect(screen.getByLabelText('Open Rock genre page')).toBeTruthy(),
    );
    fireEvent.press(screen.getByLabelText('Open Rock genre page'));

    expect(router.navigate).toHaveBeenCalledWith({
      pathname: '/genre/[slug]',
      params: { slug: 'rock' },
    });
  });
});

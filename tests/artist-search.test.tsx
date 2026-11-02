import type { PropsWithChildren } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { act, render, renderHook, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useArtistSearch } from '../src/features/artists/hooks';
import { searchArtists } from '../src/features/artists/api';
import { ArtistSearchResultRow } from '../src/features/artists/ArtistSearchResultRow';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import type { ArtistSearchResult } from '../src/features/artists/types';
import { View } from 'react-native';

jest.mock('../src/features/artists/api', () => ({
  ensureArtist: jest.fn(),
  searchArtists: jest.fn(),
}));

const mockedSearchArtists = jest.mocked(searchArtists);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    );
  };
}

function SearchResults({ query }: { query: string }) {
  const { results } = useArtistSearch(query);
  return (
    <View>
      {results.map((result) => (
        <ArtistSearchResultRow
          key={`${result.source}-${result.spotifyId ?? result.artistId}`}
          onPress={() => undefined}
          result={result}
        />
      ))}
    </View>
  );
}

describe('useArtistSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedSearchArtists.mockReset();
    mockedSearchArtists.mockResolvedValue({ results: [], rateLimited: false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits 300ms and ignores queries shorter than two characters', async () => {
    const wrapper = createWrapper();
    const { rerender } = renderHook<
      ReturnType<typeof useArtistSearch>,
      { query: string }
    >(({ query }) => useArtistSearch(query), {
      initialProps: { query: 'A' },
      wrapper,
    });

    rerender({ query: 'Arctic Monkeys' });
    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(mockedSearchArtists).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(mockedSearchArtists).toHaveBeenCalledTimes(1);
    expect(mockedSearchArtists).toHaveBeenCalledWith(
      'Arctic Monkeys',
      expect.any(AbortSignal),
    );
  });

  it('aborts the in-flight request as soon as the query changes', async () => {
    let activeSignal: AbortSignal | undefined;
    mockedSearchArtists.mockImplementation(
      (_query, signal) =>
        new Promise((resolve) => {
          activeSignal = signal;
          signal.addEventListener(
            'abort',
            () => resolve({ results: [], rateLimited: false }),
            { once: true },
          );
        }),
    );

    const wrapper = createWrapper();
    const { rerender } = renderHook<
      ReturnType<typeof useArtistSearch>,
      { query: string }
    >(({ query }) => useArtistSearch(query), {
      initialProps: { query: 'Ar' },
      wrapper,
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });
    expect(activeSignal).toBeDefined();
    expect(activeSignal?.aborted).toBe(false);

    rerender({ query: 'Arc' });
    await act(async () => {
      await Promise.resolve();
    });
    expect(activeSignal?.aborted).toBe(true);
  });

  it('renders Spotify search results with image and macro genre after debounce', async () => {
    jest.useRealTimers();
    const result: ArtistSearchResult = {
      artistId: null,
      spotifyId: 'arctic-monkeys',
      name: 'Arctic Monkeys',
      imageLarge: 'https://images.test/large.jpg',
      imageThumb: 'https://images.test/thumb.jpg',
      genres: ['indie rock'],
      macroGenres: ['indie'],
      popularity: 87,
      source: 'spotify',
      existingArtistId: null,
      artist: null,
    };
    mockedSearchArtists.mockResolvedValue({
      results: [result],
      rateLimited: false,
    });
    render(<SearchResults query="Arctic Monkeys" />, {
      wrapper: createWrapper(),
    });

    await screen.findByText('Arctic Monkeys');
    expect(screen.getByText('Arctic Monkeys')).toBeTruthy();
    expect(screen.getByText('Indie')).toBeTruthy();
    expect(screen.getByLabelText('Arctic Monkeys artist photo')).toBeTruthy();
  });
});

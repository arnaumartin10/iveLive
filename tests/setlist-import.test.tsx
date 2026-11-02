import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { SetlistImportPanel } from '../src/features/setlist/SetlistImportPanel';
import type { ConcertWithRelations } from '../src/features/concerts/types';
import type { ParsedSetlist } from '../src/features/setlist/parse';
import {
  fetchConcertSetlist,
  fetchSetlistFmById,
  saveConcertSetlist,
} from '../src/features/setlist/api';
import { useAuthStore } from '../src/features/auth/store';
import type { User } from '@supabase/supabase-js';

jest.mock('../src/features/setlist/api', () => ({
  fetchConcertSetlist: jest.fn(async () => null),
  fetchSetlistFmById: jest.fn(),
  saveConcertSetlist: jest.fn(),
}));

const mockFetchSaved = fetchConcertSetlist as jest.MockedFunction<
  typeof fetchConcertSetlist
>;
const mockFetchSetlistFm = fetchSetlistFmById as jest.MockedFunction<
  typeof fetchSetlistFmById
>;
const mockSaveSetlist = saveConcertSetlist as jest.MockedFunction<
  typeof saveConcertSetlist
>;
const embed = readFileSync(
  join(process.cwd(), 'fixtures/setlists/embed-my-chemical-romance.html'),
  'utf8',
);

const concert = {
  id: 'log-1',
  event_date: '2026-06-15',
  venue_name: 'Hollywood Bowl',
  artist: { name: 'My Chemical Romance' },
} as ConcertWithRelations;

const apiPayload = {
  id: '3b4f5c50',
  url: 'https://www.setlist.fm/setlist/my-chemical-romance/2026/hollywood-bowl-los-angeles-ca-3b4f5c50.html',
  eventDate: '14-06-2026',
  artist: { name: 'Mý Chemical Romance' },
  venue: { name: 'Hollywood Bowl', city: { name: 'Los Angeles' } },
  set: [{ name: 'Set 1', song: [{ name: 'The Foundations of Decay' }] }],
};
const bbcode =
  '[url=https://www.setlist.fm/edit?setlist=534e2bb9&amp;step=song]Edit this setlist[/url] | [url=https://www.setlist.fm/setlists/gorillaz-13d681d1.html]More Gorillaz setlists[/url]';

function renderPanel(
  options: {
    concert?: ConcertWithRelations | null;
    onSelect?: (setlist: ParsedSetlist) => void;
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SetlistImportPanel
          concert={
            options.concert === null ? undefined : (options.concert ?? concert)
          }
          editable
          logContext={{
            artistName: 'My Chemical Romance',
            eventDate: '2026-06-15',
            venueName: 'Hollywood Bowl',
          }}
          onSelect={options.onSelect}
        />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

async function openAndPaste() {
  fireEvent.press(screen.getByText('Import setlist'));
  const pasteInput = screen.getByPlaceholderText(
    'Paste an embed, link, or one song per line',
  );
  fireEvent.changeText(pasteInput, embed);
  await waitFor(() => expect(pasteInput.props.value).toBe(embed));
  fireEvent.press(screen.getByText('Read setlist'));
  await waitFor(() => expect(mockFetchSetlistFm).toHaveBeenCalled());
}

describe('Setlist import screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchSaved.mockImplementation(() => new Promise(() => undefined));
    useAuthStore.setState({
      user: { id: 'user-1' } as User,
    });
  });

  it('looks up the real fixture, shows an editable song preview and date mismatch warning', async () => {
    mockFetchSetlistFm.mockResolvedValue(apiPayload);
    renderPanel();
    await openAndPaste();

    expect(
      screen.getByPlaceholderText('Type or paste one song per line').props
        .value,
    ).toBe('The Foundations of Decay');
    expect(
      screen.getByText(
        'This setlist is for 14 Jun 2026 but your log says 15 Jun 2026.',
      ),
    ).toBeTruthy();
    expect(mockFetchSetlistFm).toHaveBeenCalledWith('3b4f5c50');
    expect(screen.getByText('Setlist via setlist.fm')).toBeTruthy();
  });

  it('fetches the songs from the setlist ID in pasted BBCode', async () => {
    mockFetchSetlistFm.mockResolvedValue({
      id: '534e2bb9',
      url: 'https://www.setlist.fm/setlist/gorillaz/2026/example-534e2bb9.html',
      eventDate: '01-06-2026',
      artist: { name: 'Gorillaz' },
      venue: { name: 'Example Hall', city: { name: 'London' } },
      sets: {
        set: [
          {
            name: 'Set 1',
            song: [{ name: 'Clint Eastwood' }, { name: 'Feel Good Inc.' }],
          },
        ],
      },
    });
    renderPanel();
    fireEvent.press(screen.getByRole('button', { name: 'Import setlist' }));
    const pasteInput = screen.getByPlaceholderText(
      'Paste an embed, link, or one song per line',
    );
    fireEvent.changeText(pasteInput, bbcode);
    await waitFor(() => expect(pasteInput.props.value).toBe(bbcode));
    fireEvent.press(screen.getByText('Read setlist'));
    await waitFor(() =>
      expect(mockFetchSetlistFm).toHaveBeenCalledWith('534e2bb9'),
    );

    expect(
      screen.getByPlaceholderText('Type or paste one song per line').props
        .value,
    ).toBe('Clint Eastwood\nFeel Good Inc.');
    expect(screen.getByText('Gorillaz')).toBeTruthy();
  });

  it('shows a friendly fallback with the metadata if the API lookup fails', async () => {
    mockFetchSetlistFm.mockRejectedValue(new Error('missing server API key'));
    renderPanel();
    await openAndPaste();

    await waitFor(() => {
      expect(
        screen.getByText(/songs could not be fetched: missing server API key/i),
      ).toBeTruthy();
    });
    expect(screen.getByText('My Chemical Romance')).toBeTruthy();
    expect(screen.getByText('Open on setlist.fm')).toBeTruthy();
  });

  it('opens during logging and stages an edited setlist without a saved log row', async () => {
    const onSelect = jest.fn();
    renderPanel({ concert: null, onSelect });
    fireEvent.press(screen.getByRole('button', { name: 'Import setlist' }));
    expect(await screen.findByText('Bring in the setlist')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Type it in' }));

    fireEvent.changeText(
      screen.getByPlaceholderText('Type or paste one song per line'),
      'The Foundations of Decay',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Use this setlist' }));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          songs: [
            {
              title: 'The Foundations of Decay',
              setName: null,
              encore: false,
              medal: null,
            },
          ],
        }),
      );
    });
  });

  it('shows every saved song and persists owner-assigned medals', async () => {
    const savedSetlist = {
      log_id: 'log-1',
      user_id: 'user-1',
      source: 'setlistfm',
      source_url: apiPayload.url,
      setlistfm_id: '3b4f5c50',
      artist: 'My Chemical Romance',
      venue: 'Hollywood Bowl',
      city: 'Los Angeles',
      event_date: '2026-06-14',
      event_year: 2026,
      updated_at: '2026-06-15T12:00:00Z',
      songs: [
        {
          title: 'The Foundations of Decay',
          setName: 'Set 1',
          encore: false,
          medal: null,
        },
        {
          title: 'Welcome to the Black Parade',
          setName: 'Encore',
          encore: true,
          medal: 'gold',
        },
      ],
    };
    mockFetchSaved.mockResolvedValue(savedSetlist);
    mockSaveSetlist.mockResolvedValue();
    renderPanel();

    expect(await screen.findByText('The Foundations of Decay')).toBeTruthy();
    expect(screen.getByText('Welcome to the Black Parade')).toBeTruthy();
    expect(screen.getByText('ENCORE')).toBeTruthy();

    expect(
      screen.queryByRole('button', { name: 'Assign gold medal' }),
    ).toBeNull();
    fireEvent.press(
      screen.getByRole('button', {
        name: 'Choose a medal for The Foundations of Decay',
      }),
    );
    expect(
      screen.getByText('Pick a medal for The Foundations of Decay'),
    ).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Assign gold medal' }));

    await waitFor(() => {
      expect(mockSaveSetlist).toHaveBeenCalledWith(
        'log-1',
        'user-1',
        expect.objectContaining({
          songs: expect.arrayContaining([
            expect.objectContaining({
              title: 'The Foundations of Decay',
              medal: 'gold',
            }),
          ]),
        }),
      );
    });

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Choose a medal for Welcome to the Black Parade',
      }),
    );
    fireEvent.press(
      screen.getByRole('button', { name: 'Assign silver medal' }),
    );
    await waitFor(() => {
      expect(mockSaveSetlist).toHaveBeenLastCalledWith(
        'log-1',
        'user-1',
        expect.objectContaining({
          songs: expect.arrayContaining([
            expect.objectContaining({
              title: 'The Foundations of Decay',
              medal: 'gold',
            }),
            expect.objectContaining({
              title: 'Welcome to the Black Parade',
              medal: 'silver',
            }),
          ]),
        }),
      );
    });

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Choose a medal for Welcome to the Black Parade',
      }),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Assign gold medal' }));
    await waitFor(() => {
      const lastCall = mockSaveSetlist.mock.lastCall;
      expect(lastCall?.[2].songs).toEqual([
        expect.objectContaining({
          title: 'The Foundations of Decay',
          medal: null,
        }),
        expect.objectContaining({
          title: 'Welcome to the Black Parade',
          medal: 'gold',
        }),
      ]);
    });
  });
});

import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { FriendsWhoSawArtistSheet } from '../src/features/artists/FriendsWhoSawArtistSheet';
import type { ArtistFriend } from '../src/features/artists/types';

jest.mock('@gorhom/bottom-sheet', () => {
  const { ScrollView } = require('react-native');
  return { BottomSheetScrollView: ScrollView };
});

jest.mock('../src/components/ui/Sheet', () => {
  const { Text, View } = require('react-native');
  return {
    Sheet: ({
      visible,
      title,
      children,
    }: {
      visible: boolean;
      title?: string;
      children: React.ReactNode;
    }) =>
      visible ? (
        <View>
          {title ? <Text>{title}</Text> : null}
          {children}
        </View>
      ) : null,
  };
});

const friends: ArtistFriend[] = Array.from({ length: 12 }, (_, index) => ({
  id: `friend-${index}`,
  username: `friend_${index}`,
  display_name: `Friend ${index}`,
  avatar_url: null,
  logs_count: index + 1,
  logs:
    index === 0
      ? [
          {
            id: 'visible-log',
            event_date: '2025-06-01',
            venue_type: 'festival',
            venue_name: 'Parc del Fòrum',
            rating: 4.5,
            review: 'Una nit increïble amb una gran banda.',
            media_count: 2,
            has_setlist: true,
            top_song: 'La cançó final',
          },
        ]
      : [],
}));

function renderSheet(friendData: ArtistFriend[]) {
  const onOpenLog = jest.fn();
  render(
    <ThemeProvider>
      <FriendsWhoSawArtistSheet
        artistName="Example Artist"
        friends={friendData}
        ownEventDates={new Set(['2025-06-01'])}
        visible
        onDismiss={jest.fn()}
        onOpenLog={onOpenLog}
      />
    </ThemeProvider>,
  );
  return onOpenLog;
}

describe('FriendsWhoSawArtistSheet', () => {
  it('renders many friends and their visible logs with shared-date context', () => {
    const onOpenLog = renderSheet(friends);

    expect(screen.getByText("Friends who've seen Example Artist")).toBeTruthy();
    expect(screen.getByText('@friend_11')).toBeTruthy();
    expect(screen.getByText('seen 12 times')).toBeTruthy();
    expect(screen.getByText('YOU WENT TOO')).toBeTruthy();
    expect(
      screen.getByText('Una nit increïble amb una gran banda.'),
    ).toBeTruthy();
    fireEvent.press(
      screen.getByRole('button', { name: /Open Example Artist log/ }),
    );
    expect(onOpenLog).toHaveBeenCalledWith('visible-log');
  });

  it('shows a useful empty state when no friend has a visible log', () => {
    renderSheet([]);
    expect(
      screen.getByText(
        'No friends have shared a visible show by this artist yet.',
      ),
    ).toBeTruthy();
  });
});

import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable } from 'react-native';
import {
  ArtistCardProvider,
  useArtistCard,
} from '../src/features/artists/ArtistCardProvider';

const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args) },
}));

function OpenArtistCardButton() {
  const { openArtistCard } = useArtistCard();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open artist"
      onPress={() => void openArtistCard('artist-1')}
    />
  );
}

describe('ArtistCardProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the full artist route instead of presenting a partial-height sheet', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ArtistCardProvider>
          <OpenArtistCardButton />
        </ArtistCardProvider>
      </QueryClientProvider>,
    );

    fireEvent.press(screen.getByLabelText('Open artist'));

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/artist/[id]',
      params: { id: 'artist-1' },
    });
  });
});

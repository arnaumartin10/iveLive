import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { CloudAccessibleList } from '../src/features/cloud/CloudAccessibleList';
import { CloudEmptyWorld } from '../src/features/cloud/CloudEmptyWorld';
import type { CloudArtistData } from '../src/features/cloud/types';

jest.mock('../src/features/genres/catalog', () => ({
  ...jest.requireActual<typeof import('../src/features/genres/catalog')>(
    '../src/features/genres/catalog',
  ),
  useGenreCatalog: () => ({ data: [] }),
}));

const artist: CloudArtistData = {
  id: 'artist-1',
  name: 'Artist One',
  image_url_thumb: null,
  image_url_large: null,
  primary_macro: 'rock',
  macro_genres: ['rock'],
  genres: ['rock'],
  begin_year: 2000,
  log_count: 3,
  avg_rating: 4.5,
  max_rating: 5,
  first_seen: null,
  last_seen: null,
  venue_type_counts: {},
  logs: [],
};

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Atlas accessibility and empty world', () => {
  it('groups artist details by territory with complete spoken labels', () => {
    renderWithTheme(<CloudAccessibleList artists={[artist]} />);
    expect(
      screen.getByLabelText('Artist One, 3 shows, rated 4.5 out of 5'),
    ).toBeTruthy();
    expect(screen.getByText('Rock')).toBeTruthy();
    expect(screen.getByText('1 artists')).toBeTruthy();
    expect(screen.getAllByText('Unexplored')).toHaveLength(13);
  });

  it('shows all fourteen unexplored territories and a start action', () => {
    const onStart = jest.fn();
    renderWithTheme(<CloudEmptyWorld onStart={onStart} />);
    expect(screen.getByText('WORLD EXPLORED 0 / 14')).toBeTruthy();
    expect(screen.getByText('START YOUR ATLAS')).toBeTruthy();
    expect(
      screen.getByLabelText('Rock, dots pattern, unexplored'),
    ).toBeTruthy();
    expect(screen.getAllByText(/UNEXPLORED ·/)).toHaveLength(14);
  });
});

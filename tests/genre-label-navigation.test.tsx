import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { GenreLabel } from '../src/components/paper/GenreLabel';
import { useGenreCatalog } from '../src/features/genres/catalog';
import { ThemeProvider } from '../src/theme/ThemeProvider';

jest.mock('../src/features/genres/catalog', () => ({
  ...jest.requireActual<typeof import('../src/features/genres/catalog')>(
    '../src/features/genres/catalog',
  ),
  useGenreCatalog: jest.fn(),
}));

describe('GenreLabel navigation', () => {
  beforeEach(() => {
    jest.mocked(useGenreCatalog).mockReturnValue({ data: [] } as never);
  });

  it('opens the macro page by default', () => {
    render(
      <ThemeProvider>
        <GenreLabel genre="rock" />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByLabelText('Open the Rock page'));
    expect(jest.mocked(router.navigate)).toHaveBeenCalledWith({
      pathname: '/genre/[slug]',
      params: { slug: 'rock' },
    });
  });

  it('keeps filter labels non-interactive when requested', () => {
    render(
      <ThemeProvider>
        <GenreLabel genre="indie" interactive={false} />
      </ThemeProvider>,
    );

    expect(screen.queryByLabelText('Open the Indie page')).toBeNull();
    expect(screen.getByText('Indie')).toBeTruthy();
  });

  it('preserves a detailed tag slug so its route can resolve the parent', () => {
    jest.mocked(useGenreCatalog).mockReturnValue({
      data: [
        {
          slug: 'post-punk',
          label: 'Post-Punk',
          parent_slug: 'punk',
          level: 2,
          aliases: ['post punk'],
        },
      ],
    } as never);
    render(
      <ThemeProvider>
        <GenreLabel genre="post-punk" label="Post-punk" />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByLabelText('Open the Post-punk page'));
    expect(jest.mocked(router.navigate)).toHaveBeenCalledWith({
      pathname: '/genre/[slug]',
      params: { slug: 'post-punk' },
    });
  });
});

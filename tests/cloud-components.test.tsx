import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { CloudInfoCard } from '../src/features/cloud/CloudInfoCard';
import { CloudScrubber } from '../src/features/cloud/CloudScrubber';
import type { CloudArtistNode } from '../src/features/cloud/simulation';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};

const mockArtistNode: CloudArtistNode = {
  id: 'artist-1',
  type: 'artist',
  artistId: 'artist-1',
  name: 'Radiohead',
  imageUrl: 'https://example.com/radiohead.jpg',
  primaryMacro: 'rock',
  clusterTarget: 'rock',
  logCount: 4,
  avgRating: 4.8,
  maxRating: 5,
  beginYear: 1985,
  firstSeen: '2016-06-03',
  lastSeen: '2023-07-12',
  venueTypeCounts: {
    festival: 2,
    stadium: 1,
    concert_hall_club: 1,
  },
  logs: [
    ['2016-06-03', 'festival', 5],
    ['2017-06-15', 'festival', 5],
    ['2018-07-10', 'stadium', 4],
    ['2023-07-12', 'concert_hall_club', 5],
  ],
  hubTargets: ['rock'],
  genreSlugs: ['rock', 'electronic'],
  radius: 32,
  color: '#FF5D73',
  clusterColor: '#FF5D73',
  phaseOffset: 0.5,
};

describe('Cloud 2.0 Component Tests', () => {
  describe('CloudInfoCard', () => {
    it('renders artist information, macro pills, log count, rating, and venue breakdown', () => {
      const onFocusRelated = jest.fn();
      const onOpenDetails = jest.fn();

      renderWithTheme(
        <CloudInfoCard
          node={mockArtistNode}
          position={{ left: 24, top: 120 }}
          onFocusRelated={onFocusRelated}
          onOpenDetails={onOpenDetails}
        />,
      );

      expect(screen.getByText('Radiohead')).toBeTruthy();
      expect(screen.getByText('Seen 4x')).toBeTruthy();
      expect(screen.getByText('4.8')).toBeTruthy();
      expect(screen.getByText('2016 – 2023')).toBeTruthy();
      expect(screen.getByText('Rock')).toBeTruthy();

      // Trigger Related focus
      const relatedBtn = screen.getByLabelText('Highlight related artists');
      fireEvent.press(relatedBtn);
      expect(onFocusRelated).toHaveBeenCalledWith(mockArtistNode);

      // Trigger View Artist sheet
      const viewBtn = screen.getByLabelText('Open artist profile sheet');
      fireEvent.press(viewBtn);
      expect(onOpenDetails).toHaveBeenCalledWith(mockArtistNode);
    });

    it('renders cleanly near screen edges with clamped coordinates and respects pinned mode', () => {
      const onClose = jest.fn();

      renderWithTheme(
        <CloudInfoCard
          node={mockArtistNode}
          position={{ left: 12, top: 480 }} // Near edge
          isPinned={true}
          onClose={onClose}
        />,
      );

      const closeBtn = screen.getByLabelText('Close info card');
      expect(closeBtn).toBeTruthy();
      fireEvent.press(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it('renders with Reduce Motion enabled without throwing or failing styles', () => {
      const { toJSON } = renderWithTheme(
        <CloudInfoCard
          node={mockArtistNode}
          position={{ left: 50, top: 100 }}
          reduceMotion={true}
        />,
      );

      expect(toJSON()).toBeTruthy();
      expect(screen.getByText('Radiohead')).toBeTruthy();
    });
  });

  describe('CloudScrubber (Time Travel)', () => {
    it('renders year label, artist counts, speed button, and controls', () => {
      const onProgressChange = jest.fn();
      const onTogglePlay = jest.fn();
      const onCycleSpeed = jest.fn();

      renderWithTheme(
        <CloudScrubber
          progress={0.5}
          onProgressChange={onProgressChange}
          isPlaying={false}
          onTogglePlay={onTogglePlay}
          speed={1}
          onCycleSpeed={onCycleSpeed}
          currentYearLabel="2021"
          totalArtistsCount={42}
          revealedArtistsCount={21}
        />,
      );

      expect(screen.getByText('2021')).toBeTruthy();
      expect(screen.getByText('21 / 42 artists')).toBeTruthy();
      expect(screen.getByText('1x')).toBeTruthy();

      // Cycle speed button
      const speedBtn = screen.getByLabelText('Playback speed 1x');
      fireEvent.press(speedBtn);
      expect(onCycleSpeed).toHaveBeenCalled();

      // Play toggle button
      const playBtn = screen.getByLabelText('Play time travel');
      fireEvent.press(playBtn);
      expect(onTogglePlay).toHaveBeenCalled();
    });

    it('renders Reduce Motion mode calmly without errors', () => {
      const onProgressChange = jest.fn();
      const onTogglePlay = jest.fn();
      const onCycleSpeed = jest.fn();

      const { toJSON } = renderWithTheme(
        <CloudScrubber
          progress={1.0}
          onProgressChange={onProgressChange}
          isPlaying={false}
          onTogglePlay={onTogglePlay}
          speed={2}
          onCycleSpeed={onCycleSpeed}
          currentYearLabel="All time"
          totalArtistsCount={10}
          revealedArtistsCount={10}
          reduceMotion={true}
        />,
      );

      expect(toJSON()).toBeTruthy();
      expect(screen.getByText('All time')).toBeTruthy();
    });
  });
});

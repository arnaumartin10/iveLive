import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { CloudExperienceHud } from '../src/features/cloud/CloudExperienceHud';
import { CloudTerritoryCard } from '../src/features/cloud/CloudTerritoryCard';

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Cloud experience components', () => {
  it('renders the exploration progress and menu controls in the HUD', () => {
    const onFly = jest.fn();
    const onToggleMenu = jest.fn();
    const onReplay = jest.fn();
    const onMotion = jest.fn();
    const onSound = jest.fn();
    const onLegend = jest.fn();
    const props = {
      exploredCount: 6,
      menuVisible: true,
      motionEnabled: false,
      soundEnabled: false,
      legendVisible: false,
      onFly,
      onToggleMenu,
      onReplay,
      onToggleMotion: onMotion,
      onToggleSound: onSound,
      onToggleLegend: onLegend,
    };
    renderWithTheme(<CloudExperienceHud {...props} />);
    expect(screen.getByText('WORLD EXPLORED 6 / 14')).toBeTruthy();
    fireEvent.press(screen.getByText('Fly me through it'));
    fireEvent.press(screen.getByText('Replay print run'));
    fireEvent.press(screen.getByText('Motion effects: Off'));
    fireEvent.press(screen.getByText('Sound: Off'));
    fireEvent.press(screen.getByText('Legend'));
    expect(onFly).toHaveBeenCalledTimes(1);
    expect(onReplay).toHaveBeenCalledTimes(1);
    expect(onMotion).toHaveBeenCalledTimes(1);
    expect(onSound).toHaveBeenCalledTimes(1);
    expect(onLegend).toHaveBeenCalledTimes(1);
  });

  it('renders an unexplored territory with a working log action', () => {
    const onLogShow = jest.fn();
    const onClose = jest.fn();
    renderWithTheme(
      <CloudTerritoryCard
        genre="jazz_blues"
        label="Jazz / Blues"
        unexplored
        discoveries={['Artist A', 'Artist B']}
        onLogShow={onLogShow}
        onOpenArtist={jest.fn()}
        onClose={onClose}
      />,
    );
    expect(screen.getByText('UNEXPLORED')).toBeTruthy();
    expect(screen.getByText('Artist A')).toBeTruthy();
    fireEvent.press(screen.getByText('Log a show'));
    fireEvent.press(screen.getByLabelText('Close territory card'));
    expect(onLogShow).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows explored territory details and artist stickers', () => {
    renderWithTheme(
      <CloudTerritoryCard
        genre="rock"
        label="Rock"
        unexplored={false}
        sharePercent={42}
        averageRating={4.5}
        firstSeen="2018-05-01"
        lastSeen="2024-06-02"
        artists={[{ id: 'a1', name: 'Artist One' }]}
        venues={[{ id: 'festival', label: 'Festival 3', venue: 'festival' }]}
        onLogShow={jest.fn()}
        onOpenArtist={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('SHARE OF SHOWS 42%')).toBeTruthy();
    expect(screen.getByText('AVG RATING 4.5')).toBeTruthy();
    expect(screen.getByText('Artist One')).toBeTruthy();
    expect(screen.getByText('Festival 3')).toBeTruthy();
  });
});

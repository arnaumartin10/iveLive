import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import ComponentsPreviewScreen from '../src/app/(dev)/components';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useThemeStore } from '../src/theme/store';
import {
  paperTheme,
  nightTheme,
  getContrastRatio,
  RAW,
} from '../src/theme/palette';
import {
  getSeededRotation,
  getSeededOffset,
} from '../src/components/paper/hash';
import { Ticket, Stub, Stamp, Sticker } from '../src/components/paper';
import { Text } from '../src/components/ui/Text';

describe('Paper & Ink Brand Sheet & Foundations', () => {
  it.each(['dark', 'light'] as const)(
    'renders the brand sheet in %s mode',
    (mode) => {
      useThemeStore.setState({ mode });

      render(
        <ThemeProvider>
          <ComponentsPreviewScreen />
        </ThemeProvider>,
      );

      expect(screen.getByText('IveLive Brand Sheet')).toBeTruthy();
      expect(screen.getByText('01. The Five Hues')).toBeTruthy();
      expect(screen.getByText('02. Typography')).toBeTruthy();
      expect(screen.getByText('03. Paper Shapes')).toBeTruthy();
      expect(screen.getByText('04. 14 Genre Patterns')).toBeTruthy();
      expect(screen.getByText('05. Genre label contrast matrix')).toBeTruthy();
      expect(screen.getByText('06. Venue Stamps')).toBeTruthy();
      expect(screen.getByText('07. Core Primitives')).toBeTruthy();
      expect(screen.getByText('08. Custom Icon Set')).toBeTruthy();
      expect(screen.getByText('09. Physical Motion')).toBeTruthy();
      expect(screen.getByText('10. Voice & Empty State')).toBeTruthy();
    },
  );

  describe('Contrast matrix (WCAG 2.1 compliance)', () => {
    it('enforces body text contrast >= 4.5:1 in Paper light theme', () => {
      // ink on bg
      const contrastBg = getContrastRatio(paperTheme.ink, paperTheme.bg);
      expect(contrastBg).toBeGreaterThanOrEqual(4.5);

      // ink on surface
      const contrastSurface = getContrastRatio(
        paperTheme.ink,
        paperTheme.surface,
      );
      expect(contrastSurface).toBeGreaterThanOrEqual(4.5);
    });

    it('enforces body text contrast >= 4.5:1 in Night shift dark theme', () => {
      // ink on bg
      const contrastBg = getContrastRatio(nightTheme.ink, nightTheme.bg);
      expect(contrastBg).toBeGreaterThanOrEqual(4.5);

      // ink on surface
      const contrastSurface = getContrastRatio(
        nightTheme.ink,
        nightTheme.surface,
      );
      expect(contrastSurface).toBeGreaterThanOrEqual(4.5);
    });

    it('enforces large/bold text & accent fill contrast >= 3:1', () => {
      // accentInk on accent
      const contrastAccent = getContrastRatio(
        paperTheme.accentInk,
        paperTheme.accent,
      );
      expect(contrastAccent).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe('Deterministic imperfection', () => {
    it('produces identical rotation and offset for the same ID across calls', () => {
      const id = 'concert-log-xyz-123';
      const rot1 = getSeededRotation(id);
      const rot2 = getSeededRotation(id);
      expect(rot1).toBe(rot2);

      const offset1 = getSeededOffset(id);
      const offset2 = getSeededOffset(id);
      expect(offset1).toEqual(offset2);
    });

    it('stays strictly within bounded rotation range [-3, 3] degrees', () => {
      const testIds = [
        'band-1',
        'band-2',
        'band-3',
        'show-99',
        'venue-abc',
        'artist-999',
      ];
      for (const id of testIds) {
        const rot = getSeededRotation(id, 3);
        expect(rot).toBeGreaterThanOrEqual(-3);
        expect(rot).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('Paper shapes snapshots', () => {
    it('matches snapshot for Ticket, Stub, Stamp, and Sticker', () => {
      const { toJSON } = render(
        <ThemeProvider>
          <Ticket serialNumber="TEST-123">
            <Text>Test Ticket Content</Text>
          </Ticket>
          <Stub id="stub-test">
            <Text>Test Stub Content</Text>
          </Stub>
          <Stamp label="STAMP TEST" variant="orange" />
          <Sticker id="sticker-test" size={40}>
            <Text>Avatar</Text>
          </Sticker>
        </ThemeProvider>,
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });
});

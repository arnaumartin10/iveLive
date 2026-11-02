import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { Text as NativeText, View } from 'react-native';
import {
  getContrastRatio,
  nightTheme,
  paperTheme,
  type SemanticColors,
} from '../src/theme/palette';

type RolePair = {
  foreground: keyof SemanticColors;
  background: keyof SemanticColors;
};

const screens: Array<{ name: string; pairs: RolePair[] }> = [
  {
    name: 'Welcome and auth',
    pairs: [
      { foreground: 'ink', background: 'bg' },
      { foreground: 'inkMuted', background: 'surface' },
    ],
  },
  {
    name: 'Onboarding',
    pairs: [
      { foreground: 'ink', background: 'surface' },
      { foreground: 'accentText', background: 'bg' },
    ],
  },
  {
    name: 'Timeline',
    pairs: [
      { foreground: 'ink', background: 'bg' },
      { foreground: 'inkMuted', background: 'surfaceRaised' },
    ],
  },
  {
    name: 'Cloud',
    pairs: [
      { foreground: 'ink', background: 'bg' },
      { foreground: 'accentText', background: 'surface' },
    ],
  },
  {
    name: 'Cloud experience HUD',
    pairs: [
      { foreground: 'ink', background: 'surface' },
      { foreground: 'accentText', background: 'bg' },
    ],
  },
  {
    name: 'Cloud territory card',
    pairs: [
      { foreground: 'ink', background: 'surface' },
      { foreground: 'inkMuted', background: 'surfaceRaised' },
    ],
  },
  {
    name: 'Friends',
    pairs: [
      { foreground: 'ink', background: 'surface' },
      { foreground: 'positiveText', background: 'surfaceRaised' },
    ],
  },
  {
    name: 'Stats',
    pairs: [
      { foreground: 'ink', background: 'bg' },
      { foreground: 'accentText', background: 'surface' },
    ],
  },
  {
    name: 'Log wizard',
    pairs: [
      { foreground: 'ink', background: 'surface' },
      { foreground: 'inkMuted', background: 'bg' },
    ],
  },
  {
    name: 'Log celebration',
    pairs: [
      { foreground: 'ink', background: 'surface' },
      { foreground: 'accentText', background: 'bg' },
    ],
  },
  {
    name: 'Artist card',
    pairs: [
      { foreground: 'ink', background: 'surface' },
      { foreground: 'inkMuted', background: 'surfaceRaised' },
    ],
  },
  {
    name: 'Profile',
    pairs: [
      { foreground: 'ink', background: 'bg' },
      { foreground: 'accentText', background: 'surface' },
    ],
  },
  {
    name: 'Wishlist',
    pairs: [
      { foreground: 'ink', background: 'surface' },
      { foreground: 'warningText', background: 'surfaceRaised' },
    ],
  },
  {
    name: 'Settings',
    pairs: [
      { foreground: 'ink', background: 'bg' },
      { foreground: 'inkMuted', background: 'surface' },
    ],
  },
  {
    name: 'Edit profile',
    pairs: [
      { foreground: 'ink', background: 'surface' },
      { foreground: 'dangerText', background: 'bg' },
    ],
  },
  {
    name: 'Legal pages',
    pairs: [
      { foreground: 'ink', background: 'bg' },
      { foreground: 'inkMuted', background: 'surface' },
    ],
  },
  {
    name: 'Wrapped stories',
    pairs: [
      { foreground: 'ink', background: 'surface' },
      { foreground: 'accentText', background: 'bg' },
    ],
  },
  {
    name: 'Wall of Fame',
    pairs: [
      { foreground: 'ink', background: 'bg' },
      { foreground: 'positiveText', background: 'surface' },
    ],
  },
  {
    name: 'Notifications',
    pairs: [
      { foreground: 'ink', background: 'surface' },
      { foreground: 'dangerText', background: 'surfaceRaised' },
    ],
  },
  {
    name: 'User friends',
    pairs: [
      { foreground: 'ink', background: 'bg' },
      { foreground: 'inkMuted', background: 'surface' },
    ],
  },
  {
    name: 'Artist search',
    pairs: [
      { foreground: 'ink', background: 'surface' },
      { foreground: 'accentText', background: 'bg' },
    ],
  },
  {
    name: 'Create artist',
    pairs: [
      { foreground: 'ink', background: 'bg' },
      { foreground: 'positiveText', background: 'surface' },
    ],
  },
  {
    name: 'Error boundary',
    pairs: [
      { foreground: 'ink', background: 'surface' },
      { foreground: 'dangerText', background: 'bg' },
    ],
  },
  {
    name: 'Loading states',
    pairs: [
      { foreground: 'ink', background: 'bg' },
      { foreground: 'inkMuted', background: 'surfaceRaised' },
    ],
  },
];

const themes = [
  ['Paper', paperTheme],
  ['Night Shift', nightTheme],
] as const;

describe('screen text and background contrast', () => {
  for (const [themeName, theme] of themes) {
    for (const screen of screens) {
      for (const pair of screen.pairs) {
        it(`${themeName}: ${screen.name} renders ${pair.foreground} on ${pair.background} at 4.5:1 or better`, () => {
          const foreground = theme[pair.foreground];
          const background = theme[pair.background];
          const { getByTestId } = render(
            <View style={{ backgroundColor: background }}>
              <NativeText testID="contrast-text" style={{ color: foreground }}>
                Paper and ink
              </NativeText>
            </View>,
          );

          expect(getByTestId('contrast-text')).toBeTruthy();
          expect(
            getContrastRatio(foreground, background),
          ).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }
});

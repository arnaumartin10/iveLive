import React from 'react';
import * as ReactNative from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import * as Haptics from 'expo-haptics';
import WelcomeScreen from '../src/app/(auth)/welcome';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useThemeStore } from '../src/theme/store';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  router: { replace: jest.fn() },
}));

jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationButton: () => null,
  AppleAuthenticationButtonStyle: { WHITE: 'white' },
  AppleAuthenticationButtonType: { CONTINUE: 'continue' },
  isAvailableAsync: jest.fn(async () => false),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('../src/features/auth/oauth', () => ({
  sendEmailOtp: jest.fn(),
  signInWithApple: jest.fn(),
  signInWithGoogle: jest.fn(),
  verifyEmailOtp: jest.fn(),
}));

describe('Welcome poster brand', () => {
  it.each([
    ['iPhone SE', 375, 667],
    ['large phone', 430, 932],
  ])(
    'renders and matches the welcome layout on %s',
    (_label, width, height) => {
      useThemeStore.setState({ mode: 'light' });
      const dimensions = jest
        .spyOn(ReactNative, 'useWindowDimensions')
        .mockReturnValue({ width, height, scale: 1, fontScale: 1 });

      const { toJSON, unmount } = render(
        <ThemeProvider>
          <WelcomeScreen />
        </ThemeProvider>,
      );

      expect(screen.getByText('Every show you’ve ever been to.')).toBeTruthy();
      expect(screen.getByText('THIS WEEK: ROCK')).toBeTruthy();
      expect(screen.getByLabelText(/Change mascot colorway/)).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();

      unmount();
      dimensions.mockRestore();
    },
  );

  it('changes colorway and announces the caption after a mascot tap', () => {
    useThemeStore.setState({ mode: 'dark' });
    const dimensions = jest
      .spyOn(ReactNative, 'useWindowDimensions')
      .mockReturnValue({ width: 390, height: 844, scale: 1, fontScale: 1 });

    const { unmount } = render(
      <ThemeProvider>
        <WelcomeScreen />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByLabelText(/Change mascot colorway/));

    expect(
      screen.getByText('THIS WEEK: INDIE').props.accessibilityLiveRegion,
    ).toBe('polite');
    expect(Haptics.impactAsync).toHaveBeenCalled();

    unmount();
    dimensions.mockRestore();
  });
});

import { describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: ({ scheme }: { scheme: string }) => `${scheme}://callback`,
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { scheme: 'ivelive-preview' } },
}));

import {
  AUTH_REDIRECT_URI,
  getAuthRedirectUri,
} from '../src/features/auth/oauth';

describe('auth redirect URI', () => {
  it('uses the deployed web root so static hosts can return to the SPA entrypoint', () => {
    expect(getAuthRedirectUri('web', 'https://ivelive.example.com')).toBe(
      'https://ivelive.example.com/',
    );
  });

  it('keeps the native deep link callback', () => {
    expect(getAuthRedirectUri('ios')).toBe(AUTH_REDIRECT_URI);
    expect(AUTH_REDIRECT_URI).toBe('ivelive-preview://callback');
  });
});

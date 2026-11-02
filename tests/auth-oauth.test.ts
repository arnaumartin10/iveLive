import { describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: () => 'ivelive://callback',
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
  });
});

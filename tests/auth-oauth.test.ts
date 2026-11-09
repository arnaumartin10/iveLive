import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  AUTH_REDIRECT_URI,
  completeAuthRedirect,
  getAuthRedirectUri,
  sendEmailOtp,
  verifyEmailOtp,
} from '../src/features/auth/oauth';
import { peekReturnTo, saveReturnTo } from '../src/navigation/returnTo';

const mockExchangeCodeForSession = jest
  .fn<(...args: unknown[]) => Promise<{ data: { session: object }; error: null }>>()
  .mockResolvedValue({ data: { session: {} }, error: null });
const mockVerifyOtp = jest
  .fn<(...args: unknown[]) => Promise<{ data: { session: object }; error: null }>>()
  .mockResolvedValue({ data: { session: {} }, error: null });
const mockSignInWithOtp = jest
  .fn<(...args: unknown[]) => Promise<{ error: null }>>()
  .mockResolvedValue({ error: null });

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: ({
    scheme,
    path,
    queryParams,
  }: {
    scheme: string;
    path?: string;
    queryParams?: Record<string, string>;
  }) => {
    const url = new URL(`${scheme}://${path ?? 'callback'}`);
    for (const [key, value] of Object.entries(queryParams ?? {})) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  },
}));
jest.mock('expo-linking', () => ({
  parse: (value: string) => {
    const url = new URL(value);
    return {
      queryParams: Object.fromEntries(url.searchParams.entries()),
    };
  },
}));
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (...args: unknown[]) =>
        mockExchangeCodeForSession(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
    },
  },
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { scheme: 'ivelive-preview' } },
}));

describe('auth redirect URI', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockExchangeCodeForSession.mockClear();
    mockVerifyOtp.mockClear();
    mockSignInWithOtp.mockClear();
  });

  it('uses the current web origin for deployed and local sign-in', () => {
    expect(getAuthRedirectUri('web', 'https://ivelive.example.com')).toBe(
      'https://ivelive.example.com/',
    );
    expect(getAuthRedirectUri('web', 'http://localhost:8081')).toBe(
      'http://localhost:8081/',
    );
    expect(getAuthRedirectUri('web', 'http://127.0.0.1:8082')).toBe(
      'http://127.0.0.1:8082/',
    );
  });

  it('keeps the native deep link callback', () => {
    expect(getAuthRedirectUri('ios')).toBe(AUTH_REDIRECT_URI);
    expect(AUTH_REDIRECT_URI).toBe('ivelive-preview://callback');
  });

  it('carries a validated return target through web and native auth redirects', () => {
    expect(
      getAuthRedirectUri(
        'web',
        'https://ivelive.example.com',
        '/artist/artist-1',
      ),
    ).toBe(
      'https://ivelive.example.com/?returnTo=%2Fartist%2Fartist-1',
    );
    expect(
      getAuthRedirectUri('ios', undefined, '/genre/indie-rock'),
    ).toBe(
      'ivelive-preview://callback?returnTo=%2Fgenre%2Findie-rock',
    );
  });

  it('keeps the original path through a one-time email code flow', async () => {
    await saveReturnTo('/log/log-1');
    await sendEmailOtp('listener@example.test');
    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining(
            'returnTo=%2Flog%2Flog-1',
          ),
        }),
      }),
    );

    await verifyEmailOtp('listener@example.test', '123456');
    expect(await peekReturnTo()).toBe('/log/log-1');
  });

  it('restores a destination delivered by a native magic-link callback', async () => {
    await completeAuthRedirect(
      'ivelive-preview://callback?token_hash=token&type=magiclink&returnTo=%2Fartist%2Fartist-1',
    );

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'token',
      type: 'magiclink',
    });
    expect(await peekReturnTo()).toBe('/artist/artist-1');
  });

  it.each([
    [
      'native',
      'ivelive-preview://callback?code=native-code&returnTo=%2Fgenre%2Findie-rock',
      '/genre/indie-rock',
    ],
    [
      'web',
      'https://ivelive.example.com/?code=web-code&returnTo=%2Fuser%2Flistener%3Ftab%3Dtimeline',
      '/user/listener?tab=timeline',
    ],
  ])('restores OAuth return destinations on %s', async (_platform, url, path) => {
    await completeAuthRedirect(url);
    expect(mockExchangeCodeForSession).toHaveBeenCalled();
    expect(await peekReturnTo()).toBe(path);
  });
});

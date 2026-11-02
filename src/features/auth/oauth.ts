import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { EmailOtpType } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const configuredScheme = Constants.expoConfig?.scheme;
const appScheme = Array.isArray(configuredScheme)
  ? (configuredScheme[0] ?? 'ivelive')
  : (configuredScheme ?? 'ivelive');

export const AUTH_REDIRECT_URI = makeRedirectUri({
  scheme: appScheme,
  path: 'callback',
});

export function getAuthRedirectUri(
  platform: typeof Platform.OS = Platform.OS,
  webOrigin?: string,
) {
  if (platform === 'web') {
    const origin =
      webOrigin ??
      (typeof window !== 'undefined' ? window.location.origin : undefined);
    if (!origin) throw new Error('The web sign-in origin is unavailable.');
    return new URL('/', origin).toString();
  }

  return AUTH_REDIRECT_URI;
}

const handledRedirects = new Set<string>();

export async function sendEmailOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getAuthRedirectUri(),
      shouldCreateUser: true,
    },
  });

  if (error) throw new Error(error.message);
}

export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function signInWithGoogle() {
  const redirectTo = getAuthRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });

  if (error) throw new Error(error.message);
  if (!data.url)
    throw new Error('Supabase did not return a Google sign-in URL.');

  if (Platform.OS === 'web') return;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'success' && result.url) {
    await completeAuthRedirect(result.url);
  }
}

export async function signInWithApple() {
  const rawNonce = Crypto.randomUUID();
  const nonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    ],
    nonce,
  });

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token.');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });

  if (error) throw new Error(error.message);

  const name = credential.fullName
    ? AppleAuthentication.formatFullName(credential.fullName).trim()
    : '';

  if (name) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.auth.updateUser({ data: { display_name: name } });
    }
  }
}

export async function completeAuthRedirect(url: string) {
  if (handledRedirects.has(url)) return;
  handledRedirects.add(url);

  try {
    const parsed = Linking.parse(url);
    const params = parsed.queryParams ?? {};
    const code = firstParam(params.code);

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw new Error(error.message);
      return;
    }

    const tokenHash = firstParam(params.token_hash);
    const type = firstParam(params.type) as EmailOtpType | null;
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (error) throw new Error(error.message);
      return;
    }

    const fragment = url.split('#')[1];
    if (fragment) {
      const fragmentParams = new URLSearchParams(fragment);
      const accessToken = fragmentParams.get('access_token');
      const refreshToken = fragmentParams.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw new Error(error.message);
      }
    }
  } catch (error) {
    handledRedirects.delete(url);
    throw error;
  }
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

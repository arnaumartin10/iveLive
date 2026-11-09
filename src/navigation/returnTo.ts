import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';
import { Platform } from 'react-native';

const RETURN_TO_KEY = 'ivelive:return-to';
const MAX_RETURN_TO_LENGTH = 2048;
const FALLBACK_ORIGIN = 'https://ivelive.invalid';

export function validateReturnTo(
  value: unknown,
  origin = FALLBACK_ORIGIN,
): string | null {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_RETURN_TO_LENGTH ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    /%5c/i.test(value)
  ) {
    return null;
  }

  try {
    const parsed = new URL(value, origin);
    if (parsed.origin !== origin || parsed.username || parsed.password) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export async function saveReturnTo(value: unknown): Promise<void> {
  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : FALLBACK_ORIGIN;
  const destination = validateReturnTo(value, origin);
  if (!destination) return;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.sessionStorage.setItem(RETURN_TO_KEY, destination);
    return;
  }
  await AsyncStorage.setItem(RETURN_TO_KEY, destination);
}

export async function consumeReturnTo(
  override?: unknown,
): Promise<string | null> {
  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : FALLBACK_ORIGIN;
  const explicitDestination = validateReturnTo(override, origin);

  let storedDestination: string | null = null;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    storedDestination = window.sessionStorage.getItem(RETURN_TO_KEY);
    window.sessionStorage.removeItem(RETURN_TO_KEY);
  } else {
    storedDestination = await AsyncStorage.getItem(RETURN_TO_KEY);
    await AsyncStorage.removeItem(RETURN_TO_KEY);
  }

  return explicitDestination ?? validateReturnTo(storedDestination, origin);
}

export async function peekReturnTo(): Promise<string | null> {
  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : FALLBACK_ORIGIN;
  const stored =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.sessionStorage.getItem(RETURN_TO_KEY)
      : await AsyncStorage.getItem(RETURN_TO_KEY);
  return validateReturnTo(stored, origin);
}

export function returnToHref(value: unknown): Href | null {
  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : FALLBACK_ORIGIN;
  const validated = validateReturnTo(value, origin);
  return validated ? (validated as Href) : null;
}

export function getCurrentInternalPath(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.pathname}${window.location.search}`;
  }
  return '/';
}

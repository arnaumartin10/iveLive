import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { env } from './env';
import type { Database } from './database.types';

const memoryStorage = new Map<string, string>();

function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (!window.localStorage) return false;
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const sessionStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (isLocalStorageAvailable()) {
        try {
          return window.localStorage.getItem(key);
        } catch {
          return memoryStorage.get(key) ?? null;
        }
      }
      return memoryStorage.get(key) ?? null;
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (isLocalStorageAvailable()) {
        try {
          window.localStorage.setItem(key, value);
          return;
        } catch {
          memoryStorage.set(key, value);
          return;
        }
      }
      memoryStorage.set(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      memoryStorage.set(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (isLocalStorageAvailable()) {
        try {
          window.localStorage.removeItem(key);
          return;
        } catch {
          memoryStorage.delete(key);
          return;
        }
      }
      memoryStorage.delete(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      memoryStorage.delete(key);
    }
  },
};

export const supabase = createClient<Database>(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

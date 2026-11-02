import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

export function migrateThemeMode(mode: unknown): ThemeMode {
  return mode === 'light' ? 'light' : 'dark';
}

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'ivelive-theme',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persistedState) => ({
        mode:
          typeof persistedState === 'object' &&
          persistedState !== null &&
          'mode' in persistedState
            ? migrateThemeMode(persistedState.mode)
            : 'dark',
      }),
    },
  ),
);

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { colorScheme as nativeWindColorScheme } from 'nativewind';
import { useThemeStore, type ThemeMode } from './store';
import { colors, type ColorScheme, type ThemeColors } from './tokens';

/**
 * ThemeProvider — Paper & Ink design system.
 *
 * Light: "Paper" (wheat backgrounds, violet ink, orange accent)
 * Dark:  "Night Shift" (violet-slate backgrounds, wheat ink, orange accent)
 *
 * The `colors` object in context contains ONLY semantic role tokens;
 * components must never import raw palette values.
 */

type ThemeContextValue = {
  mode: ThemeMode;
  scheme: ColorScheme;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const scheme: ColorScheme = mode;

  useEffect(() => {
    nativeWindColorScheme.set(scheme);
  }, [scheme]);

  return (
    <ThemeContext.Provider
      value={{ mode, scheme, colors: colors[scheme], setMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider.');
  }

  return theme;
}

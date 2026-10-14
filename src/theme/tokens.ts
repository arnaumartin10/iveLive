/**
 * IveLive Design Tokens
 * 8pt grid, dark-first, one accent color system
 * Palette: #FB3640 (crimson), #031927 (navy), #F2AF29 (amber), #508AA8 (steel), #E0E0CE (ivory)
 */

export const palette = {
  // Brand
  crimson: '#FB3640',
  navy: '#031927',
  amber: '#F2AF29',
  steel: '#508AA8',
  ivory: '#E0E0CE',

  // Neutrals (dark-first)
  black: '#000000',
  surface0: '#080F15',
  surface1: '#0D1821',
  surface2: '#152233',
  surface3: '#1E3045',
  border: '#1F3347',
  muted: '#4A6A82',
  textSecondary: '#8AA8BC',
  textPrimary: '#E0E0CE',
  white: '#FFFFFF',

  // Semantic
  success: '#4CAF50',
  error: '#FB3640',
  warning: '#F2AF29',
} as const;

export type PaletteKey = keyof typeof palette;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  black: 'Inter_900Black',
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 36,
  '4xl': 48,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#031927',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#031927',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  glow: {
    shadowColor: '#FB3640',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
  glowAmber: {
    shadowColor: '#F2AF29',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export const duration = {
  fast: 150,
  normal: 250,
  slow: 350,
  celebration: 600,
} as const;

export const spring = {
  snappy: { damping: 18, stiffness: 300 },
  bouncy: { damping: 14, stiffness: 250 },
  gentle: { damping: 20, stiffness: 200 },
} as const;

/**
 * PAPER & INK — Design Tokens
 *
 * Components import ONLY from this file (never raw palette values).
 * Semantic roles come from paperTheme / nightTheme via ThemeProvider.
 */
import type { ViewStyle } from 'react-native';
import {
  RAW,
  paperTheme,
  nightTheme,
  type SemanticColors,
} from './palette';

// ─── Theme color maps (used by ThemeProvider) ─────────────────────────────────
export const colors = {
  light: paperTheme,
  dark:  nightTheme,
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColors = SemanticColors;

// ─── Spacing (unchanged) ─────────────────────────────────────────────────────
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
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

// ─── Shape ────────────────────────────────────────────────────────────────────
// Paper & Ink uses HARD SHADOWS and BORDERS; mostly square corners.
// Pills only for tiny labels. No rounded-2xl uniform cards.
export const radius = {
  none:  0,
  sm:    2,   // nearly square
  md:    4,   // slight cut corner
  lg:    6,   // used sparingly
  pill:  999, // ONLY for tiny labels/chips
  full:  999,
  xl:    8,   // max used in the system
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
// Display: YoungSerif_400Regular (headings, big numerals, artist names)
// Body/UI: SchibstedGrotesk_* (all UI text)
// Data:    DMMono_* (dates, numbers, counters, labels)
//
// Font substitution notes:
// - Young Serif has only 400Regular weight; use it at large sizes where weight
//   comes from scale and serifs, not stroke weight.
// - Schibsted Grotesk covers 400–900 with italics; replaces Inter for body and
//   Space Grotesk for display-weight UI headings.
// - DM Mono covers 300–500; use 500Medium for upright mono labels.
export const fontFamily = {
  display:         'YoungSerif_400Regular',       // Young Serif, editorial headlines
  displayFallback: 'serif',                        // system serif fallback
  regular:         'SchibstedGrotesk_400Regular', // body text
  medium:          'SchibstedGrotesk_500Medium',  // UI emphasis
  semibold:        'SchibstedGrotesk_600SemiBold',
  bold:            'SchibstedGrotesk_700Bold',
  black:           'SchibstedGrotesk_900Black',
  mono:            'DMMono_400Regular',           // data / ticket text
  monoMedium:      'DMMono_500Medium',            // mono labels
  // Legacy compat keys (keep so existing components don't break during migration)
  displaySemibold: 'SchibstedGrotesk_700Bold',
  displayMedium:   'SchibstedGrotesk_500Medium',
} as const;

export const fontSize = {
  xs:   11,
  sm:   13,
  base: 16,
  md:   18,
  lg:   22,
  xl:   28,
  '2xl': 36,
  '3xl': 48,
  '4xl': 72,  // oversized display numeral
  '5xl': 96,
} as const;

// Type scale — strong contrast between display and body
export const typeScale = {
  /** Editorial display — Young Serif, 48pt+. Artist names, stat headings. */
  display: {
    fontSize:   fontSize['4xl'],
    lineHeight: 80,
    fontFamily: fontFamily.display,
    letterSpacing: -1,
  },
  /** Section headline — Young Serif, 36pt */
  headline: {
    fontSize:   fontSize['3xl'],
    lineHeight: 52,
    fontFamily: fontFamily.display,
    letterSpacing: -0.5,
  },
  /** Card title — Schibsted Grotesk Bold, 22pt */
  title: {
    fontSize:   fontSize.lg,
    lineHeight: 28,
    fontFamily: fontFamily.bold,
    letterSpacing: 0,
  },
  /** Sub-heading — Schibsted Grotesk SemiBold, 18pt */
  subtitle: {
    fontSize:   fontSize.md,
    lineHeight: 24,
    fontFamily: fontFamily.semibold,
  },
  /** Body — Schibsted Grotesk Regular, 16/24 */
  body: {
    fontSize:   fontSize.base,
    lineHeight: 24,
    fontFamily: fontFamily.regular,
  },
  /** Caption — Schibsted Grotesk Medium, 13pt */
  caption: {
    fontSize:   fontSize.sm,
    lineHeight: 18,
    fontFamily: fontFamily.medium,
  },
  /** Mono label — DM Mono Medium, uppercase, wide tracking */
  label: {
    fontSize:   fontSize.xs,
    lineHeight: 16,
    fontFamily: fontFamily.monoMedium,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  /** Overline — DM Mono Medium, 11pt, uppercase */
  overline: {
    fontSize:   fontSize.xs,
    lineHeight: 14,
    fontFamily: fontFamily.monoMedium,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  /** Mono body — DM Mono Regular, dates / numbers */
  mono: {
    fontSize:   fontSize.sm,
    lineHeight: 20,
    fontFamily: fontFamily.mono,
    letterSpacing: 0.3,
  },
} as const;

// ─── Shadows: HARD OFFSET only; no blur ──────────────────────────────────────
// React Native doesn't support box-shadow with 0 blur natively;
// we use a tiny blur (1) to achieve a crisp edge on iOS.
// On Android use elevation 0 + border to simulate.
export const hardShadow = {
  /** 2px hard offset ink shadow */
  sm: {
    shadowColor:  RAW.violet, // violet ink
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.85,
    shadowRadius: 0,
    elevation: 2,
  } satisfies ViewStyle,
  /** 3px hard offset ink shadow */
  md: {
    shadowColor:  RAW.violet,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.85,
    shadowRadius: 0,
    elevation: 3,
  } satisfies ViewStyle,
  /** 4px hard offset for large CTAs */
  lg: {
    shadowColor:  RAW.violet,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.85,
    shadowRadius: 0,
    elevation: 4,
  } satisfies ViewStyle,
  /** Orange 3px hard shadow for accent elements */
  accent: {
    shadowColor:  RAW.orange,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.90,
    shadowRadius: 0,
    elevation: 3,
  } satisfies ViewStyle,
} as const;

// ─── Keep named exports for back-compat ──────────────────────────────────────
/** @deprecated Use hardShadow instead */
export const shadow = hardShadow;

/** @deprecated Glow is removed from Paper & Ink. Use hardShadow.accent. */
export function glow(_color: string, _intensity = 0.7): ViewStyle {
  // Returns accent hard shadow as a non-breaking fallback
  return hardShadow.accent;
}

// ─── Motion (physical, not floaty) ───────────────────────────────────────────
export const duration = {
  /** Stamp impact */   stamp:  90,
  /** UI fast */        fast:   120,
  /** UI normal */      normal: 180,
  /** Flip / tear */    slow:   260,
} as const;

export const spring = {
  /** Stamp settle: quick, slight rotation land */
  stamp:  { damping: 16, stiffness: 380, mass: 0.6 },
  /** Paper slide-in */
  paper:  { damping: 22, stiffness: 280, mass: 0.7 },
  /** Snappy UI response */
  snappy: { damping: 18, stiffness: 300 },
  bouncy: { damping: 14, stiffness: 250 },
  gentle: { damping: 20, stiffness: 200 },
} as const;

// ─── Palette export for legacy consumers ─────────────────────────────────────
// Minimal re-export so old palette.* references don't break.
export const palette = {
  ...nightTheme,
  crimson: nightTheme.accent,
  navy:    nightTheme.background,
  amber:   nightTheme.gold,
  steel:   nightTheme.textSecondary,
  ivory:   nightTheme.textPrimary,
  muted:   nightTheme.textSecondary,
  surface0: nightTheme.background,
  surface1: nightTheme.surface2,
  surface2: nightTheme.surfaceElevated,
  surface3: nightTheme.surfaceElevated,
  error:    nightTheme.danger,
} as const;

export type PaletteKey = keyof typeof palette;

// ─── Re-export for convenience ────────────────────────────────────────────────
export type { SemanticColors };

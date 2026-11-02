/**
 * PAPER & INK — Palette System
 *
 * The ONLY allowed hues: mauve, slate, wheat, orange, violet.
 * Every color in the app must derive from these five.
 * Tints are created by mixing toward wheat.
 * Shades are created by mixing toward violet (dark) or slate (cool-dark).
 *
 * The mix() helper works in linear RGB (gamma-decoded then re-encoded),
 * which approximates OKLCH mixing for similar saturation levels without
 * pulling toward gray like sRGB interpolation does.
 */

// ─── Base palette anchors (RAW values, export for tests only) ─────────────────
import paletteAnchors from './anchors.json';

export const RAW = paletteAnchors;

export type PaletteAnchor = keyof typeof RAW;

// ─── Linear-RGB mix helper ────────────────────────────────────────────────────
/** Decode sRGB component to linear */
function lin(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
/** Encode linear to sRGB component */
function enc(l: number): number {
  const s = l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
  return Math.round(Math.min(255, Math.max(0, s * 255)));
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Mix two hex colors in linear-RGB space.
 * @param a - start hex color
 * @param b - end hex color
 * @param t - 0 = all a, 1 = all b
 */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const r = enc(lin(ar) * (1 - t) + lin(br) * t);
  const g = enc(lin(ag) * (1 - t) + lin(bg) * t);
  const bl = enc(lin(ab) * (1 - t) + lin(bb) * t);
  return toHex(r, g, bl);
}

/** Compute relative luminance in linear space (WCAG 2.1) */
export function getLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Compute WCAG contrast ratio between two hex colors */
export function getContrastRatio(hexA: string, hexB: string): number {
  const l1 = getLuminance(hexA);
  const l2 = getLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Tonal ramps (5 steps each, t=0 is pure, t=1 is wheat/violet) ────────────
// Each step is mix(base, tintTarget|shadeTarget, step * 0.25)
// Named: 0 (pure) → 100 (darkest shade) or 900 (lightest tint)

export const mauveTints = {
  /** pure mauve */ 500: RAW.mauve,
  /** 25% toward wheat */ 300: mix(RAW.mauve, RAW.wheat, 0.25),
  /** 50% toward wheat */ 200: mix(RAW.mauve, RAW.wheat, 0.5),
  /** 75% toward wheat */ 100: mix(RAW.mauve, RAW.wheat, 0.75),
} as const;

export const mauveShades = {
  /** pure mauve */ 500: RAW.mauve,
  /** 25% toward violet */ 600: mix(RAW.mauve, RAW.violet, 0.25),
  /** 50% toward violet */ 700: mix(RAW.mauve, RAW.violet, 0.5),
  /** 75% toward violet */ 800: mix(RAW.mauve, RAW.violet, 0.75),
} as const;

export const slateShades = {
  /** pure slate */ 500: RAW.slate,
  /** 25% toward violet */ 600: mix(RAW.slate, RAW.violet, 0.25),
  /** 50% toward violet */ 700: mix(RAW.slate, RAW.violet, 0.5),
  /** deep dark */ 800: mix(RAW.slate, RAW.violet, 0.7),
} as const;

export const slateTints = {
  /** pure slate */ 500: RAW.slate,
  /** 25% toward wheat */ 400: mix(RAW.slate, RAW.wheat, 0.2),
  /** 50% toward wheat */ 300: mix(RAW.slate, RAW.wheat, 0.45),
} as const;

export const wheatTints = {
  /** pure wheat */ 100: RAW.wheat,
  /** 20% toward mauve (warm shadow) */ 200: mix(RAW.wheat, RAW.mauve, 0.12),
  /** 40% toward mauve */ 300: mix(RAW.wheat, RAW.mauve, 0.28),
  /** pure wheat (lightest hue in system) */ 50: RAW.wheat,
} as const;

export const orangeTints = {
  /** pure orange */ 500: RAW.orange,
  /** 30% toward wheat (readable on dark) */ 400: mix(
    RAW.orange,
    RAW.wheat,
    0.3,
  ),
  /** 55% toward wheat (small text on dark) */ 300: mix(
    RAW.orange,
    RAW.wheat,
    0.55,
  ),
} as const;

export const orangeShades = {
  /** pure orange */ 500: RAW.orange,
  /** 25% toward violet */ 600: mix(RAW.orange, RAW.violet, 0.25),
  /** 50% toward violet */ 700: mix(RAW.orange, RAW.violet, 0.5),
} as const;

export const violetTints = {
  /** pure violet */ 900: RAW.violet,
  /** 25% toward wheat */ 700: mix(RAW.violet, RAW.wheat, 0.15),
  /** 50% toward wheat */ 600: mix(RAW.violet, RAW.wheat, 0.28),
} as const;

// ─── Semantic role tokens ─────────────────────────────────────────────────────
// Used by ThemeProvider; components only touch these roles, never raw palette.

export type SemanticColors = {
  /** Page / screen background */
  bg: string;
  /** Sunken inset background (below bg) */
  bgSunken: string;
  /** Card / surface background */
  surface: string;
  /** Raised surface (modals, overlays) */
  surfaceRaised: string;
  /** Primary text, icons */
  ink: string;
  /** Secondary / muted text */
  inkMuted: string;
  /** Borders, rules, dividers */
  line: string;
  /** Accent fill (big buttons, stamps) */
  accent: string;
  /** Ink on accent fill */
  accentInk: string;
  accentText: string;
  /** Positive state */
  positive: string;
  positiveText: string;
  /** Warning state */
  warning: string;
  warningText: string;
  /** Danger state */
  danger: string;
  dangerText: string;

  // Legacy compat (consumed by existing code; mapped here to avoid mass rename)
  background: string;
  surface2: string;
  surfaceElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  text: string;
  muted: string;
  white: string;
  gold: string;
  success: string;
};

// Light theme — "Paper"
export const paperTheme: SemanticColors = {
  bg: wheatTints[50], // near-white warm
  bgSunken: wheatTints[200], // warm sunken wash
  surface: RAW.wheat, // paper card
  surfaceRaised: wheatTints[50], // elevated modal
  ink: RAW.violet, // deep violet ink
  inkMuted: mauveShades[600], // muted mauve-violet
  line: mauveShades[700], // ink border (ink at 40% mix)
  accent: RAW.orange, // orange stamp
  accentInk: RAW.wheat, // wheat on orange
  accentText: orangeShades[700],
  positive: slateShades[500], // slate for positive
  positiveText: RAW.slate,
  warning: orangeTints[400], // warm orange tint
  warningText: orangeShades[700],
  danger: orangeShades[600], // dark orange for danger
  dangerText: orangeShades[700],

  // Legacy compat
  background: wheatTints[50],
  surface2: RAW.wheat,
  surfaceElevated: wheatTints[200],
  border: mauveShades[700],
  textPrimary: RAW.violet,
  textSecondary: mauveShades[600],
  text: RAW.violet,
  muted: mauveShades[600],
  white: RAW.wheat,
  gold: RAW.orange,
  success: slateShades[500],
};

// Dark theme — "Night Shift"
export const nightTheme: SemanticColors = {
  bg: mix(RAW.violet, RAW.slate, 0.4), // deep violet-slate
  bgSunken: RAW.violet, // pure violet sunken
  surface: mauveShades[700], // dark mauve surface
  surfaceRaised: mauveShades[600], // slightly lighter
  ink: RAW.wheat, // wheat ink on dark
  inkMuted: mauveTints[100], // readable muted wheat-mauve
  line: mauveShades[600], // subdued border
  accent: RAW.orange, // orange remains
  accentInk: RAW.wheat, // wheat on orange
  accentText: RAW.wheat,
  positive: slateTints[400], // slate tint for positive
  positiveText: RAW.wheat,
  warning: orangeTints[400], // warm orange tint
  warningText: RAW.wheat,
  danger: orangeTints[300], // lighter danger for dark
  dangerText: RAW.wheat,

  // Legacy compat
  background: mix(RAW.violet, RAW.slate, 0.4),
  surface2: mauveShades[700],
  surfaceElevated: mauveShades[600],
  border: mauveShades[600],
  textPrimary: RAW.wheat,
  textSecondary: mauveTints[300],
  text: RAW.wheat,
  muted: mauveTints[300],
  white: RAW.wheat,
  gold: orangeTints[400],
  success: slateTints[400],
};

/** Accent text safe for small text on DARK backgrounds (passes 4.5:1) */
export const ACCENT_TEXT_DARK = orangeTints[300];
/** Accent text safe for small text on LIGHT backgrounds (passes 4.5:1) */
export const ACCENT_TEXT_LIGHT = orangeShades[700];

/**
 * Shared utility functions for IveLive.
 */
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  RAW,
  orangeTints,
  orangeShades,
  mauveTints,
  mauveShades,
  slateTints,
  slateShades,
  wheatTints,
} from '../theme/palette';

/** Format a date string to a human-readable concert date */
export function formatConcertDate(isoString: string): string {
  try {
    return format(parseISO(isoString), 'MMM d, yyyy');
  } catch {
    return isoString;
  }
}

/** Relative time: "3 months ago" */
export function formatRelativeDate(isoString: string): string {
  try {
    return formatDistanceToNow(parseISO(isoString), { addSuffix: true });
  } catch {
    return isoString;
  }
}

/** Generate initials from an artist name for placeholder avatars */
export function getInitials(name?: string | null): string {
  return (name?.trim() || 'Unknown user')
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Convert hex color to RGBA with opacity */
export function hexToRgba(hex: string, opacity: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0,0,0,${opacity})`;
  const r = parseInt(result[1] ?? '0', 16);
  const g = parseInt(result[2] ?? '0', 16);
  const b = parseInt(result[3] ?? '0', 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

export const DETERMINISTIC_GRADIENTS: readonly (readonly [string, string])[] = [
  [RAW.orange, orangeTints[400]],
  [RAW.slate, slateTints[400]],
  [RAW.mauve, mauveTints[300]],
  [RAW.violet, mauveShades[600]],
  [RAW.orange, orangeShades[600]],
  [RAW.slate, slateShades[600]],
  [RAW.mauve, wheatTints[300]],
  [RAW.wheat, wheatTints[200]],
];

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getDeterministicGradient(name: string): [string, string] {
  const normalized = (name || '').trim().toLowerCase();
  if (!normalized) {
    const fallback = DETERMINISTIC_GRADIENTS[0] || [RAW.orange, RAW.wheat];
    return [fallback[0], fallback[1]];
  }
  const hash = hashString(normalized);
  const palette =
    DETERMINISTIC_GRADIENTS[hash % DETERMINISTIC_GRADIENTS.length] ||
    DETERMINISTIC_GRADIENTS[0] || [RAW.orange, RAW.wheat];
  return [palette[0], palette[1]];
}

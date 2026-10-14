/**
 * Shared utility functions for IveLive.
 */
import { format, formatDistanceToNow, parseISO } from 'date-fns';

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
export function getInitials(name: string): string {
  return name
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

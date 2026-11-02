import { z } from 'zod';
import type { ProfilePick, WishlistStatus } from './types';

export const MAX_PROFILE_PICKS = 5;
export const STALE_PICKS_DAYS = 60;

export function reorderPicks<T>(
  items: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }
  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);
  if (moved === undefined) return items;
  reordered.splice(toIndex, 0, moved);
  return reordered;
}

export function arePicksStale(
  updatedAt: string | null | undefined,
  now = Date.now(),
) {
  if (!updatedAt) return false;
  const timestamp = Date.parse(updatedAt);
  return (
    Number.isFinite(timestamp) &&
    now - timestamp > STALE_PICKS_DAYS * 24 * 60 * 60 * 1000
  );
}

export function applyWishlistTransition(
  current: WishlistStatus,
  next: WishlistStatus,
): WishlistStatus | null {
  const allowed: Record<WishlistStatus, WishlistStatus[]> = {
    wanted: ['going', 'seen'],
    going: ['wanted', 'seen'],
    seen: ['wanted', 'going'],
  };
  return allowed[current].includes(next) ? next : null;
}

export function picksToIds(picks: ProfilePick[]) {
  return picks.slice(0, MAX_PROFILE_PICKS).map((pick) => pick.id);
}

const httpsUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === '' || /^https:\/\//i.test(value), {
    message: 'Ticket link must use https://',
  });

export const wishlistEditorSchema = z.object({
  artist_id: z.string().uuid('Choose an artist.'),
  event_name: z.string().trim().max(120),
  venue_name: z.string().trim().max(120),
  city: z.string().trim().max(100),
  target_date: z
    .string()
    .nullable()
    .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: 'Enter a date in YYYY-MM-DD format.',
    }),
  date_flexible: z.boolean(),
  venue_type: z
    .enum([
      'festival',
      'concert_hall_club',
      'stadium',
      'indoor_arena',
      'festa_major',
      'other',
    ])
    .nullable(),
  priority: z.number().int().min(1).max(3),
  note: z.string().trim().max(300),
  status: z.enum(['wanted', 'going', 'seen']),
  ticket_url: httpsUrlSchema,
});

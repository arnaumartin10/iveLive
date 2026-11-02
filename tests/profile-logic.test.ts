import { describe, expect, it } from '@jest/globals';
import {
  arePicksStale,
  applyWishlistTransition,
  reorderPicks,
  wishlistEditorSchema,
} from '../src/features/profile/logic';

const validWishlist = {
  artist_id: '20000000-0000-4000-8000-000000000001',
  event_name: 'Primavera Sound 2027',
  venue_name: 'Parc del Fòrum',
  city: 'Barcelona',
  target_date: '2027-06-03',
  date_flexible: false,
  venue_type: 'festival' as const,
  priority: 1,
  note: 'Meet friends at the main entrance.',
  status: 'wanted' as const,
  ticket_url: 'https://tickets.example.test/show',
};

describe('profile picks and wishlist rules', () => {
  it('reorders a pick without mutating the original list', () => {
    const items = ['A', 'B', 'C', 'D'];
    expect(reorderPicks(items, 0, 2)).toEqual(['B', 'C', 'A', 'D']);
    expect(items).toEqual(['A', 'B', 'C', 'D']);
  });

  it('ignores invalid reorder positions', () => {
    const items = ['A', 'B'];
    expect(reorderPicks(items, 0, 4)).toBe(items);
  });

  it('marks picks stale only after sixty days', () => {
    const now = Date.parse('2026-10-16T00:00:00.000Z');
    expect(arePicksStale('2026-08-17T00:00:00.000Z', now)).toBe(false);
    expect(arePicksStale('2026-08-16T00:00:00.000Z', now)).toBe(true);
    expect(arePicksStale(null, now)).toBe(false);
  });

  it('allows wishlist wanted to going to seen transitions', () => {
    expect(applyWishlistTransition('wanted', 'going')).toBe('going');
    expect(applyWishlistTransition('going', 'seen')).toBe('seen');
    expect(applyWishlistTransition('wanted', 'seen')).toBe('seen');
    expect(applyWishlistTransition('seen', 'seen')).toBeNull();
  });

  it('validates wishlist fields and requires ticket links to use https', () => {
    expect(wishlistEditorSchema.safeParse(validWishlist).success).toBe(true);
    expect(
      wishlistEditorSchema.safeParse({
        ...validWishlist,
        ticket_url: 'http://tickets.example.test',
      }).success,
    ).toBe(false);
    expect(
      wishlistEditorSchema.safeParse({
        ...validWishlist,
        note: 'x'.repeat(301),
      }).success,
    ).toBe(false);
  });
});

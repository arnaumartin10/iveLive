import { formatConcertDate, getInitials, clamp, hexToRgba } from '../src/lib/utils';

describe('Utility Functions', () => {
  describe('getInitials', () => {
    it('returns first letters of first two words', () => {
      expect(getInitials('Radiohead')).toBe('R');
      expect(getInitials('Arctic Monkeys')).toBe('AM');
      expect(getInitials('The Black Keys')).toBe('TB');
    });

    it('handles empty string gracefully', () => {
      expect(getInitials('')).toBe('');
    });
  });

  describe('clamp', () => {
    it('clamps numbers within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('hexToRgba', () => {
    it('converts 6-digit hex color to rgba string', () => {
      expect(hexToRgba('#FB3640', 0.5)).toBe('rgba(251,54,64,0.5)');
      expect(hexToRgba('#031927', 1)).toBe('rgba(3,25,39,1)');
    });

    it('returns default rgba on invalid hex', () => {
      expect(hexToRgba('invalid', 0.5)).toBe('rgba(0,0,0,0.5)');
    });
  });

  describe('formatConcertDate', () => {
    it('formats ISO dates accurately', () => {
      expect(formatConcertDate('2024-06-15')).toBe('Jun 15, 2024');
    });

    it('returns fallback string if invalid date provided', () => {
      expect(formatConcertDate('invalid-date')).toBe('invalid-date');
    });
  });
});

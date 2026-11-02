import { describe, expect, it } from '@jest/globals';
import { migrateThemeMode } from '../src/theme/store';

describe('theme preference migration', () => {
  it('migrates the former system setting to the new dark default', () => {
    expect(migrateThemeMode('system')).toBe('dark');
  });

  it.each(['light', 'dark'] as const)(
    'preserves an existing %s preference',
    (mode) => {
      expect(migrateThemeMode(mode)).toBe(mode);
    },
  );

  it('uses dark for invalid saved values', () => {
    expect(migrateThemeMode(null)).toBe('dark');
  });
});

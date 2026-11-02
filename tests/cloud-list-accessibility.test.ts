import { describe, expect, it } from '@jest/globals';
import { isAccessibleListRequired } from '../src/features/cloud/accessibility';

describe('accessible Cloud list selection', () => {
  it('does not interpret React Native Web’s always-true reader result as active', () => {
    expect(isAccessibleListRequired('web', true, false)).toBe(false);
  });

  it('still permits manually selecting the list on web', () => {
    expect(isAccessibleListRequired('web', false, true)).toBe(true);
  });

  it('automatically selects the list for native screen readers', () => {
    expect(isAccessibleListRequired('ios', true, false)).toBe(true);
    expect(isAccessibleListRequired('android', false, false)).toBe(false);
  });
});

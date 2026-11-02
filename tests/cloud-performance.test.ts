import { describe, expect, it } from '@jest/globals';
import {
  chooseDefaultCloudTier,
  cloudTierSettings,
  FrameTimeMonitor,
  lowerCloudTier,
  percentile95,
} from '../src/features/cloud/performance';

describe('Cloud performance tiers', () => {
  it('chooses a default tier from device class without platform-specific guesses', () => {
    expect(chooseDefaultCloudTier({ deviceYearClass: 2023, isTablet: false })).toBe(
      'spectacular',
    );
    expect(chooseDefaultCloudTier({ deviceYearClass: 2020, isTablet: false })).toBe(
      'balanced',
    );
    expect(chooseDefaultCloudTier({ deviceYearClass: null, isTablet: false })).toBe(
      'lite',
    );
    expect(chooseDefaultCloudTier({ deviceYearClass: 2017, isTablet: true })).toBe(
      'spectacular',
    );
  });

  it('drops only one tier after three consecutive over-budget frame windows', () => {
    const monitor = new FrameTimeMonitor();
    expect(monitor.recordWindow([24, 23, 24])).toBe(false);
    expect(monitor.recordWindow([23, 25, 24])).toBe(false);
    expect(monitor.recordWindow([21, 21, 21])).toBe(false);
    expect(monitor.recordWindow([24, 24, 24])).toBe(false);
    expect(monitor.recordWindow([23, 24, 25])).toBe(false);
    expect(monitor.recordWindow([25, 23, 24])).toBe(true);
    expect(lowerCloudTier('spectacular')).toBe('balanced');
    expect(lowerCloudTier('balanced')).toBe('lite');
    expect(lowerCloudTier('lite')).toBe('lite');
  });

  it('uses the 95th percentile and exposes the defined visual budgets', () => {
    expect(percentile95([10, 12, 14, 16, 20, 24, 26, 28, 30, 40])).toBe(40);
    expect(cloudTierSettings.spectacular.reliefLevels).toBe(5);
    expect(cloudTierSettings.balanced.reliefLevels).toBe(4);
    expect(cloudTierSettings.lite.reliefLevels).toBe(3);
    expect(cloudTierSettings.lite.waterlines).toBe(false);
  });
});
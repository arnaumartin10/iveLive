export type CloudVisualTier = 'spectacular' | 'balanced' | 'lite';
export type CloudQualitySetting = 'auto' | CloudVisualTier;

const TIER_ORDER: CloudVisualTier[] = ['spectacular', 'balanced', 'lite'];

export function chooseDefaultCloudTier(input: {
  deviceYearClass: number | null;
  isTablet: boolean;
}): CloudVisualTier {
  if (input.isTablet || (input.deviceYearClass ?? 0) >= 2022)
    return 'spectacular';
  if ((input.deviceYearClass ?? 0) >= 2019) return 'balanced';
  return 'lite';
}

export function lowerCloudTier(tier: CloudVisualTier): CloudVisualTier {
  return TIER_ORDER[Math.min(TIER_ORDER.indexOf(tier) + 1, 2)] ?? 'lite';
}

export const cloudTierSettings: Record<
  CloudVisualTier,
  {
    reliefLevels: number;
    ambientLife: boolean;
    grain: boolean;
    tilt: boolean;
    waterlines: boolean;
    scraps: boolean;
    smallAtlasOnly: boolean;
  }
> = {
  spectacular: {
    reliefLevels: 5,
    ambientLife: true,
    grain: true,
    tilt: true,
    waterlines: true,
    scraps: true,
    smallAtlasOnly: false,
  },
  balanced: {
    reliefLevels: 4,
    ambientLife: false,
    grain: true,
    tilt: true,
    waterlines: true,
    scraps: false,
    smallAtlasOnly: false,
  },
  lite: {
    reliefLevels: 3,
    ambientLife: false,
    grain: false,
    tilt: false,
    waterlines: false,
    scraps: false,
    smallAtlasOnly: true,
  },
};

const FRAME_BUDGET_MS = 22;

export class FrameTimeMonitor {
  private consecutiveOverBudgetSeconds = 0;
  private readonly triggerAfterSeconds: number;
  lastP95Ms = 0;

  constructor(triggerAfterSeconds = 3) {
    this.triggerAfterSeconds = triggerAfterSeconds;
  }

  recordWindow(samples: readonly number[]): boolean {
    if (samples.length === 0) return false;
    const ordered = samples
      .filter((sample) => Number.isFinite(sample) && sample >= 0)
      .sort((a, b) => a - b);
    if (ordered.length === 0) return false;
    this.lastP95Ms = ordered[Math.ceil(ordered.length * 0.95) - 1] ?? 0;
    if (this.lastP95Ms > FRAME_BUDGET_MS) {
      this.consecutiveOverBudgetSeconds += 1;
    } else {
      this.consecutiveOverBudgetSeconds = 0;
    }
    if (this.consecutiveOverBudgetSeconds < this.triggerAfterSeconds)
      return false;
    this.consecutiveOverBudgetSeconds = 0;
    return true;
  }

  reset(): void {
    this.consecutiveOverBudgetSeconds = 0;
    this.lastP95Ms = 0;
  }
}

export function percentile95(samples: readonly number[]): number {
  if (samples.length === 0) return 0;
  const ordered = samples.slice().sort((a, b) => a - b);
  return ordered[Math.ceil(ordered.length * 0.95) - 1] ?? 0;
}
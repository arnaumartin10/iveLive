import { describe, expect, it } from '@jest/globals';
import {
  getArcSegments,
  getBarRects,
  getHeatmapCellSize,
  getStackedRects,
} from '../src/components/stats/layout';

describe('stats chart layout', () => {
  it('scales bars to the available size with a minimum visible height', () => {
    const bars = getBarRects([0, 2, 4], 120, 80, 4);
    expect(bars).toHaveLength(3);
    expect(bars[0]?.height).toBe(2);
    expect(bars[2]?.height).toBe(80);
    expect(bars[2]?.x).toBeGreaterThan(bars[1]?.x ?? 0);
  });

  it('returns a stable cell size for a weekly heatmap', () => {
    expect(getHeatmapCellSize(100, 10, 2)).toBe(8.2);
    expect(getHeatmapCellSize(0, 10)).toBe(0);
  });

  it('places donut arcs and stacked segments without gaps or overlap', () => {
    expect(getArcSegments([1, 1])).toEqual([
      { index: 0, startAngle: -90, sweepAngle: 179.7 },
      { index: 1, startAngle: 89.69999999999999, sweepAngle: 179.7 },
    ]);
    expect(getStackedRects([1, 3], 100, 12)).toEqual([
      { x: 0, y: 0, width: 25, height: 12 },
      { x: 25, y: 0, width: 75, height: 12 },
    ]);
  });
});

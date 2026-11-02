export type BarRect = { x: number; y: number; width: number; height: number };
export type ArcSegment = {
  index: number;
  startAngle: number;
  sweepAngle: number;
};

export function getBarRects(
  values: number[],
  width: number,
  height: number,
  gap = 6,
): BarRect[] {
  if (values.length === 0 || width <= 0 || height <= 0) return [];
  const slot = width / values.length;
  const barWidth = Math.max(1, slot - gap);
  const maximum = Math.max(1, ...values);
  return values.map((value, index) => {
    const barHeight = Math.max(2, (Math.max(0, value) / maximum) * height);
    return {
      x: index * slot + (slot - barWidth) / 2,
      y: height - barHeight,
      width: barWidth,
      height: barHeight,
    };
  });
}

export function getHeatmapCellSize(
  width: number,
  weeks: number,
  gap = 3,
): number {
  if (weeks <= 0 || width <= 0) return 0;
  return Math.max(1, (width - gap * (weeks - 1)) / weeks);
}

export function getArcSegments(values: number[]): ArcSegment[] {
  const weights = values.map((value) => Math.max(0, value));
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total === 0) return [];
  return weights.flatMap((value, index) => {
    if (value === 0) return [];
    const before = weights
      .slice(0, index)
      .reduce((sum, prior) => sum + prior, 0);
    return [
      {
        index,
        startAngle: -90 + (before / total) * 359.4,
        sweepAngle: (value / total) * 359.4,
      },
    ];
  });
}

export function getStackedRects(
  values: number[],
  width: number,
  height: number,
): BarRect[] {
  const weights = values.map((value) => Math.max(0, value));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let offset = 0;
  return weights.map((value) => {
    const segmentWidth = total && width > 0 ? (value / total) * width : 0;
    const rect = { x: offset, y: 0, width: segmentWidth, height };
    offset += segmentWidth;
    return rect;
  });
}

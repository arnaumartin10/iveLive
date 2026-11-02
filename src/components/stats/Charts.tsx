import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Canvas, Circle, Path, Rect, Skia } from '@shopify/react-native-skia';
import { useTheme } from '../../theme/ThemeProvider';
import {
  getArcSegments,
  getBarRects,
  getHeatmapCellSize,
  getStackedRects,
} from './layout';
import type { HeatmapDay } from '../../features/stats/types';
import { useStatsScopeStore } from '../../features/stats/store';

const revealedCharts = new Set<string>();

function useChartReveal(animationKey: string, growthHeight = 0) {
  const scope = useStatsScopeStore((state) => state.scope);
  const key = `${animationKey}:${scope ?? 'all'}`;
  const progress = useSharedValue(0);

  useEffect(() => {
    if (revealedCharts.has(key)) {
      progress.value = 1;
      return;
    }
    revealedCharts.add(key);
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!mounted) return;
      progress.value = reduced ? 1 : withTiming(1, { duration: 420 });
    });
    return () => {
      mounted = false;
    };
  }, [key, progress]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: growthHeight
      ? [
          { translateY: (1 - progress.value) * growthHeight * 0.5 },
          { scaleY: progress.value },
        ]
      : [{ translateY: (1 - progress.value) * 8 }],
  }));
}

export function BarChart({
  values,
  colors,
  height = 112,
  animationKey = 'bar-chart',
}: {
  values: number[];
  colors: string[];
  height?: number;
  animationKey?: string;
}) {
  const { colors: themeColors } = useTheme();
  const [width, setWidth] = useState(0);
  const revealStyle = useChartReveal(animationKey, height);
  const bars = getBarRects(values, width, height);
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, revealStyle]}>
        <Canvas style={StyleSheet.absoluteFill}>
          {bars.map((bar, index) => (
            <Rect
              key={index}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              color={colors[index] ?? themeColors.accent}
              opacity={0.9}
            />
          ))}
        </Canvas>
      </Animated.View>
    </View>
  );
}

export function Donut({
  values,
  colors,
  size = 176,
  center,
  animationKey = 'donut-chart',
}: {
  values: number[];
  colors: string[];
  size?: number;
  center?: string;
  animationKey?: string;
}) {
  const { colors: themeColors } = useTheme();
  const revealStyle = useChartReveal(animationKey);
  const strokeWidth = 20;
  const diameter = size - strokeWidth;
  const arcs = getArcSegments(values).map(
    ({ index, startAngle, sweepAngle }) => {
      const path = Skia.Path.Make();
      path.addArc(
        {
          x: strokeWidth / 2,
          y: strokeWidth / 2,
          width: diameter,
          height: diameter,
        },
        startAngle,
        startAngle + sweepAngle,
      );
      return { path, color: colors[index] ?? themeColors.accent };
    },
  );

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, revealStyle]}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={diameter / 2}
            color={themeColors.surfaceElevated}
            style="stroke"
            strokeWidth={strokeWidth}
          />
          {arcs.map((arc, index) => (
            <Path
              key={index}
              path={arc.path}
              color={arc.color}
              style="stroke"
              strokeWidth={strokeWidth}
              strokeCap="butt"
            />
          ))}
        </Canvas>
      </Animated.View>
      {center ? (
        <View pointerEvents="none" style={styles.donutCenter}>
          <Animated.Text
            style={[styles.centerText, { color: themeColors.textPrimary }]}
          >
            {center}
          </Animated.Text>
        </View>
      ) : null}
    </View>
  );
}

export function StackedBar({
  values,
  colors,
  animationKey = 'stacked-bar',
}: {
  values: number[];
  colors: string[];
  animationKey?: string;
}) {
  const { colors: themeColors } = useTheme();
  const [width, setWidth] = useState(0);
  const revealStyle = useChartReveal(animationKey);
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={styles.stacked}
    >
      <Animated.View style={[StyleSheet.absoluteFill, revealStyle]}>
        <Canvas style={StyleSheet.absoluteFill}>
          {getStackedRects(values, width, 14).map((rect, index) => (
            <Rect
              key={index}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              color={colors[index] ?? themeColors.accent}
            />
          ))}
        </Canvas>
      </Animated.View>
    </View>
  );
}

export function Histogram({
  values,
  average,
  color,
  animationKey = 'rating-histogram',
}: {
  values: number[];
  average: number | null;
  color: string;
  animationKey?: string;
}) {
  const { colors: themeColors } = useTheme();
  const [width, setWidth] = useState(0);
  const revealStyle = useChartReveal(animationKey);
  const bars = getBarRects(values, width, 90, 4);
  const averageX = average == null ? null : ((average - 0.5) / 4.5) * width;
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height: 96 }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, revealStyle]}>
        <Canvas style={StyleSheet.absoluteFill}>
          {bars.map((bar, index) => (
            <Rect
              key={index}
              x={bar.x}
              y={bar.y + 4}
              width={bar.width}
              height={bar.height}
              color={color}
              opacity={0.8}
            />
          ))}
          {averageX != null ? (
            <Rect
              x={averageX}
              y={0}
              width={2}
              height={94}
              color={themeColors.textPrimary}
              opacity={0.65}
            />
          ) : null}
        </Canvas>
      </Animated.View>
    </View>
  );
}

export function Heatmap({
  days,
  accent,
  onSelectDay,
  year,
  animationKey = 'calendar-heatmap',
}: {
  days: HeatmapDay[];
  accent: string;
  onSelectDay?: (date: string) => void;
  year?: number;
  animationKey?: string;
}) {
  const { colors: themeColors } = useTheme();
  const [width, setWidth] = useState(0);
  const revealStyle = useChartReveal(animationKey);
  const max = Math.max(1, ...days.map((day) => day.count));
  const counts = new Map(days.map((day) => [day.date, day.count]));
  const allDates = days.map((day) => day.date).sort();
  const firstDate =
    year != null
      ? new Date(year, 0, 1)
      : allDates[0]
        ? new Date(`${allDates[0]}T00:00:00`)
        : new Date();
  const lastDate =
    year != null
      ? new Date(year, 11, 31)
      : allDates.at(-1)
        ? new Date(`${allDates.at(-1)}T00:00:00`)
        : new Date();
  firstDate.setDate(firstDate.getDate() - ((firstDate.getDay() + 6) % 7));
  lastDate.setDate(
    lastDate.getDate() + ((7 - ((lastDate.getDay() + 6) % 7)) % 7),
  );
  const weeks = Math.max(
    1,
    Math.ceil(
      (lastDate.getTime() - firstDate.getTime() + 86400000) / (7 * 86400000),
    ),
  );
  const gap = 3;
  const cellSize = getHeatmapCellSize(width, weeks, gap);
  const cells: { date: string; x: number; y: number; count: number }[] = [];
  for (
    let day = new Date(firstDate);
    day <= lastDate;
    day.setDate(day.getDate() + 1)
  ) {
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const index = Math.round((day.getTime() - firstDate.getTime()) / 86400000);
    cells.push({
      date,
      x: Math.floor(index / 7) * (cellSize + gap),
      y: (index % 7) * (cellSize + gap),
      count: counts.get(date) ?? 0,
    });
  }

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height: cellSize ? 7 * cellSize + 6 * gap : 72 }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, revealStyle]}>
        <Canvas style={StyleSheet.absoluteFill}>
          {cells.map((cell) => (
            <Rect
              key={cell.date}
              x={cell.x}
              y={cell.y}
              width={cellSize}
              height={cellSize}
              color={cell.count ? accent : themeColors.surfaceElevated}
              opacity={cell.count ? 0.28 + 0.72 * (cell.count / max) : 1}
            />
          ))}
        </Canvas>
      </Animated.View>
      {onSelectDay ? (
        <View style={StyleSheet.absoluteFill}>
          {cells.map((cell) => (
            <Pressable
              key={cell.date}
              accessibilityRole="button"
              accessibilityLabel={`${cell.date}: ${cell.count} shows`}
              onPress={() => cell.count > 0 && onSelectDay(cell.date)}
              style={{
                position: 'absolute',
                left: cell.x,
                top: cell.y,
                width: cellSize,
                height: cellSize,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function Gauge({
  value,
  color,
  animationKey = 'diversity-gauge',
}: {
  value: number;
  color: string;
  animationKey?: string;
}) {
  const { colors: themeColors } = useTheme();
  const revealStyle = useChartReveal(animationKey);
  const clamped = Math.max(0, Math.min(100, value));
  const path = Skia.Path.Make();
  path.addArc({ x: 8, y: 8, width: 124, height: 124 }, 135, 405);
  const progress = Skia.Path.Make();
  progress.addArc(
    { x: 8, y: 8, width: 124, height: 124 },
    135,
    135 + (270 * clamped) / 100,
  );
  return (
    <View style={styles.gauge}>
      <Animated.View style={[StyleSheet.absoluteFill, revealStyle]}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Path
            path={path}
            color={themeColors.surfaceElevated}
            style="stroke"
            strokeWidth={12}
            strokeCap="round"
          />
          <Path
            path={progress}
            color={color}
            style="stroke"
            strokeWidth={12}
            strokeCap="round"
          />
        </Canvas>
      </Animated.View>
      <Animated.Text
        style={[styles.gaugeValue, { color: themeColors.textPrimary }]}
      >
        {Math.round(clamped)}
      </Animated.Text>
    </View>
  );
}

export function CountUp({
  value,
  suffix = '',
  precision = Number.isInteger(value) ? 0 : 1,
  fontSize,
}: {
  value: number;
  suffix?: string;
  precision?: number;
  fontSize?: number;
}) {
  const { colors: themeColors } = useTheme();
  const [displayValue, setDisplayValue] = useState(value);
  const progress = useSharedValue(0);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active) return;
      if (reduced) {
        setDisplayValue(value);
        return;
      }
      progress.value = 0;
      progress.value = withTiming(1, { duration: 700 });
    });
    return () => {
      active = false;
    };
  }, [progress, value]);

  useAnimatedReaction(
    () => progress.value * value,
    (nextValue) => {
      const scale = 10 ** precision;
      runOnJS(setDisplayValue)(Math.round(nextValue * scale) / scale);
    },
    [precision, value],
  );

  return (
    <Animated.Text
      style={[
        styles.countUp,
        { color: themeColors.textPrimary },
        fontSize ? { fontSize, lineHeight: fontSize * 1.08 } : null,
      ]}
    >
      {new Intl.NumberFormat(undefined, {
        maximumFractionDigits: precision,
      }).format(displayValue)}
      {suffix}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  donutCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: { fontSize: 21, fontWeight: '800' },
  stacked: { height: 14, overflow: 'hidden', borderRadius: 8 },
  gauge: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeValue: { fontSize: 28, fontWeight: '800' },
  countUp: { fontSize: 20, fontWeight: '800' },
});

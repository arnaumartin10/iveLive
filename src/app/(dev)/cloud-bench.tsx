import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Circle, Rect } from '@shopify/react-native-skia';
import {
  runOnJS,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { percentile95, type CloudVisualTier } from '../../features/cloud/performance';

const BENCH_COUNTS = [100, 300, 1000] as const;
const BENCH_TIERS: CloudVisualTier[] = ['spectacular', 'balanced', 'lite'];

function makeBenchNodes(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    x: ((index * 127 + 53) % 997) / 997,
    y: ((index * 193 + 29) % 991) / 991,
    radius: 2 + (index % 5),
    palette: index % 5,
  }));
}

export default function CloudBenchScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [nodeCount, setNodeCount] = useState<(typeof BENCH_COUNTS)[number]>(300);
  const [tier, setTier] = useState<CloudVisualTier>('balanced');
  const [metrics, setMetrics] = useState({ fps: 0, p95Ms: 0 });
  const samples = useSharedValue<number[]>([]);
  const elapsed = useSharedValue(0);
  const benchNodes = useMemo(() => makeBenchNodes(nodeCount), [nodeCount]);
  const visibleCount =
    tier === 'lite' ? Math.min(250, nodeCount) : tier === 'balanced' ? Math.min(700, nodeCount) : nodeCount;
  const reportWindow = useCallback((window: number[]) => {
    setMetrics({
      fps: window.length,
      p95Ms: percentile95(window),
    });
  }, []);

  useFrameCallback(({ timeSincePreviousFrame }) => {
    if (timeSincePreviousFrame == null) return;
    samples.value = [...samples.value, timeSincePreviousFrame];
    elapsed.value += timeSincePreviousFrame;
    if (elapsed.value < 1000) return;
    const window = samples.value;
    samples.value = [];
    elapsed.value %= 1000;
    runOnJS(reportWindow)(window);
  }, true);

  const palette = [
    colors.accent,
    colors.ink,
    colors.positive,
    colors.inkMuted,
    colors.surfaceRaised,
  ];
  const canvasHeight = Math.min(520, width * 1.05);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Text variant="title" weight="bold">
        Cloud renderer bench
      </Text>
      <Text variant="caption" color="secondary">
        Choose a scene size and tier; keep the screen visible for at least 3s.
      </Text>
      <View style={styles.selectorRow}>
        {BENCH_COUNTS.map((count) => (
          <Pressable
            key={count}
            accessibilityRole="button"
            accessibilityState={{ selected: nodeCount === count }}
            onPress={() => setNodeCount(count)}
            style={[
              styles.selector,
              {
                borderColor: nodeCount === count ? colors.accent : colors.line,
              },
            ]}
          >
            <Text variant="caption">{count} artists</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.selectorRow}>
        {BENCH_TIERS.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: tier === item }}
            onPress={() => setTier(item)}
            style={[
              styles.selector,
              { borderColor: tier === item ? colors.accent : colors.line },
            ]}
          >
            <Text variant="caption">{item}</Text>
          </Pressable>
        ))}
      </View>
      <View
        style={[
          styles.canvas,
          { height: canvasHeight, borderColor: colors.line },
        ]}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          <Rect
            x={0}
            y={0}
            width={width}
            height={canvasHeight}
            color={colors.bg}
          />
          {benchNodes.slice(0, visibleCount).map((node, index) => (
            <Circle
              key={index}
              cx={node.x * width}
              cy={node.y * canvasHeight}
              r={node.radius}
              color={palette[node.palette] ?? colors.ink}
            />
          ))}
        </Canvas>
      </View>
      <Text variant="subtitle" weight="bold">
        {metrics.fps ? `${metrics.fps} fps · p95 ${metrics.p95Ms.toFixed(1)} ms` : 'Measuring…'}
      </Text>
      <Text variant="caption" color="secondary">
        {tier.toUpperCase()} · {visibleCount} draw nodes · frame target ≤22 ms.
        This isolated canvas baseline excludes data and gestures.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12, padding: 20 },
  canvas: { width: '100%', overflow: 'hidden', borderWidth: 1 },
  selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selector: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 10,
  },
});

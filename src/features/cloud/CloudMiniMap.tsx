import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Circle, Rect } from '@shopify/react-native-skia';
import { useTheme } from '../../theme/ThemeProvider';
import type { Camera, CloudNode } from './simulation';

const MAP_WIDTH = 104;
const MAP_HEIGHT = 84;
const MAP_INSET = 6;

export function CloudMiniMap({
  nodes,
  camera,
  viewport,
}: {
  nodes: CloudNode[];
  camera: Camera;
  viewport: { width: number; height: number };
}) {
  const { colors } = useTheme();
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: -1, minY: -1, width: 2, height: 2 };
    const xs = nodes.map((node) => node.x ?? 0);
    const ys = nodes.map((node) => node.y ?? 0);
    const minX = Math.min(...xs) - 70;
    const minY = Math.min(...ys) - 70;
    return {
      minX,
      minY,
      width: Math.max(...xs) - minX + 70,
      height: Math.max(...ys) - minY + 70,
    };
  }, [nodes]);
  const scale = Math.min(
    (MAP_WIDTH - MAP_INSET * 2) / bounds.width,
    (MAP_HEIGHT - MAP_INSET * 2) / bounds.height,
  );
  const offsetX = (MAP_WIDTH - bounds.width * scale) / 2 - bounds.minX * scale;
  const offsetY =
    (MAP_HEIGHT - bounds.height * scale) / 2 - bounds.minY * scale;
  const worldCenterX = -camera.x / Math.max(camera.scale, 0.001);
  const worldCenterY = -camera.y / Math.max(camera.scale, 0.001);
  const viewportScale = scale / Math.max(camera.scale, 0.001);
  const viewportWidth = viewport.width * viewportScale;
  const viewportHeight = viewport.height * viewportScale;

  return (
    <View
      pointerEvents="none"
      accessibilityLabel="Cloud minimap"
      style={[
        styles.container,
        { borderColor: colors.ink, backgroundColor: colors.surface },
      ]}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect
          x={0}
          y={0}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          color={colors.surface}
        />
        {nodes.map((node) => (
          <Circle
            key={node.id}
            cx={offsetX + (node.x ?? 0) * scale}
            cy={offsetY + (node.y ?? 0) * scale}
            r={node.type === 'hub' ? 2.4 : 1.2}
            color={node.type === 'hub' ? colors.accent : node.color}
          />
        ))}
        <Rect
          x={offsetX + (worldCenterX - viewportWidth / 2) * scale}
          y={offsetY + (worldCenterY - viewportHeight / 2) * scale}
          width={viewportWidth}
          height={viewportHeight}
          color={colors.ink}
          style="stroke"
          strokeWidth={1}
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    overflow: 'hidden',
    borderWidth: 1,
  },
});

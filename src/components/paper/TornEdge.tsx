import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { seededRandom } from './hash';

export interface TornEdgeProps {
  id?: string;
  width?: number;
  height?: number;
  color?: string;
  edge?: 'top' | 'bottom' | 'left' | 'right';
  style?: ViewStyle;
}

export function TornEdge({
  id = 'torn-edge',
  width = 320,
  height = 12,
  color,
  edge = 'top',
  style,
}: TornEdgeProps) {
  const { colors } = useTheme();
  const fillColor = color || colors.surface;

  // Generate deterministic jagged points across the width/length
  const segments = Math.max(12, Math.floor(width / 16));
  const step = width / segments;

  let d = '';
  if (edge === 'top') {
    d = `M 0 ${height}`;
    for (let i = 0; i <= segments; i++) {
      const x = i * step;
      const jitter = (seededRandom(id, i) * 0.7 + 0.3) * height;
      d += ` L ${x.toFixed(1)} ${jitter.toFixed(1)}`;
    }
    d += ` L ${width} ${height} Z`;
  } else if (edge === 'bottom') {
    d = `M 0 0`;
    for (let i = 0; i <= segments; i++) {
      const x = i * step;
      const jitter = (seededRandom(id, i) * 0.7 + 0.3) * height;
      d += ` L ${x.toFixed(1)} ${(height - jitter).toFixed(1)}`;
    }
    d += ` L ${width} 0 Z`;
  } else {
    // default simple horizontal
    d = `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
  }

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path d={d} fill={fillColor} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

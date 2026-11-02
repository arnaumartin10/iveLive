import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { hardShadow } from '../../theme/tokens';
import { getSeededRotation } from './hash';

export interface StubProps {
  id?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  tilt?: boolean;
}

export function Stub({ id = 'stub', children, style, tilt = true }: StubProps) {
  const { colors } = useTheme();
  const rotation = tilt ? getSeededRotation(id, 1.5) : 0;

  return (
    <View
      style={[
        styles.outer,
        hardShadow.sm,
        {
          transform: [{ rotate: `${rotation}deg` }],
        },
        style,
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.ink,
          },
        ]}
      >
        {/* Left perforated torn strip */}
        <View style={[styles.tornStrip, { borderRightColor: colors.line }]}>
          <Svg height="100%" width={12}>
            <Line
              x1={6}
              y1={0}
              x2={6}
              y2={500}
              stroke={colors.line}
              strokeWidth={1.5}
              strokeDasharray="4, 4"
            />
          </Svg>
        </View>

        {/* Stub content */}
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginVertical: 4,
  },
  container: {
    flexDirection: 'row',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  tornStrip: {
    width: 14,
    borderRightWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
  },
  content: {
    flex: 1,
    padding: 12,
  },
});

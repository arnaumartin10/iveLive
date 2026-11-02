/**
 * PAPER & INK — Skeleton Placeholder
 *
 * Steady 'blank paper' placeholder: warm paper surface with a subtle
 * dashed rule outline. NO animated shimmer sweeps or glow pulses.
 */
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { radius } from '../../theme/tokens';

export type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  rounded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({
  width = '100%',
  height = 16,
  rounded = false,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius: rounded ? radius.pill : radius.sm,
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.line,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.65,
  },
});

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { palette, radius } from '@theme/tokens';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  circle?: boolean;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = radius.md,
  circle = false,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, {
        duration: 800,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const actualHeight = circle && typeof width === 'number' ? width : height;
  const actualRadius = circle ? (typeof width === 'number' ? width / 2 : 9999) : borderRadius;

  return (
    <Animated.View
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.skeleton,
        {
          width,
          height: actualHeight,
          borderRadius: actualRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function ConcertCardSkeleton() {
  return (
    <View style={styles.cardContainer}>
      <Skeleton circle width={56} />
      <View style={styles.cardTextContent}>
        <Skeleton width="60%" height={18} style={{ marginBottom: 8 }} />
        <Skeleton width="40%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="30%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: palette.surface3,
  },
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: palette.surface1,
    borderRadius: radius.xl,
    marginBottom: 12,
  },
  cardTextContent: {
    flex: 1,
    marginLeft: 16,
  },
});

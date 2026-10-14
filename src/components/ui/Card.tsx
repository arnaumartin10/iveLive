import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { palette, radius, spacing, spring } from '@theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CardProps extends ViewProps {
  onPress?: () => void;
  glow?: boolean;
  accent?: 'crimson' | 'amber' | 'steel' | 'none';
  style?: ViewStyle;
}

export function Card({
  children,
  onPress,
  glow = false,
  accent = 'none',
  style,
  ...props
}: CardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, spring.snappy);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, spring.bouncy);
    }
  };

  const handlePress = async () => {
    if (!onPress) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const accentBorderColor =
    accent === 'crimson'
      ? palette.crimson
      : accent === 'amber'
      ? palette.amber
      : accent === 'steel'
      ? palette.steel
      : palette.border;

  const glowShadow = glow
    ? {
        shadowColor: accent === 'crimson' ? palette.crimson : palette.amber,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 6,
      }
    : styles.baseShadow;

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.container,
          glowShadow,
          { borderColor: accentBorderColor },
          animatedStyle,
          style,
        ]}
        accessibilityRole="button"
        {...props}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View
      style={[
        styles.container,
        glowShadow,
        { borderColor: accentBorderColor },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.surface1,
    borderRadius: radius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: palette.border,
  },
  baseShadow: {
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
});

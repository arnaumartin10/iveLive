import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { palette, radius, spacing, fontFamily, fontSize, spring } from '@theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends PressableProps {
  variant?: Variant;
  size?: Size;
  label: string;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  variant = 'primary',
  size = 'md',
  label,
  isLoading = false,
  leftIcon,
  onPress,
  disabled,
  accessibilityLabel,
  style,
  ...props
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.96, spring.snappy);
  }

  function handlePressOut() {
    scale.value = withSpring(1, spring.bouncy);
  }

  async function handlePress(event: Parameters<NonNullable<PressableProps['onPress']>>[0]) {
    if (disabled || isLoading) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(event);
  }

  const isDisabled = disabled || isLoading;

  return (
    <AnimatedPressable
      style={[animatedStyle, styles.base, styles[variant], styles[size], isDisabled && styles.disabled, style]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? palette.navy : palette.ivory} size="small" />
      ) : (
        <View style={styles.content}>
          {leftIcon}
          <Animated.Text
            style={[
              styles.label,
              styles[`${variant}Label` as keyof typeof styles],
              styles[`${size}Label` as keyof typeof styles],
            ]}
          >
            {label}
          </Animated.Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // Accessibility: min 44pt touch target
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  label: {
    includeFontPadding: false,
  },
  // Variants
  primary: {
    backgroundColor: palette.crimson,
  },
  secondary: {
    backgroundColor: palette.surface2,
    borderWidth: 1,
    borderColor: palette.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: 'rgba(251, 54, 64, 0.15)',
    borderWidth: 1,
    borderColor: palette.crimson,
  },
  disabled: {
    opacity: 0.45,
  },
  // Sizes
  sm: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 44,
  },
  md: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    minHeight: 48,
  },
  lg: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    minHeight: 56,
  },
  // Label variants
  primaryLabel: {
    color: palette.white,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
  },
  secondaryLabel: {
    color: palette.textPrimary,
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
  },
  ghostLabel: {
    color: palette.textSecondary,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
  },
  dangerLabel: {
    color: palette.crimson,
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
  },
  // Label sizes
  smLabel: { fontSize: fontSize.sm },
  mdLabel: { fontSize: fontSize.base },
  lgLabel: { fontSize: fontSize.md },
});

/**
 * PAPER & INK — Button component
 *
 * primary:   Orange fill + 3px hard ink shadow. Large bold wheat label.
 *            Feels like a stamp — presses with a stamp animation.
 * secondary: Ink outline + hard shadow. Ink-colored label.
 * ghost:     Underlined mono text. No border or fill.
 * danger:    Orange-shade fill/outline.
 *
 * NO gradients, NO glow, NO blur shadows.
 */
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  ActivityIndicator,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { radius, spacing, fontFamily, hardShadow, spring, duration } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  variant?: Variant;
  size?: Size;
  label?: string;
  children?: ReactNode;
  loading?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  variant = 'primary',
  size = 'md',
  label,
  children,
  loading = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  onPress,
  disabled,
  accessibilityLabel,
  style,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const scale  = useSharedValue(1);
  const rotate = useSharedValue(0);
  const busy   = loading || isLoading;

  // Stamp animation: scale down then stamp-back with a 2° rotation settle
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  function handlePressIn() {
    scale.value = withTiming(0.94, { duration: duration.stamp });
  }

  function handlePressOut() {
    scale.value = withSpring(1, spring.stamp);
    // Tiny rotation settle — feels like a stamp landing
    rotate.value = withSequence(
      withTiming(1.5, { duration: 60 }),
      withSpring(0, { damping: 8, stiffness: 200 }),
    );
  }

  function handlePress(
    event: Parameters<NonNullable<PressableProps['onPress']>>[0],
  ) {
    if (disabled || busy) return;
    void Haptics.impactAsync(
      variant === 'primary'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Light,
    );
    onPress?.(event);
  }

  const isDisabled = disabled || busy;

  // Colors per variant
  const fillColor =
    variant === 'primary'  ? colors.accent :
    variant === 'danger'   ? colors.danger :
    variant === 'secondary'? colors.surface :
    'transparent';

  const foregroundColor =
    variant === 'primary'  ? colors.accentInk :
    variant === 'danger'   ? colors.accentInk :
    variant === 'ghost'    ? colors.inkMuted :
    colors.ink;

  const borderColor =
    variant === 'ghost'    ? 'transparent' :
    variant === 'primary'  ? colors.accent :
    colors.ink;

  // Shadow — hard offset on primary and secondary
  const buttonShadow: StyleProp<ViewStyle> =
    variant === 'primary'  ? hardShadow.lg :
    variant === 'secondary'? hardShadow.sm :
    {};

  return (
    <AnimatedPressable
      style={[
        animatedStyle,
        styles.base,
        styles[size],
        {
          backgroundColor: fillColor,
          borderColor,
          borderWidth: variant === 'ghost' ? 0 : 2,
          borderRadius: radius.sm,
        },
        !isDisabled && buttonShadow,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy }}
      {...props}
    >
      {busy ? (
        <ActivityIndicator color={foregroundColor} size="small" />
      ) : (
        <View style={styles.content}>
          {leftIcon}
          {children ?? (
            <Animated.Text
              style={[
                styles.label,
                styles[`${size}Label` as keyof typeof styles],
                {
                  color:      foregroundColor,
                  fontFamily: variant === 'ghost'
                    ? fontFamily.mono
                    : fontFamily.bold,
                  textDecorationLine: variant === 'ghost' ? 'underline' : 'none',
                  letterSpacing: variant === 'primary' ? 0.5 : 0,
                },
              ]}
            >
              {label}
            </Animated.Text>
          )}
          {rightIcon}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems:     'center',
    justifyContent: 'center',
    minHeight:      44,
    overflow:       'visible', // shadow must be visible
  },
  content: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing[2],
  },
  label: {
    includeFontPadding: false,
  },
  disabled: { opacity: 0.45 },
  sm: {
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[2],
    minHeight:         44,
  },
  md: {
    paddingHorizontal: spacing[5],
    paddingVertical:   spacing[3],
    minHeight:         48,
  },
  lg: {
    paddingHorizontal: spacing[6],
    paddingVertical:   spacing[4],
    minHeight:         56,
  },
  smLabel: { fontSize: 13, includeFontPadding: false },
  mdLabel: { fontSize: 16, includeFontPadding: false },
  lgLabel: { fontSize: 18, includeFontPadding: false },
});

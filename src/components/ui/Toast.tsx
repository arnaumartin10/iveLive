/**
 * PAPER & INK — Toast (Stamp)
 *
 * Styled like an official physical ink stamp with a hard offset shadow,
 * crisp 1.5px ink border, and physical motion.
 */
import { useEffect } from 'react';
import { AlertCircle, Check, Info, TriangleAlert } from 'lucide-react-native';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing, hardShadow } from '../../theme/tokens';
import { Text } from './Text';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export type ToastProps = {
  visible: boolean;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onDismiss?: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: StyleProp<ViewStyle>;
};

const icons = {
  info: Info,
  success: Check,
  warning: TriangleAlert,
  danger: AlertCircle,
};

export function Toast({
  visible,
  message,
  variant = 'info',
  duration = 3200,
  onDismiss,
  action,
  style,
}: ToastProps) {
  const { colors } = useTheme();
  const Icon = icons[variant];
  const tone = {
    info: colors.accent,
    success: colors.positive,
    warning: colors.warning,
    danger: colors.danger,
  }[variant];

  useEffect(() => {
    if (!visible || !onDismiss) return;
    const timeout = setTimeout(onDismiss, duration);
    return () => clearTimeout(timeout);
  }, [duration, onDismiss, visible]);

  if (!visible) return null;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      entering={FadeInDown.duration(140)}
      exiting={FadeOutUp.duration(120)}
      style={[
        styles.container,
        hardShadow.md,
        {
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.ink,
        },
        style,
      ]}
    >
      <View style={[styles.stampIcon, { borderColor: tone }]}>
        <Icon color={tone} size={16} strokeWidth={2.5} />
      </View>
      <Text variant="caption" style={[styles.message, { color: colors.ink }]}>
        {message}
      </Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={() => {
            action.onPress();
            onDismiss?.();
          }}
          style={[styles.actionBtn, { borderColor: tone }]}
        >
          <Text
            variant="label"
            style={[styles.actionLabel, { color: tone }]}
          >
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  stampIcon: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  message: {
    flex: 1,
    fontWeight: '500',
  },
  actionBtn: {
    borderBottomWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  actionLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});

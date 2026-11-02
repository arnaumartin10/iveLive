/**
 * PAPER & INK — Card / Panel primitive
 *
 * Replaces soft rounded cards with printed, bordered panels:
 * 1.5px solid ink border, crisp 2-4px hard offset shadow, mostly square corners.
 */
import type { PropsWithChildren } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, hardShadow, spacing } from '../../theme/tokens';

export type CardProps = PropsWithChildren<{
  variant?: 'default' | 'elevated' | 'outlined' | 'sunken';
  padding?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}>;

export function Card({
  children,
  variant = 'default',
  padding = spacing.lg,
  onPress,
  style,
}: CardProps) {
  const { colors } = useTheme();

  const bgMap = {
    default: colors.surface,
    elevated: colors.surfaceRaised,
    outlined: colors.surface,
    sunken: colors.bgSunken,
  };

  const containerStyle = [
    styles.base,
    hardShadow.sm,
    {
      padding,
      backgroundColor: bgMap[variant] ?? colors.surface,
      borderColor: colors.ink,
    },
    variant === 'elevated' && hardShadow.md,
    variant === 'sunken' && styles.sunken,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          containerStyle,
          pressed && {
            transform: [{ translateX: 1.5 }, { translateY: 1.5 }],
            shadowOffset: { width: 1, height: 1 },
          },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

// Panel alias as requested by Paper & Ink shape language
export const Panel = Card;

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    borderWidth: 1.5,
  },
  sunken: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    elevation: 0,
  },
});

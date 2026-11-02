import type { LucideIcon } from 'lucide-react-native';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, hardShadow } from '../../theme/tokens';

export type IconButtonProps = {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  tone?: 'default' | 'accent' | 'danger';
  size?: 36 | 40 | 44 | 48;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function IconButton({
  icon: Icon,
  label,
  onPress,
  tone = 'default',
  size = 44,
  style,
  disabled,
}: IconButtonProps) {
  const { colors } = useTheme();

  const bgMap = {
    default: colors.surface,
    accent: colors.accent,
    danger: colors.surface,
  };

  const iconColorMap = {
    default: colors.ink,
    accent: colors.accentInk,
    danger: colors.danger,
  };

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        hardShadow.sm,
        {
          width: size,
          height: size,
          backgroundColor: bgMap[tone],
          borderColor: colors.ink,
          opacity: disabled ? 0.45 : 1,
          transform: [
            { translateX: pressed ? 1.5 : 0 },
            { translateY: pressed ? 1.5 : 0 },
          ],
        },
        style,
      ]}
    >
      <Icon color={iconColorMap[tone]} size={Math.round(size * 0.48)} strokeWidth={2.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
});

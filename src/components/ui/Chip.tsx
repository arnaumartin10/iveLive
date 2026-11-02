import type { PropsWithChildren } from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, hardShadow } from '../../theme/tokens';
import { Text } from './Text';

export type ChipProps = PropsWithChildren<{
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Chip({
  children,
  selected = false,
  onPress,
  disabled = false,
  style,
}: ChipProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && hardShadow.sm,
        {
          backgroundColor: selected ? colors.accent : colors.surface,
          borderColor: colors.ink,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text
        variant="label"
        style={[
          styles.text,
          { color: selected ? colors.accentInk : colors.ink },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});

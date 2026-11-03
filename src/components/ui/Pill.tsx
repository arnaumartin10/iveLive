import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { radius } from '../../theme/tokens';
import { VENUE_TYPES, type VenueType } from '../../features/venues/venueTypes';
import { Text } from './Text';
import { VenueLabel } from '../paper/GenreLabel';

export type PillProps = PropsWithChildren<{
  venueType?: VenueType;
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}>;

export function Pill({
  children,
  venueType,
  tone = 'default',
  icon,
  style,
}: PillProps) {
  const { colors } = useTheme();
  if (venueType) {
    return (
      <VenueLabel
        venue={venueType}
        label={
          typeof children === 'string'
            ? children
            : VENUE_TYPES[venueType].shortLabel
        }
        size="xs"
        style={style}
      />
    );
  }
  const toneColor = {
    default: colors.inkMuted,
    accent: colors.accent,
    success: colors.positive,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];
  const color = toneColor;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: color,
        },
        style,
      ]}
    >
      {icon ?? null}
      <Text variant="label" style={[styles.label, { color }]}>
        {children ?? 'Badge'}
      </Text>
    </View>
  );
}

export const Badge = Pill;

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 5,
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});

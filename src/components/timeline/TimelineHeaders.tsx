import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';

export function YearHeader({ year }: { year: string }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.yearContainer,
        {
          backgroundColor: colors.bg,
          borderBottomColor: `${colors.line}80`,
        },
      ]}
    >
      <View style={styles.yearRow}>
        <View style={[styles.yearIndicator, { backgroundColor: colors.accent }]} />
        <Text
          variant="title"
          weight="black"
          style={[styles.yearText, { color: colors.ink }]}
        >
          {year}
        </Text>
        <View
          style={[styles.dividerLine, { backgroundColor: `${colors.line}60` }]}
        />
      </View>
    </View>
  );
}

export function MonthSubheader({
  month,
  year,
}: {
  month: string;
  year: string;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.monthContainer,
        {
          backgroundColor: colors.bg,
          borderBottomColor: `${colors.line}40`,
        },
      ]}
    >
      <View style={styles.monthRow}>
        <View
          style={[styles.monthDot, { backgroundColor: colors.inkMuted }]}
        />
        <Text
          variant="caption"
          weight="bold"
          style={[styles.monthText, { color: colors.inkMuted }]}
        >
          {month.toUpperCase()}
        </Text>
        <Text
          variant="caption"
          weight="medium"
          style={{ color: `${colors.inkMuted}80`, fontSize: 11 }}
        >
          {year}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  yearContainer: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  yearIndicator: {
    width: 4,
    height: 20,
    borderRadius: radius.pill,
  },
  yearText: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    marginLeft: 6,
  },
  monthContainer: {
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 9,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  monthText: {
    fontSize: 12,
    letterSpacing: 1.2,
  },
});

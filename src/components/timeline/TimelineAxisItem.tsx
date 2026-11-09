import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { hardShadow, radius } from '../../theme/tokens';
import { Text } from '../ui/Text';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface TimelineAxisItemProps {
  dayNumber: string;
  shortWeekday: string;
  currentColor: string;
}

export function TimelineAxisItem({
  dayNumber,
  shortWeekday,
  currentColor,
}: TimelineAxisItemProps) {
  const { colors } = useTheme();
  const compact = useBreakpoint() !== 'wide';

  return (
    <View
      style={[styles.axisContainer, compact && styles.compactAxisContainer]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.axisLine,
          compact && styles.compactAxisLine,
          { backgroundColor: colors.line },
        ]}
      />

      {/* Date badge sitting on the axis */}
      <View
        style={[
          styles.badge,
          compact && styles.compactBadge,
          {
            backgroundColor: colors.surface,
            borderColor: colors.ink,
          },
          hardShadow.sm,
        ]}
      >
        <Text
          variant="mono"
          weight="black"
          style={[styles.dayText, { color: colors.ink }]}
        >
          {dayNumber}
        </Text>
        <Text
          variant="caption"
          weight="bold"
          style={[styles.weekdayText, { color: colors.ink }]}
        >
          {shortWeekday.toUpperCase()}
        </Text>
      </View>

      {/* Horizontal connector line leading to the card */}
      <View
        style={[
          styles.connectorLine,
          compact && styles.compactConnectorLine,
          { backgroundColor: currentColor },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  axisContainer: {
    width: 54,
    alignItems: 'center',
    position: 'relative',
  },
  compactAxisContainer: { width: 42 },
  axisLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 26,
    width: 2.5,
  },
  compactAxisLine: { left: 20 },
  badge: {
    position: 'absolute',
    top: 14,
    left: 7,
    width: 40,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  compactBadge: {
    left: 1,
    width: 38,
  },
  dayText: {
    fontSize: 15,
    lineHeight: 18,
  },
  weekdayText: {
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.5,
  },
  connectorLine: {
    position: 'absolute',
    top: 35,
    left: 47,
    width: 7,
    height: 2,
    zIndex: 1,
  },
  compactConnectorLine: { left: 39, width: 3 },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { Skeleton } from '../ui/Skeleton';

export function TimelineSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {[1, 2, 3].map((key) => (
        <View key={key} style={styles.row}>
          {/* Axis + Badge Skeleton */}
          <View style={styles.axisCol}>
            <View
              style={[
                styles.axisLine,
                { backgroundColor: `${colors.line}60` },
              ]}
            />
            <Skeleton width={40} height={44} style={styles.dateBadge} />
          </View>

          {/* Card Skeleton */}
          <View
            style={[
              styles.cardSkeleton,
              {
                backgroundColor: colors.surface,
                borderColor: `${colors.line}60`,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Skeleton width={44} height={44} style={styles.avatar} />
              <View style={styles.cardMeta}>
                <Skeleton width="60%" height={16} />
                <Skeleton width="40%" height={12} />
              </View>
              <Skeleton width={40} height={16} />
            </View>
            <Skeleton width="90%" height={14} style={{ marginTop: 8 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  axisCol: {
    width: 54,
    alignItems: 'center',
    position: 'relative',
  },
  axisLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 26,
    width: 2,
  },
  dateBadge: {
    borderRadius: radius.sm,
    marginTop: 14,
  },
  cardSkeleton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    borderRadius: 22,
  },
  cardMeta: {
    flex: 1,
    gap: 6,
  },
});

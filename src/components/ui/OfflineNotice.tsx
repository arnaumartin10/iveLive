import React from 'react';
import { View, StyleSheet } from 'react-native';
import { palette, spacing } from '@theme/tokens';
import { Text } from './Text';

interface OfflineNoticeProps {
  isOffline?: boolean;
}

export function OfflineNotice({ isOffline = false }: OfflineNoticeProps) {
  if (!isOffline) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <View style={styles.dot} />
      <Text variant="caption" weight="medium" color="inverse">
        Offline Mode — Browsing cached collection
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: palette.amber,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.navy,
  },
});

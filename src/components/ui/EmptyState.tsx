import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { palette, spacing } from '@theme/tokens';
import { Text } from './Text';
import { Button } from './Button';

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  title = 'Your Stage is Quiet',
  subtitle = 'Log every artist you have seen live and watch your visual collection grow.',
  actionLabel = 'Log Your First Concert',
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <View style={styles.innerPulse} />
        <Text variant="title" color="crimson" weight="black">
          ♫
        </Text>
      </View>

      <Text variant="headline" weight="bold" center style={styles.title}>
        {title}
      </Text>

      <Text variant="body" color="secondary" center style={styles.subtitle}>
        {subtitle}
      </Text>

      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          variant="primary"
          size="lg"
          onPress={onAction}
          style={styles.actionButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[10],
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: palette.surface2,
    borderWidth: 2,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
    shadowColor: palette.crimson,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 4,
  },
  innerPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(251, 54, 64, 0.08)',
  },
  title: {
    marginBottom: spacing[2],
  },
  subtitle: {
    maxWidth: 280,
    marginBottom: spacing[8],
  },
  actionButton: {
    minWidth: 220,
  },
});

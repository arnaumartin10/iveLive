import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { palette, spacing } from '@theme/tokens';
import { Text } from './Text';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({
  title = 'Something hit a flat note',
  message = 'We could not load your concerts. Check your connection or try again.',
  onRetry,
  style,
}: ErrorStateProps) {
  const handleRetry = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRetry?.();
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Text variant="title" color="crimson" weight="black">
          !
        </Text>
      </View>

      <Text variant="headline" weight="bold" center style={styles.title}>
        {title}
      </Text>

      <Text variant="body" color="secondary" center style={styles.message}>
        {message}
      </Text>

      {onRetry && (
        <Button
          label="Try Again"
          variant="secondary"
          size="md"
          onPress={handleRetry}
          style={styles.retryButton}
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(251, 54, 64, 0.12)',
    borderWidth: 1,
    borderColor: palette.crimson,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  title: {
    marginBottom: spacing[2],
  },
  message: {
    maxWidth: 280,
    marginBottom: spacing[6],
  },
  retryButton: {
    minWidth: 160,
  },
});

import React from 'react';
import { View, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { palette, spacing } from '@theme/tokens';
import { Text } from '@components/ui/Text';
import { LogWizard } from '@components/log/LogWizard';

export default function LogConcertModal() {
  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text variant="headline" weight="bold">
          Log a Concert
        </Text>
        <Pressable
          onPress={handleClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close concert logging modal"
        >
          <Text variant="title" color="secondary">
            ✕
          </Text>
        </Pressable>
      </View>

      <LogWizard onDismiss={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.surface0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: palette.surface1,
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

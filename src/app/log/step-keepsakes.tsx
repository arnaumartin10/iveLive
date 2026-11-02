import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { KeepsakeFrames } from '../../components/media/KeepsakeFrames';
import { Text } from '../../components/ui/Text';
import { WizardStepView } from '../../components/log/WizardStepView';
import { useLogMedia, useMediaQueue } from '../../features/media/hooks';
import { useLogDraft } from '../../features/log/store';
import { spacing } from '../../theme/tokens';

export default function StepKeepsakes() {
  const { id, setlistSaveFailed } = useLocalSearchParams<{
    id: string;
    setlistSaveFailed?: string;
  }>();
  const setStep = useLogDraft((state) => state.setStep);
  const mediaQuery = useLogMedia(id ?? '');
  const queue = useMediaQueue(id);

  function finish(skipped: boolean) {
    setStep(6);
    router.replace({
      pathname: '/log/done',
      params: {
        id,
        skipped: skipped ? 'true' : 'false',
        ...(setlistSaveFailed ? { setlistSaveFailed } : {}),
      },
    });
  }

  const hasKeepsakes =
    (mediaQuery.data?.length ?? 0) > 0 || queue.items.length > 0;

  return (
    <WizardStepView
      step={6}
      continueLabel="Finish"
      onContinue={() => finish(!hasKeepsakes)}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title" weight="bold">Keep a little piece of the night</Text>
        <Text variant="body" color="secondary">
          Add a concert photo, a crew photo, or a short reel. Your log is already saved.
        </Text>
        <KeepsakeFrames logId={id ?? ''} mode="edit" />
        <Pressable
          accessibilityRole="button"
          onPress={() => finish(true)}
          style={styles.skipButton}
        >
          <Text variant="mono">Skip for now</Text>
        </Pressable>
      </ScrollView>
    </WizardStepView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  skipButton: { alignSelf: 'center', padding: spacing.sm },
});

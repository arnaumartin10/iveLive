import React, { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Modal, Pressable, StyleSheet, View } from 'react-native';
import {
  Slot,
  useLocalSearchParams,
  useNavigation,
  useSegments,
} from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing, spring } from '../../theme/tokens';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { useLogDraft } from '../../features/log/store';
import { deleteLocalFiles } from '../../features/media/api';
import { routes } from '../../navigation/routes';
import { useSafeBack } from '../../navigation/useSafeBack';

const TOTAL_STEPS = 6;

const STEP_TITLES: Record<number, string> = {
  1: 'Artist',
  2: 'Date',
  3: 'Venue Type',
  4: 'Venue Details',
  5: 'Rating & Review',
  6: 'Keepsakes',
};

// ─── Animated Segment ─────────────────────────────────────────────────────────

function ProgressSegment({
  index,
  currentStep,
  isEditing = false,
  accentColor,
  borderColor,
}: {
  index: number;
  currentStep: number;
  isEditing?: boolean;
  accentColor: string;
  borderColor: string;
}) {
  // index is 0-based; step is 1-based
  const stepNumber = index + 1;
  const isFilled = (isEditing && stepNumber === 1) || stepNumber < currentStep;
  const isActive = stepNumber === currentStep;

  const progress = useSharedValue(0);

  useEffect(() => {
    if (isFilled) {
      progress.value = withTiming(1, { duration: 280 });
    } else if (isActive) {
      progress.value = withSpring(0.5, spring.gentle);
    } else {
      progress.value = withTiming(0, { duration: 200 });
    }
  }, [isFilled, isActive, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.5, 1],
      [borderColor, accentColor, accentColor],
    ),
    opacity: isActive ? 1 : isFilled ? 1 : 0.35,
    transform: [{ scaleY: isActive ? 1 : isFilled ? 1 : 0.6 }],
  }));

  return <Animated.View style={[styles.segment, animatedStyle]} />;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function LogWizardLayout() {
  const { colors } = useTheme();
  const { id, setlistSaveFailed } = useLocalSearchParams<{
    id?: string;
    setlistSaveFailed?: string;
  }>();
  const segments = useSegments();
  const activeSegment = segments[segments.length - 1];
  const isSavedKeepsakesRoute =
    activeSegment === 'step-keepsakes' && Boolean(id);
  const safeBack = useSafeBack(
    isSavedKeepsakesRoute && id
      ? routes.logDone(id, true, setlistSaveFailed === 'true')
      : routes.fallback.wizard(),
    { handleHardwareBack: false },
  );
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isStandaloneScreen =
    activeSegment === 'done' ||
    activeSegment === '[id]' ||
    activeSegment === 'comments';

  const step = useLogDraft((s) => s.step);
  const isEditing = useLogDraft((s) => s.isEditing);
  const hasProgress = useLogDraft((s) => s.hasProgress);
  const reset = useLogDraft((s) => s.reset);
  const goBack = useLogDraft((s) => s.goBack);
  const pendingKeepsakes = useLogDraft((s) => s.pendingKeepsakes);
  const [discardConfirmationVisible, setDiscardConfirmationVisible] =
    React.useState(false);
  const isDraftKeepsakesStage = !id && !isStandaloneScreen && step === 6;
  const isKeepsakesStage = isSavedKeepsakesRoute || isDraftKeepsakesStage;
  const displayedStep = isKeepsakesStage ? 6 : step;

  // Track whether we've mounted (avoid navigation events on first render)
  const hasMounted = useRef(false);
  const allowNextRemoval = useRef(false);
  useEffect(() => {
    hasMounted.current = true;
  }, []);

  // ─── Discard guard ──────────────────────────────────────────────────────────
  const confirmDiscard = useCallback(() => {
    if (!isEditing && !hasProgress()) {
      reset();
      safeBack();
      return;
    }
    setDiscardConfirmationVisible(true);
  }, [hasProgress, isEditing, reset, safeBack]);

  const keepEditing = useCallback(() => {
    setDiscardConfirmationVisible(false);
  }, []);

  const discardAndClose = useCallback(async () => {
    setDiscardConfirmationVisible(false);
    try {
      await deleteLocalFiles(
        pendingKeepsakes.flatMap((item) => [
          item.localPath,
          item.thumbLocalPath,
          item.posterLocalPath,
        ]),
      );
    } catch (error) {
      console.error('[log] Could not clear staged photo files.', error);
    }
    reset();
    safeBack();
  }, [pendingKeepsakes, reset, safeBack]);

  // Intercept hardware back / swipe-to-dismiss on step > 1
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasMounted.current) return;
      if (allowNextRemoval.current) {
        allowNextRemoval.current = false;
        return;
      }
      if (isStandaloneScreen) {
        reset();
        return;
      }
      if (isSavedKeepsakesRoute) {
        reset();
        return;
      }
      if (!isEditing && !hasProgress()) {
        reset();
        return;
      }
      e.preventDefault();
      confirmDiscard();
    });
    return unsubscribe;
  }, [
    navigation,
    hasProgress,
    isEditing,
    reset,
    confirmDiscard,
    isStandaloneScreen,
    isSavedKeepsakesRoute,
  ]);

  const exitEdit = useCallback(() => {
    allowNextRemoval.current = true;
    reset();
    safeBack();
  }, [reset, safeBack]);

  const handleBack = useCallback(() => {
    if (isDraftKeepsakesStage) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      goBack();
      return;
    }
    if (isSavedKeepsakesRoute || isStandaloneScreen) {
      safeBack();
      return;
    }
    if (isEditing) {
      exitEdit();
      return;
    }
    if (step === 1 || (isEditing && step === 2)) {
      confirmDiscard();
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      goBack();
    }
  }, [
    confirmDiscard,
    goBack,
    isDraftKeepsakesStage,
    isEditing,
    isSavedKeepsakesRoute,
    isStandaloneScreen,
    safeBack,
    step,
    exitEdit,
  ]);

  const handleClose = useCallback(() => {
    if (isSavedKeepsakesRoute || isStandaloneScreen) {
      safeBack();
      return;
    }
    if (isEditing) {
      exitEdit();
      return;
    }
    confirmDiscard();
  }, [
    confirmDiscard,
    exitEdit,
    isEditing,
    isSavedKeepsakesRoute,
    isStandaloneScreen,
    safeBack,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [handleBack]);

  if (isStandaloneScreen) return <Slot />;

  return (
    <>
      <View
        style={[
          styles.container,
          { backgroundColor: colors.bg, paddingTop: insets.top + 8 },
        ]}
      >
        {/* ── Top Chrome ─────────────────────────────────────────────────── */}
        <View style={styles.chrome}>
          {/* Back / Close row */}
          <View style={styles.navRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isKeepsakesStage
                  ? 'Go back'
                  : displayedStep === 1
                    ? 'Close wizard'
                    : 'Go back'
              }
              hitSlop={10}
              onPress={handleBack}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: colors.surfaceRaised,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <ArrowLeft size={20} color={colors.ink} />
            </Pressable>

            <Text
              variant="caption"
              weight="semibold"
              color="secondary"
              style={styles.stepLabel}
            >
              {STEP_TITLES[displayedStep] ?? ''}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isSavedKeepsakesRoute
                  ? 'Close photo upload'
                  : 'Discard and close'
              }
              hitSlop={10}
              onPress={handleClose}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: colors.surfaceRaised,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <X size={20} color={colors.ink} />
            </Pressable>
          </View>

          {/* Segmented progress bar */}
          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <ProgressSegment
                key={i}
                index={i}
                currentStep={displayedStep}
                isEditing={isEditing}
                accentColor={colors.accent}
                borderColor={colors.line}
              />
            ))}
          </View>
        </View>

        {/* ── Step content ───────────────────────────────────────────────── */}
        <View style={styles.stepContent}>
          <Slot />
        </View>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={keepEditing}
        transparent
        visible={discardConfirmationVisible}
      >
        <View style={styles.modalBackdrop}>
          <View
            accessibilityRole="alert"
            style={[
              styles.confirmationCard,
              { backgroundColor: colors.surface, borderColor: colors.ink },
            ]}
          >
            <Text variant="title" weight="bold">
              {isEditing ? 'Discard changes?' : 'Discard this log?'}
            </Text>
            <Text color="secondary">
              {isEditing
                ? 'Your changes will not be saved.'
                : 'Your progress will be lost.'}
            </Text>
            <View style={styles.confirmationActions}>
              <Button
                label="Keep editing"
                onPress={keepEditing}
                variant="secondary"
                style={styles.confirmationButton}
              />
              <Button
                label="Discard"
                onPress={discardAndClose}
                variant="danger"
                style={styles.confirmationButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chrome: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepLabel: {
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    height: 6,
  },
  segment: {
    flex: 1,
    borderRadius: radius.pill,
    height: 6,
  },
  stepContent: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing[5],
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  confirmationCard: {
    gap: spacing[3],
    padding: spacing[5],
    borderWidth: 2,
    borderRadius: radius.md,
  },
  confirmationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  confirmationButton: {
    minWidth: 128,
  },
});

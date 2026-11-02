/**
 * WizardStep
 *
 * Wraps each step's content with:
 * - Horizontal slide + fade entrance animation keyed to the step number.
 * - A "Continue" button pinned above the keyboard (KeyboardAvoidingView).
 * - The button is disabled until `isStepValid(step)` returns true.
 */
import React, { useEffect, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components/ui/Button';
import { useLogDraft } from '../../features/log/store';
import { spacing, spring } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import type { WizardStep as WizardStepType } from '../../features/log/store';

interface WizardStepProps {
  step: WizardStepType;
  children: ReactNode;
  /** Override the Continue label (defaults to 'Continue') */
  continueLabel?: string;
  /** Called instead of goNext; useful for custom async logic before advancing */
  onContinue?: () => void | Promise<void>;
  /** Additional bottom content rendered between scroll and Continue button */
  footerSlot?: ReactNode;
  /** If true, disable the Continue button regardless of step validity */
  disableContinue?: boolean;
}

export function WizardStepView({
  step,
  children,
  continueLabel = 'Continue',
  onContinue,
  footerSlot,
  disableContinue = false,
}: WizardStepProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isStepValid = useLogDraft((s) => s.isStepValid);
  const goNext = useLogDraft((s) => s.goNext);

  // ── Slide + fade entrance ─────────────────────────────────────────────────
  const translateX = useSharedValue(48);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = 48;
    opacity.value = 0;
    translateX.value = withSpring(0, { ...spring.gentle, overshootClamping: true });
    opacity.value = withTiming(1, { duration: 220 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const valid = isStepValid(step) && !disableContinue;

  async function handleContinue() {
    if (!valid) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onContinue) {
      await onContinue();
    } else {
      goNext();
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <Animated.View style={[styles.flex, animatedStyle]}>
        {children}
      </Animated.View>

      {footerSlot}

      {/* Continue button pinned above keyboard */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, spacing[4]),
            backgroundColor: colors.bg,
            borderTopColor: colors.line,
          },
        ]}
      >
        <Button
          label={continueLabel}
          size="lg"
          disabled={!valid}
          onPress={() => { void handleContinue(); }}
          accessibilityLabel={continueLabel}
          style={styles.continueBtn}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  continueBtn: {
    width: '100%',
  },
});

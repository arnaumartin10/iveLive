/**
 * Log Wizard – Root Entry
 *
 * This file is the index screen under `app/log/_layout.tsx`.
 * It renders whichever wizard step is currently active (driven by the Zustand
 * `useLogDraft` store) and applies a horizontal slide + fade transition between
 * steps using Reanimated.
 *
 * Layout hierarchy:
 *   app/log/_layout.tsx   ← chrome (progress bar, back/close buttons)
 *   app/log/index.tsx     ← this file; renders the active step content
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { spring } from '../../theme/tokens';
import { useLogDraft } from '../../features/log/store';
import { useConcert } from '../../features/concerts/hooks';

// Lazy-import step components so each chunk only loads when reached
const StepArtist = React.lazy(() => import('./step-artist'));
const StepDate = React.lazy(() => import('./step-date'));
const StepVenue = React.lazy(() => import('./step-venue'));
const StepVenueDetails = React.lazy(() => import('./step-venue-details'));
const StepReview = React.lazy(() => import('./step-review'));
const StepKeepsakes = React.lazy(() => import('./step-keepsakes'));

const STEP_COMPONENTS = [
  StepArtist,
  StepDate,
  StepVenue,
  StepVenueDetails,
  StepReview,
  StepKeepsakes,
];

function StepSlide({ step }: { step: number }) {
  const tx = useSharedValue(48);
  const opacity = useSharedValue(0);

  useEffect(() => {
    tx.value = 48;
    opacity.value = 0;
    tx.value = withSpring(0, { ...spring.gentle, overshootClamping: true });
    opacity.value = withTiming(1, { duration: 200 });
  }, [step, tx, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
    opacity: opacity.value,
  }));

  const StepComponent = STEP_COMPONENTS[step - 1];
  if (!StepComponent) return null;

  return (
    <Animated.View style={[styles.fill, animStyle]}>
      <React.Suspense fallback={<View style={styles.fill} />}>
        <StepComponent />
      </React.Suspense>
    </Animated.View>
  );
}

export default function LogWizardIndex() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const step = useLogDraft((s) => s.step);
  const editingConcertId = useLogDraft((s) => s.editingConcertId);
  const startEdit = useLogDraft((s) => s.startEdit);
  const { data: concertToEdit } = useConcert(editId || '');

  useEffect(() => {
    if (editId && concertToEdit && editingConcertId !== editId) {
      startEdit(concertToEdit);
    }
  }, [editId, concertToEdit, editingConcertId, startEdit]);

  return (
    <View style={styles.fill}>
      <StepSlide step={step} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

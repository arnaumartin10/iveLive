import React, { useRef } from 'react';
import {
  Animated as RNAnimated,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';

interface SwipeableTimelineRowProps {
  children: React.ReactNode;
  onSwipeDelete: () => void;
}

export function SwipeableTimelineRow({
  children,
  onSwipeDelete,
}: SwipeableTimelineRowProps) {
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable | null>(null);

  function handleOpen(direction: 'left' | 'right') {
    if (direction === 'right') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      swipeableRef.current?.close();
      onSwipeDelete();
    }
  }

  function renderRightActions(
    _progress: RNAnimated.AnimatedInterpolation<number>,
    dragX: RNAnimated.AnimatedInterpolation<number>,
  ) {
    const scale = dragX.interpolate({
      inputRange: [-80, -20, 0],
      outputRange: [1, 0.7, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActionContainer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete show"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            swipeableRef.current?.close();
            onSwipeDelete();
          }}
          style={[styles.deleteButton, { backgroundColor: colors.danger }]}
        >
          <RNAnimated.View style={{ transform: [{ scale }] }}>
            <Trash2 size={20} color={colors.accentInk} strokeWidth={2.2} />
          </RNAnimated.View>
        </Pressable>
      </View>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      overshootRight={false}
      rightThreshold={44}
      renderRightActions={renderRightActions}
      onSwipeableOpen={handleOpen}
      containerStyle={styles.swipeContainer}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    flex: 1,
  },
  rightActionContainer: {
    width: 68,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: spacing.sm,
  },
  deleteButton: {
    width: 52,
    height: '84%',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

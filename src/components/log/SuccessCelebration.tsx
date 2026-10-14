import React, { useEffect } from 'react';
import { View, StyleSheet, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { spacing, spring } from '@theme/tokens';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { ArtistAvatar } from '@components/ui/ArtistAvatar';
import type { SpotifyArtistSearchResult } from '@features/spotify/types';

interface SuccessCelebrationProps {
  artist: SpotifyArtistSearchResult;
  onDone: () => void;
}

export function SuccessCelebration({ artist, onDone }: SuccessCelebrationProps) {
  const avatarScale = useSharedValue(0.2);
  const glowOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    // Play success haptic
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Check if reduce motion is requested
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) {
        avatarScale.value = 1;
        glowOpacity.value = 0.5;
        textOpacity.value = 1;
      } else {
        avatarScale.value = withSpring(1, spring.bouncy);
        glowOpacity.value = withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.6, { duration: 500 }),
        );
        textOpacity.value = withTiming(1, { duration: 400 });
      }
    });
  }, [avatarScale, glowOpacity, textOpacity]);

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Background glow circle */}
      <Animated.View style={[styles.glowBackdrop, glowAnimatedStyle]} />

      <Animated.View style={[styles.avatarBox, avatarAnimatedStyle]}>
        <ArtistAvatar
          name={artist.name}
          imageUrl={artist.image_url}
          size={120}
          showGlow
        />
      </Animated.View>

      <Animated.View style={[styles.textContent, textAnimatedStyle]}>
        <Text variant="overline" color="amber" weight="bold" center>
          ARCHIVE EXPANDED
        </Text>
        <Text variant="headline" weight="black" center style={styles.title}>
          {artist.name} Logged!
        </Text>
        <Text variant="body" color="secondary" center style={styles.subtitle}>
          This performance has been etched into your visual music archive.
        </Text>
      </Animated.View>

      <Button
        label="View in Archive"
        variant="primary"
        size="lg"
        onPress={onDone}
        style={styles.actionButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  glowBackdrop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(251, 54, 64, 0.2)',
  },
  avatarBox: {
    marginBottom: spacing[6],
  },
  textContent: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  title: {
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  subtitle: {
    maxWidth: 280,
  },
  actionButton: {
    minWidth: 220,
  },
});

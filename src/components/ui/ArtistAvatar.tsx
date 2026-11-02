import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { spring } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { Sticker } from '../paper/Sticker';
import { getInitials } from '../../lib/utils';
import { Text } from './Text';

interface ArtistAvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: number;
  showGlow?: boolean; // deprecated in Paper & Ink
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export function ArtistAvatar({
  name,
  imageUrl,
  size = 72,
  onPress,
}: ArtistAvatarProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    if (onPress) scale.value = withSpring(0.96, spring.stamp);
  }
  function handlePressOut() {
    if (onPress) scale.value = withSpring(1, spring.stamp);
  }

  const initials = getInitials(name);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
    >
      <Sticker id={name} size={size}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            placeholder={blurhash}
            contentFit="cover"
            transition={150}
            style={{ width: size, height: size }}
          />
        ) : (
          <View
            style={[
              styles.fallback,
              {
                width: size,
                height: size,
                backgroundColor: colors.surfaceRaised,
              },
            ]}
          >
            <Text
              variant={size < 40 ? 'caption' : 'subtitle'}
              style={[styles.initials, { color: colors.ink }]}
            >
              {initials}
            </Text>
          </View>
        )}
      </Sticker>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

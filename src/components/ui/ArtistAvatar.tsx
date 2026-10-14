import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { palette, spring } from '@theme/tokens';
import { getInitials } from '@lib/utils';
import { Text } from './Text';

interface ArtistAvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: number;
  showGlow?: boolean;
  onPress?: () => void;
}

const AnimatedView = Animated.createAnimatedComponent(View);

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export function ArtistAvatar({
  name,
  imageUrl,
  size = 72,
  showGlow = false,
  onPress,
}: ArtistAvatarProps) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(showGlow ? 1 : 0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glowOpacity.value * 0.6,
  }));

  React.useEffect(() => {
    glowOpacity.value = withTiming(showGlow ? 1 : 0, { duration: 300 });
  }, [showGlow, glowOpacity]);

  function handlePressIn() {
    if (onPress) scale.value = withSpring(0.95, spring.snappy);
  }
  function handlePressOut() {
    if (onPress) scale.value = withSpring(1, spring.bouncy);
  }

  const initials = getInitials(name);
  const borderRadius = size / 2; // always circular

  return (
    <AnimatedView
      style={[
        animatedStyle,
        styles.glowWrapper,
        {
          width: size,
          height: size,
          borderRadius,
          shadowColor: palette.crimson,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: size * 0.4,
          elevation: 8,
        },
      ]}
      accessible={!!onPress}
      accessibilityLabel={`${name} avatar`}
      accessibilityRole={onPress ? 'button' : 'image'}
      onStartShouldSetResponder={() => !!onPress}
      onResponderGrant={handlePressIn}
      onResponderRelease={() => {
        handlePressOut();
        onPress?.();
      }}
      onResponderTerminate={handlePressOut}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size, borderRadius }}
          placeholder={blurhash}
          contentFit="cover"
          transition={300}
          recyclingKey={imageUrl}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius,
              backgroundColor: palette.surface3,
            },
          ]}
        >
          <Text
            variant="title"
            weight="bold"
            color="secondary"
            style={{ fontSize: size * 0.32 }}
          >
            {initials}
          </Text>
        </View>
      )}
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  glowWrapper: {
    overflow: 'visible',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

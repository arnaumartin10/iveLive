import { useEffect, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { hardShadow } from '../../theme/tokens';
import type { MacroGenre } from '../../features/genres/macroGenres';
import { RAW } from '../../theme/palette';
import { MascotArtwork } from './MascotArtwork';
import {
  resolveMascotColors,
  resolveMascotMood,
  getMascotTilt,
  type MascotMood,
  type MascotRoleColors,
} from './mascotColors';

export type { MascotMood } from './mascotColors';

export type MascotVariant = 'color' | 'ink' | 'sticker' | 'stamp';

export type MascotProps = {
  size?: number;
  genre?: MacroGenre | 'unclassified';
  colors?: Partial<MascotRoleColors>;
  variant?: MascotVariant;
  mood?: MascotMood;
  animated?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  id?: string;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export function useMascotColors(genre: MacroGenre, background?: string) {
  const { colors } = useTheme();
  return useMemo(
    () => resolveMascotColors(genre, background ?? colors.bg),
    [background, colors.bg, genre],
  );
}

export function Mascot({
  size = 96,
  genre = 'unclassified',
  colors: colorOverride,
  variant = 'color',
  mood = 'happy',
  animated = false,
  accessibilityLabel,
  style,
  id = genre,
}: MascotProps) {
  const { colors: themeColors } = useTheme();
  const reduceMotion = useReducedMotion();
  const idle = useSharedValue(0);
  const isSticker = variant === 'sticker';
  const isStamp = variant === 'stamp';
  const tilt = getMascotTilt(id);
  const roles = useMemo(
    () => ({
      ...resolveMascotColors(genre, themeColors.bg),
      ...colorOverride,
    }),
    [colorOverride, genre, themeColors.bg],
  );
  const renderRoles = useMemo(() => {
    if (variant !== 'ink' && variant !== 'stamp') return roles;
    const ink = roles.outline;
    return { body: ink, accent: ink, outline: ink, feature: ink };
  }, [roles, variant]);

  useEffect(() => {
    if (!animated || reduceMotion) {
      idle.value = 0;
      return;
    }

    idle.value = withRepeat(withTiming(1, { duration: 1800 }), -1, true);
    return () => cancelAnimation(idle);
  }, [animated, idle, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: isSticker || isStamp ? `${tilt}deg` : '0deg' },
      { translateY: animated && !reduceMotion ? idle.value * -2 : 0 },
    ],
  }));
  const contentSize = isSticker ? size - 12 : size;
  const requestedMood = resolveMascotMood(mood);

  if (isSticker) {
    return (
      <AnimatedView
        accessible={Boolean(accessibilityLabel)}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityLabel ? 'image' : undefined}
        style={[
          styles.sticker,
          hardShadow.sm,
          {
            width: size,
            height: size,
            backgroundColor: RAW.wheat,
            borderColor: themeColors.ink,
          },
          style,
          animatedStyle,
        ]}
      >
        <MascotArtwork size={contentSize} colors={renderRoles} />
      </AnimatedView>
    );
  }

  return (
    <AnimatedView
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      style={[
        isStamp ? styles.stamp : styles.artwork,
        isStamp
          ? {
              borderColor: themeColors.ink,
              backgroundColor: themeColors.surface,
              width: size,
              height: size,
            }
          : undefined,
        style,
        animatedStyle,
      ]}
      testID={`mascot-${genre}-${variant}-${requestedMood}`}
    >
      <MascotArtwork size={size} colors={renderRoles} />
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  artwork: { alignItems: 'center', justifyContent: 'center' },
  sticker: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stamp: {
    alignItems: 'center',
    borderWidth: 1.5,
    justifyContent: 'center',
  },
});

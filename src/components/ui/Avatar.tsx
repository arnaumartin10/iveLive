import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Sticker } from '../paper/Sticker';
import { getInitials } from '../../lib/utils';
import { Text } from './Text';
import { Mascot } from '../brand/Mascot';
import type { MacroGenre } from '../../features/genres/macroGenres';

const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';
const sizes = { xs: 28, sm: 36, md: 48, lg: 64, xl: 88 } as const;

export type AvatarSize = keyof typeof sizes;

type AvatarProps = {
  name?: string | null;
  imageUrl?: string | null;
  size?: AvatarSize;
  ringColor?: string;
  glowEnabled?: boolean; // deprecated in Paper & Ink
  cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
  fallbackGenre?: MacroGenre;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({
  name,
  imageUrl,
  size = 'md',
  cachePolicy = 'disk',
  fallbackGenre,
  style,
}: AvatarProps) {
  const { colors } = useTheme();
  const diameter = sizes[size];
  const accessibleName = name?.trim() || 'Unknown user';
  const initials = getInitials(accessibleName);

  return (
    <Sticker
      id={accessibleName}
      size={diameter}
      accessible
      accessibilityLabel={`${accessibleName} avatar`}
      style={style as ViewStyle}
    >
      {imageUrl ? (
        <Image
          accessibilityLabel={accessibleName}
          contentFit="cover"
          cachePolicy={cachePolicy}
          placeholder={BLURHASH}
          placeholderContentFit="cover"
          source={{ uri: imageUrl }}
          style={{ width: diameter, height: diameter }}
        />
      ) : fallbackGenre ? (
        <View
          style={[
            styles.fallback,
            {
              width: diameter,
              height: diameter,
              backgroundColor: colors.surfaceRaised,
            },
          ]}
        >
          <Mascot genre={fallbackGenre} size={diameter - 6} />
        </View>
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: diameter,
              height: diameter,
              backgroundColor: colors.surfaceRaised,
            },
          ]}
        >
          <Text
            variant={size === 'xs' || size === 'sm' ? 'caption' : 'subtitle'}
            style={[styles.initials, { color: colors.ink }]}
          >
            {initials}
          </Text>
        </View>
      )}
    </Sticker>
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

/**
 * NOTE: Spotify's brand and metadata display guidelines must be reviewed before
 * commercial release when applying duotone and color matrix treatments to Spotify-sourced images.
 */
import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  type ImageSourcePropType,
  type ViewStyle,
} from 'react-native';
import { Canvas, Image as SkiaImage, ColorMatrix, useImage } from '@shopify/react-native-skia';
import { useTheme } from '../../theme/ThemeProvider';
import { hardShadow } from '../../theme/tokens';

export type PhotoTreatment = 'duotone' | 'original';

export interface ArtistPhotoProps {
  uri?: string | null;
  source?: ImageSourcePropType;
  width?: number;
  height?: number;
  treatment?: PhotoTreatment;
  isFiveStar?: boolean;
  style?: ViewStyle;
  borderRadius?: number;
  onPress?: () => void;
  allowPeekOriginal?: boolean;
}

// Duotone ColorMatrix:
// Maps luminance: shadows -> violet (#432534), highlights -> wheat (#EFD6AC)
const DUOTONE_MATRIX = [
  0.65, 0.20, 0.15, 0, 0.26, // R
  0.45, 0.35, 0.20, 0, 0.15, // G
  0.25, 0.20, 0.55, 0, 0.20, // B
  0,    0,    0,    1, 0,
];

// Five-star variant highlights toward orange (#C44900)
const FIVE_STAR_MATRIX = [
  0.80, 0.15, 0.05, 0, 0.35,
  0.30, 0.35, 0.10, 0, 0.15,
  0.10, 0.10, 0.30, 0, 0.10,
  0,    0,    0,    1, 0,
];

export function ArtistPhoto({
  uri,
  source,
  width = 120,
  height = 120,
  treatment = 'duotone',
  isFiveStar = false,
  style,
  borderRadius = 4,
  onPress,
  allowPeekOriginal = true,
}: ArtistPhotoProps) {
  const { colors } = useTheme();
  const [peekingOriginal, setPeekingOriginal] = useState(false);
  const skiaImg = useImage(uri ?? undefined);

  const activeTreatment = peekingOriginal ? 'original' : treatment;
  const matrix = isFiveStar ? FIVE_STAR_MATRIX : DUOTONE_MATRIX;

  const handlePressIn = () => {
    if (allowPeekOriginal) setPeekingOriginal(true);
  };

  const handlePressOut = () => {
    if (allowPeekOriginal) setPeekingOriginal(false);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        hardShadow.sm,
        {
          width,
          height,
          borderRadius,
          borderColor: colors.ink,
          backgroundColor: colors.surface,
        },
        style,
      ]}
    >
      {activeTreatment === 'duotone' && skiaImg ? (
        <Canvas style={{ width, height, borderRadius }}>
          <SkiaImage
            image={skiaImg}
            fit="cover"
            x={0}
            y={0}
            width={width}
            height={height}
          >
            <ColorMatrix matrix={matrix} />
          </SkiaImage>
        </Canvas>
      ) : (
        <Image
          source={uri ? { uri } : (source ?? require('../../../assets/artist-placeholder-1.jpg'))}
          style={[styles.img, { width, height, borderRadius }]}
          resizeMode="cover"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    height: '100%',
  },
});

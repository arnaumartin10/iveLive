import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share2 } from 'lucide-react-native';
import {
  Canvas,
  Fill,
  Image as SkiaImage,
  ImageFormat,
  Rect,
  Text as SkiaText,
  matchFont,
  useCanvasRef,
  useImage,
} from '@shopify/react-native-skia';
import { Text } from '../ui/Text';
import { fontFamily, hardShadow, radius, spacing } from '../../theme/tokens';
import { RAW } from '../../theme/palette';
import { useTheme } from '../../theme/ThemeProvider';
import type { ShareConcertButtonProps } from './ShareConcertButton';

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

export function ShareConcertButton({
  artistName,
  imageUri,
  genreColor,
  eventDate,
  venueName,
  rating,
  onError,
}: ShareConcertButtonProps) {
  const canvasRef = useCanvasRef();
  const { colors } = useTheme();
  const artistImage = useImage(imageUri ?? require('../../../assets/artist-placeholder-1.jpg'));
  const [isSharing, setIsSharing] = useState(false);
  const titleFont = matchFont({
    fontFamily: fontFamily.display,
    fontSize: 72,
    fontWeight: 'bold',
  });
  const bodyFont = matchFont({
    fontFamily: fontFamily.mono,
    fontSize: 34,
  });
  const brandFont = matchFont({
    fontFamily: fontFamily.monoMedium,
    fontSize: 30,
    fontWeight: 'bold',
  });

  async function handleShare() {
    setIsSharing(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device.');
      }
      const image = await canvasRef.current?.makeImageSnapshotAsync();
      if (!image) throw new Error('The share card is not ready yet.');
      const bytes = image.encodeToBytes(ImageFormat.PNG, 100);
      const file = new File(Paths.cache, `ivelive-show-${Date.now()}.png`);
      file.create({ overwrite: true });
      file.write(bytes);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your show',
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not create the share card.');
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <>
      <View pointerEvents="none" style={styles.offscreenCanvas}>
        <Canvas ref={canvasRef} style={styles.canvas}>
          <Fill color={RAW.wheat} />
          <Rect x={0} y={0} width={CARD_WIDTH} height={CARD_HEIGHT} color={RAW.wheat} />
          {artistImage ? (
            <SkiaImage
              image={artistImage}
              x={72}
              y={72}
              width={CARD_WIDTH - 144}
              height={640}
              fit="cover"
            />
          ) : (
            <Rect x={72} y={72} width={CARD_WIDTH - 144} height={640} color={RAW.mauve} />
          )}
          <Rect x={72} y={712} width={CARD_WIDTH - 144} height={5} color={genreColor} />
          <Rect x={72} y={748} width={CARD_WIDTH - 144} height={1.5} color={RAW.violet} />
          <SkiaText
            x={80}
            y={850}
            text={artistName.length > 28 ? `${artistName.slice(0, 27)}…` : artistName}
            font={titleFont}
            color={RAW.violet}
          />
          <SkiaText
            x={82}
            y={930}
            text={eventDate}
            font={bodyFont}
            color={RAW.mauve}
          />
          {venueName ? (
            <SkiaText
              x={82}
              y={990}
              text={venueName.length > 42 ? `${venueName.slice(0, 41)}…` : venueName}
              font={bodyFont}
              color={RAW.mauve}
            />
          ) : null}
          {rating !== null ? (
            <SkiaText
              x={82}
              y={1080}
              text={`${'★'.repeat(Math.floor(rating))}${rating % 1 ? '½' : ''}  ${rating.toFixed(1)}`}
              font={bodyFont}
              color={RAW.orange}
            />
          ) : null}
          <SkiaText
            x={82}
            y={1250}
            text="IveLive  ·  Every show has a story"
            font={brandFont}
            color={RAW.violet}
          />
        </Canvas>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share show image"
        accessibilityState={{ busy: isSharing, disabled: isSharing }}
        disabled={isSharing}
        onPress={() => { void handleShare(); }}
        style={({ pressed }) => [
          styles.button,
          hardShadow.sm,
          { backgroundColor: colors.surface, borderColor: colors.ink },
          pressed && styles.pressed,
          isSharing && styles.disabled,
        ]}
      >
        <Share2 color={colors.ink} size={17} />
        <Text variant="label" style={[styles.label, { color: colors.ink }]}>
          {isSharing ? 'Preparing...' : 'Share'}
        </Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  offscreenCanvas: { height: CARD_HEIGHT, left: -CARD_WIDTH - 20, position: 'absolute', top: 0, width: CARD_WIDTH },
  canvas: { height: CARD_HEIGHT, width: CARD_WIDTH },
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing[2],
  },
  label: {},
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.52 },
});
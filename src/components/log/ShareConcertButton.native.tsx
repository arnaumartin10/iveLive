import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { File, Paths } from 'expo-file-system';
import Share from 'react-native-share';
import { Share2 } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { hardShadow, radius, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import type { ShareConcertButtonProps } from './ShareConcertButton';
import {
  getConcertShareMessage,
  getPublicLogUrl,
  renderConcertShareCard,
} from '../../features/log/shareCard';

export function ShareConcertButton({
  logId,
  artistName,
  imageUri,
  macroGenre = null,
  genreColor,
  eventDate,
  venueName,
  rating,
  review,
  compact = false,
  onError,
}: ShareConcertButtonProps) {
  const { colors } = useTheme();
  const [isSharing, setIsSharing] = useState(false);

  async function handleShare() {
    setIsSharing(true);
    try {
      const publicUrl = getPublicLogUrl(logId);
      const input = {
        artistName,
        imageUri,
        macroGenre,
        genreColor,
        eventDate,
        venueName,
        rating,
        review,
        publicUrl,
      };
      const card = await renderConcertShareCard(input);
      const file = new File(
        Paths.cache,
        `ivelive-show-${logId}-${card.width}x${card.height}.png`,
      );
      file.create({ overwrite: true });
      file.write(card.bytes);
      await Share.open({
        title: 'Share your show',
        message: getConcertShareMessage(input),
        url: file.uri,
        type: 'image/png',
        failOnCancel: false,
        useInternalStorage: true,
      });
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : 'Could not create the share card.',
      );
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share show image and link"
        accessibilityState={{ busy: isSharing, disabled: isSharing }}
        disabled={isSharing}
        onPress={() => {
          void handleShare();
        }}
        style={({ pressed }) => [
          styles.button,
          hardShadow.sm,
          { backgroundColor: colors.surface, borderColor: colors.ink },
          compact && styles.compactButton,
          pressed && styles.pressed,
          isSharing && styles.disabled,
        ]}
      >
        <Share2 color={colors.ink} size={17} />
        {!compact ? (
          <Text variant="label" style={[styles.label, { color: colors.ink }]}>
            {isSharing ? 'Preparing...' : 'Share'}
          </Text>
        ) : null}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
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
  compactButton: {
    flex: 0,
    minWidth: 44,
    paddingHorizontal: spacing[1],
  },
  label: {},
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.52 },
});

import { useState } from 'react';
import { Platform, StyleSheet, Pressable, View } from 'react-native';
import { MessageCircle, Share2 } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { hardShadow, radius, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import {
  getConcertShareMessage,
  getPublicLogUrl,
  renderConcertShareCard,
} from '../../features/log/shareCard';

export type ShareConcertButtonProps = {
  logId: string;
  artistName: string;
  imageUri: string | null;
  macroGenre?: string | null;
  genreColor: string;
  eventDate: string;
  venueName: string | null;
  rating: number | null;
  review?: string | null;
  compact?: boolean;
  showWhatsApp?: boolean;
  onError: (message: string) => void;
  onStatus?: (message: string) => void;
};

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
  showWhatsApp = true,
  onError,
  onStatus,
}: ShareConcertButtonProps) {
  const { colors } = useTheme();
  const [isSharing, setIsSharing] = useState(false);

  async function handleShare(target: 'default' | 'whatsapp' = 'default') {
    if (isSharing) return;
    const whatsappWindow =
      target === 'whatsapp' ? window.open('about:blank', '_blank') : null;
    if (whatsappWindow) whatsappWindow.opener = null;
    setIsSharing(true);
    onStatus?.('');
    try {
      const publicUrl = getPublicLogUrl(logId);
      const title = `I saw ${artistName} live`;
      const text = getConcertShareMessage({
        artistName,
        eventDate,
        venueName,
        rating,
        publicUrl,
      });
      let blob: Blob | null = null;
      let cardFailure: unknown;
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
      try {
        const card = await renderConcertShareCard(input);
        blob = new Blob([new Uint8Array(card.bytes).buffer], {
          type: 'image/png',
        });
      } catch (error) {
        cardFailure = error;
      }

      const webNavigator = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      const file =
        blob && typeof globalThis.File === 'function'
          ? new globalThis.File([blob], `ivelive-log-${logId}.png`, {
              type: 'image/png',
            })
          : null;

      if (target === 'whatsapp') {
        if (blob) downloadBlob(blob, `ivelive-log-${logId}.png`);
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        if (whatsappWindow) {
          whatsappWindow.location.href = whatsappUrl;
        } else {
          await navigator.clipboard.writeText(text);
        }
        onStatus?.(
          blob
            ? 'Image downloaded. WhatsApp opened with the link; attach the PNG in the chat.'
            : 'WhatsApp opened with the show link.',
        );
        return;
      }

      if (
        file &&
        typeof webNavigator.share === 'function' &&
        webNavigator.canShare?.({ files: [file] })
      ) {
        try {
          await webNavigator.share({ files: [file], title, text, url: publicUrl });
          return;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
        }
      }

      if (blob) downloadBlob(blob, `ivelive-log-${logId}.png`);

      let linkMethod: 'shared' | 'copied' | 'downloaded' = 'downloaded';
      if (typeof webNavigator.share === 'function') {
        try {
          await webNavigator.share({ title, text, url: publicUrl });
          linkMethod = 'shared';
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
        }
      }
      if (linkMethod !== 'shared') {
        try {
          await navigator.clipboard.writeText(text);
          linkMethod = 'copied';
        } catch {
          downloadBlob(
            new Blob([text], { type: 'text/plain;charset=utf-8' }),
            `ivelive-log-${logId}-share.txt`,
          );
        }
      }
      const cardError =
        cardFailure instanceof Error ? ` ${cardFailure.message}` : '';
      const status = cardFailure
        ? `The image card could not be generated.${cardError}`
        : blob
          ? 'The image was downloaded.'
          : '';
      const linkStatus = {
        shared: 'The link was shared.',
        copied:
          'The show link was copied. Paste it into WhatsApp, or attach the image in Instagram.',
        downloaded:
          'A text file with the show link was downloaded. Attach the image separately.',
      }[linkMethod];
      onStatus?.([status, linkStatus].filter(Boolean).join(' '));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      onError(
        error instanceof Error ? error.message : 'Could not share this show.',
      );
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <View style={[styles.actions, compact && styles.compactActions]}>
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
          isSharing && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Share2 color={colors.ink} size={17} />
        {!compact ? (
          <Text variant="label" style={[styles.label, { color: colors.ink }]}>
            {isSharing ? 'Preparing...' : 'Share'}
          </Text>
        ) : null}
      </Pressable>
      {Platform.OS === 'web' && showWhatsApp ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share show on WhatsApp"
          accessibilityState={{ disabled: isSharing }}
          disabled={isSharing}
          onPress={() => {
            void handleShare('whatsapp');
          }}
          style={({ pressed }) => [
            styles.whatsappButton,
            hardShadow.sm,
            { backgroundColor: colors.surface, borderColor: colors.line },
            pressed && styles.pressed,
            isSharing && styles.disabled,
          ]}
        >
          <MessageCircle color={colors.ink} size={17} />
          {!compact ? (
            <Text variant="label" style={[styles.label, { color: colors.ink }]}>
              WhatsApp
            </Text>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const imageUrl = URL.createObjectURL(blob);
  const download = document.createElement('a');
  download.href = imageUrl;
  download.download = filename;
  download.click();
  window.setTimeout(() => URL.revokeObjectURL(imageUrl), 30_000);
}

const styles = StyleSheet.create({
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  compactActions: {
    flex: 0,
  },
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
  compactButton: {
    flex: 0,
    minWidth: 44,
    paddingHorizontal: spacing[1],
  },
  whatsappButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing[2],
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.52 },
});

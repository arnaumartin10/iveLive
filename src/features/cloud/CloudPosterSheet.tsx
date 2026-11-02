import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as Device from 'expo-device';
import * as Sharing from 'expo-sharing';
import { Button } from '../../components/ui/Button';
import { Sheet } from '../../components/ui/Sheet';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import {
  getPosterDimensions,
  type PosterFormat,
  type PosterVariant,
} from './poster';
import {
  renderAtlasPoster,
  writePosterFile,
  type AtlasPosterRequest,
} from './posterRenderer';
import { savePosterToPhotos } from './savePosterToPhotos';

type CloudPosterSheetProps = Omit<
  AtlasPosterRequest,
  'format' | 'variant' | 'watermark' | 'dimensions'
> & {
  visible: boolean;
  onDismiss: () => void;
};

const formatOptions: { label: string; value: PosterFormat }[] = [
  { label: 'Print · 3000 × 4200', value: 'print' },
  { label: 'Story · 1080 × 1920', value: 'story' },
];

const variantOptions: { label: string; value: PosterVariant }[] = [
  { label: 'Whole world', value: 'whole-world' },
  { label: 'My biggest territory', value: 'biggest-territory' },
];

export function CloudPosterSheet({
  visible,
  onDismiss,
  ...posterData
}: CloudPosterSheetProps) {
  const { colors } = useTheme();
  const {
    artists,
    date,
    deviceMemoryBytes,
    stats,
    territories,
    title,
    username,
  } = posterData;
  const [format, setFormat] = useState<PosterFormat>('print');
  const [variant, setVariant] = useState<PosterVariant>('whole-world');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const request = useMemo(
    () => ({
      artists,
      date,
      deviceMemoryBytes,
      stats,
      territories,
      title,
      username,
      format,
      variant,
    }),
    [
      artists,
      date,
      deviceMemoryBytes,
      format,
      stats,
      territories,
      title,
      username,
      variant,
    ],
  );

  useEffect(() => {
    if (!visible) return;
    let active = true;
    const timeout = setTimeout(() => {
      if (!active) return;
      setBusy(true);
      setPreviewUri(null);
      setMessage('');
      const dimensions = getPosterDimensions(request.format);
      const previewWidth = request.format === 'print' ? 600 : 432;
      const previewDimensions = {
        width: previewWidth,
        height: Math.round(
          previewWidth * (dimensions.height / dimensions.width),
        ),
      };
      void renderAtlasPoster({
        ...request,
        dimensions: previewDimensions,
        watermark: false,
      })
        .then(({ bytes }) => {
          if (!active) return;
          const uri = writePosterFile(
            bytes,
            `atlas-preview-${request.format}-${request.variant}-${Date.now()}.png`,
          );
          setPreviewUri(uri);
        })
        .catch((error: unknown) => {
          if (!active) return;
          setMessage(
            error instanceof Error
              ? error.message
              : 'Could not render a preview.',
          );
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [request, visible]);

  async function createExportFile() {
    const {
      bytes,
      width,
      height,
      fellBack,
      missingStickerCount,
    } = await renderAtlasPoster({
      ...request,
      watermark: true,
      deviceMemoryBytes: Device.totalMemory,
    });
    const filename = `ivelive-atlas-${format}-${width}x${height}-${Date.now()}.png`;
    const uri = writePosterFile(bytes, filename);
    const notes = [
      fellBack ? `Memory-safe export: ${width} × ${height}px.` : '',
      missingStickerCount
        ? `${missingStickerCount} artist image(s) were unavailable; genre marks were printed instead.`
        : '',
    ].filter(Boolean);
    return { uri, notes };
  }

  async function sharePoster() {
    setBusy(true);
    setMessage('');
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        setMessage('Sharing is not available on this device.');
        return;
      }
      const { uri, notes } = await createExportFile();
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your Atlas',
        UTI: 'public.png',
      });
      setMessage(notes.join(' '));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not share the atlas.');
    } finally {
      setBusy(false);
    }
  }

  async function saveToPhotos() {
    setBusy(true);
    setMessage('');
    try {
      const { uri, notes } = await createExportFile();
      const result = await savePosterToPhotos(uri);
      if (result === 'unavailable') {
        setMessage('Saving to Photos is only available in the iOS and Android apps.');
        return;
      }
      if (result === 'denied') {
        setMessage('Photo access was not granted. Allow it to save your atlas.');
        return;
      }
      setMessage(['Saved to Photos.', ...notes].filter(Boolean).join(' '));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the atlas.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      title="Print your atlas"
      onDismiss={onDismiss}
      snapPoints={['88%']}
    >
      <View style={styles.content}>
        <View style={styles.optionGroup}>
          <Text variant="label" weight="bold">Format</Text>
          <View style={styles.optionRow}>
            {formatOptions.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: format === option.value }}
                accessibilityLabel={option.label}
                onPress={() => setFormat(option.value)}
                style={[
                  styles.option,
                  {
                    borderColor:
                      format === option.value ? colors.accent : colors.line,
                    backgroundColor:
                      format === option.value ? `${colors.accent}18` : colors.surface,
                  },
                ]}
              >
                <Text variant="caption" weight="semibold">{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.optionGroup}>
          <Text variant="label" weight="bold">Composition</Text>
          <View style={styles.optionRow}>
            {variantOptions.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: variant === option.value }}
                accessibilityLabel={option.label}
                onPress={() => setVariant(option.value)}
                style={[
                  styles.option,
                  {
                    borderColor:
                      variant === option.value ? colors.accent : colors.line,
                    backgroundColor:
                      variant === option.value ? `${colors.accent}18` : colors.surface,
                  },
                ]}
              >
                <Text variant="caption" weight="semibold">{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View
          accessibilityLabel="Atlas poster preview without watermark"
          style={[styles.preview, { backgroundColor: colors.bgSunken }]}
        >
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              contentFit="contain"
              style={styles.previewImage}
              accessibilityLabel="Preview of your atlas poster"
            />
          ) : (
            <Text variant="caption" color="secondary">
              {busy ? 'Printing a preview…' : 'Preview unavailable'}
            </Text>
          )}
        </View>
        {message ? (
          <Text
            variant="caption"
            color={
              message.startsWith('Saved to Photos.')
                ? 'success'
                : message.startsWith('Could not') ||
                    message.includes('not available') ||
                    message.includes('not granted')
                  ? 'danger'
                  : 'secondary'
            }
          >
            {message}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button
            label="Share PNG"
            loading={busy}
            disabled={!previewUri}
            onPress={() => void sharePoster()}
          />
          <Button
            label="Save to Photos"
            variant="secondary"
            loading={busy}
            disabled={!previewUri}
            onPress={() => void saveToPhotos()}
          />
        </View>
        <Text variant="caption" color="secondary">
          The IveLive mark is added to exported PNGs, not the preview.
        </Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 12, paddingHorizontal: 20, paddingBottom: 20 },
  optionGroup: { gap: 6 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  preview: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 120,
    overflow: 'hidden',
  },
  previewImage: { height: '100%', width: '100%' },
  actions: { gap: 8 },
});

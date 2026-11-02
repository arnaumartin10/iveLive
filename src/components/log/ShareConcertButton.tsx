import { Share, StyleSheet, Pressable } from 'react-native';
import { Share2 } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { hardShadow, radius, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

export type ShareConcertButtonProps = {
  artistName: string;
  imageUri: string | null;
  genreColor: string;
  eventDate: string;
  venueName: string | null;
  rating: number | null;
  onError: (message: string) => void;
};

export function ShareConcertButton({
  artistName,
  eventDate,
  venueName,
  rating,
}: ShareConcertButtonProps) {
  const { colors } = useTheme();

  async function handleShare() {
    try {
      await Share.share({
        message: `I saw ${artistName}${venueName ? ` at ${venueName}` : ''} on ${eventDate}${rating ? ` · ${rating}/5` : ''}. Saved with IveLive.`,
      });
    } catch {
      return;
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Share this show"
      onPress={() => { void handleShare(); }}
      style={({ pressed }) => [
        styles.button,
        hardShadow.sm,
        { backgroundColor: colors.surface, borderColor: colors.ink },
        pressed && styles.pressed,
      ]}
    >
      <Share2 color={colors.ink} size={17} />
      <Text variant="label" style={[styles.label, { color: colors.ink }]}>Share</Text>
    </Pressable>
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
  label: {},
  pressed: { opacity: 0.72 },
});
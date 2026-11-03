import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Info, Music2 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { MACRO_GENRES } from '../genres/macroGenres';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../../components/ui/Text';
import { GenreLabel } from '../../components/paper/GenreLabel';
import type { ArtistSearchResult } from './types';

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

interface ArtistSearchResultRowProps {
  result: ArtistSearchResult;
  onPress: (result: ArtistSearchResult) => void;
  onOpenDetails?: (result: ArtistSearchResult) => void;
}

export function ArtistSearchResultRow({
  result,
  onPress,
  onOpenDetails,
}: ArtistSearchResultRowProps) {
  const { colors } = useTheme();
  const imageUrl = result.imageThumb ?? result.imageLarge;
  const genres = result.macroGenres.slice(0, 2);

  return (
    <View style={[styles.row, { borderBottomColor: colors.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Select ${result.name}`}
        onPress={() => {
          void Haptics.selectionAsync();
          onPress(result);
        }}
        style={({ pressed }) => [
          styles.mainPressable,
          { opacity: pressed ? 0.72 : 1 },
        ]}
      >
        {imageUrl ? (
          <Image
            accessibilityLabel={`${result.name} artist photo`}
            contentFit="cover"
            placeholder={blurhash}
            placeholderContentFit="cover"
            recyclingKey={imageUrl}
            source={{ uri: imageUrl }}
            style={styles.image}
            transition={150}
          />
        ) : (
          <View
            style={[
              styles.image,
              styles.imageFallback,
              { backgroundColor: colors.surfaceRaised },
            ]}
          >
            <Music2 color={colors.inkMuted} size={21} />
          </View>
        )}

        <View style={styles.copy}>
          <View style={styles.nameRow}>
            <Text
              numberOfLines={1}
              variant="label"
              weight="bold"
              style={styles.name}
            >
              {result.name}
            </Text>
            {result.source === 'manual' ? (
              <Text variant="caption" color="secondary">
                Custom
              </Text>
            ) : null}
          </View>
          {genres.length ? (
            <View style={styles.genreRow}>
              {genres.map((genre) => {
                const config = MACRO_GENRES[genre as keyof typeof MACRO_GENRES];
                if (!config) return null;
                return (
                  <GenreLabel
                    key={genre}
                    genre={genre as keyof typeof MACRO_GENRES}
                    size="xs"
                  />
                );
              })}
            </View>
          ) : null}
        </View>
      </Pressable>
      {onOpenDetails ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${result.name} artist card`}
          hitSlop={8}
          onPress={() => onOpenDetails(result)}
          style={styles.detailsButton}
        >
          <Info size={19} color={colors.inkMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 76,
    paddingVertical: 10,
  },
  mainPressable: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
    paddingVertical: 10,
  },
  detailsButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  image: { borderRadius: 28, height: 56, width: 56 },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 6, minWidth: 0 },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  name: { flexShrink: 1 },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
});

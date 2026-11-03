import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/ui/Text';
import { MACRO_GENRE_ORDER } from '../genres/macroGenres';
import type { CloudArtistData } from './types';
import { GenreLabel } from '../../components/paper/GenreLabel';

type CloudAccessibleListProps = {
  artists: CloudArtistData[];
};

export function CloudAccessibleList({ artists }: CloudAccessibleListProps) {
  const groupedArtists = new Map<string, CloudArtistData[]>();
  for (const slug of MACRO_GENRE_ORDER) groupedArtists.set(slug, []);
  for (const artist of artists) {
    const slug =
      artist.primary_macro && groupedArtists.has(artist.primary_macro)
        ? artist.primary_macro
        : (artist.macro_genres.find((genre) => groupedArtists.has(genre)) ??
          'other');
    groupedArtists.get(slug)?.push(artist);
  }

  return (
    <ScrollView
      accessibilityLabel="Atlas artist list grouped by territory"
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {MACRO_GENRE_ORDER.map((slug) => {
        const members = (groupedArtists.get(slug) ?? []).sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        return (
          <View key={slug} accessibilityRole="summary" style={styles.territory}>
            <View style={styles.territoryHeading}>
              <GenreLabel genre={slug} size="sm" />
              <Text variant="caption" color="secondary">
                {members.length} artists
              </Text>
            </View>
            {members.length === 0 ? (
              <Text variant="caption" color="secondary">
                Unexplored
              </Text>
            ) : (
              members.map((artist) => (
                <View
                  key={artist.id}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`${artist.name}, ${artist.log_count} ${artist.log_count === 1 ? 'show' : 'shows'}, ${artist.avg_rating == null ? 'not rated' : `rated ${artist.avg_rating.toFixed(1)} out of 5`}`}
                  style={styles.artist}
                >
                  <Text variant="body" numberOfLines={2} style={styles.name}>
                    {artist.name}
                  </Text>
                  <Text variant="mono" style={styles.stats}>
                    {artist.log_count} ·{' '}
                    {artist.avg_rating == null
                      ? '—'
                      : `${artist.avg_rating.toFixed(1)} / 5`}
                  </Text>
                </View>
              ))
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 520 },
  content: { gap: 12, paddingVertical: 6 },
  territory: { gap: 7, padding: 12, borderWidth: 1 },
  territoryHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  artist: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 6,
  },
  name: { flex: 1 },
  stats: { flexShrink: 0 },
});

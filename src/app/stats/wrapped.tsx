import { router } from 'expo-router';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BarChart, Donut, Gauge } from '../../components/stats/Charts';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import {
  useDiversity,
  useGenreStats,
  useStatsOverview,
} from '../../features/stats/hooks';
import { MACRO_GENRES } from '../../features/genres/macroGenres';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { GenreLabel, Ticket } from '../../components/paper';

export default function WrappedScreen() {
  const { colors } = useTheme();
  const overviewQuery = useStatsOverview();
  const genresQuery = useGenreStats();
  const diversityQuery = useDiversity();
  const overview = overviewQuery.data;
  const genres = genresQuery.data ?? [];
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.backButton}
      >
        <ChevronLeft size={22} color={colors.ink} />
      </Pressable>
      <ScrollView contentContainerStyle={styles.content}>
        <Ticket
          serialNumber="IL-WRAPPED"
          hasBarcode={false}
          style={styles.heroTicket}
        >
          <View style={styles.hero}>
            <View style={styles.heroContent}>
              <Sparkles size={20} color={colors.accent} />
              <Text variant="caption" weight="bold" color="accent">
                YOUR LIVE MUSIC WRAPPED
              </Text>
              <Text variant="display" style={styles.heroNumber}>
                {overview?.total_shows ?? 0}
              </Text>
              <Text variant="title" weight="bold">
                shows that became your story.
              </Text>
            </View>
          </View>
        </Ticket>
        {overview ? (
          <>
            <Card style={styles.storyCard}>
              <Text variant="label" weight="bold">
                YOUR SOUND
              </Text>
              {genres[0] ? (
                <GenreLabel
                  genre={genres[0].macro_genre as keyof typeof MACRO_GENRES}
                  size="md"
                  variant="stamp"
                  interactive={false}
                />
              ) : (
                <Text variant="title" weight="bold">
                  A sound all your own
                </Text>
              )}
              <Text variant="body" color="secondary">
                {genres[0]?.log_count ?? 0} show moments across {genres.length}{' '}
                genres.
              </Text>
              <BarChart
                animationKey="wrapped-genres"
                values={genres.slice(0, 7).map((genre) => genre.log_count)}
                colors={genres
                  .slice(0, 7)
                  .map(
                    (genre) =>
                      MACRO_GENRES[
                        genre.macro_genre as keyof typeof MACRO_GENRES
                      ]?.color ?? colors.accent,
                  )}
              />
            </Card>
            <Card style={styles.storyCard}>
              <Text variant="label" weight="bold">
                YOUR MOST-PLAYED LIVE
              </Text>
              <View style={styles.artistLine}>
                <Avatar
                  name={overview.most_seen_artist?.artist ?? 'Artist'}
                  size="lg"
                />
                <View>
                  <Text variant="title" weight="bold">
                    {overview.most_seen_artist?.artist ?? 'Your next favorite'}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {overview.most_seen_artist?.count ?? 0} nights together
                  </Text>
                </View>
              </View>
            </Card>
            <Card style={styles.storyCard}>
              <Text variant="label" weight="bold">
                YOUR RANGE
              </Text>
              <View style={styles.diversityLine}>
                <Gauge
                  animationKey="wrapped-diversity"
                  value={diversityQuery.data?.score ?? 0}
                  color={colors.accent}
                />
                <Donut
                  animationKey="wrapped-genre-donut"
                  values={genres.map((genre) => genre.log_count)}
                  colors={genres.map(
                    (genre) =>
                      MACRO_GENRES[
                        genre.macro_genre as keyof typeof MACRO_GENRES
                      ]?.color ?? colors.accent,
                  )}
                  center={`${genres.length}`}
                />
              </View>
              <Text variant="caption" color="secondary">
                {diversityQuery.data?.dominant_genre_share ?? 0}% of your
                concerts came from{' '}
                {diversityQuery.data?.dominant_genre ?? 'one genre'}.
              </Text>
            </Card>
            <Card style={styles.storyCard}>
              <Text variant="label" weight="bold">
                THE YEAR IN NUMBERS
              </Text>
              <View style={styles.numbersRow}>
                <Number label="Artists" value={overview.unique_artists} />
                <Number label="Venues" value={overview.unique_venues} />
                <Number label="Five stars" value={overview.five_star_count} />
              </View>
            </Card>
          </>
        ) : (
          <Text variant="body" color="secondary">
            Loading your story…
          </Text>
        )}
        <Button label="Back to Stats" onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}

function Number({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.number}>
      <Text variant="title" weight="bold">
        {new Intl.NumberFormat().format(value)}
      </Text>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backButton: {
    zIndex: 1,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
    marginLeft: 14,
  },
  content: { padding: spacing.lg, paddingBottom: 48, gap: spacing.md },
  heroTicket: { marginVertical: spacing.xs },
  hero: {
    minHeight: 280,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroContent: { alignItems: 'flex-start', gap: 8, padding: spacing.lg },
  heroNumber: { fontSize: 72, lineHeight: 80 },
  storyCard: { padding: spacing.lg, gap: spacing.md },
  artistLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  diversityLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  numbersRow: { flexDirection: 'row', justifyContent: 'space-between' },
  number: { gap: 3 },
});

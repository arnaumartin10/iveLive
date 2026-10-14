import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { palette, spacing } from '@theme/tokens';
import { Text } from '@components/ui/Text';
import { Card } from '@components/ui/Card';
import { Skeleton } from '@components/ui/Skeleton';
import { EmptyState } from '@components/ui/EmptyState';
import type { ConcertWithRelations } from '@features/concerts/types';

interface StatsOverviewProps {
  concerts: ConcertWithRelations[];
  isLoading: boolean;
  onLogFirstConcert: () => void;
}

export function StatsOverview({
  concerts,
  isLoading,
  onLogFirstConcert,
}: StatsOverviewProps) {
  if (isLoading && concerts.length === 0) {
    return (
      <View style={styles.container}>
        <Skeleton width="100%" height={100} style={{ marginBottom: 16 }} />
        <View style={styles.statsRow}>
          <Skeleton width="48%" height={110} />
          <Skeleton width="48%" height={110} />
        </View>
      </View>
    );
  }

  if (concerts.length === 0) {
    return (
      <EmptyState
        title="No Live Music Stats"
        subtitle="Log your first live concert to unlock insights into your personal music history."
        actionLabel="Log a Concert"
        onAction={onLogFirstConcert}
      />
    );
  }

  // Calculate statistics from concerts array
  const totalConcerts = concerts.length;
  const uniqueArtists = new Set(concerts.map((c) => c.artist_id)).size;
  const uniqueVenues = new Set(
    concerts.map((c) => c.venue?.name).filter(Boolean),
  ).size;
  const uniqueCountries = new Set(
    concerts.map((c) => c.venue?.country).filter(Boolean),
  ).size;

  // Genre analysis
  const genreCount = new Map<string, number>();
  for (const c of concerts) {
    for (const g of c.artist.genres) {
      genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
    }
  }

  const topGenres = Array.from(genreCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxGenreCount = topGenres[0]?.[1] ?? 1;

  // Most seen artist
  const artistCount = new Map<string, { name: string; count: number }>();
  for (const c of concerts) {
    const existing = artistCount.get(c.artist_id);
    if (existing) {
      existing.count += 1;
    } else {
      artistCount.set(c.artist_id, { name: c.artist.name, count: 1 });
    }
  }
  const topArtist = Array.from(artistCount.values()).sort(
    (a, b) => b.count - a.count,
  )[0];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero counter */}
      <Card glow accent="crimson" style={styles.heroCard}>
        <Text variant="overline" color="secondary" center>
          LIFETIME ARCHIVE
        </Text>
        <Text variant="display" weight="black" color="crimson" center>
          {totalConcerts}
        </Text>
        <Text variant="headline" weight="bold" color="primary" center>
          Concerts Attended
        </Text>
      </Card>

      {/* 2x2 Key Metric Grid */}
      <View style={styles.statsRow}>
        <Card style={styles.statBox}>
          <Text variant="title" weight="black" color="amber">
            {uniqueArtists}
          </Text>
          <Text variant="overline" color="secondary">
            ARTISTS
          </Text>
        </Card>

        <Card style={styles.statBox}>
          <Text variant="title" weight="black" color="steel">
            {uniqueVenues}
          </Text>
          <Text variant="overline" color="secondary">
            VENUES
          </Text>
        </Card>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statBox}>
          <Text variant="title" weight="black" color="primary">
            {uniqueCountries}
          </Text>
          <Text variant="overline" color="secondary">
            COUNTRIES
          </Text>
        </Card>

        <Card style={styles.statBox}>
          <Text variant="title" weight="black" color="crimson" numberOfLines={1}>
            {topArtist ? topArtist.name : '—'}
          </Text>
          <Text variant="overline" color="secondary">
            MOST SEEN ({topArtist?.count ?? 0}×)
          </Text>
        </Card>
      </View>

      {/* Top Genres Breakdown */}
      {topGenres.length > 0 && (
        <Card style={styles.genresCard}>
          <Text variant="subtitle" weight="bold" style={styles.sectionTitle}>
            Top Genres
          </Text>
          {topGenres.map(([genre, count]) => {
            const percentage = (count / maxGenreCount) * 100;
            return (
              <View key={genre} style={styles.genreRow}>
                <View style={styles.genreLabelContainer}>
                  <Text variant="caption" weight="medium" style={styles.genreName}>
                    {genre}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {count}
                  </Text>
                </View>
                <View style={styles.barBackground}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${percentage}%` },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[12],
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    marginBottom: spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  statBox: {
    flex: 1,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  genresCard: {
    marginTop: spacing[2],
  },
  sectionTitle: {
    marginBottom: spacing[4],
  },
  genreRow: {
    marginBottom: spacing[3],
  },
  genreLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  genreName: {
    textTransform: 'capitalize',
  },
  barBackground: {
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.surface3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: palette.crimson,
  },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { palette, radius, spacing } from '@theme/tokens';
import { Text } from '@components/ui/Text';
import { ArtistAvatar } from '@components/ui/ArtistAvatar';
import type { ConcertWithRelations } from '@features/concerts/types';

interface ShareCardProps {
  username?: string;
  concerts: ConcertWithRelations[];
}

export function ShareCard({
  username = 'music_fan',
  concerts,
}: ShareCardProps) {
  const uniqueArtists = Array.from(
    new Map(concerts.map((c) => [c.artist.id, c.artist])).values(),
  ).slice(0, 6);

  const totalConcerts = concerts.length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text variant="overline" color="crimson" weight="bold">
          IVELIVE ARCHIVE
        </Text>
        <Text variant="caption" color="secondary">
          @{username}
        </Text>
      </View>

      <View style={styles.heroSection}>
        <Text variant="display" weight="black" color="primary">
          {uniqueArtists.length}
        </Text>
        <Text variant="title" weight="bold" color="steel">
          Artists Seen Live
        </Text>
        <Text variant="caption" color="muted">
          Across {totalConcerts} total concert experiences
        </Text>
      </View>

      <View style={styles.avatarsRow}>
        {uniqueArtists.map((artist) => (
          <View key={artist.id} style={styles.avatarItem}>
            <ArtistAvatar name={artist.name} imageUrl={artist.image_url} size={48} />
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text variant="overline" color="muted">
          Track every artist you have seen live • iveLive
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.navy,
    borderRadius: radius['2xl'],
    padding: spacing[6],
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: palette.crimson,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  heroSection: {
    marginBottom: spacing[6],
  },
  avatarsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  avatarItem: {
    marginRight: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: palette.surface2,
    paddingTop: spacing[4],
  },
});

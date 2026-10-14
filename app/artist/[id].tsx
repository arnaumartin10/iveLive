import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { palette, radius, spacing } from '@theme/tokens';
import { Text } from '@components/ui/Text';
import { Card } from '@components/ui/Card';
import { ArtistAvatar } from '@components/ui/ArtistAvatar';
import { useUserConcerts } from '@features/concerts/hooks';
import { useAuthStore } from '@features/auth/store';
import { formatConcertDate } from '@lib/utils';

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'demo-user-id';

  const { data: concerts = [] } = useUserConcerts(userId);

  const artistConcerts = concerts.filter((c) => c.artist_id === id);
  const artist = artistConcerts[0]?.artist;

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleConcertPress = (concertId: string) => {
    router.push({
      pathname: '/concert/[id]',
      params: { id: concertId },
    });
  };

  if (!artist) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Text variant="base" color="secondary">
              ← Back
            </Text>
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text variant="headline" weight="bold">
            Artist Not Found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to previous screen"
        >
          <Text variant="base" color="secondary">
            ← Back
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <ArtistAvatar
            name={artist.name}
            imageUrl={artist.image_url}
            size={120}
            showGlow
          />
          <Text variant="display" weight="black" center style={styles.artistName}>
            {artist.name}
          </Text>
          <View style={styles.countBadge}>
            <Text variant="label" weight="bold" color="amber">
              Seen {artistConcerts.length} {artistConcerts.length === 1 ? 'time' : 'times'} live
            </Text>
          </View>
        </View>

        <Text variant="title" weight="bold" style={styles.sectionTitle}>
          Concert History
        </Text>

        {artistConcerts.map((c) => (
          <Card
            key={c.id}
            onPress={() => handleConcertPress(c.id)}
            style={styles.concertCard}
          >
            <View style={styles.concertRow}>
              <View style={styles.concertMeta}>
                <Text variant="base" weight="bold">
                  {c.venue ? c.venue.name : 'Unknown Venue'}
                </Text>
                <Text variant="caption" color="secondary">
                  {c.venue ? `${c.venue.city}, ${c.venue.country}` : ''}
                </Text>
                <Text variant="overline" color="steel">
                  {formatConcertDate(c.concert_date)}
                </Text>
              </View>
              {c.rating && (
                <Text variant="title" color="amber">
                  ★ {c.rating}
                </Text>
              )}
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.surface0,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: palette.surface1,
  },
  backBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    paddingBottom: spacing[16],
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  artistName: {
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  countBadge: {
    backgroundColor: 'rgba(242, 175, 41, 0.15)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
  },
  sectionTitle: {
    marginBottom: spacing[4],
  },
  concertCard: {
    marginBottom: spacing[3],
  },
  concertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  concertMeta: {
    flex: 1,
  },
});

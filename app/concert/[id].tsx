import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { palette, radius, spacing } from '@theme/tokens';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { Card } from '@components/ui/Card';
import { ArtistAvatar } from '@components/ui/ArtistAvatar';
import { Skeleton } from '@components/ui/Skeleton';
import { ErrorState } from '@components/ui/ErrorState';
import { useConcert, useDeleteConcert } from '@features/concerts/hooks';
import { useAuthStore } from '@features/auth/store';
import { formatConcertDate } from '@lib/utils';

export default function ConcertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'demo-user-id';

  const { data: concert, isLoading, isError, refetch } = useConcert(id ?? '');
  const deleteMutation = useDeleteConcert(userId);

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleDelete = async () => {
    if (!id) return;

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      'Delete Concert',
      'Are you sure you want to remove this concert from your live archive?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(id);
              router.back();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Failed to delete';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Text variant="base" color="secondary">
              ← Back
            </Text>
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <Skeleton circle width={120} style={{ alignSelf: 'center', marginBottom: 24 }} />
          <Skeleton width="60%" height={28} style={{ alignSelf: 'center', marginBottom: 12 }} />
          <Skeleton width="40%" height={18} style={{ alignSelf: 'center', marginBottom: 24 }} />
          <Skeleton width="100%" height={120} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !concert) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Text variant="base" color="secondary">
              ← Back
            </Text>
          </Pressable>
        </View>
        <ErrorState
          title="Concert Not Found"
          message="This show might have been deleted or is unavailable."
          onRetry={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  const venueText = concert.venue
    ? `${concert.venue.name} • ${concert.venue.city}, ${concert.venue.country}`
    : 'Unknown Venue';

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
        {/* Hero Artist Avatar */}
        <View style={styles.heroSection}>
          <ArtistAvatar
            name={concert.artist.name}
            imageUrl={concert.artist.image_url}
            size={120}
            showGlow
          />
          <Text variant="display" weight="black" center style={styles.artistName}>
            {concert.artist.name}
          </Text>
          <Text variant="body" color="secondary" center style={styles.venue}>
            {venueText}
          </Text>
          <Text variant="overline" color="steel" center style={styles.date}>
            {formatConcertDate(concert.concert_date)}
          </Text>

          {concert.rating && (
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Text
                  key={star}
                  variant="title"
                  color={star <= concert.rating! ? 'amber' : 'muted'}
                  style={styles.star}
                >
                  ★
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Memories / Notes */}
        {concert.notes && (
          <Card style={styles.notesCard}>
            <Text variant="label" color="secondary" style={styles.notesLabel}>
              Concert Memories
            </Text>
            <Text variant="body" style={styles.notesText}>
              {concert.notes}
            </Text>
          </Card>
        )}

        {/* Genres */}
        {concert.artist.genres.length > 0 && (
          <View style={styles.genresSection}>
            <Text variant="overline" color="muted" style={styles.genresTitle}>
              GENRES
            </Text>
            <View style={styles.genreTags}>
              {concert.artist.genres.map((g) => (
                <View key={g} style={styles.genreTag}>
                  <Text variant="caption" color="secondary">
                    {g}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Delete Concert Button */}
        <View style={styles.deleteSection}>
          <Button
            label="Remove from Archive"
            variant="danger"
            size="md"
            isLoading={deleteMutation.isPending}
            onPress={handleDelete}
          />
        </View>
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
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    paddingBottom: spacing[16],
  },
  loadingContainer: {
    padding: spacing[6],
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  artistName: {
    marginTop: spacing[4],
    marginBottom: spacing[1],
  },
  venue: {
    marginBottom: spacing[1],
  },
  date: {
    marginBottom: spacing[3],
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    fontSize: 20,
  },
  notesCard: {
    marginBottom: spacing[6],
  },
  notesLabel: {
    marginBottom: spacing[2],
  },
  notesText: {
    lineHeight: 22,
  },
  genresSection: {
    marginBottom: spacing[6],
  },
  genresTitle: {
    marginBottom: spacing[2],
  },
  genreTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  genreTag: {
    backgroundColor: palette.surface2,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.border,
  },
  deleteSection: {
    marginTop: spacing[4],
    alignItems: 'center',
  },
});

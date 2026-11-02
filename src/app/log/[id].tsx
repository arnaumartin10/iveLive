import React from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Share2,
  Star,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConcert } from '../../features/concerts/hooks';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../../components/ui/Text';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { radius, spacing } from '../../theme/tokens';

export default function ConcertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: concert, isLoading, error } = useConcert(id || '');

  const handleShare = async () => {
    if (!concert) return;
    const artistName = concert.artist?.name || 'Live concert';
    await Share.share({
      message: `Checked out ${artistName} at ${concert.venue_name} on ${concert.event_date} via IveLive! ivelive://log/${concert.id}`,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.bg }]}
      >
        <View style={styles.navBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={styles.navBtn}
          >
            <ArrowLeft color={colors.ink} size={22} />
          </Pressable>
        </View>
        <View style={styles.loadingBody}>
          <Skeleton height={140} style={styles.skeleton} />
          <Skeleton height={80} style={styles.skeleton} />
          <Skeleton height={120} style={styles.skeleton} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !concert) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.bg }]}
      >
        <View style={styles.navBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={styles.navBtn}
          >
            <ArrowLeft color={colors.ink} size={22} />
          </Pressable>
        </View>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="Concert not found"
            description="The concert you are looking for may have been deleted or does not exist."
            action={
              <Button label="Go back" onPress={() => router.back()} />
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  const artistName = concert.artist?.name || 'Unknown Artist';
  const artistPhoto =
    concert.artist?.image_url_thumb || concert.artist?.image_url_large;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bg }]}
    >
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.navBtn}
        >
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <Text variant="label" weight="bold">
          Concert Log
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share concert"
          onPress={handleShare}
          style={styles.navBtn}
        >
          <Share2 color={colors.ink} size={20} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Artist Header Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${artistName} artist profile`}
          onPress={() => {
            if (concert.artist_id) {
              router.push(`/artist/${concert.artist_id}`);
            }
          }}
        >
          <Card style={styles.artistCard}>
            <Avatar
              imageUrl={artistPhoto}
              name={artistName}
              size="lg"
            />
            <View style={styles.artistCopy}>
              <Text variant="title" weight="bold" numberOfLines={1}>
                {artistName}
              </Text>
              <Text variant="caption" color="accent" weight="bold">
                View artist page →
              </Text>
            </View>
          </Card>
        </Pressable>

        {/* Details Card */}
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <MapPin size={16} color={colors.inkMuted} />
              <Text variant="caption" color="secondary" weight="bold">
                VENUE
              </Text>
            </View>
            <Text variant="body" weight="bold">
              {concert.venue_name}
            </Text>
            {concert.venue_type ? (
              <View style={styles.chipWrap}>
                <Chip>{concert.venue_type.replace('_', ' ')}</Chip>
              </View>
            ) : null}
          </View>

          <View style={[styles.separator, { backgroundColor: colors.line }]} />

          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Calendar size={16} color={colors.inkMuted} />
              <Text variant="caption" color="secondary" weight="bold">
                DATE
              </Text>
            </View>
            <Text variant="body">
              {concert.event_date}
            </Text>
          </View>

          {concert.rating ? (
            <>
              <View
                style={[styles.separator, { backgroundColor: colors.line }]}
              />
              <View style={styles.detailRow}>
                <Text variant="caption" color="secondary" weight="bold">
                  RATING
                </Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={20}
                      color={star <= concert.rating! ? colors.accent : colors.inkMuted}
                      fill={star <= concert.rating! ? colors.accent : 'transparent'}
                    />
                  ))}
                </View>
              </View>
            </>
          ) : null}
        </Card>

        {/* Review Card */}
        {concert.review ? (
          <Card style={styles.reviewCard}>
            <Text variant="caption" color="secondary" weight="bold">
              MEMORIES & NOTES
            </Text>
            <Text variant="body" style={styles.reviewText}>
              {concert.review}
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  loadingBody: {
    padding: 16,
    gap: spacing.md,
  },
  skeleton: {
    borderRadius: radius.md,
    width: '100%',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  artistCopy: {
    flex: 1,
    gap: 4,
  },
  detailsCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  detailRow: {
    gap: 4,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipWrap: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  reviewCard: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  reviewText: {
    lineHeight: 22,
  },
});

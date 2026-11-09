import React, { useState } from 'react';
import Constants from 'expo-constants';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getLogFallback, routes } from '../../navigation/routes';
import { useSafeBack } from '../../navigation/useSafeBack';
import { returnToHref } from '../../navigation/returnTo';
import {
  ArrowLeft,
  Calendar,
  Heart,
  MapPin,
  MessageCircle,
  Pencil,
  Share2,
  Trash2,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useConcert,
  useDeleteConcert,
} from '../../features/concerts/hooks';
import { useAuthStore } from '../../features/auth/store';
import { useLogDraft } from '../../features/log/store';
import {
  useLogsSocialStats,
  useToggleLogLike,
} from '../../features/social/hooks';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../../components/ui/Text';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { StarRating } from '../../components/ui/StarRating';
import { KeepsakeFrames } from '../../components/media/KeepsakeFrames';
import { CommentsSheet } from '../../components/social/CommentsSheet';
import { SetlistImportPanel } from '../../features/setlist/SetlistImportPanel';
import { VenueLabel } from '../../components/paper';
import { format, parseISO } from 'date-fns';
import { hardShadow, radius, spacing } from '../../theme/tokens';

export default function ConcertDetailScreen() {
  const { id, returnTo } = useLocalSearchParams<{
    id: string;
    returnTo?: string;
  }>();
  const currentUserId = useAuthStore((state) => state.user?.id ?? '');
  const { data: concert, isLoading, error } = useConcert(id || '');
  const isMine = concert?.user_id === currentUserId;
  const socialStatsQuery = useLogsSocialStats(id ? [id] : []);
  const toggleLike = useToggleLogLike();
  const deleteConcert = useDeleteConcert(currentUserId);
  const startEdit = useLogDraft((state) => state.startEdit);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const safeBack = useSafeBack(
    returnToHref(returnTo) ??
      getLogFallback(
        concert?.owner_username,
        concert?.user_id === currentUserId,
      ),
  );
  const { colors } = useTheme();
  const socialStats = id ? socialStatsQuery.data?.[id] : undefined;

  function showDeleteConfirmation() {
    if (!concert) return;
    const remove = () =>
      deleteConcert.mutate(concert.id, { onSuccess: safeBack });
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Delete this concert log? This cannot be undone.')) {
        remove();
      }
      return;
    }
    Alert.alert('Delete concert log', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  }

  const handleShare = async () => {
    if (!concert) return;
    const artistName = concert.artist?.name || 'Live concert';
    const scheme = Constants.expoConfig?.scheme ?? 'ivelive';
    await Share.share({
      message: `Checked out ${artistName} at ${concert.venue_name} on ${concert.event_date} via IveLive! ${routes.logDeepLink(concert.id, scheme)}`,
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
            onPress={safeBack}
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
            onPress={safeBack}
            style={styles.navBtn}
          >
            <ArrowLeft color={colors.ink} size={22} />
          </Pressable>
        </View>
        <View style={styles.emptyWrap}>
          <EmptyState
            title="This log is private or no longer exists"
            description="It may have been deleted, or the owner may have changed who can see it."
            action={
              <Button label="Go back" onPress={safeBack} />
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
    <>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.bg }]}
      >
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={safeBack}
          style={styles.navBtn}
        >
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <Text variant="label" weight="bold">
          Concert Log
        </Text>
        <View style={styles.navActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share concert"
            onPress={handleShare}
            style={styles.navBtn}
          >
            <Share2 color={colors.ink} size={20} />
          </Pressable>
          {isMine ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit concert log"
                onPress={() => {
                  startEdit(concert);
                  router.navigate(routes.logWizard());
                }}
                style={styles.navBtn}
              >
                <Pencil color={colors.ink} size={19} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete concert log"
                disabled={deleteConcert.isPending}
                onPress={showDeleteConfirmation}
                style={styles.navBtn}
              >
                <Trash2 color={colors.danger} size={19} />
              </Pressable>
            </>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {concert.owner_username ? (
          <View style={styles.ownerRow}>
            <Avatar
              imageUrl={concert.owner_avatar_url}
              name={concert.owner_display_name ?? concert.owner_username}
              size="sm"
            />
            <View style={styles.ownerCopy}>
              <Text variant="caption" weight="bold">
                @{concert.owner_username}
              </Text>
              <Text variant="caption" color="secondary">
                {formatDate(concert.event_date)}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Artist Header Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${artistName} artist profile`}
          onPress={() => {
            if (concert.artist_id) {
              router.navigate(routes.artist(concert.artist_id));
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
              <Text variant="title" weight="bold" style={styles.artistName}>
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
            {concert.venue_type ? (
              <View style={styles.chipWrap}>
                <VenueLabel
                  venue={concert.venue_type}
                  size="sm"
                  variant="solid"
                />
              </View>
            ) : null}
            {concert.venue_name ? (
              <Text variant="body" weight="bold">
                {concert.venue_name}
              </Text>
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
              {formatDate(concert.event_date)}
            </Text>
          </View>

          {concert.rating !== null ? (
            <>
              <View
                style={[styles.separator, { backgroundColor: colors.line }]}
              />
              <View style={styles.detailRow}>
                <Text variant="caption" color="secondary" weight="bold">
                  RATING
                </Text>
                <View style={styles.starsRow}>
                  <StarRating value={concert.rating} size={20} />
                  <Text variant="mono" weight="bold">
                    {concert.rating.toFixed(1)}
                  </Text>
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
        <KeepsakeFrames
          logId={concert.id}
          mode="view"
          media={concert.media}
        />
        <SetlistImportPanel concert={concert} editable={isMine} />
        <View style={[styles.socialCard, { borderColor: colors.line }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Like this log. ${socialStats?.likeCount ?? 0} likes.`}
            disabled={toggleLike.isPending || socialStatsQuery.isLoading}
            onPress={() =>
              toggleLike.mutate({
                logId: concert.id,
                liked: socialStats?.likedByMe ?? false,
              })
            }
            style={styles.socialAction}
          >
            <Heart
              size={19}
              color={socialStats?.likedByMe ? colors.danger : colors.inkMuted}
              fill={socialStats?.likedByMe ? colors.danger : 'transparent'}
            />
            <Text variant="caption" weight="bold">
              {socialStats?.likeCount ?? 0} likes
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open comments. ${socialStats?.commentCount ?? 0} comments.`}
            onPress={() => setCommentsVisible(true)}
            style={styles.socialAction}
          >
            <MessageCircle size={19} color={colors.inkMuted} />
            <Text variant="caption" weight="bold">
              {socialStats?.commentCount ?? 0} comments
            </Text>
          </Pressable>
        </View>
        {concert.owner_username && !isMine ? (
          <Button
            label={`More from @${concert.owner_username}`}
            variant="secondary"
            onPress={() =>
              router.navigate(routes.diary(concert.owner_username!))
            }
          />
        ) : null}
        {deleteConcert.isError ? (
          <Text variant="caption" color="danger">
            {deleteConcert.error.message}
          </Text>
        ) : null}
      </ScrollView>
      </SafeAreaView>
      <CommentsSheet
        logId={concert.id}
        visible={commentsVisible}
        onDismiss={() => setCommentsVisible(false)}
      />
    </>
  );
}

function formatDate(value: string) {
  try {
    return format(parseISO(value), 'MMMM d, yyyy');
  } catch {
    return value;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  navBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  navActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
  },
  navBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
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
    minWidth: 0,
  },
  artistName: { flexShrink: 1, minWidth: 0 },
  ownerRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  ownerCopy: { flex: 1, minWidth: 0 },
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
    flexWrap: 'wrap',
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
  socialCard: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.md,
    ...hardShadow.sm,
  },
  socialAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    minWidth: 44,
  },
});

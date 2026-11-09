import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  ExternalLink,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Play,
} from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';
import { hardShadow, radius, spacing } from '../../theme/tokens';
import { RAW } from '../../theme/palette';
import { formatRelativeDate } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { Pill } from '../ui/Pill';
import { StarRating } from '../ui/StarRating';
import { Text } from '../ui/Text';
import { Stamp, Tape, Sticker } from '../paper';
import { getSeededRotation } from '../paper/hash';
import { MediaViewer } from '../media/MediaViewer';
import { useAuthStore } from '../../features/auth/store';
import type { FeedItem } from '../../features/social/types';
import { useToggleLike } from '../../features/social/hooks';

type FeedCardProps = {
  item: FeedItem;
  onOpenComments: (item: FeedItem) => void;
  onPressArtist?: (artistId: string) => void;
  onPressLog?: (logId: string) => void;
  youWentToo?: boolean;
  onPressUser?: (username: string) => void;
  onOpenOptions?: (item: FeedItem) => void;
};

export function FeedCard({
  item,
  onOpenComments,
  onPressArtist,
  onPressLog,
  youWentToo = false,
  onPressUser,
  onOpenOptions,
}: FeedCardProps) {
  const { colors } = useTheme();
  const toggleLikeMutation = useToggleLike();
  const [expandedReview, setExpandedReview] = useState(false);
  const [expandedSetlist, setExpandedSetlist] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const viewerId = useAuthStore((state) => state.user?.id);

  // Heart animation
  const heartScale = useSharedValue(1);
  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const handleLikePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    heartScale.value = withSequence(
      withSpring(1.35, { damping: 4, stiffness: 350 }),
      withSpring(1, { damping: 6, stiffness: 220 }),
    );
    toggleLikeMutation.mutate({
      logId: item.id,
      liked: item.liked_by_me,
    });
  };

  const authorName = item.author.display_name || item.author.username || 'User';
  const relativeTime = formatRelativeDate(item.created_at);
  const artistBanner =
    item.artist.banner_image_url || item.artist.group_image_url || null;
  const artistPhoto =
    artistBanner || item.artist.image_url_large || item.artist.image_url_thumb;
  const reviewIsLong = (item.review?.length ?? 0) > 120;
  const firstMedia = item.media[0];

  async function openSetlistSource() {
    const url = item.setlist?.source_url;
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      const message =
        'Could not open the setlist.fm link. Try again in a moment.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(message);
      } else {
        Alert.alert('Link unavailable', message);
      }
    }
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
        },
      ]}
    >
      {/* Header: Author Info */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open @${item.author.username}`}
          onPress={() => onPressUser?.(item.author.username)}
          style={styles.authorRow}
        >
          <Avatar
            imageUrl={item.author.avatar_url}
            name={authorName}
            size="sm"
          />
          <View style={styles.authorInfo}>
            <View style={styles.authorNameRow}>
              <Text variant="body" weight="semibold">
                {authorName}
              </Text>
              <Text variant="caption" style={{ color: colors.inkMuted }}>
                {' '}
                @{item.author.username}
              </Text>
            </View>
            <Text variant="caption" style={{ color: colors.inkMuted }}>
              {relativeTime}
            </Text>
          </View>
        </Pressable>

        {onOpenOptions ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Post options"
            onPress={() => onOpenOptions(item)}
            hitSlop={8}
            style={styles.optionsButton}
          >
            <MoreHorizontal size={18} color={colors.inkMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Keepsake hero takes the lead; never play list videos inline. */}
      {firstMedia ? (
        <View style={styles.mediaHeroWrap}>
          <Pressable
            testID="feed-keepsake-hero"
            accessibilityRole="button"
            accessibilityLabel={`View ${firstMedia.slot.replace('_', ' ')} keepsake`}
            onPress={() => setViewerIndex(0)}
            style={[
              styles.photoContainer,
              styles.mediaHeroPrint,
              {
                aspectRatio: 4 / 3,
                backgroundColor: RAW.wheat,
                borderColor: colors.ink,
                transform: [
                  { rotate: `${getSeededRotation(item.id, 0.8)}deg` },
                ],
              },
            ]}
          >
            {firstMedia.thumb_url || firstMedia.poster_url ? (
              <Image
                source={{
                  uri: firstMedia.poster_url ?? firstMedia.thumb_url,
                }}
                style={styles.photo}
                contentFit="cover"
                cachePolicy="disk"
              />
            ) : null}
            <Tape
              id={`feed-${item.id}`}
              width={68}
              height={16}
              style={styles.heroTape}
            />
            {firstMedia.kind === 'video' ? (
              <View
                style={[styles.videoStamp, { backgroundColor: colors.surface }]}
              >
                <Play size={18} color={colors.ink} fill={colors.ink} />
                <Text
                  variant="mono"
                  style={{ color: colors.ink, fontSize: 10 }}
                >
                  {Math.floor((firstMedia.duration_ms ?? 0) / 1000)}s
                </Text>
              </View>
            ) : null}
            {artistPhoto ? (
              <Sticker
                id={`artist-${item.artist_id}`}
                size={48}
                style={styles.artistSticker}
              >
                <Image
                  source={{ uri: artistPhoto }}
                  style={styles.stickerImage}
                  contentFit="cover"
                  cachePolicy="disk"
                />
              </Sticker>
            ) : null}
          </Pressable>
          {item.media.length > 1 ? (
            <View style={styles.extraMediaStrip}>
              {item.media.slice(1, 3).map((media, index) => (
                <Pressable
                  key={media.slot}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${media.slot.replace('_', ' ')} keepsake`}
                  onPress={() => setViewerIndex(index + 1)}
                  style={[
                    styles.extraMediaThumb,
                    {
                      backgroundColor: colors.bgSunken,
                      borderColor: colors.ink,
                    },
                  ]}
                >
                  {media.thumb_url || media.poster_url ? (
                    <Image
                      source={{ uri: media.poster_url ?? media.thumb_url }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      cachePolicy="disk"
                    />
                  ) : null}
                  {media.kind === 'video' ? (
                    <View style={styles.miniVideoStamp}>
                      <View
                        style={[
                          styles.miniPlay,
                          { backgroundColor: colors.surface },
                        ]}
                      >
                        <Play size={10} color={colors.ink} fill={colors.ink} />
                      </View>
                      <Text
                        variant="mono"
                        style={[
                          styles.miniDuration,
                          {
                            backgroundColor: colors.ink,
                            color: colors.surface,
                          },
                        ]}
                      >
                        {Math.floor((media.duration_ms ?? 0) / 1000)}s
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : artistPhoto ? (
        <Pressable
          testID="feed-artist-photo"
          onPress={() => onPressArtist?.(item.artist_id)}
          accessibilityRole="button"
          accessibilityLabel={`View ${item.artist.name}`}
          style={[
            styles.photoContainer,
            {
              aspectRatio: artistBanner ? 16 / 9 : 1,
              backgroundColor: colors.bgSunken,
            },
          ]}
        >
          <Image
            testID="feed-artist-image"
            source={{ uri: artistPhoto }}
            style={styles.photo}
            contentFit="cover"
            transition={200}
          />
        </Pressable>
      ) : null}

      {/* Concert details & metadata */}
      <View style={styles.content}>
        <Pressable onPress={() => onPressArtist?.(item.artist_id)}>
          <Text variant="title" weight="bold" style={styles.artistName}>
            {item.artist.name}
          </Text>
        </Pressable>

        <View style={styles.metaRow}>
          <Pill venueType={item.venue_type} />
          {item.venue_name ? (
            <Text
              variant="caption"
              weight="medium"
              style={[styles.venueName, { color: colors.inkMuted }]}
            >
              {item.venue_name}
            </Text>
          ) : null}
          {youWentToo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="You went too. Open this log."
              disabled={!onPressLog}
              onPress={() => onPressLog?.(item.id)}
            >
              <Stamp label="YOU WENT TOO" tilt={false} variant="orange" />
            </Pressable>
          ) : null}
        </View>

        {/* Stars */}
        {item.rating != null && item.rating > 0 ? (
          <View style={styles.ratingRow}>
            <StarRating value={item.rating} size={15} />
          </View>
        ) : null}

        {/* Review */}
        {item.review ? (
          <View style={styles.reviewContainer}>
            <Text variant="overline" color="secondary">
              SHOW NOTE
            </Text>
            <Text
              variant="body"
              numberOfLines={expandedReview ? undefined : 3}
              style={[styles.reviewText, { color: colors.ink }]}
            >
              {item.review}
            </Text>
            {reviewIsLong && !expandedReview ? (
              <Pressable
                onPress={() => setExpandedReview(true)}
                hitSlop={4}
                style={styles.moreButton}
              >
                <Text
                  variant="caption"
                  weight="semibold"
                  style={{ color: colors.accent }}
                >
                  more
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {item.setlist?.songs.length ? (
          <View style={[styles.setlist, { borderTopColor: colors.line }]}>
            <View style={styles.setlistHeader}>
              <Text variant="overline" color="secondary">
                SETLIST · {item.setlist.songs.length} SONGS
              </Text>
              {item.setlist.source === 'setlistfm' &&
              item.setlist.source_url ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Open setlist.fm source"
                  onPress={() => void openSetlistSource()}
                  style={styles.sourceLink}
                >
                  <Text variant="mono" color="accent">
                    Setlist via setlist.fm
                  </Text>
                  <ExternalLink size={12} color={colors.accent} />
                </Pressable>
              ) : null}
            </View>
            {(expandedSetlist
              ? item.setlist.songs
              : item.setlist.songs.slice(0, 5)
            ).map((song, index) => (
              <View key={`${index}-${song.title}`} style={styles.setlistSong}>
                <Text
                  variant="mono"
                  color="secondary"
                  style={styles.songNumber}
                >
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <View style={styles.setlistSongCopy}>
                  {song.setName ? (
                    <Text variant="overline" color="secondary">
                      {song.setName}
                    </Text>
                  ) : null}
                  <Text variant="caption" weight="semibold">
                    {song.title}
                  </Text>
                </View>
                {song.medal ? (
                  <Text variant="mono" color="accent">
                    {song.medal.toUpperCase()}
                  </Text>
                ) : null}
              </View>
            ))}
            {!expandedSetlist && item.setlist.songs.length > 5 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show full setlist"
                onPress={() => setExpandedSetlist(true)}
              >
                <Text variant="caption" weight="semibold" color="accent">
                  Show all {item.setlist.songs.length} songs
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Footer: Like & Comment buttons */}
      <View style={[styles.footer, { borderTopColor: colors.line }]}>
        {onPressLog ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open ${item.artist.name} log`}
            onPress={() => onPressLog(item.id)}
            style={styles.actionButton}
          >
            <Text variant="caption" weight="bold" color="accent">
              OPEN LOG
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Like post. ${item.like_count} likes.`}
          onPress={handleLikePress}
          style={styles.actionButton}
        >
          <Animated.View style={animatedHeartStyle}>
            <Heart
              size={20}
              color={item.liked_by_me ? colors.danger : colors.inkMuted}
              fill={item.liked_by_me ? colors.danger : 'transparent'}
            />
          </Animated.View>
          <Text
            variant="label"
            weight={item.liked_by_me ? 'bold' : 'regular'}
            style={{
              color: item.liked_by_me ? colors.danger : colors.inkMuted,
              marginLeft: spacing[1],
            }}
          >
            {item.like_count}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open comments. ${item.comment_count} comments.`}
          onPress={() => onOpenComments(item)}
          style={[styles.actionButton, { marginLeft: spacing[4] }]}
        >
          <MessageCircle size={20} color={colors.inkMuted} />
          <Text
            variant="label"
            style={{
              color: colors.inkMuted,
              marginLeft: spacing[1],
            }}
          >
            {item.comment_count}
          </Text>
        </Pressable>
      </View>

      <MediaViewer
        visible={viewerIndex !== null}
        media={item.media.map((media) => ({ ...media, log_id: item.id }))}
        initialIndex={viewerIndex ?? 0}
        isOwner={viewerId === item.user_id}
        onDismiss={() => setViewerIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorInfo: {
    marginLeft: spacing[2],
    flex: 1,
    minWidth: 0,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  optionsButton: {
    padding: spacing[1],
  },
  photoContainer: {
    width: '100%',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  mediaHeroWrap: { position: 'relative' },
  mediaHeroPrint: {
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    padding: 5,
    ...hardShadow.sm,
  },
  heroTape: { position: 'absolute', top: -5, left: 18, zIndex: 2 },
  artistSticker: { position: 'absolute', right: 12, top: 10 },
  stickerImage: { height: '100%', width: '100%' },
  videoStamp: {
    alignItems: 'center',
    borderWidth: 2,
    bottom: 10,
    flexDirection: 'row',
    gap: 4,
    left: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: 'absolute',
  },
  extraMediaStrip: { flexDirection: 'row', gap: 6, padding: spacing[2] },
  extraMediaThumb: {
    borderWidth: 1.5,
    height: 48,
    overflow: 'hidden',
    position: 'relative',
    width: 48,
  },
  miniPlay: {
    alignItems: 'center',
    borderWidth: 1,
    height: 18,
    justifyContent: 'center',
    left: 14,
    position: 'absolute',
    top: 14,
    width: 18,
  },
  miniVideoStamp: {
    alignItems: 'center',
    bottom: 1,
    flexDirection: 'row',
    gap: 2,
    left: 1,
    position: 'absolute',
  },
  miniDuration: {
    fontSize: 8,
    paddingHorizontal: 2,
  },
  content: {
    padding: spacing[3],
  },
  artistName: {
    marginBottom: spacing[1],
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[2],
    marginVertical: spacing[1],
  },
  venueName: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
    flex: 1,
  },
  ratingRow: {
    marginTop: spacing[1],
  },
  reviewContainer: {
    marginTop: spacing[2],
  },
  setlist: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  setlistHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sourceLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  setlistSong: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  songNumber: { minWidth: 24 },
  setlistSongCopy: { flex: 1, gap: 2 },
  reviewText: {
    lineHeight: 20,
  },
  moreButton: {
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
});

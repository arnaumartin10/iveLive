import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { ChevronDown, Heart, Info, MapPin, MessageCircle, Play } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { Stub } from '../paper';
import { Pill } from '../ui/Pill';
import { StarRating } from '../ui/StarRating';
import { Text } from '../ui/Text';
import type { ConcertWithRelations } from '../../features/concerts/types';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface TimelineCardProps {
  concert: ConcertWithRelations;
  primaryGenreColor: string;
  onPress: () => void;
  onOpenArtist: () => void;
  showSocialActions?: boolean;
  likeCount?: number;
  commentCount?: number;
  likedByMe?: boolean;
  onToggleLike?: () => void;
  onOpenComments?: () => void;
}

function CollapsibleNotes({ review }: { review: string }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      style={[
        styles.notesContainer,
        {
          backgroundColor: colors.bgSunken,
          borderLeftColor: colors.accent,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse notes' : 'Expand notes'}
        onPress={() => setExpanded((prev) => !prev)}
      >
        <Text
          variant="caption"
          color="secondary"
          numberOfLines={expanded ? undefined : 3}
          style={styles.notesText}
        >
          {review}
        </Text>
        <View style={styles.expandRow}>
          <Text
            variant="caption"
            weight="bold"
            style={[styles.readMoreText, { color: colors.accent }]}
          >
            {expanded ? 'Show less' : 'Read more'}
          </Text>
          <ChevronDown
            size={12}
            color={colors.accent}
            style={{
              transform: [{ rotate: expanded ? '180deg' : '0deg' }],
            }}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function TimelineCard({
  concert,
  primaryGenreColor,
  onPress,
  onOpenArtist,
  showSocialActions,
  likeCount,
  commentCount,
  likedByMe,
  onToggleLike,
  onOpenComments,
}: TimelineCardProps) {
  const { colors } = useTheme();
  const compact = useBreakpoint() !== 'wide';
  const artistName = concert.artist?.name || 'Unknown Artist';
  const artistPhoto =
    concert.artist?.image_url_thumb || concert.artist?.image_url_large;

  return (
    <Stub id={`show-${concert.id}`} tilt={false} style={styles.stub}>
      <View style={styles.card}>
      <View style={[styles.cardHeader, compact && styles.compactCardHeader]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Concert by ${artistName} at ${concert.venue_name || 'unknown venue'}`}
          onPress={onPress}
          style={styles.cardHeaderPressable}
        >
          {/* Round artist avatar with ring in primary genre color */}
          <View
            style={[
              styles.avatarRing,
              {
                borderColor: primaryGenreColor,
                shadowColor: primaryGenreColor,
              },
            ]}
          >
            <Avatar
              imageUrl={artistPhoto}
              name={artistName}
              size={compact ? 'sm' : 'md'}
            />
          </View>

          <View style={styles.artistInfo}>
            <Text
              variant="label"
              weight="bold"
              numberOfLines={compact ? undefined : 1}
              style={styles.artistName}
            >
              {artistName}
            </Text>

            {/* Venue Pill & Venue Name */}
            <View style={[styles.venueRow, compact && styles.compactVenueRow]}>
              {concert.venue_type ? (
                <Pill venueType={concert.venue_type} style={styles.pill} />
              ) : null}

              {concert.venue_name ? (
                <View style={styles.venueNameWrap}>
                  <MapPin size={11} color={colors.inkMuted} />
                  <Text
                    variant="caption"
                    color="secondary"
                    numberOfLines={compact ? undefined : 1}
                    style={styles.venueNameText}
                  >
                    {concert.venue_name}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

        </Pressable>
        {!compact ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${artistName} artist card`}
            onPress={onOpenArtist}
            style={styles.artistCardButton}
          >
            <Info size={18} color={colors.inkMuted} />
          </Pressable>
        ) : null}
        {/* StarRating (read-only, compact) */}
        {!compact && concert.rating ? (
          <View style={styles.ratingBadge}>
            <StarRating value={concert.rating} size={12} />
            <Text variant="caption" weight="bold" style={[styles.ratingNumber, { color: colors.ink }]}>
              {concert.rating.toFixed(1)}
            </Text>
          </View>
        ) : null}
        {!compact && concert.media && concert.media.length > 0 ? (
          <View style={styles.mediaStrip}>
            {concert.media.slice(0, 3).map((media) => (
              <Pressable
                key={media.id}
                accessibilityRole="button"
                accessibilityLabel={`View ${media.slot.replace('_', ' ')} keepsake`}
                onPress={onPress}
                style={[
                  styles.mediaThumb,
                  { borderColor: colors.ink, backgroundColor: colors.bgSunken },
                ]}
              >
                {media.thumb_url ? (
                  <Image
                    source={{ uri: media.poster_url ?? media.thumb_url }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    cachePolicy="disk"
                  />
                ) : null}
                {media.kind === 'video' ? (
                  <View style={[styles.miniVideoStamp, { backgroundColor: colors.surface }]}>
                    <Play size={10} color={colors.ink} fill={colors.ink} />
                    <Text variant="mono" style={{ color: colors.ink, fontSize: 8 }}>
                      {Math.floor((media.duration_ms ?? 0) / 1000)}s
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {compact ? (
        <View style={styles.compactDetailsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${artistName} artist card`}
            onPress={onOpenArtist}
            style={[styles.artistCardButton, styles.compactArtistCardButton]}
          >
            <Info size={18} color={colors.inkMuted} />
          </Pressable>
          {concert.rating ? (
            <View style={styles.compactRatingRow}>
              <StarRating value={concert.rating} size={12} />
              <Text
                variant="caption"
                weight="bold"
                style={[styles.ratingNumber, { color: colors.ink }]}
              >
                {concert.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {compact && concert.media && concert.media.length > 0 ? (
        <View style={styles.compactMediaStrip}>
          {concert.media.slice(0, 3).map((media) => (
            <Pressable
              key={media.id}
              accessibilityRole="button"
              accessibilityLabel={`View ${media.slot.replace('_', ' ')} keepsake`}
              onPress={onPress}
              style={[
                styles.mediaThumb,
                { borderColor: colors.ink, backgroundColor: colors.bgSunken },
              ]}
            >
              {media.thumb_url ? (
                <Image
                  source={{ uri: media.poster_url ?? media.thumb_url }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  cachePolicy="disk"
                />
              ) : null}
              {media.kind === 'video' ? (
                <View
                  style={[
                    styles.miniVideoStamp,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Play size={10} color={colors.ink} fill={colors.ink} />
                  <Text
                    variant="mono"
                    style={{ color: colors.ink, fontSize: 8 }}
                  >
                    {Math.floor((media.duration_ms ?? 0) / 1000)}s
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Collapsible notes block */}
      {concert.review ? (
        <CollapsibleNotes review={concert.review} />
      ) : null}

      {/* Social actions (likes & comments) */}
      {showSocialActions ? (
        <View style={[styles.socialRow, { borderTopColor: colors.line }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Like concert. ${likeCount ?? 0} likes.`}
            onPress={onToggleLike}
            style={styles.socialAction}
          >
            <Heart
              size={16}
              color={likedByMe ? colors.danger : colors.inkMuted}
              fill={likedByMe ? colors.danger : 'transparent'}
            />
            <Text
              variant="caption"
              weight={likedByMe ? 'bold' : 'regular'}
              style={{
                color: likedByMe ? colors.danger : colors.inkMuted,
                marginLeft: 4,
              }}
            >
              {likeCount ?? 0}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Comments. ${commentCount ?? 0} comments.`}
            onPress={onOpenComments}
            style={[styles.socialAction, { marginLeft: 16 }]}
          >
            <MessageCircle size={16} color={colors.inkMuted} />
            <Text
              variant="caption"
              style={{
                color: colors.inkMuted,
                marginLeft: 4,
              }}
            >
              {commentCount ?? 0}
            </Text>
          </Pressable>
        </View>
      ) : null}
      </View>
    </Stub>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
    minWidth: 0,
  },
  stub: { flex: 1 },
  cardHeaderPressable: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
    flexShrink: 1,
  },
  compactCardHeader: { alignItems: 'flex-start' },
  artistCardButton: { alignItems: 'center', height: 38, justifyContent: 'center', width: 32 },
  compactArtistCardButton: { height: 44, width: 44 },
  compactDetailsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarRing: {
    borderRadius: 26,
    borderWidth: 2.5,
    padding: 2,
  },
  artistInfo: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  artistName: {
    fontSize: 16,
    lineHeight: 20,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  compactVenueRow: { alignItems: 'flex-start', flexDirection: 'column' },
  pill: {
    minHeight: 22,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  venueNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
  },
  venueNameText: {
    flexShrink: 1,
    fontSize: 12,
  },
  ratingBadge: {
    alignItems: 'flex-end',
    gap: 2,
  },
  compactRatingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minHeight: 24,
  },
  ratingNumber: {
    fontSize: 11,
  },
  notesContainer: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    marginTop: 2,
  },
  mediaStrip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    flexShrink: 0,
  },
  compactMediaStrip: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mediaThumb: {
    height: 26,
    overflow: 'hidden',
    position: 'relative',
    width: 26,
    borderWidth: 1.5,
  },
  miniPlay: {
    alignItems: 'center',
    borderWidth: 1,
    height: 14,
    justifyContent: 'center',
    left: 6,
    position: 'absolute',
    top: 6,
    width: 14,
  },
  miniVideoStamp: {
    alignItems: 'center',
    bottom: 1,
    flexDirection: 'row',
    gap: 2,
    left: 1,
    position: 'absolute',
  },
  notesText: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  readMoreText: {
    fontSize: 11,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xs,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  socialAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
});

import { format, parseISO } from 'date-fns';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Camera, Music2, Play, Star } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '../../components/ui/Avatar';
import { Sheet } from '../../components/ui/Sheet';
import { Stamp, VenueLabel } from '../../components/paper';
import { Text } from '../../components/ui/Text';
import { StarRating } from '../../components/ui/StarRating';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { VENUE_TYPES, type VenueType } from '../venues/venueTypes';
import type { ArtistFriend } from './types';

type Props = {
  artistName: string;
  friends: ArtistFriend[];
  ownEventDates: ReadonlySet<string>;
  visible: boolean;
  onDismiss: () => void;
  onOpenLog: (logId: string) => void;
};

function readableDate(value: string) {
  try {
    return format(parseISO(value), 'MMM d, yyyy');
  } catch {
    return value;
  }
}

export function FriendsWhoSawArtistSheet({
  artistName,
  friends,
  ownEventDates,
  visible,
  onDismiss,
  onOpenLog,
}: Props) {
  const { colors } = useTheme();
  return (
    <Sheet
      visible={visible}
      title={`Friends who've seen ${artistName}`}
      snapPoints={['65%', '94%']}
      onDismiss={onDismiss}
      useScrollableContent
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {friends.length === 0 ? (
          <Text variant="body" color="secondary">
            No friends have shared a visible show by this artist yet.
          </Text>
        ) : (
          friends.map((friend) => (
            <View
              key={friend.id}
              style={[styles.friendSection, { borderBottomColor: colors.line }]}
            >
              <View style={styles.friendHeader}>
                <Avatar
                  imageUrl={friend.avatar_url}
                  name={friend.display_name ?? friend.username}
                  size="md"
                />
                <View style={styles.friendCopy}>
                  <Text variant="label" weight="bold" numberOfLines={1}>
                    @{friend.username}
                  </Text>
                  <Text variant="caption" color="secondary">
                    seen {friend.logs_count}{' '}
                    {friend.logs_count === 1 ? 'time' : 'times'}
                  </Text>
                </View>
              </View>

              {(friend.logs ?? []).map((log) => (
                <Pressable
                  key={log.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${artistName} log from ${readableDate(log.event_date)}`}
                  onPress={() => onOpenLog(log.id)}
                  style={[
                    styles.logRow,
                    {
                      backgroundColor: colors.surfaceRaised,
                      borderColor: colors.line,
                    },
                  ]}
                >
                  <View style={styles.logTop}>
                    <Text variant="caption" weight="bold" style={styles.date}>
                      {readableDate(log.event_date)}
                    </Text>
                    <View style={styles.icons}>
                      {log.media_count ? (
                        <Camera size={15} color={colors.inkMuted} />
                      ) : null}
                      {log.has_setlist ? (
                        <Music2 size={15} color={colors.inkMuted} />
                      ) : null}
                      {log.top_song ? (
                        <Play size={14} color={colors.inkMuted} />
                      ) : null}
                    </View>
                    {ownEventDates.has(log.event_date) ? (
                      <Stamp
                        label="YOU WENT TOO"
                        tilt={false}
                        variant="orange"
                      />
                    ) : null}
                  </View>
                  <View style={styles.venueRow}>
                    {isVenueType(log.venue_type) ? (
                      <VenueLabel
                        venue={log.venue_type}
                        size="xs"
                      />
                    ) : (
                      <Text variant="caption" color="secondary">
                        {log.venue_type.replaceAll('_', ' ')}
                      </Text>
                    )}
                    {log.venue_name ? (
                      <Text
                        variant="caption"
                        color="secondary"
                        style={styles.venueName}
                      >
                        {log.venue_name}
                      </Text>
                    ) : null}
                  </View>
                  {log.rating !== null ? (
                    <View style={styles.rating}>
                      <StarRating value={log.rating} size={13} />
                      <View style={styles.printedRating}>
                        <Star size={12} color={colors.accent} fill={colors.accent} />
                        <Text variant="mono" weight="bold">
                          {log.rating.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {log.review ? (
                    <Text
                      variant="caption"
                      color="secondary"
                      numberOfLines={2}
                    >
                      {log.review}
                    </Text>
                  ) : null}
                  {log.top_song ? (
                    <Text variant="caption" color="accent" numberOfLines={1}>
                      Top song · {log.top_song}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ))
        )}
      </BottomSheetScrollView>
    </Sheet>
  );
}

function isVenueType(value: string): value is VenueType {
  return value in VENUE_TYPES;
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  friendSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  friendHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  friendCopy: { flex: 1, minWidth: 0 },
  logRow: {
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    marginLeft: spacing.xl,
    padding: spacing.sm,
  },
  logTop: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  date: { flexShrink: 0 },
  icons: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  venueRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  venueName: { flexShrink: 1, minWidth: 0 },
  rating: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  printedRating: { alignItems: 'center', flexDirection: 'row', gap: 3 },
});

import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import {
  CalendarDays,
  ExternalLink,
  Flag,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import type { WishlistItem } from '../../features/profile/types';

export function WishlistCard({
  item,
  isOwner,
  onGoing,
  onWent,
  onEdit,
  onDelete,
}: {
  item: WishlistItem;
  isOwner: boolean;
  onGoing: () => void;
  onWent: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const place = [item.venue_name, item.city].filter(Boolean).join(' · ');
  const isPastWanted =
    item.status === 'wanted' &&
    !!item.target_date &&
    item.target_date < new Date().toISOString().slice(0, 10);
  const statusColor =
    item.status === 'going'
      ? colors.positive
      : item.status === 'seen'
        ? colors.inkMuted
        : colors.accent;
  const dateLabel = item.target_date
    ? new Date(`${item.target_date}T12:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date TBD';

  const content = (
    <Card style={styles.card}>
      <View style={styles.row}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            contentFit="cover"
            style={styles.avatar}
          />
        ) : (
          <Avatar name={item.artist_name} size="md" />
        )}
        <View style={styles.copy}>
          <Text variant="label" weight="bold" numberOfLines={1}>
            {item.artist_name}
          </Text>
          {item.event_name ? (
            <Text variant="caption" weight="semibold" numberOfLines={1}>
              {item.event_name}
            </Text>
          ) : null}
          <View style={styles.metaLine}>
            <CalendarDays size={13} color={colors.inkMuted} />
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {dateLabel}
              {item.date_flexible ? ' · Flexible' : ''}
            </Text>
          </View>
          {place ? (
            <View style={styles.metaLine}>
              <MapPin size={13} color={colors.inkMuted} />
              <Text variant="caption" color="secondary" numberOfLines={1}>
                {place}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.badges}>
          <View
            style={[
              styles.priority,
              {
                backgroundColor:
                  item.priority === 1
                    ? `${colors.warning}24`
                    : colors.surfaceRaised,
              },
            ]}
          >
            <Flag
              size={13}
              color={
                item.priority === 1 ? colors.warning : colors.inkMuted
              }
            />
            <Text
              variant="caption"
              weight="bold"
              style={{
                color:
                  item.priority === 1 ? colors.warning : colors.inkMuted,
              }}
            >
              {item.priority === 1
                ? 'Must-see'
                : item.priority === 2
                  ? 'Want'
                  : 'Maybe'}
            </Text>
          </View>
          <View
            style={[styles.status, { backgroundColor: `${statusColor}20` }]}
          >
            <Text
              variant="caption"
              weight="semibold"
              style={{ color: statusColor }}
            >
              {item.status}
            </Text>
          </View>
        </View>
      </View>
      {item.note ? (
        <Text variant="caption" color="secondary" style={styles.note}>
          {item.note}
        </Text>
      ) : null}
      {item.ticket_url ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open ticket link for ${item.artist_name}`}
          onPress={() => void Linking.openURL(item.ticket_url!)}
          style={styles.ticket}
        >
          <ExternalLink size={15} color={colors.accent} />
          <Text
            variant="caption"
            weight="semibold"
            style={{ color: colors.accent }}
          >
            Tickets
          </Text>
        </Pressable>
      ) : null}
      {isOwner ? (
        <View style={styles.actions}>
          <Button label="I went!" size="sm" onPress={onWent} />
          {item.status === 'wanted' ? (
            <Button
              label="Going"
              size="sm"
              variant="secondary"
              onPress={onGoing}
            />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.artist_name} wishlist item`}
            onPress={onEdit}
            hitSlop={8}
            style={styles.iconAction}
          >
            <Pencil size={16} color={colors.inkMuted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.artist_name} wishlist item`}
            onPress={onDelete}
            hitSlop={8}
            style={styles.iconAction}
          >
            <Trash2 size={16} color={colors.danger} />
          </Pressable>
        </View>
      ) : null}
      {isOwner && isPastWanted ? (
        <Pressable
          accessibilityRole="button"
          onPress={onWent}
          style={[styles.nudge, { backgroundColor: `${colors.warning}15` }]}
        >
          <Text variant="caption" style={{ color: colors.warning }}>
            Did it happen? Mark it seen.
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );

  if (!isOwner) return content;
  return (
    <Swipeable
      overshootRight={false}
      renderLeftActions={() => (
        <SwipeAction label="Going" color={colors.positive} onPress={onGoing} />
      )}
      renderRightActions={() => (
        <SwipeAction label="Delete" color={colors.danger} onPress={onDelete} />
      )}
    >
      {content}
    </Swipeable>
  );
}

function SwipeAction({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.swipeAction,
        { backgroundColor: colors.surface, borderColor: color },
      ]}
    >
      <Text variant="caption" weight="bold" style={{ color: colors.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md },
  row: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  avatar: { borderRadius: 24, height: 48, width: 48 },
  copy: { flex: 1, gap: 4, minWidth: 0 },
  metaLine: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  badges: { alignItems: 'flex-end', gap: 5 },
  priority: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  status: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  note: { lineHeight: 18 },
  ticket: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 5,
    minHeight: 36,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  iconAction: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  nudge: { borderRadius: radius.sm, padding: spacing.sm },
  swipeAction: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderWidth: 1.5,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});

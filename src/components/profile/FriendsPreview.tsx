import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { routes } from '../../navigation/routes';
import { ArrowRight, Users } from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import type { ProfileFriend } from '../../features/profile/types';

export function FriendsPreview({
  friends,
  followers,
  following,
  isOwner,
}: {
  friends: ProfileFriend[];
  followers: number;
  following: number;
  isOwner: boolean;
}) {
  const { colors } = useTheme();

  function openFriends() {
    router.setParams({ tab: 'friends' });
  }

  if (isOwner && following === 0 && followers === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Find friends"
        description="Follow people to share live music discoveries."
        action={
          <Pressable
            accessibilityRole="button"
            onPress={openFriends}
            style={[
              styles.findButton,
              { backgroundColor: colors.surface, borderColor: colors.accent },
            ]}
          >
            <Text variant="label" weight="bold" style={{ color: colors.ink }}>
              Find friends
            </Text>
          </Pressable>
        }
      />
    );
  }

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="See friends list"
        onPress={openFriends}
        style={styles.heading}
      >
        <View style={styles.flexOne}>
          <Text variant="title" weight="bold">
            Friends
          </Text>
          <Text variant="caption" color="secondary">
            {followers} followers · {following} following
          </Text>
        </View>
        <ArrowRight size={18} color={colors.inkMuted} />
      </Pressable>
      {friends.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {friends.slice(0, 8).map((friend) => (
            <Pressable
              key={friend.id}
              accessibilityRole="button"
              accessibilityLabel={`Open @${friend.username}`}
              onPress={() =>
                router.navigate(routes.user(friend.username))
              }
              style={styles.friend}
            >
              <Avatar
                imageUrl={friend.avatar_url}
                name={friend.display_name ?? friend.username}
                size="md"
              />
              <Text
                variant="caption"
                numberOfLines={1}
                style={styles.friendName}
              >
                @{friend.username}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Text variant="caption" color="secondary">
          No friends to preview yet.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  heading: { alignItems: 'center', flexDirection: 'row', minHeight: 52 },
  flexOne: { flex: 1 },
  row: { gap: spacing.md, paddingVertical: spacing.xs },
  friend: { alignItems: 'center', gap: spacing.xs, width: 64 },
  friendName: { maxWidth: 64, textAlign: 'center' },
  findButton: {
    alignItems: 'center',
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
});

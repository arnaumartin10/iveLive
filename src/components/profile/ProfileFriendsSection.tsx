import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import {
  useAcceptFollowRequest,
  useDeclineFollowRequest,
  useFeed,
  useFollowers,
  useFollow,
  useFollowRequests,
  useFollowing,
  useProfileSearch,
  useUnfollow,
} from '../../features/social/hooks';
import type {
  FeedItem,
  FollowListUser,
  ProfileSearchResult,
} from '../../features/social/types';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Text } from '../ui/Text';
import { CommentsSheet, FeedCard } from '../social';

type Props = {
  userId: string;
  username: string;
  isOwner: boolean;
  initialSection?: 'following' | 'followers';
  headerAddon?: ReactNode;
};

type FriendsSection =
  'following' | 'followers' | 'requests' | 'search' | 'activity' | 'mutuals';

const OWN_TABS: { label: string; value: FriendsSection }[] = [
  { label: 'Following', value: 'following' },
  { label: 'Followers', value: 'followers' },
  { label: 'Requests', value: 'requests' },
  { label: 'Find people', value: 'search' },
  { label: 'Activity', value: 'activity' },
];

export function ProfileFriendsSection({
  userId,
  username,
  isOwner,
  initialSection = 'following',
  headerAddon,
}: Props) {
  const { colors } = useTheme();
  const [section, setSection] = useState<FriendsSection>(initialSection);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [commentsLogId, setCommentsLogId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const followingQuery = useFollowing(
    userId,
    section === 'following' || section === 'mutuals',
  );
  const followersQuery = useFollowers(
    userId,
    section === 'followers' || section === 'mutuals',
  );
  const requestsQuery = useFollowRequests(isOwner && section === 'requests');
  const feedQuery = useFeed(isOwner && section === 'activity');
  const searchQuery = useProfileSearch(
    isOwner && section === 'search' ? debouncedSearch : '',
  );
  const follow = useFollow();
  const unfollow = useUnfollow();
  const acceptRequest = useAcceptFollowRequest();
  const declineRequest = useDeclineFollowRequest();
  const pendingCount = requestsQuery.data?.length ?? 0;
  const tabs: { label: string; value: FriendsSection }[] = useMemo(
    () =>
      isOwner
        ? OWN_TABS.map((tab) =>
            tab.value === 'requests'
              ? {
                  ...tab,
                  label: pendingCount
                    ? `Requests · ${pendingCount}`
                    : 'Requests',
                }
              : tab,
          )
        : [
            { label: 'Following', value: 'following' },
            { label: 'Followers', value: 'followers' },
            { label: 'Mutuals', value: 'mutuals' },
          ],
    [isOwner, pendingCount],
  );
  const visibleUsers = useMemo(() => {
    if (section === 'followers') return followersQuery.data ?? [];
    if (section !== 'mutuals') return followingQuery.data ?? [];
    const mutualIds = new Set(
      (followersQuery.data ?? []).map((person) => person.id),
    );
    return (followingQuery.data ?? []).filter((person) =>
      mutualIds.has(person.id),
    );
  }, [followersQuery.data, followingQuery.data, section]);
  const feedItems = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page) ?? [],
    [feedQuery.data],
  );

  function openProfile(targetUsername: string) {
    router.push({
      pathname: '/user/[username]',
      params: { username: targetUsername },
    });
  }

  function renderUser({
    item,
  }: {
    item: FollowListUser | ProfileSearchResult;
  }) {
    const isFollowing = item.is_following;
    const busy = follow.isPending || unfollow.isPending;
    return (
      <View style={[styles.personRow, { borderBottomColor: colors.line }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open @${item.username}`}
          onPress={() => openProfile(item.username)}
          style={styles.personInfo}
        >
          <Avatar
            imageUrl={item.avatar_url}
            name={item.display_name ?? item.username}
            size="md"
          />
          <View style={styles.personCopy}>
            <Text variant="label" weight="bold" numberOfLines={1}>
              {item.display_name ?? item.username}
            </Text>
            <Text variant="caption" color="secondary" numberOfLines={1}>
              @{item.username}
              {'follower_count' in item
                ? ` · ${item.follower_count} followers`
                : ''}
            </Text>
          </View>
        </Pressable>
        {isOwner ? (
          <Button
            label={
              isFollowing
                ? 'Following'
                : item.follow_status === 'pending'
                  ? 'Requested'
                  : 'Follow'
            }
            size="sm"
            variant={
              isFollowing || item.follow_status === 'pending'
                ? 'secondary'
                : 'primary'
            }
            disabled={busy}
            onPress={() =>
              isFollowing || item.follow_status === 'pending'
                ? unfollow.mutate({ followeeId: item.id })
                : follow.mutate({ followeeId: item.id })
            }
          />
        ) : null}
      </View>
    );
  }

  const listLoading =
    ((section === 'following' || section === 'mutuals') &&
      followingQuery.isLoading) ||
    ((section === 'followers' || section === 'mutuals') &&
      followersQuery.isLoading);
  const listError =
    section === 'mutuals'
      ? (followingQuery.error ?? followersQuery.error)
      : section === 'following'
        ? followingQuery.error
        : followersQuery.error;
  const userRows: (FollowListUser | ProfileSearchResult)[] =
    section === 'search' ? (searchQuery.data ?? []) : visibleUsers;
  const rows =
    section === 'requests'
      ? (requestsQuery.data ?? [])
      : section === 'activity'
        ? feedItems
        : userRows;
  const emptyState = (() => {
    if (section === 'requests') {
      if (requestsQuery.isLoading) {
        return (
          <Text variant="caption" color="secondary">
            Loading requests…
          </Text>
        );
      }
      if (requestsQuery.error) {
        return (
          <Text variant="caption" color="danger">
            {requestsQuery.error.message}
          </Text>
        );
      }
      return (
        <EmptyState
          title="No follow requests"
          description="New requests will be kept here."
        />
      );
    }
    if (section === 'activity') {
      if (feedQuery.isLoading) {
        return (
          <Text variant="caption" color="secondary">
            Loading activity…
          </Text>
        );
      }
      if (feedQuery.error) {
        return (
          <Text variant="caption" color="danger">
            {feedQuery.error.message}
          </Text>
        );
      }
      return (
        <EmptyState
          title="No friend activity yet"
          description="Follow a few music people and their shows will appear here."
        />
      );
    }
    if (section === 'search') {
      if (searchQuery.isLoading) {
        return (
          <Text variant="caption" color="secondary">
            Searching…
          </Text>
        );
      }
      if (searchQuery.error) {
        return (
          <Text variant="caption" color="danger">
            {searchQuery.error.message}
          </Text>
        );
      }
      return debouncedSearch ? (
        <EmptyState
          title="No people found"
          description="Try another name or username."
        />
      ) : (
        <EmptyState
          title="Find your people"
          description="Search by username or display name."
        />
      );
    }
    if (listLoading) {
      return (
        <Text variant="caption" color="secondary">
          Loading people…
        </Text>
      );
    }
    if (listError) {
      return (
        <Text variant="caption" color="danger">
          {listError.message}
        </Text>
      );
    }
    return (
      <EmptyState
        title={section === 'followers' ? 'No followers yet' : 'No one here yet'}
        description={
          isOwner
            ? 'Find people who love live music too.'
            : `@${username} has no ${section} to show.`
        }
      />
    );
  })();

  return (
    <>
      <ScrollView
        style={styles.results}
        contentContainerStyle={styles.resultsContent}
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } =
            event.nativeEvent;
          const isNearBottom =
            contentOffset.y + layoutMeasurement.height >=
            contentSize.height - 300;
          if (
            section === 'activity' &&
            isNearBottom &&
            feedQuery.hasNextPage &&
            !feedQuery.isFetchingNextPage
          ) {
            void feedQuery.fetchNextPage();
          }
        }}
      >
        {headerAddon}
        <View style={styles.listHeader}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabStrip}
          >
            {tabs.map((tab) => (
              <Pressable
                key={tab.value}
                accessibilityRole="tab"
                accessibilityState={{ selected: section === tab.value }}
                onPress={() => setSection(tab.value)}
                style={[
                  styles.tab,
                  {
                    backgroundColor:
                      section === tab.value ? colors.accent : colors.surface,
                    borderColor:
                      section === tab.value ? colors.ink : colors.line,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  weight="bold"
                  style={{
                    color:
                      section === tab.value ? colors.accentInk : colors.ink,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {section === 'search' ? (
            <TextInput
              accessibilityLabel="Find people"
              placeholder="Search by name or @username"
              placeholderTextColor={colors.inkMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              style={[
                styles.search,
                {
                  color: colors.ink,
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                },
              ]}
            />
          ) : null}
        </View>
        {rows.length === 0 ? (
          <View style={styles.emptyState}>{emptyState}</View>
        ) : (
          <View style={styles.rowList}>
            {section === 'requests'
              ? (requestsQuery.data ?? []).map((request) => (
                  <View
                    key={request.id}
                    style={[
                      styles.personRow,
                      { borderBottomColor: colors.line },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open @${request.username}`}
                      onPress={() => openProfile(request.username)}
                      style={styles.personInfo}
                    >
                      <Avatar
                        imageUrl={request.avatar_url}
                        name={request.display_name ?? request.username}
                        size="md"
                      />
                      <View style={styles.personCopy}>
                        <Text variant="label" weight="bold">
                          {request.display_name ?? request.username}
                        </Text>
                        <Text variant="caption" color="secondary">
                          @{request.username}
                        </Text>
                      </View>
                    </Pressable>
                    <View style={styles.requestActions}>
                      <Button
                        label="Accept"
                        size="sm"
                        onPress={() => acceptRequest.mutate(request.id)}
                      />
                      <Button
                        label="Decline"
                        size="sm"
                        variant="secondary"
                        onPress={() => declineRequest.mutate(request.id)}
                      />
                    </View>
                  </View>
                ))
              : section === 'activity'
                ? feedItems.map((item) => (
                    <FeedCard
                      key={item.id}
                      item={item}
                      onOpenComments={(feedItem: FeedItem) =>
                        setCommentsLogId(feedItem.id)
                      }
                      onPressUser={openProfile}
                      onPressArtist={(artistId) =>
                        router.push({
                          pathname: '/artist/[id]',
                          params: { id: artistId },
                        })
                      }
                    />
                  ))
                : userRows.map((item) => (
                    <View key={item.id}>{renderUser({ item })}</View>
                  ))}
            {section === 'activity' && feedQuery.isFetchingNextPage ? (
              <Text variant="caption" color="secondary">
                Loading more activity…
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      <CommentsSheet
        logId={commentsLogId ?? ''}
        visible={!!commentsLogId}
        onDismiss={() => setCommentsLogId(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  results: { flex: 1, minHeight: 0 },
  resultsContent: { gap: spacing.md, paddingBottom: spacing.xl },
  listHeader: { gap: spacing.md, paddingHorizontal: spacing.md },
  rowList: { gap: spacing.xs, paddingHorizontal: spacing.md },
  emptyState: { paddingHorizontal: spacing.md },
  tabStrip: { gap: spacing.xs, paddingBottom: spacing.xs },
  tab: {
    borderWidth: 1,
    borderRadius: radius.pill,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  personRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 72,
    paddingVertical: spacing.xs,
  },
  personInfo: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  personCopy: { flex: 1, gap: 2 },
  requestActions: { flexDirection: 'row', gap: spacing.xs },
  search: {
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
});

import { useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams, useScrollToTop } from 'expo-router';
import { routes } from '../../navigation/routes';
import { useSafeBack } from '../../navigation/useSafeBack';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  LockKeyhole,
  Plus,
  Settings,
  Star,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { ProfileHeader } from './ProfileHeader';
import { ProfileBannerSheet } from './ProfileBannerSheet';
import { isMacroGenre } from '../brand/mascotColors';
import { PickRow } from './PickRow';
import { PicksEditorSheet } from './PicksEditorSheet';
import { WishlistCard } from './WishlistCard';
import { WishlistEditorSheet } from './WishlistEditorSheet';
import { FriendsPreview } from './FriendsPreview';
import { ProfileFriendsSection } from './ProfileFriendsSection';
import { TimelineScreen } from '../timeline/TimelineScreen';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Text } from '../ui/Text';
import { GenreLabel } from '../paper/GenreLabel';
import { useArtistCard } from '../../features/artists/ArtistCardProvider';
import { fetchArtistById } from '../../features/artists/api';
import { useAuthStore } from '../../features/auth/store';
import { useMe, useUpdateProfile } from '../../features/auth/hooks';
import { useLogDraft } from '../../features/log/store';
import { MACRO_GENRES } from '../../features/genres/macroGenres';
import {
  useProfileOverview,
  useAddWishlistItem,
  useDeleteWishlistItem,
  useFullWishlist,
  useSetPicks,
  useUpdateWishlistItem,
} from '../../features/profile/hooks';
import { arePicksStale } from '../../features/profile/logic';
import { shareProfileCard } from '../../features/profile/shareProfileCard';
import {
  useFollow,
  useFollowStatus,
  useUnreadCount,
  useUnfollow,
} from '../../features/social/hooks';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import type {
  ProfilePick,
  WishlistDraft,
  WishlistItem,
} from '../../features/profile/types';

function relativeUpdated(updatedAt: string | null) {
  if (!updatedAt) return 'Not set yet';
  const days = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(updatedAt)) / 86_400_000),
  );
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  if (days < 7) return `Updated ${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `Updated ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
}

function latestPickUpdate(picks: ProfilePick[]) {
  return (
    picks
      .map((pick) => pick.updated_at)
      .sort()
      .at(-1) ?? null
  );
}

function SectionTitle({
  title,
  action,
  actionLabel,
}: {
  title: string;
  action?: () => void;
  actionLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionTitleRow}>
      <Text variant="label" weight="bold" style={styles.flexOne}>
        {title}
      </Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel ?? title}
          onPress={action}
          hitSlop={8}
          style={styles.sectionAction}
        >
          <Text
            variant="caption"
            weight="semibold"
            style={{ color: colors.accent }}
          >
            {actionLabel ?? 'See all'}
          </Text>
          <ArrowRight size={15} color={colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View style={styles.skeletonPage}>
      <Skeleton height={300} />
      {[0, 1, 2, 3].map((key) => (
        <View key={key} style={styles.skeletonSection}>
          <Skeleton width="42%" height={18} />
          <Skeleton height={108} />
        </View>
      ))}
    </View>
  );
}

const PROFILE_SECTIONS = [
  { label: 'Profile', value: 'profile' },
  { label: 'Timeline', value: 'timeline' },
  { label: 'Wishlist', value: 'wishlist' },
  { label: 'Friends', value: 'friends' },
];

export function ProfileScreen({
  username: usernameProp,
}: { username?: string } = {}) {
  const safeBack = useSafeBack(routes.fallback.user());
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const {
    username: rawUsername,
    tab: rawTab,
    friendsTab: rawFriendsTab,
  } = useLocalSearchParams<{
    username: string;
    tab?: string;
    friendsTab?: string;
  }>();
  const routeUsername = Array.isArray(rawUsername)
    ? (rawUsername[0] ?? '')
    : (rawUsername ?? '');
  const requestedUsername = usernameProp ?? routeUsername;
  const myProfileQuery = useMe();
  const resolvedUsername =
    requestedUsername === 'me' || !requestedUsername
      ? (myProfileQuery.data?.username ?? '')
      : requestedUsername;
  const activeTab =
    rawTab === 'diary'
      ? 'timeline'
      : PROFILE_SECTIONS.some((section) => section.value === rawTab)
        ? rawTab!
        : 'profile';
  const friendsTab =
    rawFriendsTab === 'followers' || rawFriendsTab === 'following'
      ? rawFriendsTab
      : 'following';
  const { colors } = useTheme();
  const unreadQuery = useUnreadCount();
  const signedInUserId = useAuthStore((state) => state.user?.id ?? '');
  const { openArtistCard } = useArtistCard();
  const overviewQuery = useProfileOverview(resolvedUsername);
  const followStatusQuery = useFollowStatus(
    overviewQuery.data?.profile.id === signedInUserId
      ? undefined
      : overviewQuery.data?.profile.id,
  );
  const follow = useFollow();
  const unfollow = useUnfollow();
  const setPicks = useSetPicks(resolvedUsername);
  const addWishlist = useAddWishlistItem(resolvedUsername);
  const updateWishlist = useUpdateWishlistItem(resolvedUsername);
  const deleteWishlist = useDeleteWishlistItem(resolvedUsername);
  const resetLogDraft = useLogDraft((state) => state.reset);
  const setArtist = useLogDraft((state) => state.setArtist);
  const setEventDate = useLogDraft((state) => state.setEventDate);
  const setVenueType = useLogDraft((state) => state.setVenueType);
  const setVenueName = useLogDraft((state) => state.setVenueName);
  const setStep = useLogDraft((state) => state.setStep);
  const [editingList, setEditingList] = useState<'recent' | 'favourite' | null>(
    null,
  );
  const [wishlistEditor, setWishlistEditor] = useState<{
    open: boolean;
    item?: WishlistItem;
  } | null>(null);
  const [bannerSheetVisible, setBannerSheetVisible] = useState(false);
  const updateProfile = useUpdateProfile(signedInUserId ?? '');
  const data = overviewQuery.data;
  const profile = data?.profile;
  const isOwner = !!profile && profile.id === signedInUserId;
  const recentPicks = data?.recent_picks ?? [];
  const favouritePicks = data?.favourite_picks ?? [];
  const wishlistItems = data?.wishlist?.items ?? [];
  const recentUpdatedAt = latestPickUpdate(recentPicks);
  const picksAreStale = arePicksStale(recentUpdatedAt);
  const backdrop =
    profile?.banner_image_url ?? favouritePicks[0]?.image_url ?? null;
  const backdropMacro =
    favouritePicks[0]?.primary_macro ??
    favouritePicks[0]?.macro_genres[0] ??
    'indie';
  const backdropColor =
    MACRO_GENRES[backdropMacro as keyof typeof MACRO_GENRES]?.color ??
    colors.accent;

  async function handleSaveBanner(bannerUrl: string | null) {
    if (!profile || !signedInUserId) return;
    await updateProfile.mutateAsync({
      banner_image_url: bannerUrl,
    });
    void overviewQuery.refetch();
  }
  const restricted = data?.restricted ?? false;
  const allWishlistQuery = useFullWishlist(
    resolvedUsername,
    activeTab === 'wishlist' ? profile?.id : undefined,
  );
  const followStatus = followStatusQuery.data;
  const isFollowing = followStatus === 'accepted';
  const isFollowPending = followStatus === 'pending';

  function toggleFollow() {
    if (!profile || isOwner) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const mutation = isFollowing || isFollowPending ? unfollow : follow;
    mutation.mutate(
      { followeeId: profile.id },
      {
        onError: (error) =>
          Alert.alert(
            'Could not update follow',
            error instanceof Error ? error.message : 'Try again.',
          ),
        onSuccess: () => void overviewQuery.refetch(),
      },
    );
  }

  async function saveWishlist(draft: WishlistDraft) {
    if (!profile) throw new Error('Profile is unavailable.');
    if (wishlistEditor?.item) {
      await updateWishlist.mutateAsync({
        itemId: wishlistEditor.item.id,
        updates: draft,
      });
    } else {
      await addWishlist.mutateAsync({ userId: profile.id, draft });
    }
  }

  async function startLogFromWishlist(item: WishlistItem) {
    try {
      const artist = await fetchArtistById(item.artist_id);
      resetLogDraft();
      setArtist(artist);
      setEventDate(
        item.target_date
          ? new Date(`${item.target_date}T12:00:00`)
          : new Date(),
      );
      setVenueType(item.venue_type ?? 'concert_hall_club');
      setVenueName(item.venue_name ?? item.event_name ?? '');
      setStep(2);
      router.navigate(routes.logWizard({ wishlistId: item.id }));
    } catch (error) {
      Alert.alert(
        'Could not open log wizard',
        error instanceof Error ? error.message : 'Try again.',
      );
    }
  }

  async function shareProfile() {
    if (!profile || profile.is_private) return;
    try {
      await shareProfileCard(profile, favouritePicks);
    } catch (error) {
      Alert.alert(
        'Could not share profile',
        error instanceof Error ? error.message : 'Try again.',
      );
    }
  }

  if (
    (overviewQuery.isLoading ||
      (!requestedUsername && myProfileQuery.isLoading)) &&
    !data
  )
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  if (overviewQuery.isError || !profile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={styles.errorView}>
          <Text variant="title" weight="bold">
            Profile unavailable
          </Text>
          <Text variant="caption" color="secondary" center>
            {overviewQuery.error?.message ?? 'This profile could not be found.'}
          </Text>
          <Button
            label="Try again"
            onPress={() => void overviewQuery.refetch()}
          />
          <Button
            label="Go back"
            variant="secondary"
            onPress={safeBack}
          />
        </View>
      </SafeAreaView>
    );
  }

  const counts = data.counts;
  const topGenres = data.top_genres ?? [];
  const lastLogs = data.last_logs ?? [];
  const wallOfFame = data.wall_of_fame ?? [];
  const friends = data.friends;
  const profileHeader = (
    <ProfileHeader
      profile={profile}
      counts={counts}
      fallbackGenre={
        topGenres[0] && isMacroGenre(topGenres[0].macro_genre)
          ? topGenres[0].macro_genre
          : undefined
      }
      backdropUrl={backdrop}
      backdropColor={backdropColor}
      isOwn={isOwner}
      shareable={!profile.is_private}
      onEdit={() => router.navigate(routes.settings())}
      onChangeBanner={() => setBannerSheetVisible(true)}
      onWrapped={() => router.navigate(routes.wrapped())}
      onShare={() => void shareProfile()}
      onCountPress={(section) =>
        router.setParams({
          tab: 'friends',
          friendsTab: section,
        })
      }
      followAction={
        !isOwner ? (
          <Button
            label={
              isFollowing
                ? 'Following'
                : isFollowPending
                  ? 'Requested'
                  : profile.is_private
                    ? 'Request to follow'
                    : 'Follow'
            }
            size="sm"
            variant={isFollowing || isFollowPending ? 'secondary' : 'primary'}
            loading={follow.isPending || unfollow.isPending}
            onPress={toggleFollow}
          />
        ) : undefined
      }
    />
  );
  const sectionTabs = (
    <View style={styles.sectionTabs}>
      <SegmentedControl
        options={PROFILE_SECTIONS}
        value={activeTab}
        onChange={(value) => router.setParams({ tab: value })}
      />
    </View>
  );
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={safeBack}
          style={styles.navButton}
        >
          <ArrowLeft color={colors.ink} size={21} />
        </Pressable>
        <Text variant="caption" weight="bold">
          @{profile.username}
        </Text>
        {isOwner ? (
          <View style={styles.navActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Notifications. ${unreadQuery.data ?? 0} unread.`}
              onPress={() => router.navigate(routes.notifications())}
              style={styles.navButton}
            >
              <Bell color={colors.ink} size={20} />
              {(unreadQuery.data ?? 0) > 0 ? (
                <View
                  style={[
                    styles.notificationBadge,
                    { backgroundColor: colors.accent },
                  ]}
                >
                  <Text variant="caption" style={{ color: colors.accentInk }}>
                    {(unreadQuery.data ?? 0) > 9 ? '9+' : unreadQuery.data}
                  </Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile settings"
              onPress={() => router.navigate(routes.settings())}
              style={styles.navButton}
            >
              <Settings color={colors.ink} size={21} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.navButton} />
        )}
      </View>
      {activeTab === 'timeline' && !restricted ? (
        <View style={styles.listSectionContent}>
          <TimelineScreen
            embedded
            userId={profile.id}
            canEdit={isOwner}
            ownerName={profile.username}
            headerAddon={
              <>
                {profileHeader}
                {sectionTabs}
              </>
            }
          />
        </View>
      ) : activeTab === 'friends' ? (
        <View style={styles.listSectionContent}>
          <ProfileFriendsSection
            key={friendsTab}
            userId={profile.id}
            username={profile.username}
            isOwner={isOwner}
            initialSection={friendsTab}
            headerAddon={
              <>
                {profileHeader}
                {sectionTabs}
              </>
            }
          />
        </View>
      ) : activeTab === 'timeline' ? (
        <>
          {profileHeader}
          {sectionTabs}
          <View style={[styles.lockedSection, styles.listSectionContent]}>
            <LockKeyhole size={24} color={colors.inkMuted} />
            <Text variant="title" weight="bold">
              This timeline is private
            </Text>
            <Text variant="caption" color="secondary" center>
              Follow @{profile.username} to request access to their shows.
            </Text>
          </View>
        </>
      ) : (
        <ScrollView
          ref={scrollRef}
          refreshControl={
            <RefreshControl
              refreshing={overviewQuery.isRefetching}
              onRefresh={() => void overviewQuery.refetch()}
              tintColor={colors.accent}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {profileHeader}
          {sectionTabs}
          {activeTab === 'wishlist' ? (
            restricted ? (
              <View style={styles.lockedSection}>
                <LockKeyhole size={24} color={colors.inkMuted} />
                <Text variant="title" weight="bold">
                  This wishlist is private
                </Text>
              </View>
            ) : (
              <View style={styles.section}>
                <SectionTitle title="WISHLIST" />
                {isOwner ? (
                  <Button
                    label="Add a wish"
                    size="sm"
                    variant="secondary"
                    leftIcon={<Plus size={16} color={colors.ink} />}
                    onPress={() => setWishlistEditor({ open: true })}
                  />
                ) : null}
                {(allWishlistQuery.data ?? wishlistItems).length ? (
                  (allWishlistQuery.data ?? wishlistItems).map((item) => (
                    <WishlistCard
                      key={item.id}
                      item={item}
                      isOwner={isOwner}
                      onGoing={() =>
                        void updateWishlist
                          .mutateAsync({
                            itemId: item.id,
                            updates: { status: 'going' },
                          })
                          .catch((error: unknown) =>
                            Alert.alert(
                              'Could not update wishlist',
                              error instanceof Error
                                ? error.message
                                : 'Try again.',
                            ),
                          )
                      }
                      onWent={() => void startLogFromWishlist(item)}
                      onEdit={() => setWishlistEditor({ open: true, item })}
                      onDelete={() => deleteWishlist.mutate(item.id)}
                    />
                  ))
                ) : allWishlistQuery.isLoading ? (
                  <Text variant="caption" color="secondary">
                    Loading wishlist…
                  </Text>
                ) : (
                  <EmptyState
                    title={
                      isOwner
                        ? 'Your wishlist is ready'
                        : 'Nothing on this wishlist yet'
                    }
                    description="Shows you want to see will live here."
                  />
                )}
                {allWishlistQuery.isError ? (
                  <Text variant="caption" color="danger">
                    {allWishlistQuery.error.message}
                  </Text>
                ) : null}
              </View>
            )
          ) : activeTab === 'profile' && restricted ? (
            <View style={styles.lockedSection}>
              <LockKeyhole size={24} color={colors.inkMuted} />
              <Text variant="title" weight="bold">
                This profile is private
              </Text>
              <Text variant="caption" color="secondary" center>
                Only the profile owner and accepted followers can see picks,
                shows, and wishlist.
              </Text>
            </View>
          ) : activeTab === 'profile' ? (
            <>
              <PicksSection
                title="WHAT I’M INTO RECENTLY"
                subtitle="Artists in heavy rotation right now."
                list="recent"
                picks={recentPicks}
                isOwner={isOwner}
                onEdit={() => setEditingList('recent')}
                onOpen={(pick) => void openArtistCard(pick.id)}
                updatedLabel={relativeUpdated(recentUpdatedAt)}
                stale={picksAreStale}
              />
              <PicksSection
                title="MY ALL-TIME FAVOURITES"
                subtitle="The artists you keep coming back to."
                list="favourite"
                picks={favouritePicks}
                isOwner={isOwner}
                onEdit={() => setEditingList('favourite')}
                onOpen={(pick) => void openArtistCard(pick.id)}
              />

              {isOwner || (data.wishlist?.total ?? 0) > 0 ? (
                <View style={styles.section}>
                  <SectionTitle
                    title="WISHLIST · WANT TO SEE"
                    action={
                      data.wishlist?.total
                        ? () =>
                            router.navigate(
                              routes.legacy.userWishlist(profile.username),
                            )
                        : undefined
                    }
                    actionLabel="See all"
                  />
                  {isOwner ? (
                    <Button
                      label="Add"
                      size="sm"
                      variant="secondary"
                      leftIcon={<Plus size={16} color={colors.ink} />}
                      onPress={() => setWishlistEditor({ open: true })}
                    />
                  ) : null}
                  {wishlistItems.length ? (
                    wishlistItems.slice(0, 5).map((item) => (
                      <WishlistCard
                        key={item.id}
                        item={item}
                        isOwner={isOwner}
                        onGoing={() =>
                          void updateWishlist
                            .mutateAsync({
                              itemId: item.id,
                              updates: { status: 'going' },
                            })
                            .catch((error: unknown) =>
                              Alert.alert(
                                'Could not update wishlist',
                                error instanceof Error
                                  ? error.message
                                  : 'Try again.',
                              ),
                            )
                        }
                        onWent={() => void startLogFromWishlist(item)}
                        onEdit={() => setWishlistEditor({ open: true, item })}
                        onDelete={() =>
                          Alert.alert(
                            'Remove wishlist item?',
                            item.artist_name,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: () => deleteWishlist.mutate(item.id),
                              },
                            ],
                          )
                        }
                      />
                    ))
                  ) : isOwner ? (
                    <EmptyState
                      title="Your wishlist is ready"
                      description="Add an artist or show you want to see live."
                      action={
                        <Button
                          label="Add a wish"
                          onPress={() => setWishlistEditor({ open: true })}
                        />
                      }
                    />
                  ) : null}
                </View>
              ) : null}

              {isOwner || lastLogs.length > 0 ? (
                <View style={styles.section}>
                  <SectionTitle
                    title="RECENT SHOWS"
                    action={() => router.setParams({ tab: 'timeline' })}
                    actionLabel="See timeline"
                  />
                  {lastLogs.length ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.recentShows}
                    >
                      {lastLogs.map((log) => (
                        <Pressable
                          key={log.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${log.artist_name} show`}
                          onPress={() =>
                            router.navigate(
                              routes.log(log.id, {
                                returnTo: routes.profilePath('timeline'),
                              }),
                            )
                          }
                          style={[
                            styles.showCard,
                            { backgroundColor: colors.surface },
                          ]}
                        >
                          {log.image_url ? (
                            <Image
                              source={{ uri: log.image_url }}
                              contentFit="cover"
                              style={styles.showImage}
                            />
                          ) : (
                            <Avatar name={log.artist_name} size="md" />
                          )}
                          <Text
                            variant="caption"
                            weight="bold"
                          >
                            {log.artist_name}
                          </Text>
                          <Text variant="caption" color="secondary">
                            {new Date(
                              `${log.event_date}T12:00:00`,
                            ).toLocaleDateString()}
                          </Text>
                          <Text
                            variant="caption"
                            style={{ color: colors.accent }}
                          >
                            {log.rating
                              ? `${log.rating.toFixed(1)} ★`
                              : 'Not rated'}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text variant="caption" color="secondary">
                      No shows logged yet.
                    </Text>
                  )}
                </View>
              ) : null}

              {isOwner ||
              topGenres.length > 0 ||
              (data.five_star_count ?? 0) > 0 ? (
                <View style={styles.section}>
                  <SectionTitle title="HIGHLIGHTS" />
                  <View style={styles.genreRow}>
                    {topGenres.slice(0, 3).map((genre) => {
                      const config =
                        MACRO_GENRES[
                          genre.macro_genre as keyof typeof MACRO_GENRES
                        ];
                      return (
                        <View key={genre.macro_genre} style={styles.genreChip}>
                          <GenreLabel
                            genre={genre.macro_genre}
                            label={config?.label ?? genre.macro_genre}
                            size="xs"
                          />
                          <Text variant="caption" color="secondary">
                            {genre.percentage}%
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  <View
                    style={[
                      styles.fiveStar,
                      { backgroundColor: `${colors.accent}16` },
                    ]}
                  >
                    <Star
                      size={17}
                      color={colors.accent}
                      fill={colors.accent}
                    />
                    <Text variant="label" weight="bold">
                      {data.five_star_count ?? 0} five-star shows
                    </Text>
                  </View>
                  {wallOfFame.length ? (
                    <View style={styles.wallRow}>
                      {wallOfFame.slice(0, 6).map((item) => (
                        <Pressable
                          key={`${item.artist_id}-${item.event_date}`}
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${item.artist_name}`}
                          onPress={() =>
                            router.navigate(routes.artist(item.artist_id))
                          }
                        >
                          <Avatar
                            name={item.artist_name}
                            imageUrl={item.image_url}
                            size="md"
                          />
                        </Pressable>
                      ))}
                      {isOwner ? (
                        <Button
                          label="Wall of Fame"
                          size="sm"
                          variant="secondary"
                          onPress={() =>
                            router.navigate(routes.wallOfFame())
                          }
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {isOwner ||
              (friends && (friends.followers > 0 || friends.following > 0)) ? (
                <View style={styles.section}>
                  <FriendsPreview
                    friends={friends?.preview ?? []}
                    followers={friends?.followers ?? 0}
                    following={friends?.following ?? 0}
                    isOwner={isOwner}
                  />
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      )}

      {isOwner && editingList ? (
        <PicksEditorSheet
          key={editingList}
          visible
          list={editingList}
          initialPicks={editingList === 'recent' ? recentPicks : favouritePicks}
          onDismiss={() => setEditingList(null)}
          onSave={async (picks) => {
            await setPicks.mutateAsync({ list: editingList, picks });
          }}
        />
      ) : null}
      {isOwner && wishlistEditor?.open ? (
        <WishlistEditorSheet
          key={wishlistEditor.item?.id ?? 'new'}
          visible
          initialItem={wishlistEditor.item}
          onDismiss={() => setWishlistEditor(null)}
          onSave={saveWishlist}
        />
      ) : null}
      {isOwner && bannerSheetVisible ? (
        <ProfileBannerSheet
          visible
          onDismiss={() => setBannerSheetVisible(false)}
          currentBannerUrl={profile?.banner_image_url ?? null}
          defaultBackdropUrl={favouritePicks[0]?.image_url ?? null}
          defaultArtistName={favouritePicks[0]?.name}
          suggestedArtists={favouritePicks.map((pick) => ({
            artistId: pick.id,
            name: pick.name,
            image_url: pick.image_url,
          }))}
          onSaveBanner={handleSaveBanner}
        />
      ) : null}
    </SafeAreaView>
  );
}

function PicksSection({
  title,
  subtitle,
  list,
  picks,
  isOwner,
  onEdit,
  onOpen,
  updatedLabel,
  stale = false,
}: {
  title: string;
  subtitle: string;
  list: 'recent' | 'favourite';
  picks: ProfilePick[];
  isOwner: boolean;
  onEdit: () => void;
  onOpen: (pick: ProfilePick) => void;
  updatedLabel?: string;
  stale?: boolean;
}) {
  const { colors } = useTheme();
  if (!isOwner && !picks.length) return null;
  const visiblePickCount = isOwner
    ? Math.min(5, Math.max(1, picks.length + 1))
    : picks.length;
  return (
    <View
      style={[
        styles.section,
        styles.picksSection,
        { borderTopColor: colors.line },
      ]}
    >
      <View style={styles.picksHeader}>
        <View style={styles.picksHeading}>
          <Text
            variant="overline"
            style={{
              color: list === 'recent' ? colors.accent : colors.inkMuted,
            }}
          >
            {list === 'recent' ? '01 / IN ROTATION' : '02 / THE ESSENTIALS'}
          </Text>
          <Text variant="title" weight="bold">
            {title}
          </Text>
          <Text variant="caption" color="secondary">
            {subtitle}
          </Text>
        </View>
        {isOwner ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${title}`}
            onPress={onEdit}
            style={styles.sectionAction}
          >
            <Text
              variant="caption"
              weight="semibold"
              style={{ color: colors.accent }}
            >
              {picks.length ? 'Edit' : 'Add'}
            </Text>
            <ArrowRight size={15} color={colors.accent} />
          </Pressable>
        ) : null}
      </View>
      {updatedLabel && list === 'recent' ? (
        <Text variant="caption" color="secondary">
          {updatedLabel}
        </Text>
      ) : null}
      {isOwner && stale ? (
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={[
            styles.stalePrompt,
            { backgroundColor: `${colors.warning}16` },
          ]}
        >
          <Text variant="caption" style={{ color: colors.warning }}>
            These picks are over 60 days old. Refresh them?
          </Text>
        </Pressable>
      ) : null}
      {picks.length || isOwner ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pickRow}
        >
          {Array.from({ length: visiblePickCount }, (_, index) => (
            <PickRow
              key={picks[index]?.id ?? `slot-${index}`}
              pick={picks[index]}
              position={index + 1}
              list={list}
              profilePresentation
              onPress={onOpen}
              onAdd={onEdit}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  nav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  navButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    minWidth: 52,
  },
  navActions: { alignItems: 'center', flexDirection: 'row' },
  notificationBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    minWidth: 17,
    paddingHorizontal: 3,
    position: 'absolute',
    right: 1,
    top: 1,
  },
  sectionTabs: { paddingHorizontal: spacing.md },
  listSectionContent: { flex: 1, minHeight: 0 },
  scrollContent: { gap: spacing.lg, paddingBottom: 112 },
  section: { gap: spacing.sm, paddingHorizontal: spacing.md },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 36,
  },
  picksSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  picksHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  picksHeading: { flex: 1, gap: 3 },
  sectionAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  flexOne: { flex: 1, minWidth: 0 },
  pickRow: {
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  stalePrompt: { borderRadius: radius.sm, padding: spacing.sm },
  lockedSection: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  recentShows: { gap: spacing.sm },
  showCard: {
    borderRadius: radius.md,
    gap: 4,
    padding: spacing.sm,
    width: 144,
  },
  showImage: { aspectRatio: 1, borderRadius: radius.sm, width: '100%' },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  genreChip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  fiveStar: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  wallRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  skeletonPage: { flex: 1, gap: spacing.md, paddingBottom: spacing.xl },
  skeletonSection: { gap: spacing.sm, paddingHorizontal: spacing.md },
  errorView: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
});

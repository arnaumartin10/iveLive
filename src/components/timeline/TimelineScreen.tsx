import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams, useScrollToTop } from 'expo-router';
import { routes } from '../../navigation/routes';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { CalendarDays, Filter, FilterX, Plus, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../features/auth/store';
import { useMe } from '../../features/auth/hooks';
import {
  useDeleteConcert,
  useMyLogs,
  useUserMediaCount,
} from '../../features/concerts/hooks';
import {
  useTimelineStore,
  type TimelineFilterState,
} from '../../features/concerts/timelineStore';
import { useLogDraft } from '../../features/log/store';
import { useArtistCard } from '../../features/artists/ArtistCardProvider';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Text } from '../../components/ui/Text';
import { GenreLabel, VenueLabel } from '../../components/paper/GenreLabel';
import { Toast } from '../../components/ui/Toast';
import {
  buildTimelineItems,
  LogDetailSheet,
  SwipeableTimelineRow,
  TimelineAxisItem,
  TimelineCard,
  TimelineFilterSheet,
  TimelineSkeleton,
  YearHeader,
  MonthSubheader,
  type TimelineItem,
} from '../../components/timeline';
import type { ConcertWithRelations } from '../../features/concerts/types';
import type { VenueType } from '../../features/venues/venueTypes';
import {
  MACRO_GENRES,
  type MacroGenre,
} from '../../features/genres/macroGenres';

const ORDER_OPTIONS = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
];

export function TimelineScreen({
  headerAddon,
  userId: userIdProp,
  ownerName,
  embedded = false,
  canEdit = true,
}: {
  headerAddon?: React.ReactNode;
  userId?: string;
  ownerName?: string;
  embedded?: boolean;
  canEdit?: boolean;
}) {
  const { colors } = useTheme();
  const compactLayout = useBreakpoint() !== 'wide';
  const insets = useSafeAreaInsets();
  const viewerId = useAuthStore((state) => state.user?.id ?? '');
  const userId = userIdProp ?? viewerId;
  const profileQuery = useMe();
  const profile = profileQuery.data;
  const avatarName = profile?.display_name || profile?.username || 'You';

  // Timeline Store state
  const order = useTimelineStore((state) => state.order);
  const setOrder = useTimelineStore((state) => state.setOrder);
  const filters = useTimelineStore((state) => state.filters);
  const setFilters = useTimelineStore((state) => state.setFilters);
  const resetFilters = useTimelineStore((state) => state.resetFilters);
  const toggleGenre = useTimelineStore((state) => state.toggleGenre);
  const toggleVenueType = useTimelineStore((state) => state.toggleVenueType);
  const setMinRating = useTimelineStore((state) => state.setMinRating);
  const hasActiveFilters = useTimelineStore((state) =>
    state.hasActiveFilters(),
  );
  const activeCount = useTimelineStore((state) => state.activeFilterCount());

  // Log Draft store for editing
  const startEdit = useLogDraft((state) => state.startEdit);

  // Sheets state
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [selectedConcert, setSelectedConcert] =
    useState<ConcertWithRelations | null>(null);
  const listRef = useRef<FlashListRef<TimelineItem>>(null);
  useScrollToTop(listRef);

  // Undo delete state
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [undoToastVisible, setUndoToastVisible] = useState(false);
  const [undoMessage, setUndoMessage] = useState('');
  const deletedConcertRef = useRef<ConcertWithRelations | null>(null);
  const deleteTimerRef = useRef<NodeJS.Timeout | null>(null);

  const deleteMutation = useDeleteConcert(userId);

  // Deep link params (e.g. from Stats screen)
  const searchParams = useLocalSearchParams<{
    genre?: string;
    venueType?: string;
    venue_type?: string;
    macro?: string;
    minRating?: string;
    maxRating?: string;
    year?: string;
    date?: string;
    onlyMedia?: string;
    highlight?: string;
  }>();

  useEffect(() => {
    const {
      genre,
      venueType,
      venue_type,
      macro,
      minRating,
      maxRating,
      year,
      date,
      onlyMedia,
    } = searchParams;
    if (
      genre ||
      venueType ||
      venue_type ||
      macro ||
      minRating ||
      maxRating ||
      year ||
      date ||
      onlyMedia
    ) {
      const updates: Partial<TimelineFilterState> = {};
      if (genre || macro) updates.genres = [genre ?? macro!];
      if (venueType || venue_type)
        updates.venueTypes = [(venueType ?? venue_type)! as VenueType];
      if (minRating) updates.minRating = parseFloat(minRating);
      if (maxRating) updates.maxRating = parseFloat(maxRating);
      if (year) updates.year = parseInt(year, 10);
      if (date) updates.eventDate = date;
      if (onlyMedia === 'true') updates.onlyMedia = true;
      setFilters(updates);
    }
  }, [searchParams, setFilters]);

  // Keyset paginated query
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMyLogs({ order, filters, userId });
  const mediaCountQuery = useUserMediaCount(userId);

  // Flatten pages from infinite query
  const allLogs = useMemo(() => {
    return data?.pages.flatMap((page) => page) ?? [];
  }, [data]);

  // Filter out any concerts pending undo deletion
  const visibleLogs = useMemo(() => {
    if (pendingDeleteIds.size === 0) return allLogs;
    return allLogs.filter((log) => !pendingDeleteIds.has(log.id));
  }, [allLogs, pendingDeleteIds]);

  // Group logs into Year headers, Month sub-headers, and Log items client-side
  const { items: timelineItems, stickyHeaderIndices } = useMemo(() => {
    return buildTimelineItems(visibleLogs);
  }, [visibleLogs]);

  useEffect(() => {
    const highlight = searchParams.highlight;
    if (!highlight) return;
    const index = timelineItems.findIndex(
      (item) => item.type === 'log' && item.concert.id === highlight,
    );
    if (index >= 0) {
      void listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.35,
      });
    }
  }, [searchParams.highlight, timelineItems]);

  // Handlers
  function handleEditConcert(concert: ConcertWithRelations) {
    setSelectedConcert(null);
    startEdit(concert);
    router.navigate(routes.logWizard());
  }

  function handleDeleteConcert(id: string) {
    setSelectedConcert(null);
    deleteMutation.mutate(id);
  }

  const handleSwipeDelete = useCallback(
    (concert: ConcertWithRelations) => {
      // Clear any previous timer and commit earlier deletion
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
        if (deletedConcertRef.current) {
          deleteMutation.mutate(deletedConcertRef.current.id);
        }
      }

      deletedConcertRef.current = concert;
      setPendingDeleteIds((prev) => new Set(prev).add(concert.id));
      setUndoMessage(`Deleted "${concert.artist?.name || 'Show'}"`);
      setUndoToastVisible(true);

      // Start 5-second undo timer
      deleteTimerRef.current = setTimeout(() => {
        deleteMutation.mutate(concert.id);
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          next.delete(concert.id);
          return next;
        });
        deletedConcertRef.current = null;
        setUndoToastVisible(false);
      }, 5000);
    },
    [deleteMutation],
  );

  const handleUndo = useCallback(() => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    if (deletedConcertRef.current) {
      const restoredId = deletedConcertRef.current.id;
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(restoredId);
        return next;
      });
      deletedConcertRef.current = null;
    }
    setUndoToastVisible(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const { openArtistCard } = useArtistCard();

  // FlashList renderItem
  const renderItem = useCallback(
    ({ item }: { item: TimelineItem }) => {
      if (item.type === 'year-header') {
        return <YearHeader year={item.year} />;
      }

      if (item.type === 'month-header') {
        return <MonthSubheader month={item.month} year={item.year} />;
      }

      return (
        <View
          style={[
            styles.logRowContainer,
            compactLayout && styles.compactLogRowContainer,
          ]}
        >
          <TimelineAxisItem
            dayNumber={item.dayNumber}
            shortWeekday={item.shortWeekday}
            currentColor={item.currentColor}
          />
          {canEdit ? (
            <SwipeableTimelineRow
              onSwipeDelete={() => handleSwipeDelete(item.concert)}
            >
              <TimelineCard
                concert={item.concert}
                primaryGenreColor={item.currentColor}
                onPress={() => setSelectedConcert(item.concert)}
                onOpenArtist={() => {
                  if (!item.concert.artist_id) return;
                  void openArtistCard({
                    artistId: item.concert.artist_id,
                    name: item.concert.artist?.name,
                    imageUrl:
                      item.concert.artist?.image_url_thumb ||
                      item.concert.artist?.image_url_large ||
                      undefined,
                    macroGenres: item.concert.artist?.macro_genres ?? [],
                    genres: item.concert.artist?.genres ?? [],
                  });
                }}
              />
            </SwipeableTimelineRow>
          ) : (
            <TimelineCard
              concert={item.concert}
              primaryGenreColor={item.currentColor}
              onPress={() => setSelectedConcert(item.concert)}
              onOpenArtist={() => {
                if (!item.concert.artist_id) return;
                void openArtistCard({
                  artistId: item.concert.artist_id,
                  name: item.concert.artist?.name,
                  imageUrl:
                    item.concert.artist?.image_url_thumb ||
                    item.concert.artist?.image_url_large ||
                    undefined,
                  macroGenres: item.concert.artist?.macro_genres ?? [],
                  genres: item.concert.artist?.genres ?? [],
                });
              }}
            />
          )}
        </View>
      );
    },
    [canEdit, compactLayout, handleSwipeDelete, openArtistCard],
  );

  const getItemType = useCallback((item: TimelineItem) => item.type, []);

  // Header content rendered inside FlashList
  const ListHeader = (
    <View style={styles.headerBlock}>
      {headerAddon}
      {/* Large Title */}
      <View style={styles.titleRow}>
        <View style={styles.titleTextWrap}>
          <Text variant="display" weight="black" style={styles.titleText}>
            Timeline
          </Text>
          <Text variant="caption" color="secondary" style={styles.subtitleText}>
            Your live music journey
          </Text>
          <Text variant="mono" style={{ color: colors.inkMuted }}>
            PHOTOS · {mediaCountQuery.data ?? '…'}
          </Text>
          {mediaCountQuery.isError ? (
            <Text variant="caption" color="danger">
              Photo count unavailable.
            </Text>
          ) : null}
        </View>
      </View>

      {/* SegmentedControl Order Toggle */}
      <View style={styles.toggleRow}>
        <SegmentedControl
          options={ORDER_OPTIONS}
          value={order}
          onChange={(val) => {
            void Haptics.selectionAsync();
            setOrder(val as 'newest' | 'oldest');
          }}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          filters.onlyMedia
            ? 'Show all diary entries'
            : 'Filter diary with media'
        }
        onPress={() => setFilters({ onlyMedia: !filters.onlyMedia })}
        style={[
          styles.mediaFilterChip,
          {
            backgroundColor: filters.onlyMedia ? colors.accent : colors.surface,
            borderColor: filters.onlyMedia ? colors.accent : colors.line,
          },
        ]}
      >
        <Text
          variant="mono"
          style={{ color: filters.onlyMedia ? colors.accentInk : colors.ink }}
        >
          Filter: with media
        </Text>
      </Pressable>

      {/* Active Filter Chips Pill Row */}
      {hasActiveFilters ? (
        <View style={styles.activeFiltersRow}>
          <Text variant="caption" weight="bold" color="secondary">
            FILTERS:
          </Text>
          {filters.venueTypes.map((vt) => (
            <Pressable
              key={vt}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${vt} filter`}
              onPress={() => toggleVenueType(vt)}
              style={[
                styles.activeFilterChip,
                {
                  backgroundColor: `${colors.accent}18`,
                  borderColor: colors.accent,
                },
              ]}
            >
              <VenueLabel
                venue={vt}
                label={vt.replaceAll('_', ' ')}
                size="xs"
                variant="outline"
              />
              <X size={12} color={colors.accent} />
            </Pressable>
          ))}
          {filters.genres.map((g) => (
            <Pressable
              key={g}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${g} genre filter`}
              onPress={() => toggleGenre(g)}
              style={[
                styles.activeFilterChip,
                {
                  backgroundColor: `${colors.accent}18`,
                  borderColor: colors.accent,
                },
              ]}
            >
              <GenreLabel
                genre={g in MACRO_GENRES ? (g as MacroGenre) : 'other'}
                label={g.replaceAll('_', ' ')}
                size="xs"
                variant="outline"
                interactive={false}
              />
              <X size={12} color={colors.accent} />
            </Pressable>
          ))}
          {filters.onlyMedia ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove with media filter"
              onPress={() => setFilters({ onlyMedia: false })}
              style={[
                styles.activeFilterChip,
                { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
            >
              <Text
                variant="caption"
                weight="semibold"
                style={{ color: colors.accentInk }}
              >
                with media
              </Text>
              <X size={12} color={colors.accentInk} />
            </Pressable>
          ) : null}
          {filters.minRating !== null ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove rating filter"
              onPress={() => setMinRating(null)}
              style={[
                styles.activeFilterChip,
                {
                  backgroundColor: `${colors.accent}18`,
                  borderColor: colors.accent,
                },
              ]}
            >
              <Text
                variant="caption"
                weight="semibold"
                style={{ color: colors.accent }}
              >
                {filters.minRating}+ ★
              </Text>
              <X size={12} color={colors.accent} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            onPress={resetFilters}
            style={styles.clearAllBtn}
          >
            <Text variant="caption" color="secondary" weight="bold">
              Clear all
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {!embedded ? (
        <View
          style={[
            styles.topBar,
            {
              paddingTop: insets.top + 6,
              backgroundColor: colors.bg,
              borderBottomColor: `${colors.line}60`,
            },
          ]}
        >
          <Text variant="label" weight="bold">
            IveLive
          </Text>

          <View style={styles.topBarActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open filters"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilterSheetVisible(true);
              }}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: hasActiveFilters
                    ? `${colors.accent}20`
                    : colors.surfaceRaised,
                  borderColor: hasActiveFilters ? colors.accent : colors.line,
                },
              ]}
            >
              <Filter
                size={18}
                color={hasActiveFilters ? colors.accent : colors.ink}
              />
              {activeCount > 0 ? (
                <View
                  style={[
                    styles.filterCountBadge,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.accent,
                    },
                  ]}
                >
                  <Text variant="caption" weight="bold" color="primary">
                    {activeCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open your profile"
              onPress={() => router.navigate(routes.user('me'))}
              style={styles.avatarBtn}
            >
              <Avatar
                imageUrl={profile?.avatar_url}
                name={avatarName}
                size="sm"
              />
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Main Content Area */}
      {isLoading ? (
        <View style={styles.flexFill}>
          {ListHeader}
          <TimelineSkeleton />
        </View>
      ) : visibleLogs.length === 0 ? (
        <View style={styles.flexFill}>
          {ListHeader}
          <View style={styles.emptyContainer}>
            {hasActiveFilters ? (
              <EmptyState
                icon={FilterX}
                title="No matching concerts"
                description="No concerts match your current filters. Try clearing some filters to see your shows."
                action={
                  <Button
                    label="Clear all filters"
                    variant="secondary"
                    onPress={resetFilters}
                  />
                }
              />
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No shows yet"
                description={
                  canEdit
                    ? 'No shows yet. Tap + to log your first concert.'
                    : `@${ownerName ?? 'This user'} has not logged any shows yet.`
                }
                action={
                  canEdit ? (
                    <Button
                      label="Log a concert"
                      leftIcon={<Plus color={colors.accentInk} size={17} />}
                      onPress={() => router.navigate(routes.logWizard())}
                    />
                  ) : undefined
                }
              />
            )}
          </View>
        </View>
      ) : (
        <FlashList
          ref={listRef}
          data={timelineItems}
          renderItem={renderItem}
          getItemType={getItemType}
          keyExtractor={(item) => item.id}
          stickyHeaderIndices={stickyHeaderIndices}
          ListHeaderComponent={ListHeader}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              void fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}

      {/* Detail Bottom Sheet */}
      <LogDetailSheet
        concert={selectedConcert}
        visible={!!selectedConcert}
        onDismiss={() => setSelectedConcert(null)}
        onEdit={handleEditConcert}
        onDelete={handleDeleteConcert}
        editable={canEdit}
      />

      {/* Filter Bottom Sheet */}
      <TimelineFilterSheet
        visible={filterSheetVisible}
        onDismiss={() => setFilterSheetVisible(false)}
      />

      {/* Floating Undo Toast */}
      {undoToastVisible ? (
        <View style={[styles.toastWrap, { bottom: insets.bottom + 80 }]}>
          <Toast
            visible={undoToastVisible}
            message={undoMessage}
            variant="warning"
            action={{
              label: 'Undo',
              onPress: handleUndo,
            }}
            onDismiss={() => setUndoToastVisible(false)}
            duration={5000}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flexFill: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 50,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'transparent',
    borderWidth: 1,
  },
  avatarBtn: {
    alignItems: 'center',
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerBlock: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleTextWrap: {
    gap: 2,
  },
  titleText: {
    letterSpacing: -0.8,
  },
  subtitleText: {
    fontSize: 13,
  },
  toggleRow: {
    marginTop: 2,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  mediaFilterChip: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  clearAllBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  logRowContainer: {
    flexDirection: 'row',
    paddingRight: spacing.md,
    marginBottom: spacing.md,
  },
  compactLogRowContainer: { paddingRight: spacing.sm },
  emptyContainer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastWrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 100,
  },
});

import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { routes } from '../../navigation/routes';
import { Pressable, StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { CollapsibleHeaderLayout } from '../../components/navigation/CollapsibleHeaderLayout';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Text } from '../../components/ui/Text';
import { useMyLogs } from '../../features/concerts/hooks';
import { useStatsScopeStore } from '../../features/stats/store';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';

const SORT_OPTIONS = [
  { label: 'Oldest', value: 'oldest' },
  { label: 'Newest', value: 'newest' },
];

export default function WallOfFameScreen() {
  const { colors } = useTheme();
  const year = useStatsScopeStore((state) => state.scope);
  const [sort, setSort] = useState<'oldest' | 'newest'>('newest');
  const concertsQuery = useMyLogs({
    order: sort,
    filters: { minRating: 5, maxRating: 5, ...(year == null ? {} : { year }) },
  });
  const fiveStarLogs = useMemo(
    () => concertsQuery.data?.pages.flatMap((page) => page) ?? [],
    [concertsQuery.data],
  );

  return (
    <CollapsibleHeaderLayout
      title="Wall of Fame"
      subtitle="Every perfect night"
    >
      <View style={styles.content}>
        <SegmentedControl
          options={SORT_OPTIONS}
          value={sort}
          onChange={(value) => setSort(value as 'oldest' | 'newest')}
        />
        {concertsQuery.isLoading ? (
          <Text variant="body" color="secondary">
            Loading your five-star shows…
          </Text>
        ) : fiveStarLogs.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Your first five-star show is waiting"
            description="Give a night the highest rating and it will have a place here."
          />
        ) : (
          <FlashList
            data={fiveStarLogs}
            numColumns={3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.grid}
            onEndReached={() => {
              if (
                concertsQuery.hasNextPage &&
                !concertsQuery.isFetchingNextPage
              ) {
                void concertsQuery.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              concertsQuery.isFetchingNextPage ? (
                <Text variant="caption" color="secondary">
                  Loading more…
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.artist?.name ?? 'Show'}, five stars, ${item.event_date}`}
                onPress={() =>
                  router.navigate(
                    routes.log(item.id, {
                      returnTo: routes.profilePath('timeline'),
                    }),
                  )
                }
                style={[styles.tile, { backgroundColor: colors.surface }]}
              >
                {item.artist?.image_url_large ? (
                  <Image
                    contentFit="cover"
                    source={{ uri: item.artist.image_url_large }}
                    style={styles.image}
                  />
                ) : (
                  <View
                    style={[
                      styles.image,
                      styles.avatarFallback,
                      { backgroundColor: colors.surfaceRaised },
                    ]}
                  >
                    <Avatar name={item.artist?.name ?? 'Artist'} size="lg" />
                  </View>
                )}
                <View
                  style={[styles.starBadge, { backgroundColor: colors.accent }]}
                >
                  <Star size={13} color={colors.accentInk} fill={colors.accentInk} />
                </View>
                <View style={styles.tileCaption}>
                  <Text variant="caption" weight="bold" numberOfLines={1}>
                    {item.artist?.name ?? 'Show'}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'medium',
                    }).format(new Date(`${item.event_date}T12:00:00`))}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </CollapsibleHeaderLayout>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.md },
  grid: { paddingBottom: 24 },
  tile: { flex: 1, margin: 4, borderRadius: radius.sm, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 0.82 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  starBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCaption: { padding: 8, gap: 2 },
});

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { palette, radius, spacing, spring } from '@theme/tokens';
import { Text } from '@components/ui/Text';
import { ArtistAvatar } from '@components/ui/ArtistAvatar';
import { EmptyState } from '@components/ui/EmptyState';
import { Skeleton } from '@components/ui/Skeleton';
import type { Artist, ConcertWithRelations } from '@features/concerts/types';

interface ArtistCloudProps {
  concerts: ConcertWithRelations[];
  isLoading: boolean;
  onArtistPress: (artist: Artist, timesSeen: number) => void;
  onLogFirstConcert: () => void;
}

interface ArtistWithCount {
  artist: Artist;
  count: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ArtistCloudItem({
  item,
  onPress,
}: {
  item: ArtistWithCount;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, spring.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, spring.bouncy);
  };

  const handlePress = async () => {
    await Haptics.selectionAsync();
    onPress();
  };

  // Variable sizes for collection feel (artists seen more times get larger circles)
  const baseSize = item.count > 2 ? 88 : item.count === 2 ? 78 : 70;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.itemContainer, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={`${item.artist.name}, seen ${item.count} times`}
    >
      <View style={styles.avatarWrapper}>
        <ArtistAvatar
          name={item.artist.name}
          imageUrl={item.artist.image_url}
          size={baseSize}
          showGlow={item.count >= 2}
        />
        {item.count > 1 && (
          <View style={styles.countBadge}>
            <Text variant="overline" weight="bold" color="inverse">
              ×{item.count}
            </Text>
          </View>
        )}
      </View>
      <Text
        variant="caption"
        weight="semibold"
        center
        numberOfLines={1}
        style={styles.artistName}
      >
        {item.artist.name}
      </Text>
    </AnimatedPressable>
  );
}

export function ArtistCloud({
  concerts,
  isLoading,
  onArtistPress,
  onLogFirstConcert,
}: ArtistCloudProps) {
  if (isLoading && concerts.length === 0) {
    return (
      <View style={styles.skeletonGrid}>
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={styles.itemContainer}>
            <Skeleton circle width={72} />
            <Skeleton width={60} height={12} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    );
  }

  // Deduplicate artists and calculate times seen
  const artistMap = new Map<string, ArtistWithCount>();
  for (const concert of concerts) {
    const existing = artistMap.get(concert.artist_id);
    if (existing) {
      existing.count += 1;
    } else {
      artistMap.set(concert.artist_id, {
        artist: concert.artist,
        count: 1,
      });
    }
  }

  const artistsWithCount = Array.from(artistMap.values()).sort(
    (a, b) => b.count - a.count,
  );

  if (artistsWithCount.length === 0) {
    return (
      <EmptyState
        title="Your Artist Archive is Empty"
        subtitle="Collect every band, singer, and DJ you have ever witnessed live on stage."
        actionLabel="Add Your First Artist"
        onAction={onLogFirstConcert}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.cloudContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text variant="title" weight="black" color="crimson">
            {artistsWithCount.length}
          </Text>
          <Text variant="overline" color="secondary">
            ARTISTS SEEN
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text variant="title" weight="black" color="amber">
            {concerts.length}
          </Text>
          <Text variant="overline" color="secondary">
            GIGS LOGGED
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        {artistsWithCount.map((item) => (
          <ArtistCloudItem
            key={item.artist.id}
            item={item}
            onPress={() => onArtistPress(item.artist, item.count)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cloudContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[12],
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: palette.surface1,
    borderRadius: radius.xl,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: palette.border,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: palette.border,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: spacing[4],
  },
  itemContainer: {
    alignItems: 'center',
    width: 96,
    marginBottom: spacing[4],
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: palette.amber,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 2,
    borderColor: palette.surface0,
  },
  artistName: {
    marginTop: spacing[2],
    maxWidth: 92,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: spacing[4],
  },
});

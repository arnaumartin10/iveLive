import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { palette, radius, spacing, spring } from '@theme/tokens';
import { Text } from '@components/ui/Text';
import { ArtistAvatar } from '@components/ui/ArtistAvatar';
import { formatConcertDate } from '@lib/utils';
import type { ConcertWithRelations } from '@features/concerts/types';

interface ConcertCardProps {
  concert: ConcertWithRelations;
  onPress: (concert: ConcertWithRelations) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ConcertCard({ concert, onPress }: ConcertCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, spring.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, spring.bouncy);
  };

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(concert);
  };

  const venueText = concert.venue
    ? `${concert.venue.name} • ${concert.venue.city}, ${concert.venue.country}`
    : 'Unknown Venue';

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.card, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={`Concert with ${concert.artist.name} on ${formatConcertDate(concert.concert_date)}`}
    >
      <ArtistAvatar
        name={concert.artist.name}
        imageUrl={concert.artist.image_url}
        size={60}
      />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text variant="title" weight="bold" numberOfLines={1} style={styles.artistName}>
            {concert.artist.name}
          </Text>
          {concert.rating && (
            <View style={styles.ratingBadge}>
              <Text variant="caption" weight="bold" color="amber">
                ★ {concert.rating}
              </Text>
            </View>
          )}
        </View>

        <Text variant="caption" color="secondary" numberOfLines={1} style={styles.venue}>
          {venueText}
        </Text>

        <View style={styles.bottomRow}>
          <Text variant="overline" color="steel">
            {formatConcertDate(concert.concert_date)}
          </Text>
          {concert.notes && (
            <Text variant="overline" color="muted">
              Has memory note
            </Text>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface1,
    borderRadius: radius.xl,
    padding: spacing[3],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 80,
  },
  content: {
    flex: 1,
    marginLeft: spacing[3],
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  artistName: {
    flex: 1,
    marginRight: spacing[2],
  },
  ratingBadge: {
    backgroundColor: 'rgba(242, 175, 41, 0.15)',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  venue: {
    marginTop: 2,
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

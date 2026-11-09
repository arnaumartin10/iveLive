import { useEffect, useRef } from 'react';
import { Star } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from './Text';

type StarRatingProps = {
  value: number;
  max?: number;
  size?: number;
  onChange?: (value: number) => void;
  showGlow?: boolean; // deprecated in Paper & Ink
  showFiveBadge?: boolean;
};

export function StarRating({
  value,
  max = 5,
  size = 20,
  onChange,
  showFiveBadge = true,
}: StarRatingProps) {
  const { colors } = useTheme();
  const boundedValue = Math.max(0, Math.min(max, value));
  const lastRatingRef = useRef(boundedValue);
  const ratingAtPressStart = useRef(boundedValue);
  const ratingRowRef = useRef<View | null>(null);
  const ratingRowLeft = useRef(0);
  const gap = 4;
  const trackWidth = max * size + (max - 1) * gap;

  useEffect(() => {
    lastRatingRef.current = boundedValue;
  }, [boundedValue]);

  function commitRating(nextRating: number) {
    if (lastRatingRef.current === nextRating) return;
    lastRatingRef.current = nextRating;
    onChange?.(nextRating);
    void Haptics.selectionAsync();
  }

  function handleAccessibilityAction(actionName: string) {
    if (!onChange) return;
    const nextRating = actionName === 'increment'
      ? Math.min(max, (boundedValue || 0) + 0.5)
      : Math.max(0.5, (boundedValue || 1) - 0.5);
    commitRating(nextRating);
  }

  const touchOrigin = useRef({ x: 0, y: 0 });

  function handleTouchStart(event: GestureResponderEvent) {
    touchOrigin.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    };
  }

  function measureRatingRow() {
    ratingRowRef.current?.measureInWindow((x) => {
      ratingRowLeft.current = x;
    });
  }

  function shouldStartScrubbing(event: GestureResponderEvent) {
    const deltaX = event.nativeEvent.pageX - touchOrigin.current.x;
    const deltaY = event.nativeEvent.pageY - touchOrigin.current.y;
    return Math.abs(deltaX) > 6 && Math.abs(deltaX) > Math.abs(deltaY);
  }

  function handleScrub(event: GestureResponderEvent) {
    const locationX = event.nativeEvent.pageX - ratingRowLeft.current;
    const progress = Math.max(0, Math.min(1, locationX / trackWidth));
    const nextRating = Math.max(0.5, Math.round(progress * max * 2) / 2);
    commitRating(nextRating);
  }

  const stars = Array.from({ length: max }, (_, index) => {
    const fill = Math.max(0, Math.min(1, boundedValue - index));
    const star = (
      <View style={[styles.starSlot, { height: size, width: size }]}>
        {/* Background star outline with hard offset */}
        <View style={styles.starShadow}>
          <Star
            color={colors.ink}
            size={size}
            strokeWidth={2}
          />
        </View>
        <Star
          color={colors.line}
          size={size}
          strokeWidth={2}
        />
        {fill > 0 ? (
          <View style={[styles.filledClip, { width: size * fill }]}>
            <Star
              color={colors.accent}
              fill={colors.accent}
              size={size}
              strokeWidth={2}
            />
          </View>
        ) : null}
      </View>
    );

    return onChange ? (
      <Pressable
        key={index}
        accessibilityRole="button"
        accessibilityLabel={`${index + 1} ${index === 0 ? 'star' : 'stars'}`}
        hitSlop={4}
        onPressIn={(event) => {
          ratingAtPressStart.current = lastRatingRef.current;
          const locationX = event.nativeEvent.locationX;
          const isHalf =
            typeof locationX === 'number' && locationX < size / 2;
          commitRating(Math.min(max, index + (isHalf ? 0.5 : 1)));
        }}
        onPress={() => {
          if (lastRatingRef.current === ratingAtPressStart.current) {
            commitRating(index + 1);
          }
        }}
        style={[styles.starButton, { height: size + 8, width: size }]}
      >
        {star}
      </Pressable>
    ) : (
      <View key={index}>{star}</View>
    );
  });

  const isFiveStar = boundedValue === 5;

  return (
    <View
      ref={ratingRowRef}
      onLayout={measureRatingRow}
      style={styles.wrapper}
      accessibilityLabel={boundedValue ? `${boundedValue.toFixed(1)} out of ${max} stars` : 'No rating selected'}
      accessibilityRole={onChange ? 'adjustable' : 'image'}
      accessibilityActions={onChange ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
      accessibilityValue={onChange ? {
        min: 0.5,
        max,
        now: boundedValue || 0.5,
        text: boundedValue ? `${boundedValue} stars` : 'Not rated',
      } : undefined}
      onAccessibilityAction={onChange
        ? (event) => handleAccessibilityAction(event.nativeEvent.actionName)
        : undefined}
      onTouchStart={onChange ? handleTouchStart : undefined}
      onMoveShouldSetResponder={onChange ? shouldStartScrubbing : undefined}
      onResponderGrant={onChange ? handleScrub : undefined}
      onResponderMove={onChange ? handleScrub : undefined}
    >
      <View style={styles.row}>{stars}</View>
      {isFiveStar && showFiveBadge && (
        <View
          style={[
            styles.fiveBadge,
            {
              backgroundColor: colors.accent,
              borderColor: colors.ink,
            },
          ]}
        >
          <Text variant="label" style={[styles.fiveBadgeText, { color: colors.accentInk }]}>
            FIVE
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  starButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  starSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  starShadow: {
    position: 'absolute',
    top: 1.5,
    left: 1.5,
    opacity: 0.25,
  },
  filledClip: {
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
  },
  fiveBadge: {
    borderWidth: 1.5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    transform: [{ rotate: '-3deg' }],
  },
  fiveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

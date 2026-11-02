import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Plus, X } from 'lucide-react-native';
import { MACRO_GENRES } from '../../features/genres/macroGenres';
import { useTheme } from '../../theme/ThemeProvider';
import { hardShadow, radius } from '../../theme/tokens';
import { Text } from '../ui/Text';
import type { ProfilePick } from '../../features/profile/types';

export function PickRow({
  pick,
  position,
  list,
  editable = false,
  profilePresentation = false,
  onPress,
  onAdd,
  onRemove,
  onMove,
}: {
  pick?: ProfilePick;
  position: number;
  list: 'recent' | 'favourite';
  editable?: boolean;
  profilePresentation?: boolean;
  onPress?: (pick: ProfilePick) => void;
  onAdd?: () => void;
  onRemove?: () => void;
  onMove?: (from: number, to: number) => void;
}) {
  const { colors } = useTheme();
  const macro = pick?.primary_macro ?? pick?.macro_genres[0] ?? 'other';
  const ringColor =
    list === 'favourite' && position === 1
      ? colors.accent
      : (MACRO_GENRES[macro as keyof typeof MACRO_GENRES]?.color ??
        colors.accent);
  const offsetY = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const gesture = Gesture.Pan()
    .enabled(editable && !!pick && !!onMove)
    .onUpdate((event) => {
      offsetY.value = event.translationY;
    })
    .onEnd((event) => {
      const offset = Math.round(event.translationY / 78);
      if (offset && onMove) {
        const target = Math.max(0, Math.min(4, position - 1 + offset));
        if (target !== position - 1) runOnJS(onMove)(position - 1, target);
      }
      offsetY.value = reduceMotion
        ? 0
        : withSpring(0, { damping: 18, stiffness: 220 });
    });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offsetY.value }],
  }));
  const diameter = editable ? 62 : list === 'favourite' ? 84 : 70;
  const macroLabel =
    MACRO_GENRES[macro as keyof typeof MACRO_GENRES]?.label ?? 'Live music';

  if (profilePresentation) {
    return (
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.profileCardWrap, animatedStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              pick
                ? `Open ${pick.name}, pick ${position}`
                : `Add artist to ${list === 'recent' ? 'recent picks' : 'favourites'}`
            }
            onPress={() => (pick ? onPress?.(pick) : onAdd?.())}
            style={({ pressed }) => [
              styles.profileCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.ink,
              },
              hardShadow.sm,
              pressed && styles.profileCardPressed,
            ]}
          >
            <View
              style={[
                styles.profileArtwork,
                {
                  backgroundColor: pick ? `${ringColor}24` : colors.bgSunken,
                  borderBottomColor: colors.ink,
                },
              ]}
            >
              {pick?.image_url ? (
                <Image
                  source={{ uri: pick.image_url }}
                  contentFit="cover"
                  style={StyleSheet.absoluteFill}
                />
              ) : (
                <View style={styles.profileArtworkPlaceholder}>
                  {pick ? (
                    <Text variant="title" weight="bold" color="secondary">
                      {pick.name.slice(0, 1)}
                    </Text>
                  ) : (
                    <Plus size={24} color={colors.inkMuted} />
                  )}
                </View>
              )}
              <View
                style={[
                  styles.profileRank,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.ink,
                  },
                ]}
              >
                <Text variant="overline" weight="bold">
                  {pick ? String(position).padStart(2, '0') : '+'}
                </Text>
              </View>
            </View>
            <View style={styles.profileCardCopy}>
              <Text variant="caption" weight="bold" numberOfLines={2}>
                {pick?.name ?? 'Add an artist'}
              </Text>
              <Text variant="overline" color="secondary" numberOfLines={1}>
                {pick ? macroLabel : 'Your list'}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.root, animatedStyle]}>
        {pick ? (
          <View style={styles.pickWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${pick.name} artist card, position ${position}`}
              onPress={() => onPress?.(pick)}
              style={[
                styles.photoRing,
                {
                  width: diameter + 8,
                  height: diameter + 8,
                  borderColor: ringColor,
                  shadowColor: ringColor,
                },
              ]}
            >
              {pick.image_url ? (
                <Image
                  source={{ uri: pick.image_url }}
                  contentFit="cover"
                  style={{
                    width: diameter,
                    height: diameter,
                    borderRadius: diameter / 2,
                  }}
                />
              ) : (
                <View
                  style={[
                    styles.placeholder,
                    {
                      width: diameter,
                      height: diameter,
                      borderRadius: diameter / 2,
                      backgroundColor: colors.surfaceRaised,
                    },
                  ]}
                >
                  <Text variant="caption" color="secondary">
                    {pick.name.slice(0, 1)}
                  </Text>
                </View>
              )}
            </Pressable>
            <Text
              variant="caption"
              weight="semibold"
              numberOfLines={1}
              style={[styles.name, { maxWidth: diameter + 14 }]}
            >
              {pick.name}
            </Text>
            <Text variant="overline" color="secondary">
              {position}
            </Text>
            {editable ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${pick.name}`}
                onPress={onRemove}
                hitSlop={8}
                style={[
                  styles.remove,
                  { backgroundColor: colors.surfaceRaised },
                ]}
              >
                <X size={13} color={colors.ink} />
              </Pressable>
            ) : null}
          </View>
        ) : editable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add artist to slot ${position}`}
            onPress={onAdd}
            style={[
              styles.emptySlot,
              {
                width: diameter + 8,
                height: diameter + 8,
                borderColor: colors.line,
              },
            ]}
          >
            <Plus size={22} color={colors.inkMuted} />
          </Pressable>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', minWidth: 80 },
  pickWrap: { alignItems: 'center', gap: 3 },
  photoRing: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    justifyContent: 'center',
  },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  name: { textAlign: 'center' },
  remove: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    top: -2,
    width: 26,
  },
  emptySlot: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  profileCardWrap: { minWidth: 0 },
  profileCard: {
    borderRadius: radius.sm,
    borderWidth: 1.5,
    overflow: 'visible',
    width: 108,
  },
  profileCardPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOffset: { width: 0, height: 0 },
  },
  profileArtwork: {
    aspectRatio: 1,
    borderBottomWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  profileArtworkPlaceholder: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  profileRank: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    left: 0,
    minWidth: 30,
    paddingHorizontal: 5,
    paddingVertical: 3,
    position: 'absolute',
    top: 0,
  },
  profileCardCopy: {
    gap: 4,
    minHeight: 52,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
});

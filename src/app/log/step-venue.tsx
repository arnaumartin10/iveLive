import { useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Check, GalleryHorizontal, Grid2X2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { WizardStepView } from '../../components/log/WizardStepView';
import { Text } from '../../components/ui/Text';
import { PatternFill, Stamp } from '../../components/paper';
import { useLogDraft } from '../../features/log/store';
import {
  VENUE_TYPES,
  VENUE_TYPE_ORDER,
  type VenueType,
  type VenueTypeConfig,
} from '../../features/venues/venueTypes';
import { useTheme } from '../../theme/ThemeProvider';
import { hardShadow, radius, spacing } from '../../theme/tokens';

const CARD_WIDTH = 220;
const CARD_HEIGHT = 300;
const CARD_GAP = 16;
const CARD_INTERVAL = CARD_WIDTH + CARD_GAP;
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<VenueType>);

function VenueCard({
  config,
  selected,
  onPress,
  mode,
  index,
  scrollOffset,
  reduceMotion,
}: {
  config: VenueTypeConfig;
  selected: boolean;
  onPress: () => void;
  mode: 'reel' | 'grid';
  index?: number;
  scrollOffset?: SharedValue<number>;
  reduceMotion?: boolean;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    if (mode !== 'reel' || index === undefined || !scrollOffset) return {};
    if (reduceMotion) {
      return { opacity: 1, transform: [{ scale: 1 }] };
    }
    const distance = Math.abs(index * CARD_INTERVAL - scrollOffset.value);
    return {
      opacity: interpolate(distance, [0, CARD_INTERVAL], [1, 0.56], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(distance, [0, CARD_INTERVAL], [1, 0.88], Extrapolation.CLAMP),
        },
      ],
    };
  }, [index, mode, reduceMotion, scrollOffset]);
  const Icon = config.icon;
  const { colors } = useTheme();

  return (
    <Animated.View
      style={[
        mode === 'reel' ? styles.reelCardWrap : styles.gridCardWrap,
        { backgroundColor: colors.surface, borderColor: selected ? colors.accent : colors.ink },
        selected && { ...hardShadow.sm },
        animatedStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${config.label}. ${config.description}`}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
      >
        <View style={[styles.cardSurface, mode === 'grid' && styles.gridSurface]}>
          <PatternFill
            pattern="dots"
            colorA={config.primaryColor}
            colorB={colors.surface}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            style={styles.cardPattern}
          />
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.iconDisc,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.ink },
              ]}
            >
              <Icon color={config.primaryColor} size={mode === 'reel' ? 48 : 30} strokeWidth={1.7} />
            </View>
            <Stamp
              id={`venue-${config.key}`}
              label={config.shortLabel.toUpperCase()}
              variant={selected ? 'orange' : 'mauve'}
              tilt={false}
            />
            {selected ? (
              <View style={[styles.checkMark, { backgroundColor: colors.accent }]}>
                <Check color={colors.accentInk} size={17} strokeWidth={3} />
              </View>
            ) : null}
          </View>
          <View style={styles.cardCopy}>
            <Text
              variant={mode === 'reel' ? 'title' : 'label'}
              weight="bold"
              numberOfLines={2}
            >
              {config.label}
            </Text>
            <Text
              variant={mode === 'reel' ? 'body' : 'caption'}
              color="secondary"
              numberOfLines={mode === 'reel' ? 3 : 2}
            >
              {config.description}
            </Text>
            {mode === 'reel' ? (
              <Text variant="caption" color="secondary" numberOfLines={2} style={styles.examples}>
                {config.examples.length ? `e.g. ${config.examples.join(' / ')}` : 'e.g. A unique live music spot'}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function StepVenue() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const listRef = useRef<FlashListRef<VenueType>>(null);
  const venueType = useLogDraft((state) => state.venueType);
  const setVenueType = useLogDraft((state) => state.setVenueType);
  const [viewMode, setViewMode] = useState<'reel' | 'grid'>('reel');
  const scrollOffset = useSharedValue(0);
  const lastSelection = useRef<VenueType | null>(venueType);
  const selectedIndex = venueType ? VENUE_TYPE_ORDER.indexOf(venueType) : -1;
  const sideInset = Math.max(0, (width - CARD_WIDTH) / 2);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.x;
    },
  });

  function handleWebScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollOffset.value = event.nativeEvent.contentOffset.x;
  }

  function selectVenue(type: VenueType, forceHaptic = false) {
    setVenueType(type);
    if (lastSelection.current !== type || forceHaptic) {
      void Haptics.selectionAsync();
    }
    lastSelection.current = type;
  }

  function handleReelSettled(offset: number) {
    const index = Math.max(
      0,
      Math.min(VENUE_TYPE_ORDER.length - 1, Math.round(offset / CARD_INTERVAL)),
    );
    const type = VENUE_TYPE_ORDER[index];
    if (type) selectVenue(type);
  }

  function handleCardPress(type: VenueType) {
    const index = VENUE_TYPE_ORDER.indexOf(type);
    selectVenue(type, true);
    if (viewMode === 'reel') {
      listRef.current?.scrollToOffset({ offset: index * CARD_INTERVAL, animated: !reduceMotion });
    }
  }

  const listProps = {
    ref: listRef,
    data: VENUE_TYPE_ORDER,
    horizontal: true,
    keyExtractor: (item: VenueType) => item,
    renderItem: ({ item, index }: { item: VenueType; index: number }) => (
      <VenueCard
        config={VENUE_TYPES[item]}
        selected={venueType === item}
        onPress={() => handleCardPress(item)}
        mode="reel"
        index={index}
        scrollOffset={scrollOffset}
        reduceMotion={reduceMotion}
      />
    ),
    contentContainerStyle: { paddingHorizontal: sideInset },
    ItemSeparatorComponent: () => <View style={styles.separator} />,
    snapToInterval: CARD_INTERVAL,
    snapToAlignment: 'start' as const,
    decelerationRate: 'fast' as const,
    showsHorizontalScrollIndicator: false,
    onMomentumScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) =>
      handleReelSettled(event.nativeEvent.contentOffset.x),
    scrollEventThrottle: 16,
    initialScrollIndex: selectedIndex >= 0 ? selectedIndex : undefined,
    getItemType: () => 'venue-type',
    style: styles.reel,
  };

  return (
    <WizardStepView step={3}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text variant="title" weight="bold">Choose a venue type</Text>
          <Text color="secondary">Pick the setting that fits the show.</Text>
        </View>

        {viewMode === 'reel' ? (
          Platform.OS === 'web' ? (
            <FlashList {...listProps} onScroll={handleWebScroll} />
          ) : (
            <AnimatedFlashList {...listProps} onScroll={onScroll} />
          )
        ) : (
          <View style={styles.grid}>
            {VENUE_TYPE_ORDER.map((type) => (
              <VenueCard
                key={type}
                config={VENUE_TYPES[type]}
                selected={venueType === type}
                onPress={() => handleCardPress(type)}
                mode="grid"
              />
            ))}
          </View>
        )}

        <View style={[styles.viewToggle, { backgroundColor: colors.surfaceRaised }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reel view"
            accessibilityState={{ selected: viewMode === 'reel' }}
            onPress={() => setViewMode('reel')}
            style={[styles.toggleOption, viewMode === 'reel' && { backgroundColor: colors.surface }]}
          >
            <GalleryHorizontal color={viewMode === 'reel' ? colors.accent : colors.inkMuted} size={17} />
            <Text variant="caption" weight="semibold" color={viewMode === 'reel' ? 'primary' : 'secondary'}>Reel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Grid view"
            accessibilityState={{ selected: viewMode === 'grid' }}
            onPress={() => setViewMode('grid')}
            style={[styles.toggleOption, viewMode === 'grid' && { backgroundColor: colors.surface }]}
          >
            <Grid2X2 color={viewMode === 'grid' ? colors.accent : colors.inkMuted} size={17} />
            <Text variant="caption" weight="semibold" color={viewMode === 'grid' ? 'primary' : 'secondary'}>Grid</Text>
          </Pressable>
        </View>
      </ScrollView>
    </WizardStepView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing[5], paddingVertical: spacing[3] },
  heading: { gap: spacing[2], paddingHorizontal: spacing[4] },
  reel: { height: CARD_HEIGHT, flexGrow: 0 },
  reelCardWrap: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 0,
    borderWidth: 1.5,
    overflow: 'visible',
  },
  cardPressable: { flex: 1, overflow: 'hidden' },
  cardSurface: { flex: 1, justifyContent: 'space-between', padding: spacing[5], position: 'relative' },
  cardPattern: { position: 'absolute', top: 0, left: 0, opacity: 0.12 },
  cardTopRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  iconDisc: {
    alignItems: 'center',
    borderWidth: 1,
    height: 74,
    justifyContent: 'center',
    width: 74,
  },
  checkMark: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  cardCopy: { gap: spacing[2] },
  examples: { paddingTop: spacing[1] },
  separator: { width: CARD_GAP },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], justifyContent: 'center', paddingHorizontal: spacing[4] },
  gridCardWrap: {
    borderWidth: 1.5,
    height: 158,
    overflow: 'visible',
    width: '47%',
  },
  gridSurface: { padding: spacing[3] },
  pressed: { transform: [{ scale: 0.97 }] },
  viewToggle: {
    alignSelf: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing[1],
    padding: spacing[1],
  },
  toggleOption: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 40,
    paddingHorizontal: spacing[3],
  },
});
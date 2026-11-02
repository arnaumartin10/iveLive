import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Calendar, Sparkles, Star, X } from 'lucide-react-native';
import { Text } from '../../components/ui/Text';
import { Pill } from '../../components/ui/Pill';
import { useTheme } from '../../theme/ThemeProvider';
import { VENUE_TYPES } from '../venues/venueTypes';
import { MACRO_GENRES } from '../genres/macroGenres';
import type { CloudArtistNode } from './simulation';

export type CloudInfoCardProps = {
  node: CloudArtistNode;
  position: { left: number; top: number };
  isPinned?: boolean;
  isFocused?: boolean;
  onFocusRelated?: (node: CloudArtistNode) => void;
  onOpenDetails?: (node: CloudArtistNode) => void;
  onClose?: () => void;
  reduceMotion?: boolean;
};

export function CloudInfoCard({
  node,
  position,
  isPinned = false,
  isFocused = false,
  onFocusRelated,
  onOpenDetails,
  onClose,
  reduceMotion = false,
}: CloudInfoCardProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const scale = useSharedValue(reduceMotion ? 1 : 0.94);

  useEffect(() => {
    if (reduceMotion) {
      opacity.set(1);
      scale.set(1);
      return;
    }
    opacity.set(withTiming(1, { duration: 150 }));
    scale.set(withTiming(1, { duration: 150 }));
  }, [node.id, opacity, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));

  const firstYear = node.firstSeen ? node.firstSeen.slice(0, 4) : null;
  const lastYear = node.lastSeen ? node.lastSeen.slice(0, 4) : null;
  const yearSpan =
    firstYear && lastYear
      ? firstYear === lastYear
        ? firstYear
        : `${firstYear} – ${lastYear}`
      : firstYear ?? lastYear ?? null;

  const venueEntries = Object.entries(node.venueTypeCounts).filter(
    (entry): entry is [keyof typeof VENUE_TYPES, number] =>
      entry[0] in VENUE_TYPES && (entry[1] ?? 0) > 0,
  );

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          left: position.left,
          top: position.top,
          backgroundColor: colors.surface,
          borderColor: colors.ink,
          shadowColor: colors.ink,
        },
        animatedStyle,
      ]}
      pointerEvents="auto"
    >
      <View
        pointerEvents="none"
        style={[
          styles.notch,
          styles.notchLeft,
          { backgroundColor: colors.bg, borderColor: colors.ink },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.notch,
          styles.notchRight,
          { backgroundColor: colors.bg, borderColor: colors.ink },
        ]}
      />
      <View style={styles.cardHeader}>
        <Pressable
          style={styles.headerPressable}
          onPress={() => onOpenDetails?.(node)}
          accessibilityRole="button"
          accessibilityLabel={`View ${node.name}`}
        >
          {node.imageUrl ? (
            <Image
              source={{ uri: node.imageUrl }}
              style={[styles.avatar, { borderColor: node.color }]}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: node.color }]}>
              <Text style={styles.avatarInitials} weight="bold">
                {node.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.headerInfo}>
            <Text variant="body" weight="bold" numberOfLines={1}>
              {node.name}
            </Text>
            <View style={styles.macroPillsRow}>
              {node.genreSlugs.slice(0, 2).map((slug) => {
                const macro = MACRO_GENRES[slug as keyof typeof MACRO_GENRES];
                if (!macro) return null;
                return (
                  <View
                    key={slug}
                    style={[styles.macroPill, { backgroundColor: `${macro.color}25`, borderColor: macro.color }]}
                  >
                    <Text style={[styles.macroPillText, { color: macro.color }]}>
                      {macro.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Pressable>

        {isPinned ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close info card"
            onPress={(e) => {
              e?.stopPropagation?.();
              onClose?.();
            }}
            hitSlop={8}
            style={styles.closeBtn}
          >
            <X size={16} color={colors.inkMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.statsRow}>
        <Pill tone="accent">
          {`Seen ${node.logCount}x`}
        </Pill>
        {node.avgRating > 0 ? (
          <View style={styles.ratingBadge}>
            <Star size={12} color={colors.accent} fill={colors.accent} />
            <Text variant="caption" weight="semibold" style={styles.ratingText}>
              {node.avgRating.toFixed(1)}
            </Text>
          </View>
        ) : null}
        {yearSpan ? (
          <View style={styles.yearBadge}>
            <Calendar size={12} color={colors.inkMuted} />
            <Text variant="caption" color="secondary" style={styles.yearText}>
              {yearSpan}
            </Text>
          </View>
        ) : null}
      </View>

      {venueEntries.length > 0 ? (
        <View style={styles.venueRow}>
          {venueEntries.slice(0, 4).map(([venueKey, count]) => {
            const venueDef = VENUE_TYPES[venueKey];
            if (!venueDef) return null;
            const VenueIcon = venueDef.icon;
            return (
              <View
                key={venueKey}
                style={[
                  styles.venueChip,
                  { backgroundColor: `${venueDef.primaryColor}18`, borderColor: `${venueDef.primaryColor}40` },
                ]}
              >
                <VenueIcon size={11} color={venueDef.primaryColor} />
                <Text style={[styles.venueChipText, { color: venueDef.primaryColor }]}>
                  {count}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFocused ? 'Clear related focus' : 'Highlight related artists'}
          onPress={() => onFocusRelated?.(node)}
          style={[
            styles.relatedBtn,
            {
              backgroundColor: isFocused ? `${colors.accent}30` : colors.surface,
              borderColor: isFocused ? colors.accent : colors.line,
            },
          ]}
        >
          <Sparkles size={13} color={isFocused ? colors.accent : colors.inkMuted} />
          <Text
            variant="caption"
            weight="semibold"
            style={{ color: isFocused ? colors.accent : colors.ink }}
          >
            {isFocused ? 'Focused' : 'Related'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open artist profile sheet"
          onPress={() => onOpenDetails?.(node)}
          style={[
            styles.detailsBtn,
            { backgroundColor: colors.surface, borderColor: colors.accent },
          ]}
        >
          <Text
            variant="caption"
            weight="bold"
            style={[styles.detailsBtnText, { color: colors.ink }]}
          >
            View Artist
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    position: 'absolute',
    width: 250,
    borderWidth: 1.5,
    overflow: 'visible',
    padding: 12,
    gap: 10,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.85,
    shadowRadius: 0,
    elevation: 3,
    zIndex: 9999,
  },
  notch: {
    position: 'absolute',
    top: '50%',
    width: 14,
    height: 14,
    marginTop: -7,
    borderRadius: 7,
    borderWidth: 1.5,
    zIndex: 2,
  },
  notchLeft: { left: -8 },
  notchRight: { right: -8 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 14,
  },
  headerInfo: {
    flex: 1,
    gap: 3,
  },
  macroPillsRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  macroPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  macroPillText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
  },
  yearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  yearText: {
    fontSize: 11,
  },
  venueRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  venueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  venueChipText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  relatedBtn: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  detailsBtn: {
    flex: 1,
    height: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtnText: {
    fontSize: 12,
  },
});

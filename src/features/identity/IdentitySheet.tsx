import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Share2, Sparkles, X, ChevronRight, Disc } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing, type ThemeColors } from '../../theme/tokens';
import { useMusicIdentity } from './hooks';
import { shareIdentityCard } from './shareIdentityCard';
import { MIN_SHOWS_FOR_PROTOTYPE } from './logic';
import type { ProfileBasics } from '../profile/types';

// ── Era Color Mapping ─────────────────────────────────────────────────────────

const ERA_COLORS: Record<string, keyof ThemeColors> = {
  'pre-70s': 'warning',
  '70s': 'accent',
  '80s': 'inkMuted',
  '90s': 'ink',
  '00s': 'positive',
  '10s': 'positive',
  '20s': 'accent',
  unknown: 'inkMuted',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function AnimatedAgeYear({
  targetYear,
  reduced,
}: {
  targetYear: number;
  reduced: boolean;
}) {
  const { colors } = useTheme();
  const [displayYear, setDisplayYear] = useState(targetYear - 15);
  const scale = useSharedValue(reduced ? 1 : 0.7);
  const opacity = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }

    scale.value = withTiming(1, { duration: 600 });
    opacity.value = withTiming(1, { duration: 400 });

    const startYear = targetYear - 15;
    const duration = 650;
    const steps = 15;
    const intervalTime = Math.floor(duration / steps);

    let current = startYear;
    const timer = setInterval(() => {
      current += 1;
      if (current >= targetYear) {
        setDisplayYear(targetYear);
        clearInterval(timer);
      } else {
        setDisplayYear(current);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [targetYear, reduced, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const shownYear = reduced ? targetYear : displayYear;

  return (
    <Animated.View style={[styles.ageBadge, animatedStyle]}>
      <Text
        style={[styles.ageNumber, { color: colors.accentInk }]}
        accessibilityLabel={`Musical age ${targetYear}`}
      >
        {shownYear}
      </Text>
    </Animated.View>
  );
}

function TraitChip({ label, color }: { label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.traitChip,
        { backgroundColor: colors.surface, borderColor: color },
      ]}
    >
      <Text
        style={[styles.traitLabel, { color: colors.ink }]}
        weight="semibold"
      >
        {label}
      </Text>
    </View>
  );
}

function VenueSplitBar({
  dist,
}: {
  dist: Record<string, { count?: number; share: number }>;
}) {
  const { colors } = useTheme();
  const clubShare =
    (dist.concert_hall_club?.share ?? 0) + (dist.other?.share ?? 0);
  const stadiumShare =
    (dist.stadium?.share ?? 0) +
    (dist.indoor_arena?.share ?? 0) +
    (dist.festival?.share ?? 0);

  const total = clubShare + stadiumShare;
  if (total <= 0) return null;

  const clubPct = Math.round((clubShare / total) * 100);
  const stadiumPct = 100 - clubPct;

  return (
    <View style={styles.venueSplitWrap}>
      <View style={styles.venueSplitLabels}>
        <Text variant="caption" weight="medium" color="secondary">
          Small / Club ({clubPct}%)
        </Text>
        <Text variant="caption" weight="medium" color="secondary">
          Arena / Fest ({stadiumPct}%)
        </Text>
      </View>
      <View
        style={[styles.splitBarBg, { backgroundColor: colors.surfaceRaised }]}
      >
        <View
          style={[
            styles.splitBarFillLeft,
            { flex: clubPct || 1, backgroundColor: colors.accent },
          ]}
        />
        <View
          style={[
            styles.splitBarFillRight,
            { flex: stadiumPct || 1, backgroundColor: colors.positive },
          ]}
        />
      </View>
    </View>
  );
}

function ArtistExtremeCard({
  label,
  name,
  year,
}: {
  label: string;
  name: string;
  year: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.extremeCard,
        { backgroundColor: colors.surfaceRaised, borderColor: colors.line },
      ]}
    >
      <Text variant="caption" color="secondary" style={styles.extremeLabel}>
        {label}
      </Text>
      <Text weight="bold" numberOfLines={1}>
        {name}
      </Text>
      <Text
        variant="caption"
        style={{ color: colors.accent }}
        weight="semibold"
      >
        Debut: {year}
      </Text>
    </View>
  );
}

// ── Main Identity Sheet Component ─────────────────────────────────────────────

export interface IdentitySheetProps {
  visible: boolean;
  onDismiss: () => void;
  highlightedDecade?: number | null;
  onHighlightDecade?: (decade: number | null) => void;
  profile?: ProfileBasics | null;
  birthYear?: number | null;
  yearOverride?: number | null;
}

export function IdentitySheet({
  visible,
  onDismiss,
  highlightedDecade,
  onHighlightDecade,
  profile,
  birthYear,
  yearOverride,
}: IdentitySheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const hasPresentedRef = useRef(false);
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [sharing, setSharing] = useState(false);
  const snapPoints = useMemo(() => ['92%'], []);

  const { rawData, computed, isLoading, isError } = useMusicIdentity(
    undefined,
    yearOverride,
  );

  useEffect(() => {
    if (visible) {
      hasPresentedRef.current = true;
      sheetRef.current?.present();
    } else if (hasPresentedRef.current) {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleShare = useCallback(async () => {
    if (!profile || !rawData || !computed) return;
    setSharing(true);
    try {
      await shareIdentityCard(profile, rawData, computed);
    } catch (error) {
      console.warn('[IdentitySheet] share failed', error);
    } finally {
      setSharing(false);
    }
  }, [profile, rawData, computed]);

  const prototype = computed?.prototype;
  const shows = rawData?.shows ?? 0;
  const isThinData = shows < MIN_SHOWS_FOR_PROTOTYPE;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      onDismiss={onDismiss}
      backgroundStyle={{ backgroundColor: colors.surface }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.65}
          pressBehavior="close"
        />
      )}
      handleIndicatorStyle={{ backgroundColor: colors.inkMuted }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Hero Banner ──────────────────────────────────────────────── */}
        <View
          style={[
            styles.heroGradient,
            { backgroundColor: colors.surface, borderColor: colors.ink },
          ]}
        >
          <View style={styles.heroTopActions}>
            <Pressable
              onPress={onDismiss}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.ink,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close identity sheet"
            >
              <X size={18} color={colors.ink} />
            </Pressable>
            {profile && computed && !isThinData && !sharing && (
              <Pressable
                onPress={() => void handleShare()}
                style={[
                  styles.shareBtn,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderColor: colors.ink,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Share your music identity card"
              >
                <Share2 size={16} color={colors.ink} />
                <Text variant="caption" weight="bold">
                  Share Card
                </Text>
              </Pressable>
            )}
            {sharing && <ActivityIndicator color={colors.ink} size="small" />}
          </View>

          {isLoading ? (
            <View style={styles.heroLoading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : isError ? (
            <Text style={styles.heroErrorText} color="secondary">
              Could not load your music identity.
            </Text>
          ) : isThinData ? (
            /* Warm Keep Logging state */
            <View style={styles.thinDataWrap}>
              <View style={styles.heroTitleRow}>
                <Disc size={22} color={colors.accent} />
                <Text style={styles.heroTitle} color="primary" weight="bold">
                  Keep Logging
                </Text>
              </View>
              <Text style={styles.heroTagline} color="secondary">
                Log at least {MIN_SHOWS_FOR_PROTOTYPE} shows to unlock your
                concert prototype and musical identity!
              </Text>
              {/* Progress meter */}
              <View style={styles.progressWrap}>
                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: colors.line },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round((shows / MIN_SHOWS_FOR_PROTOTYPE) * 100)}%`,
                        backgroundColor: colors.accent,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel} color="secondary">
                  {shows} of {MIN_SHOWS_FOR_PROTOTYPE} shows logged
                </Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.heroTitleRow}>
                <Sparkles size={22} color={colors.accent} />
                <Text style={styles.heroTitle} color="primary" weight="bold">
                  {prototype?.title ?? 'The Music Lover'}
                </Text>
              </View>
              <Text style={styles.heroTagline} color="secondary">
                {prototype?.tagline ?? 'Every show has a story.'}
              </Text>

              {/* Musical Age callout */}
              {computed?.musicalAge ? (
                <View
                  style={[
                    styles.ageCallout,
                    {
                      backgroundColor: colors.surfaceRaised,
                      borderColor: colors.ink,
                    },
                  ]}
                >
                  <View style={styles.ageTextCol}>
                    <Text
                      variant="caption"
                      weight="bold"
                      color="secondary"
                      style={styles.ageHeader}
                    >
                      MUSICAL AGE
                    </Text>
                    <Text style={[styles.ageSublabel, { color: colors.ink }]}>
                      {computed.musicalAge.formattedText}
                    </Text>
                    <Text
                      variant="caption"
                      color="secondary"
                      style={styles.ageExplain}
                    >
                      {computed.musicalAge.sublabel}
                    </Text>
                  </View>
                  <AnimatedAgeYear
                    targetYear={computed.musicalAge.year}
                    reduced={!!reduceMotion}
                  />
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* ── Body Content ──────────────────────────────────────────────── */}
        {!isThinData && computed && rawData && (
          <View style={styles.body}>
            {/* Era label pill */}
            {computed.eraLabel ? (
              <View
                style={[
                  styles.eraBadge,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderColor: prototype?.accentColor ?? colors.accent,
                  },
                ]}
              >
                <Text style={{ color: colors.ink }} weight="bold">
                  {computed.eraLabel}
                </Text>
                <Text variant="caption" color="secondary">
                  Based on your top era and primary genre
                </Text>
              </View>
            ) : null}

            {/* 3 Key Traits */}
            {prototype?.traits && prototype.traits.length > 0 ? (
              <View style={styles.section}>
                <Text weight="bold" style={styles.sectionTitle}>
                  Key Traits
                </Text>
                <View style={styles.traitsRow}>
                  {prototype.traits.map((trait) => (
                    <TraitChip
                      key={trait}
                      label={trait}
                      color={prototype.accentColor}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {/* Runner-up prototype */}
            {prototype?.runnerUp ? (
              <View
                style={[
                  styles.runnerUpCard,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderColor: colors.line,
                  },
                ]}
              >
                <Text variant="caption" color="secondary">
                  Also leans:
                </Text>
                <Text weight="bold" style={{ color: colors.ink }}>
                  {prototype.runnerUp.title}
                </Text>
              </View>
            ) : null}

            {/* Era breakdown */}
            {rawData.era_distribution.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text weight="bold" style={styles.sectionTitle}>
                    Era Breakdown
                  </Text>
                  <Text variant="caption" color="secondary">
                    Tap to highlight in Cloud
                  </Text>
                </View>

                {/* Stacked segmented bar */}
                <View style={styles.stackedBar}>
                  {rawData.era_distribution.map((item) => {
                    if (item.share <= 0) return null;
                    const bucketKey = item.bucket ?? 'unknown';
                    const color = colors[ERA_COLORS[bucketKey] ?? 'accent'];
                    return (
                      <View
                        key={bucketKey}
                        style={{
                          flex: item.share,
                          backgroundColor: color,
                          height: 14,
                        }}
                      />
                    );
                  })}
                </View>

                {/* Era items list */}
                <View style={styles.eraList}>
                  {rawData.era_distribution.map((item) => {
                    const bucketKey = item.bucket ?? 'unknown';
                    const color = colors[ERA_COLORS[bucketKey] ?? 'accent'];
                    const isSelected =
                      highlightedDecade != null &&
                      item.decade != null &&
                      highlightedDecade === item.decade;

                    return (
                      <Pressable
                        key={bucketKey}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          if (item.decade != null && onHighlightDecade) {
                            onHighlightDecade(isSelected ? null : item.decade);
                          }
                        }}
                        style={[
                          styles.eraRow,
                          isSelected && { backgroundColor: colors.bgSunken },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.bucket}: ${item.share}%`}
                      >
                        <View
                          style={[styles.eraDot, { backgroundColor: color }]}
                        />
                        <Text
                          style={[styles.eraRowLabel, { color: colors.ink }]}
                          weight={isSelected ? 'bold' : 'medium'}
                        >
                          {item.bucket
                            ? item.bucket.toUpperCase()
                            : `${item.decade}s`}
                        </Text>
                        <View
                          style={[
                            styles.eraRowTrack,
                            { backgroundColor: colors.surfaceRaised },
                          ]}
                        >
                          <View
                            style={[
                              styles.eraRowFill,
                              {
                                width: `${Math.round(item.share)}%`,
                                backgroundColor: color,
                              },
                            ]}
                          />
                        </View>
                        <Text
                          variant="caption"
                          color="secondary"
                          weight="semibold"
                        >
                          {item.share.toFixed(0)}%
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Venue Split Mini-bar */}
            <View style={styles.section}>
              <Text weight="bold" style={styles.sectionTitle}>
                Venue Split
              </Text>
              <VenueSplitBar dist={rawData.venue_distribution as any} />
            </View>

            {/* Oldest & Newest Artist Seen */}
            {(rawData.oldest_artist || rawData.newest_artist) && (
              <View style={styles.section}>
                <Text weight="bold" style={styles.sectionTitle}>
                  Your Musical Span
                </Text>
                <View style={styles.extremeRow}>
                  {rawData.oldest_artist && (
                    <ArtistExtremeCard
                      label="Oldest artist seen"
                      name={rawData.oldest_artist.name}
                      year={rawData.oldest_artist.begin_year}
                    />
                  )}
                  {rawData.newest_artist && (
                    <ArtistExtremeCard
                      label="Newest artist seen"
                      name={rawData.newest_artist.name}
                      year={rawData.newest_artist.begin_year}
                    />
                  )}
                </View>
              </View>
            )}

            {/* Highlight in Cloud button */}
            {onHighlightDecade && rawData.weighted_median_begin_year && (
              <Pressable
                style={[
                  styles.highlightAction,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderColor: prototype?.accentColor ?? colors.accent,
                  },
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  const medianDecade =
                    Math.floor(rawData.weighted_median_begin_year! / 10) * 10;
                  onHighlightDecade(medianDecade);
                  onDismiss();
                }}
                accessibilityRole="button"
                accessibilityLabel="Highlight my era in Cloud"
              >
                <Text style={{ color: colors.ink }} weight="bold">
                  ✦ Highlight my era in Cloud
                </Text>
                <ChevronRight size={16} color={colors.accent} />
              </Pressable>
            )}
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 48,
  },
  heroGradient: {
    borderWidth: 1.5,
    padding: spacing.xl,
    paddingTop: spacing.md,
    minHeight: 220,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  heroTopActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
  },
  heroLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  heroErrorText: {
    marginTop: spacing.md,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  heroTagline: {
    fontSize: 15,
    marginTop: 4,
    lineHeight: 22,
  },
  thinDataWrap: {
    marginTop: spacing.sm,
    gap: 8,
  },
  progressWrap: {
    marginTop: spacing.md,
    gap: 6,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  ageCallout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  ageTextCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  ageHeader: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  ageSublabel: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  ageExplain: {
    fontSize: 11,
    marginTop: 2,
  },
  ageBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageNumber: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  eraBadge: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
  },
  traitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  traitChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  traitLabel: {
    fontSize: 13,
  },
  runnerUpCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: 4,
  },
  eraList: {
    gap: 6,
    marginTop: spacing.xs,
  },
  eraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
  },
  eraDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eraRowLabel: {
    width: 65,
    fontSize: 12,
  },
  eraRowTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  eraRowFill: {
    height: 6,
    borderRadius: 3,
  },
  venueSplitWrap: {
    gap: 6,
  },
  venueSplitLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  splitBarBg: {
    flexDirection: 'row',
    height: 10,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  splitBarFillLeft: {
    borderTopLeftRadius: radius.full,
    borderBottomLeftRadius: radius.full,
  },
  splitBarFillRight: {
    borderTopRightRadius: radius.full,
    borderBottomRightRadius: radius.full,
  },
  extremeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  extremeCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 3,
  },
  extremeLabel: {
    fontSize: 11,
  },
  highlightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
});

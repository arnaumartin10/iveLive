import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { routes } from '../../navigation/routes';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowRight, Plus, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { format } from 'date-fns';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ShareConcertButton } from '../../components/log/ShareConcertButton';
import { GenreLabel, Stamp, Sticker } from '../../components/paper';
import { Mascot } from '../../components/brand/Mascot';
import { isMacroGenre } from '../../components/brand/mascotColors';
import { useAuthStore } from '../../features/auth/store';
import { useConcert, useUserConcerts } from '../../features/concerts/hooks';
import {
  cloudTerritoryBeforeLogKey,
  useUserTerritoryStats,
} from '../../features/cloud/hooks';
import {
  detectNewTerritories,
  type TerritoryStat,
} from '../../features/cloud/experience';
import type { ConcertWithRelations } from '../../features/concerts/types';
import { useLogDraft } from '../../features/log/store';
import { useTimelineStore } from '../../features/concerts/timelineStore';
import { MACRO_GENRES } from '../../features/genres/macroGenres';
import { MiniCloud } from '../../features/cloud/CloudGraph';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, spacing, spring } from '../../theme/tokens';
import { cloudExperiencePreferences } from '../../features/cloud/experiencePrefs';
import { playCloudSound } from '../../features/cloud/sounds';

type ParticleSeed = {
  dx: number;
  dy: number;
  gravity: number;
  rotation: number;
  size: number;
  colorIndex: number;
};

function createParticleSeeds(): ParticleSeed[] {
  return Array.from({ length: 120 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 90 + Math.random() * 260;
    return {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      gravity: 100 + Math.random() * 230,
      rotation: (Math.random() - 0.5) * 1100,
      size: 3 + Math.random() * 6,
      colorIndex: Math.floor(Math.random() * 5),
    };
  });
}

function ConfettiParticle({
  seed,
  color,
  borderColor,
  progress,
  centerX,
  originY,
}: {
  seed: ParticleSeed;
  color: string;
  borderColor: string;
  progress: SharedValue<number>;
  centerX: number;
  originY: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const value = progress.value;
    return {
      opacity: interpolate(
        value,
        [0, 0.1, 0.76, 1],
        [0, 1, 0.9, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        { translateX: seed.dx * value },
        { translateY: seed.dy * value + seed.gravity * value * value },
        { rotate: `${seed.rotation * value}deg` },
      ],
    };
  }, [progress, seed]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: centerX,
          top: originY,
          width: seed.size,
          height: seed.size * 1.7,
          backgroundColor: color,
          borderColor,
        },
        animatedStyle,
      ]}
    />
  );
}

function ordinal(value: number) {
  const suffix =
    value % 100 >= 11 && value % 100 <= 13
      ? 'th'
      : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[
          value % 10
        ] ?? 'th');
  return `${value}${suffix}`;
}

export default function LogDoneScreen() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const { id, skipped, setlistSaveFailed } = useLocalSearchParams<{
    id: string;
    skipped?: string;
    setlistSaveFailed?: string;
  }>();
  const userId = useAuthStore((state) => state.user?.id ?? '');
  const queryClient = useQueryClient();
  const draftArtist = useLogDraft((state) => state.artist);
  const reset = useLogDraft((state) => state.reset);
  const setStep = useLogDraft((state) => state.setStep);
  const reduceMotion = useReducedMotion();
  const concertQuery = useConcert(id ?? '');
  const concertsQuery = useUserConcerts(userId);
  const territoryStatsQuery = useUserTerritoryStats(userId);
  const [particleSeeds] = useState(createParticleSeeds);
  const [shareError, setShareError] = useState<string | null>(null);
  const progress = useSharedValue(0);
  const avatarScale = useSharedValue(0.92);
  const territoryStampScale = useSharedValue(0.65);
  const didStart = useRef(false);
  const didCelebrateTerritory = useRef<string | null>(null);
  const concert: ConcertWithRelations | undefined = concertQuery.data;
  const artist = concert?.artist ?? draftArtist;
  const genre = artist?.primary_macro ?? artist?.macro_genres[0] ?? 'other';
  const genreColor =
    MACRO_GENRES[genre as keyof typeof MACRO_GENRES]?.color ?? colors.accent;
  const colorSet = [
    colors.accent,
    colors.positive,
    colors.ink,
    colors.surface,
    colors.inkMuted,
  ];
  const logs = concertsQuery.data ?? [];
  const artistLogCount = concert
    ? logs.filter((log) => log.artist_id === concert.artist_id).length
    : 1;
  const artistCount = new Set(logs.map((log) => log.artist_id)).size || 1;
  const showCount = logs.length || 1;
  const territoryBefore = useMemo(
    () =>
      id
        ? queryClient.getQueryData<TerritoryStat[]>(
            cloudTerritoryBeforeLogKey(id),
          )
        : undefined,
    [id, queryClient],
  );
  const discoveredTerritory = useMemo(() => {
    if (!territoryBefore || !territoryStatsQuery.isSuccess) return null;
    const newTerritories = detectNewTerritories(
      territoryBefore,
      territoryStatsQuery.data,
    );
    return (
      newTerritories.find(
        (item) => item.macro_slug === concert?.artist?.primary_macro,
      ) ??
      newTerritories[0] ??
      null
    );
  }, [
    concert?.artist?.primary_macro,
    territoryBefore,
    territoryStatsQuery.data,
    territoryStatsQuery.isSuccess,
  ]);

  useEffect(() => {
    if (
      !id ||
      !territoryStatsQuery.isSuccess ||
      territoryStatsQuery.isFetching ||
      didCelebrateTerritory.current === id
    )
      return;
    didCelebrateTerritory.current = id;
    if (!territoryBefore) {
      console.warn(
        '[cloud] Previous territory stats were unavailable; skipping the discovery ceremony.',
      );
    } else {
      queryClient.removeQueries({
        queryKey: cloudTerritoryBeforeLogKey(id),
        exact: true,
      });
    }
    if (!discoveredTerritory) return;
    territoryStampScale.value = withSpring(1, {
      ...spring.snappy,
      damping: 0.7,
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    void AsyncStorage.getItem(cloudExperiencePreferences.soundEnabled)
      .then((enabled) =>
        playCloudSound('stamp', enabled === 'true', reduceMotion),
      )
      .catch((error: unknown) => {
        console.error(
          '[cloud] Unable to read sound preference for the territory stamp.',
          error,
        );
      });
  }, [
    discoveredTerritory,
    id,
    queryClient,
    reduceMotion,
    territoryBefore,
    territoryStampScale,
    territoryStatsQuery.isFetching,
    territoryStatsQuery.isSuccess,
  ]);

  useEffect(() => {
    if (didStart.current) return;
    didStart.current = true;
    avatarScale.value = withSpring(1, { ...spring.gentle, damping: 14 });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!reduceMotion) {
      progress.value = withTiming(1, { duration: 2500 });
    }
  }, [avatarScale, progress, reduceMotion]);

  const avatarStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: reduceMotion ? 1 : avatarScale.value }],
    }),
    [reduceMotion],
  );
  const territoryStampStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: reduceMotion ? 1 : territoryStampScale.value }],
    }),
    [reduceMotion],
  );

  function handleTimelinePress() {
    if (!id) return;
    reset();
    useTimelineStore.getState().resetFilters();
    router.replace(routes.profile('timeline', { highlight: id }));
  }

  function handleAnotherPress() {
    reset();
    router.replace(routes.logWizard());
  }

  function handleAddPhotos() {
    if (!id) return;
    setStep(6);
    router.navigate(routes.logKeepsakes(id));
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        {!reduceMotion
          ? particleSeeds.map((seed, index) => (
              <ConfettiParticle
                key={index}
                seed={seed}
                color={colorSet[seed.colorIndex] ?? genreColor}
                borderColor={colors.ink}
                progress={progress}
                centerX={width / 2}
                originY={height * 0.31}
              />
            ))
          : null}

        <View style={styles.hero}>
          <Mascot
            animated={!reduceMotion}
            genre={isMacroGenre(genre) ? genre : 'unclassified'}
            mood="hyped"
            size={66}
            style={styles.mascotCelebration}
            variant="sticker"
          />
          <Animated.View
            style={[
              styles.artistSticker,
              { borderColor: colors.ink, backgroundColor: colors.surface },
              avatarStyle,
            ]}
          >
            {artist?.image_url_large || artist?.image_url_thumb ? (
              <Sticker id={`logged-${artist.id}`} size={204} tilt={false}>
                <Image
                  source={{
                    uri: artist.image_url_large ?? artist.image_url_thumb ?? '',
                  }}
                  style={styles.artistPhoto}
                  contentFit="cover"
                  transition={250}
                />
              </Sticker>
            ) : (
              <Sticker id="logged-fallback" size={204} tilt={false}>
                <View
                  style={[
                    styles.photoFallback,
                    { backgroundColor: colors.surfaceRaised },
                  ]}
                >
                  <Text variant="headline" style={{ color: colors.ink }}>
                    {artist?.name.slice(0, 1).toUpperCase() ?? '♪'}
                  </Text>
                </View>
              </Sticker>
            )}
          </Animated.View>
          <Stamp
            id="admit-one-logged"
            label="ADMIT ONE / LOGGED"
            variant="orange"
            tilt
            style={styles.successStamp}
          />
        </View>

        <Animated.View
          entering={
            reduceMotion ? undefined : FadeInDown.delay(280).duration(360)
          }
          style={styles.copy}
        >
          <Text variant="headline" center style={styles.title}>
            Added to your archive
          </Text>
          <Text
            variant="body"
            color="secondary"
            center
            style={styles.artistName}
          >
            {artist?.name ?? 'Your show'}
          </Text>
          <Text
            variant="caption"
            color="secondary"
            center
            style={styles.dateLine}
          >
            {concert
              ? format(
                  new Date(`${concert.event_date}T12:00:00`),
                  'EEEE, d MMMM yyyy',
                )
              : ''}
          </Text>
        </Animated.View>

        <Animated.View
          entering={
            reduceMotion ? undefined : FadeInDown.delay(560).duration(360)
          }
        >
          <Text variant="label" color="accent" center style={styles.statLine}>
            {artistLogCount > 1
              ? `Your ${ordinal(artistLogCount)} time seeing them`
              : `Artist #${artistCount}  ·  Show #${showCount}`}
          </Text>
        </Animated.View>

        {territoryStatsQuery.isError ? (
          <Text variant="caption" color="danger" center>
            Show saved. Atlas progress could not be refreshed yet.
          </Text>
        ) : null}
        {setlistSaveFailed === 'true' ? (
          <Text variant="caption" color="danger" center>
            Show saved, but the setlist could not be saved. You can add it from
            the concert details.
          </Text>
        ) : null}

        {discoveredTerritory ? (
          <Card style={styles.territoryCard} padding={spacing[3]}>
            <View style={styles.territoryHeading}>
              <Animated.View style={territoryStampStyle}>
                <Stamp
                  id={`new-territory-${discoveredTerritory.macro_slug}`}
                  label="NEW TERRITORY"
                  variant="orange"
                  tilt
                  style={styles.territoryStamp}
                />
              </Animated.View>
              <View style={styles.territoryCopy}>
                <GenreLabel
                  genre={
                    discoveredTerritory.macro_slug in MACRO_GENRES
                      ? (discoveredTerritory.macro_slug as keyof typeof MACRO_GENRES)
                      : 'other'
                  }
                  label={
                    MACRO_GENRES[
                      discoveredTerritory.macro_slug as keyof typeof MACRO_GENRES
                    ]?.label ??
                    discoveredTerritory.macro_slug.replaceAll('_', ' ')
                  }
                  size="sm"
                />
                <Text variant="caption" color="secondary">
                  Another part of your musical map, printed in.
                </Text>
              </View>
            </View>
            <View
              style={[styles.territoryMiniMap, { borderColor: colors.ink }]}
            >
              <MiniCloud userId={userId} height={72} />
            </View>
            <Button
              label="See on the atlas"
              size="sm"
              onPress={() =>
                router.navigate(
                  routes.cloud(`macro:${discoveredTerritory.macro_slug}`),
                )
              }
            />
          </Card>
        ) : null}

        <View style={styles.actions}>
          {skipped === 'true' ? (
            <Button
              label="Add photos"
              size="lg"
              variant="secondary"
              onPress={handleAddPhotos}
            />
          ) : null}
          <Button
            label="See in Timeline"
            rightIcon={<ArrowRight color={colors.accentInk} size={18} />}
            size="lg"
            onPress={handleTimelinePress}
          />
          <View style={styles.secondaryActions}>
            <Pressable
              accessibilityRole="button"
              onPress={handleAnotherPress}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <Plus color={colors.accent} size={17} />
              <Text variant="label" color="accent">
                Log another
              </Text>
            </Pressable>
            {concert ? (
              <ShareConcertButton
                artistName={artist?.name ?? 'Live show'}
                imageUri={
                  artist?.image_url_large ?? artist?.image_url_thumb ?? null
                }
                genreColor={genreColor}
                eventDate={concert.event_date}
                venueName={concert.venue_name}
                rating={concert.rating}
                onError={setShareError}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setShareError('The share card is not ready yet.')
                }
                style={styles.secondaryButton}
              >
                <Share2 color={colors.inkMuted} size={17} />
                <Text variant="label" color="secondary">
                  Share
                </Text>
              </Pressable>
            )}
          </View>
          {shareError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShareError(null)}
            >
              <Text
                variant="caption"
                color="danger"
                center
                style={styles.shareError}
              >
                {shareError}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[6],
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 270,
    width: '100%',
  },
  artistSticker: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: 216,
    justifyContent: 'center',
    width: 216,
  },
  artistPhoto: { height: 204, width: 204 },
  mascotCelebration: { bottom: 7, left: 8, position: 'absolute', zIndex: 1 },
  successStamp: { position: 'absolute', bottom: 8, right: 12 },
  photoFallback: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  copy: { alignItems: 'center', gap: spacing[2], maxWidth: 360 },
  title: {},
  artistName: { fontFamily: fontFamily.medium },
  dateLine: {},
  statLine: {},
  territoryCard: { alignSelf: 'stretch', gap: spacing[2], maxWidth: 420 },
  territoryHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
  },
  territoryStamp: { margin: 0 },
  territoryCopy: { flex: 1, gap: 3 },
  territoryMiniMap: { borderWidth: 1, height: 72, overflow: 'hidden' },
  actions: { gap: spacing[3], width: '100%', maxWidth: 420 },
  secondaryActions: { flexDirection: 'row', gap: spacing[3] },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing[2],
  },
  shareError: {},
  particle: { borderWidth: 0.5, position: 'absolute' },
});

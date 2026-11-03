import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  FadeIn,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Share2, Sparkles, Star, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  BarChart,
  CountUp,
  Donut,
  Gauge,
  Histogram,
  StackedBar,
} from '../stats/Charts';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';
import { Text } from '../ui/Text';
import { Grain, GenreLabel, VenueLabel } from '../paper';
import { useMe } from '../../features/auth/hooks';
import { useMyLogs } from '../../features/concerts/hooks';
import {
  useGenreStats,
  useStatsOverview,
  useVenueStats,
} from '../../features/stats/hooks';
import {
  buildWrappedData,
  type WrappedData,
  type WrappedSlideId,
} from '../../features/wrapped/buildWrappedData';
import { shareWrappedImage } from '../../features/wrapped/shareImage';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import type { StatsScope } from '../../features/stats/types';
import type { ConcertWithRelations } from '../../features/concerts/types';
import type { MacroGenre } from '../../features/genres/macroGenres';

const SLIDE_MS = 6000;
const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function parseScope(raw: string | undefined): StatsScope {
  if (!raw || raw === 'all') return null;
  const year = Number(raw);
  return Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : null;
}

function formatDate(value: string | null) {
  if (!value) return 'Not yet';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

function useEntrance(delay: number, reducedMotion: boolean) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = reducedMotion
      ? withDelay(delay, withTiming(1, { duration: 160 }))
      : withDelay(delay, withSpring(1, { damping: 22, stiffness: 180 }));
  }, [delay, progress, reducedMotion]);
  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: reducedMotion
      ? []
      : [
          { translateY: (1 - progress.value) * 16 },
          { scale: 0.97 + progress.value * 0.03 },
        ],
  }));
}

function Entrance({
  children,
  delay = 0,
  reducedMotion = false,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  reducedMotion?: boolean;
  style?: object;
}) {
  const entranceStyle = useEntrance(delay, reducedMotion);
  return (
    <Animated.View style={[entranceStyle, style]}>{children}</Animated.View>
  );
}

function WrappedSlide({
  slide,
  data,
  userName,
  avatarUrl,
  wallLogs,
  reducedMotion,
}: {
  slide: WrappedSlideId;
  data: WrappedData;
  userName: string;
  avatarUrl: string | null;
  wallLogs: ConcertWithRelations[];
  reducedMotion: boolean;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const headingStyle = {
    color: colors.accentInk,
    textAlign: 'center' as const,
  };
  const secondaryStyle = {
    color: colors.inkMuted,
    textAlign: 'center' as const,
  };

  switch (slide) {
    case 'intro':
      return (
        <View style={styles.slideCenter}>
          <Entrance reducedMotion={reducedMotion}>
            <Avatar
              name={userName}
              imageUrl={avatarUrl}
              size="xl"
              ringColor={colors.ink}
            />
          </Entrance>
          <Entrance delay={90} reducedMotion={reducedMotion}>
            <Text variant="overline" style={secondaryStyle}>
              IVELIVE WRAPPED
            </Text>
          </Entrance>
          <Entrance delay={170} reducedMotion={reducedMotion}>
            <Text
              variant="display"
              weight="black"
              style={[headingStyle, styles.introTitle]}
            >
              {data.year == null
                ? 'Your live music story'
                : `Your ${data.year} in live music`}
            </Text>
          </Entrance>
          <Entrance delay={250} reducedMotion={reducedMotion}>
            <Text variant="body" style={secondaryStyle}>
              A year measured in rooms, choruses, and encore lights.
            </Text>
          </Entrance>
        </View>
      );
    case 'total':
      return (
        <View style={styles.slideCenter}>
          <Entrance reducedMotion={reducedMotion}>
            <Text variant="overline" style={secondaryStyle}>
              THE YEAR IN SHOWS
            </Text>
          </Entrance>
          <Entrance delay={90} reducedMotion={reducedMotion}>
            <CountUp value={data.totalShows} fontSize={148} />
          </Entrance>
          <Entrance delay={160} reducedMotion={reducedMotion}>
            <Text variant="display" weight="black" style={headingStyle}>
              shows
            </Text>
          </Entrance>
          <Entrance delay={250} reducedMotion={reducedMotion}>
            <Text variant="title" style={headingStyle}>
              Across {data.uniqueVenues} venues and {data.uniqueArtists}{' '}
              artists.
            </Text>
          </Entrance>
        </View>
      );
    case 'top-artist':
      return (
        <View style={styles.slideCenter}>
          <Entrance
            reducedMotion={reducedMotion}
            style={[
              styles.artistPhotoFrame,
              {
                borderColor: data.genreColors[0] ?? colors.accent,
                shadowColor: colors.bgSunken,
              },
            ]}
          >
            <View style={styles.artistPhotoClip}>
              {data.topArtist?.imageUrl ? (
                <Image
                  source={{ uri: data.topArtist.imageUrl }}
                  contentFit="cover"
                  style={styles.artistPhoto}
                />
              ) : (
                <Avatar name={data.topArtist?.name ?? 'Artist'} size="xl" />
              )}
            </View>
          </Entrance>
          <Entrance delay={100} reducedMotion={reducedMotion}>
            <Text variant="overline" style={secondaryStyle}>
              YOUR MOST-SEEN ARTIST
            </Text>
          </Entrance>
          <Entrance delay={190} reducedMotion={reducedMotion}>
            <Text
              variant="display"
              weight="black"
              numberOfLines={2}
              style={[headingStyle, styles.artistName]}
            >
              {data.topArtist?.name}
            </Text>
          </Entrance>
          <Entrance delay={270} reducedMotion={reducedMotion}>
            <Text variant="title" style={headingStyle}>
              {data.topArtist?.count} nights together
            </Text>
          </Entrance>
          <Entrance delay={350} reducedMotion={reducedMotion}>
            <Text variant="caption" style={secondaryStyle}>
              {formatDate(data.topArtist?.firstSeen ?? null)} ·{' '}
              {formatDate(data.topArtist?.lastSeen ?? null)}
            </Text>
          </Entrance>
        </View>
      );
    case 'top-artists':
      return (
        <View style={styles.slideContent}>
          <Entrance reducedMotion={reducedMotion}>
            <Text variant="display" weight="black" style={headingStyle}>
              The soundtrack
            </Text>
          </Entrance>
          {data.topArtists.map((artist, index) => (
            <Entrance
              key={artist.id}
              delay={index * 75}
              reducedMotion={reducedMotion}
              style={styles.rankedArtist}
            >
              <Text
                variant="label"
                weight="bold"
                style={{ color: colors.accentInk, width: 28 }}
              >
                {String(index + 1).padStart(2, '0')}
              </Text>
              <Avatar
                name={artist.name}
                imageUrl={artist.imageUrl}
                size="md"
                ringColor={
                  data.genreColors[
                    index % Math.max(1, data.genreColors.length)
                  ] ?? colors.accent
                }
              />
              <View style={styles.flexOne}>
                <Text
                  variant="body"
                  weight="bold"
                  numberOfLines={1}
                  style={{ color: colors.accentInk }}
                >
                  {artist.name}
                </Text>
                <Text variant="caption" style={secondaryStyle}>
                  {artist.count} shows
                </Text>
              </View>
            </Entrance>
          ))}
        </View>
      );
    case 'genres':
      return (
        <View style={styles.slideCenter}>
          <Entrance reducedMotion={reducedMotion}>
            <Text variant="display" weight="black" style={headingStyle}>
              Your top genres
            </Text>
          </Entrance>
          <Entrance delay={80} reducedMotion={reducedMotion}>
            <Donut
              animationKey={`wrapped-genres-${data.year ?? 'all'}`}
              values={data.topGenres.map((genre) => genre.count)}
              colors={data.topGenres.map((genre) => genre.color)}
              center={`${data.topGenres.reduce((sum, genre) => sum + genre.count, 0)}`}
              size={Math.min(210, width * 0.58)}
            />
          </Entrance>
          <View style={styles.genreRows}>
            {data.topGenres.map((genre, index) => (
              <Entrance
                key={genre.slug}
                delay={130 + index * 75}
                reducedMotion={reducedMotion}
                style={styles.genreRow}
              >
                <GenreLabel
                  genre={genre.slug as MacroGenre}
                  label={`${genre.label} · ${genre.percentage}%`}
                  size="md"
                  variant="stamp"
                  surface="sunken"
                  interactive={false}
                />
              </Entrance>
            ))}
          </View>
        </View>
      );
    case 'venues':
      return (
        <View style={styles.slideContent}>
          <Entrance reducedMotion={reducedMotion}>
            <Text variant="display" weight="black" style={headingStyle}>
              Where you went
            </Text>
          </Entrance>
          <Entrance delay={80} reducedMotion={reducedMotion}>
            <StackedBar
              animationKey={`wrapped-venues-${data.year ?? 'all'}`}
              values={data.venueMix.map((venue) => venue.count)}
              colors={data.venueMix.map((venue) => venue.color)}
            />
          </Entrance>
          {data.venueMix.map((venue, index) => {
            return (
              <Entrance
                key={venue.type}
                delay={130 + index * 60}
                reducedMotion={reducedMotion}
                style={styles.venueLine}
              >
                <VenueLabel
                  venue={venue.type}
                  label={venue.label}
                  size="xs"
                  surface="sunken"
                  style={{ flex: 1 }}
                />
                <Text variant="caption" style={{ color: colors.ink }}>
                  {venue.count} · {venue.percentage}%
                </Text>
              </Entrance>
            );
          })}
          {data.mostVisitedVenue ? (
            <Entrance delay={380} reducedMotion={reducedMotion}>
              <View style={styles.venueLine}>
                <Text variant="title" style={headingStyle}>
                  Most visited:
                </Text>
                <VenueLabel
                  venue={data.mostVisitedVenue.type ?? 'other'}
                  label={data.mostVisitedVenue.name}
                  size="sm"
                  surface="sunken"
                />
              </View>
            </Entrance>
          ) : null}
        </View>
      );
    case 'month':
      return (
        <View style={styles.slideContent}>
          <Entrance reducedMotion={reducedMotion}>
            <Text variant="overline" style={secondaryStyle}>
              YOUR BUSIEST MONTH
            </Text>
          </Entrance>
          <Entrance delay={80} reducedMotion={reducedMotion}>
            <Text variant="display" weight="black" style={headingStyle}>
              {data.busiestMonth
                ? new Intl.DateTimeFormat(undefined, { month: 'long' }).format(
                    new Date(2025, data.busiestMonth.month - 1, 1),
                  )
                : 'Live music'}
            </Text>
          </Entrance>
          <Entrance delay={150} reducedMotion={reducedMotion}>
            <Text variant="title" style={headingStyle}>
              {data.busiestMonth?.count ?? 0} shows
            </Text>
          </Entrance>
          <Entrance delay={220} reducedMotion={reducedMotion}>
            <BarChart
              animationKey={`wrapped-month-${data.year ?? 'all'}`}
              values={data.showsByMonth}
              colors={data.showsByMonth.map((_count, index) =>
                index + 1 === data.busiestMonth?.month
                  ? colors.accentInk
                  : (data.genreColors[0] ?? colors.accent),
              )}
              height={130}
            />
          </Entrance>
          <Entrance delay={310} reducedMotion={reducedMotion}>
            <Text variant="body" style={headingStyle}>
              Busiest weekday:{' '}
              {WEEKDAYS[(data.busiestWeekday?.weekday ?? 1) - 1]}
            </Text>
          </Entrance>
        </View>
      );
    case 'records':
      return (
        <View style={styles.slideContent}>
          <Entrance reducedMotion={reducedMotion}>
            <Text variant="display" weight="black" style={headingStyle}>
              The records
            </Text>
          </Entrance>
          <RecordLine
            label="Longest streak"
            value={`${data.longestStreakWeeks} weeks`}
            delay={80}
            reducedMotion={reducedMotion}
          />
          <RecordLine
            label="Most shows in one week"
            value={`${data.mostShowsInOneWeek}`}
            delay={150}
            reducedMotion={reducedMotion}
          />
          <RecordLine
            label="Longest gap"
            value={`${data.longestGapDays} days`}
            delay={220}
            reducedMotion={reducedMotion}
          />
        </View>
      );
    case 'taste':
      return (
        <View style={styles.slideCenter}>
          <Entrance reducedMotion={reducedMotion}>
            <Text variant="overline" style={secondaryStyle}>
              YOUR TASTE
            </Text>
          </Entrance>
          <Entrance delay={80} reducedMotion={reducedMotion}>
            <Gauge
              animationKey={`wrapped-taste-${data.year ?? 'all'}`}
              value={data.tasteScore}
              color={colors.accentInk}
            />
          </Entrance>
          <Entrance delay={160} reducedMotion={reducedMotion}>
            <Text variant="display" weight="black" style={headingStyle}>
              {data.personality.title}
            </Text>
          </Entrance>
          <Entrance delay={240} reducedMotion={reducedMotion}>
            <Text variant="body" style={secondaryStyle}>
              {data.personality.description}
            </Text>
          </Entrance>
          {data.dominantGenre ? (
            <Entrance delay={320} reducedMotion={reducedMotion}>
              <GenreLabel
                genre={data.dominantGenre.slug as MacroGenre}
                label={`${data.dominantGenre.percentage}% · ${data.dominantGenre.label}`}
                size="sm"
                surface="sunken"
              />
            </Entrance>
          ) : null}
        </View>
      );
    case 'ratings':
      return (
        <View style={styles.slideContent}>
          <Entrance reducedMotion={reducedMotion}>
            <Text variant="display" weight="black" style={headingStyle}>
              Your ratings
            </Text>
          </Entrance>
          <Entrance delay={90} reducedMotion={reducedMotion}>
            <Text variant="title" style={headingStyle}>
              {data.ratingLabel}
            </Text>
          </Entrance>
          <Entrance delay={170} reducedMotion={reducedMotion}>
            <Histogram
              animationKey={`wrapped-ratings-${data.year ?? 'all'}`}
              values={data.ratingHistogram}
              average={data.averageRating}
              color={colors.accentInk}
            />
          </Entrance>
          <Entrance delay={240} reducedMotion={reducedMotion}>
            <Text variant="title" style={headingStyle}>
              {data.fiveStarCount} five-star shows
            </Text>
          </Entrance>
        </View>
      );
    case 'wall-of-fame':
      return (
        <View style={styles.slideContent}>
          <Entrance reducedMotion={reducedMotion}>
            <Text variant="display" weight="black" style={headingStyle}>
              Wall of Fame
            </Text>
          </Entrance>
          <View style={styles.wallMosaic}>
            {wallLogs.slice(0, 9).map((log, index) => (
              <Entrance
                key={log.id}
                delay={index * 55}
                reducedMotion={reducedMotion}
                style={[
                  styles.wallTile,
                  { backgroundColor: colors.surface, borderColor: colors.ink },
                ]}
              >
                {log.artist?.image_url_large ? (
                  <Image
                    source={{ uri: log.artist.image_url_large }}
                    contentFit="cover"
                    style={styles.wallImage}
                  />
                ) : (
                  <Avatar name={log.artist?.name ?? 'Artist'} size="md" />
                )}
                <Star
                  size={15}
                  color={colors.accent}
                  fill={colors.accent}
                  style={styles.wallStar}
                />
              </Entrance>
            ))}
          </View>
          <Entrance delay={330} reducedMotion={reducedMotion}>
            <Text variant="caption" style={secondaryStyle}>
              {data.fiveStarCount} nights got the full five.
            </Text>
          </Entrance>
        </View>
      );
    case 'badges':
      return (
        <View style={styles.slideContent}>
          <Entrance reducedMotion={reducedMotion}>
            <Text variant="display" weight="black" style={headingStyle}>
              Badges earned
            </Text>
          </Entrance>
          <View style={styles.badgeList}>
            {data.earnedBadges.slice(0, 8).map((badge, index) => (
              <Entrance
                key={badge}
                delay={index * 65}
                reducedMotion={reducedMotion}
                style={styles.badgeChip}
              >
                <Sparkles size={16} color={colors.accent} />
                <Text
                  variant="body"
                  weight="bold"
                  style={{ color: colors.accentInk }}
                >
                  {badge}
                </Text>
              </Entrance>
            ))}
          </View>
        </View>
      );
    case 'outro':
      return (
        <View style={styles.slideCenter}>
          <Entrance reducedMotion={reducedMotion}>
            <Text variant="overline" style={secondaryStyle}>
              THAT WAS YOUR LIVE MUSIC STORY
            </Text>
          </Entrance>
          <Entrance delay={90} reducedMotion={reducedMotion}>
            <Text variant="display" weight="black" style={headingStyle}>
              <CountUp value={data.totalShows} fontSize={76} /> shows
            </Text>
          </Entrance>
          <Entrance delay={170} reducedMotion={reducedMotion}>
            <Text variant="title" style={headingStyle}>
              {data.uniqueArtists} artists · {data.uniqueVenues} venues
            </Text>
          </Entrance>
          <Entrance delay={240} reducedMotion={reducedMotion}>
            <Text variant="title" weight="bold" style={headingStyle}>
              {data.personality.title}
            </Text>
          </Entrance>
        </View>
      );
  }
}

function RecordLine({
  label,
  value,
  delay,
  reducedMotion,
}: {
  label: string;
  value: string;
  delay: number;
  reducedMotion: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Entrance
      delay={delay}
      reducedMotion={reducedMotion}
      style={[styles.recordLine, { borderLeftColor: colors.accent }]}
    >
      <Text variant="display" weight="black">
        {value}
      </Text>
      <Text variant="body" color="secondary">
        {label}
      </Text>
    </Entrance>
  );
}

function StoryProgressSegment({
  active,
  complete,
  paused,
  onComplete,
  trackColor,
  progressColor,
}: {
  active: boolean;
  complete: boolean;
  paused: boolean;
  onComplete: () => void;
  trackColor: string;
  progressColor: string;
}) {
  const progress = useSharedValue(0);
  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  useEffect(() => {
    if (!active || complete || paused) {
      if (paused) cancelAnimation(progress);
      return;
    }
    let mounted = true;
    Promise.resolve().then(() => {
      if (!mounted) return;
      const remaining = Math.max(80, SLIDE_MS * (1 - progress.value));
      progress.value = withTiming(
        1,
        { duration: remaining, easing: (time) => time },
        (finished) => {
          if (finished) runOnJS(onComplete)();
        },
      );
    });
    return () => {
      mounted = false;
      cancelAnimation(progress);
    };
  }, [active, complete, onComplete, paused, progress]);

  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
      {complete ? (
        <View
          style={[
            styles.progressFill,
            styles.progressComplete,
            { backgroundColor: progressColor },
          ]}
        />
      ) : active ? (
        <Animated.View
          style={[
            styles.progressFill,
            styles.progressComplete,
            { backgroundColor: progressColor },
            fillStyle,
          ]}
        />
      ) : null}
    </View>
  );
}

export function WrappedStoryScreen() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ year?: string }>();
  const year = parseScope(params.year);
  const profileQuery = useMe();
  const overviewQuery = useStatsOverview(undefined, year);
  const genresQuery = useGenreStats(undefined, year);
  const venuesQuery = useVenueStats(undefined, year);
  const wallQuery = useMyLogs({
    order: 'newest',
    filters: { minRating: 5, maxRating: 5, ...(year == null ? {} : { year }) },
  });
  const wallLogs = useMemo(
    () => wallQuery.data?.pages.flatMap((page) => page).slice(0, 9) ?? [],
    [wallQuery.data],
  );
  const overview = overviewQuery.data;
  const data = useMemo(
    () =>
      overview
        ? buildWrappedData(
            overview,
            genresQuery.data ?? [],
            venuesQuery.data ?? [],
            year,
          )
        : null,
    [genresQuery.data, overview, venuesQuery.data, year],
  );
  const userName =
    profileQuery.data?.display_name || profileQuery.data?.username || 'You';
  const imageUris = useMemo(
    () => [
      ...new Set(
        [
          data?.topArtist?.imageUrl,
          ...(data?.topArtists ?? []).map((artist) => artist.imageUrl),
          ...wallLogs.map((log) => log.artist?.image_url_large ?? null),
        ].filter((uri): uri is string => !!uri),
      ),
    ],
    [data, wallLogs],
  );
  const imageKey = imageUris.join('|');
  const [preloadedImageKey, setPreloadedImageKey] = useState<string | null>(
    null,
  );
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const slideCount = data?.slides.length ?? 1;
  const imagesReady = preloadedImageKey === imageKey;
  const loading =
    overviewQuery.isLoading ||
    genresQuery.isLoading ||
    venuesQuery.isLoading ||
    profileQuery.isLoading ||
    (overview?.five_star_count ? wallQuery.isLoading : false) ||
    !imagesReady;
  const slides = data?.slides ?? [];
  const slide = slides[slideIndex] ?? 'intro';

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReducedMotion(value);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!data || (overview?.five_star_count && wallQuery.isLoading)) {
      return () => {
        active = false;
      };
    }
    if (imageUris.length === 0) {
      Promise.resolve().then(() => {
        if (active) setPreloadedImageKey(imageKey);
      });
      return () => {
        active = false;
      };
    }
    void Image.prefetch(imageUris, { cachePolicy: 'disk' })
      .catch(() => false)
      .finally(() => {
        if (active) setPreloadedImageKey(imageKey);
      });
    return () => {
      active = false;
    };
  }, [
    data,
    imageKey,
    imageUris,
    overview?.five_star_count,
    wallQuery.isLoading,
  ]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, []);

  const advance = useCallback(() => {
    if (slideIndex >= slideCount - 1) {
      close();
      return;
    }
    setSlideIndex(slideIndex + 1);
    void Haptics.selectionAsync();
  }, [close, slideCount, slideIndex]);

  const goBack = useCallback(() => {
    if (slideIndex <= 0) return;
    setSlideIndex(slideIndex - 1);
    void Haptics.selectionAsync();
  }, [slideIndex]);

  const pausePlayback = useCallback(() => setPaused(true), []);
  const resumePlayback = useCallback(() => setPaused(false), []);

  const closeGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd((event) => {
      if (
        event.translationY > 110 &&
        Math.abs(event.translationY) > Math.abs(event.translationX)
      )
        close();
    });
  const holdGesture = Gesture.LongPress()
    .minDuration(240)
    .runOnJS(true)
    .onStart(pausePlayback)
    .onFinalize(resumePlayback);
  const storyGesture = Gesture.Simultaneous(closeGesture, holdGesture);

  async function handleShare() {
    if (!data || isSharing) return;
    setShareError(null);
    setIsSharing(true);
    try {
      await shareWrappedImage(data, {
        slide,
        username: profileQuery.data?.username ?? 'ivelive',
        avatarUrl: profileQuery.data?.avatar_url,
        wallImageUris: wallLogs
          .map((log) => log.artist?.image_url_large ?? '')
          .filter(Boolean),
        summary: slide === 'outro',
      });
    } catch (error) {
      setShareError(
        error instanceof Error ? error.message : 'Could not share this image.',
      );
    } finally {
      setIsSharing(false);
    }
  }

  if (loading || !data) {
    return (
      <View
        style={[
          styles.loadingScreen,
          {
            backgroundColor: colors.bg,
            paddingTop: insets.top + 28,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <View style={styles.loadingProgressRow}>
          {(
            data?.slides ?? Array.from({ length: 5 }, (_item, index) => index)
          ).map((_item, index) => (
            <View
              key={index}
              style={[styles.progressTrack, { backgroundColor: colors.line }]}
            >
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.accent, width: 0 },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.loadingContent}>
          <ActivityIndicator color={colors.accent} />
          <Text variant="title" weight="bold">
            Preparing your story
          </Text>
          <Text variant="caption" color="secondary" center>
            Loading your artist photos…
          </Text>
          <Skeleton width="70%" height={8} />
        </View>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close Wrapped"
          style={styles.closeButton}
        >
          <X color={colors.ink} size={22} />
        </Pressable>
      </View>
    );
  }

  return (
    <GestureDetector gesture={storyGesture}>
      <View style={[styles.root, { width, height }]}>
        <Animated.View
          key={`${year ?? 'all'}-${slideIndex}`}
          entering={FadeIn.duration(reducedMotion ? 160 : 340)}
          style={StyleSheet.absoluteFill}
        >
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.bgSunken },
            ]}
          />
          <Grain />
        </Animated.View>
        <View style={[styles.progressRow, { top: insets.top + 10 }]}>
          {slides.map((_item, index) => (
            <StoryProgressSegment
              key={`${index}-${slideIndex}`}
              active={index === slideIndex}
              complete={index < slideIndex}
              paused={loading || paused}
              onComplete={advance}
              trackColor={colors.line}
              progressColor={colors.accent}
            />
          ))}
        </View>
        <View style={[styles.topControls, { top: insets.top + 28 }]}>
          <Pressable
            onPress={close}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close Wrapped"
            style={styles.controlButton}
          >
            <X color={colors.accentInk} size={23} />
          </Pressable>
          <Text
            variant="overline"
            style={[styles.slideCounter, { color: colors.accentInk }]}
          >
            {String(slideIndex + 1).padStart(2, '0')} /{' '}
            {String(slideCount).padStart(2, '0')}
          </Text>
          <Pressable
            onPress={() => {
              void handleShare();
            }}
            hitSlop={10}
            disabled={isSharing}
            accessibilityRole="button"
            accessibilityLabel="Share this Wrapped slide"
            style={styles.controlButton}
          >
            {isSharing ? (
              <ActivityIndicator color={colors.accentInk} size="small" />
            ) : (
              <Share2 color={colors.accentInk} size={20} />
            )}
          </Pressable>
        </View>
        <View
          style={[
            styles.slideBody,
            { paddingTop: insets.top + 82, paddingBottom: insets.bottom + 104 },
          ]}
          key={`${year ?? 'all'}-${slide}`}
        >
          <WrappedSlide
            slide={slide}
            data={data}
            userName={userName}
            avatarUrl={profileQuery.data?.avatar_url ?? null}
            wallLogs={wallLogs}
            reducedMotion={reducedMotion}
          />
        </View>
        <View
          style={[
            styles.tapZones,
            { top: insets.top + 80, bottom: insets.bottom + 106 },
          ]}
          pointerEvents="box-none"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous story"
            onPress={goBack}
            style={styles.tapZone}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next story"
            onPress={advance}
            style={styles.tapZone}
          />
        </View>
        <View style={[styles.bottomControls, { bottom: insets.bottom + 22 }]}>
          <Pressable
            onPress={() => (paused ? resumePlayback() : pausePlayback())}
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Resume story' : 'Pause story'}
            style={styles.pauseControl}
          >
            <Text
              variant="caption"
              color="danger"
              weight="semibold"
              style={{ color: colors.accentInk }}
            >
              {paused ? 'Resume' : 'Pause'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void handleShare();
            }}
            disabled={isSharing}
            accessibilityRole="button"
            style={[
              styles.shareButton,
              { backgroundColor: colors.bgSunken, borderColor: colors.ink },
            ]}
          >
            <Share2 size={17} color={colors.accentInk} />
            <Text
              variant="label"
              weight="bold"
              style={{ color: colors.accentInk }}
            >
              {isSharing
                ? 'Preparing…'
                : slide === 'outro'
                  ? 'Share your Wrapped'
                  : 'Share slide'}
            </Text>
          </Pressable>
        </View>
        {shareError ? (
          <Text
            variant="caption"
            style={[styles.errorText, { bottom: insets.bottom + 76 }]}
          >
            {shareError}
          </Text>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingProgress: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: 48,
  },
  loadingProgressRow: {
    position: 'absolute',
    top: 48,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: 4,
  },
  loadingContent: { alignItems: 'center', gap: spacing.md, width: '100%' },
  progressRow: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 10,
    flexDirection: 'row',
    gap: 4,
  },
  progressTrack: {
    height: 4,
    flex: 1,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', width: '100%' },
  progressComplete: {},
  topControls: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 12,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideCounter: {},
  slideBody: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  slideCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
  },
  introTitle: { fontSize: 46, lineHeight: 52 },
  artistPhotoFrame: {
    width: 172,
    height: 172,
    borderRadius: 0,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.9,
    shadowRadius: 0,
    elevation: 3,
  },
  artistPhotoClip: {
    flex: 1,
    width: '100%',
    borderRadius: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistPhoto: { width: '100%', height: '100%' },
  artistName: { fontSize: 42, lineHeight: 48 },
  rankedArtist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
  },
  flexOne: { flex: 1, minWidth: 0 },
  genreRows: { width: '100%', gap: 8 },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 34,
    gap: 8,
  },
  venueLine: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    gap: 9,
  },
  recordLine: {
    borderLeftWidth: 2,
    paddingLeft: 18,
    gap: 3,
  },
  wallMosaic: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  wallTile: {
    width: '28%',
    aspectRatio: 1,
    borderRadius: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallImage: { width: '100%', height: '100%' },
  wallStar: { position: 'absolute', top: 6, right: 6 },
  badgeList: { gap: 10 },
  badgeChip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tapZones: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5,
    flexDirection: 'row',
  },
  tapZone: { flex: 1 },
  bottomControls: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pauseControl: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  shareButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    position: 'absolute',
    left: 20,
    right: 20,
    textAlign: 'center',
  },
});

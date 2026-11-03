import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import {
  BarChart3,
  ChevronRight,
  Crown,
  Plus,
  Sparkles,
  Star,
} from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Skeleton } from '../ui/Skeleton';
import { Sheet } from '../ui/Sheet';
import { Text } from '../ui/Text';
import {
  BarChart,
  CountUp,
  Donut,
  Gauge,
  Heatmap,
  Histogram,
  StackedBar,
} from './Charts';
import {
  buildInsights,
  computeBadges,
  genreSharesExcludingUnclassified,
  getConcertArchetype,
  largestRemainder,
} from '../../features/stats/analytics';
import {
  useArtistsByGenre,
  useArtistsByVenue,
  useDiversity,
  useExclusiveArtists,
  useGenreStats,
  useHeatmap,
  useLeaderboard,
  useStatsOverview,
  useSubgenreStats,
  useVenueStats,
} from '../../features/stats/hooks';
import { useStatsScopeStore } from '../../features/stats/store';
import { MACRO_GENRES } from '../../features/genres/macroGenres';
import { VENUE_TYPES, type VenueType } from '../../features/venues/venueTypes';
import { useAuthStore } from '../../features/auth/store';
import { useTheme } from '../../theme/ThemeProvider';
import { hardShadow, radius, spacing } from '../../theme/tokens';
import { GenreLabel, VenueLabel } from '../paper';
import { useMusicIdentity, IdentitySheet } from '../../features/identity';
import { useOptionalArtistCard } from '../../features/artists/ArtistCardProvider';

const TAB_OPTIONS = [
  { label: 'Overview', value: 'overview' },
  { label: 'Genres', value: 'genres' },
  { label: 'Venues', value: 'venues' },
];
const ARTIST_OPTIONS = [
  { label: 'Most seen', value: 'count' },
  { label: 'Highest rated', value: 'rating' },
];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function SectionTitle({
  children,
  action,
}: {
  children: string;
  action?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionTitleRow}>
      <Text variant="title" weight="bold">
        {children}
      </Text>
      {action ? (
        <Pressable onPress={action} hitSlop={8}>
          <ChevronRight size={19} color={colors.inkMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Metric({
  label,
  value,
  suffix,
  precision,
}: {
  label: string;
  value: number;
  suffix?: string;
  precision?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.metric}>
      <CountUp value={value} suffix={suffix} />
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <View style={[styles.metricRule, { backgroundColor: colors.line }]} />
    </View>
  );
}

function Record({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.record, { backgroundColor: colors.surface }]}>
      <Text variant="title" weight="bold">
        {value}
      </Text>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
    </View>
  );
}

export function StatsScreen() {
  const { colors } = useTheme();
  const userId = useAuthStore((state) => state.user?.id ?? '');
  const scope = useStatsScopeStore((state) => state.scope);
  const currentYear = new Date().getFullYear();
  const showWrappedBadge =
    new Date().getMonth() === 11 || (scope != null && scope < currentYear);
  const setScope = useStatsScopeStore((state) => state.setScope);
  const [tab, setTab] = useState('overview');
  const [artistMode, setArtistMode] = useState('count');
  const [genreMetric, setGenreMetric] = useState('shows');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [expandedGenre, setExpandedGenre] = useState<string | null>(null);
  const [heatmapYear, setHeatmapYear] = useState<number | 'all' | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<VenueType>('festival');
  const [exclusiveOnly, setExclusiveOnly] = useState(false);
  const [identitySheetVisible, setIdentitySheetVisible] = useState(false);
  const artistCard = useOptionalArtistCard();

  function handleOpenArtist(artist: {
    artist_id: string;
    artist?: string;
    name?: string;
    image_url?: string | null;
  }) {
    if (artistCard) {
      void artistCard.openArtistCard({
        artistId: artist.artist_id,
        name: artist.name ?? artist.artist,
        imageUrl: artist.image_url,
      });
    } else {
      router.push({
        pathname: '/artist/[id]',
        params: { id: artist.artist_id },
      });
    }
  }

  const overviewQuery = useStatsOverview();
  const genresQuery = useGenreStats();
  const subgenresQuery = useSubgenreStats();
  const venuesQuery = useVenueStats();
  const heatmapQuery = useHeatmap();
  const diversityQuery = useDiversity();
  const identityQuery = useMusicIdentity();
  const leaderboardQuery = useLeaderboard();
  const exclusiveQuery = useExclusiveArtists(selectedVenue);
  const venueArtistsQuery = useArtistsByVenue(selectedVenue);
  const genreArtistsQuery = useArtistsByGenre(selectedGenre);
  const overview = overviewQuery.data;
  const genres = genresQuery.data ?? [];
  const venues = venuesQuery.data ?? [];
  const activeVenue = venues.find(
    (venue) => venue.venue_type === selectedVenue,
  );
  const artistRows = useMemo(
    () =>
      (artistMode === 'count'
        ? (overview?.top_artists_by_count ?? [])
        : (overview?.top_artists_by_rating ?? [])
      ).slice(0, 10),
    [artistMode, overview],
  );
  const mostSeenArtistId = overview?.top_artists_by_count?.[0]?.artist_id;
  const genreValues = genres.map((genre) =>
    genreMetric === 'shows' ? genre.log_count : genre.artist_count,
  );
  const genrePercentages = genreSharesExcludingUnclassified(
    genreValues,
    genres.map((genre) => genre.macro_genre),
  );
  const venuePercentages = largestRemainder(
    venues.map((venue) => venue.log_count),
  );
  const venueCounts = Object.fromEntries(
    venues.map((venue) => [venue.venue_type, venue.log_count]),
  );
  const badges = overview
    ? computeBadges({
        total_shows: overview.total_shows,
        five_star_count: overview.five_star_count,
        active_years: overview.active_years,
        genre_count: genres.filter(
          (genre) => genre.macro_genre !== 'unclassified',
        ).length,
        venue_counts: venueCounts,
      })
    : [];
  const earnedBadges = badges.filter((badge) => badge.earned);
  const nextBadge = badges.find((badge) => !badge.earned);
  const archetype =
    overview && diversityQuery.data
      ? getConcertArchetype(venueCounts, diversityQuery.data.score)
      : null;
  const insights = overview
    ? buildInsights({
        total_shows: overview.total_shows,
        busiest_month: overview.busiest_month,
        most_seen_artist: overview.most_seen_artist,
        longest_streak_weeks: overview.longest_streak_weeks,
        rating_by_venue_type: overview.rating_by_venue_type,
      })
    : [];

  function openTimeline(params: Record<string, string>) {
    const { venueType, ...timelineParams } = params;
    router.push({
      pathname: '/user/[username]/diary',
      params: {
        username: 'me',
        ...timelineParams,
        ...(venueType ? { venueType } : {}),
      },
    });
  }

  const scopeOptions = [null, ...(overview?.years ?? [])] as const;
  const selectedHeatmapYear =
    scope ??
    (heatmapYear === 'all' ? undefined : (heatmapYear ?? overview?.years[0]));
  const heatmapYears: (number | 'all')[] = ['all', ...(overview?.years ?? [])];
  const heatmapDays =
    selectedHeatmapYear == null
      ? (heatmapQuery.data ?? [])
      : (heatmapQuery.data ?? []).filter(
          (day) => Number(day.date.slice(0, 4)) === selectedHeatmapYear,
        );
  const showEmpty =
    overviewQuery.isSuccess && overview != null && overview.total_shows === 0;
  const statsErrors = [overviewQuery, genresQuery, subgenresQuery, venuesQuery]
    .filter((query) => query.isError)
    .map((query) => query.error.message);

  return (
    <View style={styles.content}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scopeRow}
      >
        {scopeOptions.map((year) => {
          const selected = scope === year;
          return (
            <Pressable
              key={year ?? 'all'}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setScope(year)}
              style={[
                styles.scopeChip,
                {
                  backgroundColor: selected ? colors.ink : colors.surface,
                  borderColor: selected ? colors.ink : colors.line,
                },
              ]}
            >
              <Text
                variant="caption"
                weight="semibold"
                style={{
                  color: selected ? colors.bg : colors.inkMuted,
                }}
              >
                {year == null ? 'All time' : year}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push({
            pathname: '/wrapped',
            params: { year: scope ?? 'all' },
          })
        }
      >
        <View
          style={[
            styles.wrappedHero,
            hardShadow.md,
            { backgroundColor: colors.surface, borderColor: colors.ink },
          ]}
        >
          <View style={styles.wrappedTopline}>
            <Sparkles size={18} color={colors.accent} />
            <Text variant="caption" weight="bold" color="primary">
              YOUR WRAPPED
            </Text>
            {showWrappedBadge ? (
              <View
                style={[styles.newBadge, { backgroundColor: colors.accent }]}
              >
                <Text
                  variant="overline"
                  color="accentInk"
                  style={styles.newBadgeText}
                >
                  NEW
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="title" weight="bold" style={styles.heroTitle}>
            A life in live music.
          </Text>
          <Text variant="caption" color="secondary">
            {scope == null
              ? 'Your story across all years'
              : `Your ${scope} story`}
          </Text>
          <ChevronRight size={22} color={colors.ink} style={styles.heroArrow} />
        </View>
      </Pressable>

      {overview ? (
        <View style={styles.summaryBlock}>
          <Text variant="label" weight="bold">
            YOUR NUMBERS
          </Text>
          <View style={styles.summaryGrid}>
            <Metric label="Shows" value={overview.total_shows} />
            <Metric label="Artists" value={overview.unique_artists} />
            <Metric label="Venues" value={overview.unique_venues} />
            <Metric label="Active years" value={overview.active_years} />
            <Metric
              label="Avg. rating"
              value={overview.avg_rating ?? 0}
              suffix="★"
              precision={2}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${overview.most_seen_artist?.artist ?? 'artist'} card`}
              disabled={!mostSeenArtistId}
              onPress={() => {
                if (mostSeenArtistId && overview.most_seen_artist) {
                  handleOpenArtist({
                    artist_id: mostSeenArtistId,
                    name: overview.most_seen_artist.artist,
                    image_url: overview.most_seen_artist.image_url,
                  });
                }
              }}
              style={styles.mostSeenMetric}
            >
              <Avatar
                name={overview.most_seen_artist?.artist ?? 'Artist'}
                imageUrl={overview.most_seen_artist?.image_url}
                size="sm"
              />
              <View style={styles.flexOne}>
                <Text variant="caption" weight="bold" numberOfLines={1}>
                  {overview.most_seen_artist?.artist ?? 'No artist yet'}
                </Text>
                <Text variant="caption" color="secondary">
                  Most seen
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      ) : overviewQuery.isLoading ? (
        <View style={styles.loadingSummary}>
          <Skeleton width="42%" height={18} />
          <Skeleton height={92} />
        </View>
      ) : null}

      <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} />
      {statsErrors.length ? (
        <Card style={[styles.errorCard, { borderColor: colors.danger }]}>
          <Text variant="title" weight="bold">
            Stats could not load
          </Text>
          <Text variant="caption" color="secondary">
            {statsErrors[0]}
          </Text>
          <Button
            label="Retry"
            variant="secondary"
            onPress={() => {
              void Promise.all([
                overviewQuery.refetch(),
                genresQuery.refetch(),
                subgenresQuery.refetch(),
                venuesQuery.refetch(),
              ]);
            }}
          />
        </Card>
      ) : null}
      {overviewQuery.isLoading ? (
        <View style={styles.tabContent}>
          <Card style={styles.loadingCard}>
            <Skeleton width="38%" height={18} />
            <Skeleton height={100} />
            <Skeleton width="62%" height={14} />
          </Card>
        </View>
      ) : null}
      {showEmpty ? (
        <EmptyState
          icon={BarChart3}
          title="Your live music story starts here"
          description="Log a show to see your artists, venues, and listening patterns take shape."
          action={
            <Button
              label="Log a concert"
              leftIcon={<Plus color={colors.accentInk} size={17} />}
              onPress={() => router.push('/log')}
            />
          }
        />
      ) : null}

      {overview && overview.total_shows > 0 && tab === 'overview' ? (
        <View style={styles.tabContent}>
          {overview.total_shows < 3 ? (
            <Card
              style={[styles.thinCard, { borderLeftColor: colors.warning }]}
            >
              <Text variant="body" weight="semibold">
                Log at least 3 shows to unlock insights
              </Text>
            </Card>
          ) : insights.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.insightsRow}
            >
              {insights.map((insight) => (
                <Card key={insight.id} style={styles.insightCard}>
                  <Sparkles color={colors.accent} size={16} />
                  <Text variant="caption" weight="semibold">
                    {insight.text}
                  </Text>
                </Card>
              ))}
            </ScrollView>
          ) : null}

          <Card style={styles.chartCard}>
            <Text variant="label" weight="bold">
              SHOWS BY MONTH
            </Text>
            <BarChart
              animationKey="overview-months"
              values={overview.shows_by_month.map((item) => item.count)}
              colors={overview.shows_by_month.map((item) =>
                item.month === overview.busiest_month?.month
                  ? colors.accent
                  : colors.accent,
              )}
            />
            <View style={styles.chartLabels}>
              {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map(
                (month, index) => (
                  <Text
                    key={`${month}-${index}`}
                    variant="caption"
                    color="secondary"
                    style={styles.chartLabel}
                  >
                    {month}
                  </Text>
                ),
              )}
            </View>
            {overview.busiest_month ? (
              <Text variant="caption" color="secondary">
                Peak:{' '}
                {new Intl.DateTimeFormat(undefined, { month: 'long' }).format(
                  new Date(2024, overview.busiest_month.month - 1, 1),
                )}{' '}
                · {overview.busiest_month.count} shows
              </Text>
            ) : null}
          </Card>
          <Card style={styles.chartCard}>
            <Text variant="label" weight="bold">
              SHOWS BY WEEKDAY
            </Text>
            <BarChart
              animationKey="overview-weekdays"
              values={overview.shows_by_weekday.map((item) => item.count)}
              colors={WEEKDAYS.map((_day, index) =>
                index === (overview.busiest_weekday?.weekday ?? 0) - 1
                  ? colors.accent
                  : colors.accent,
              )}
              height={92}
            />
            <View style={styles.chartLabels}>
              {WEEKDAYS.map((day) => (
                <Text
                  key={day}
                  variant="caption"
                  color="secondary"
                  style={styles.chartLabel}
                >
                  {day}
                </Text>
              ))}
            </View>
          </Card>
          <Card style={styles.chartCard}>
            <SectionTitle
              action={() => router.push('/stats/wall-of-fame' as never)}
            >
              YOUR CALENDAR
            </SectionTitle>
            {scope == null ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scopeRow}
              >
                {heatmapYears.map((year) => {
                  const selected =
                    year === 'all'
                      ? heatmapYear === 'all'
                      : heatmapYear == null
                        ? overview.years[0] === year
                        : heatmapYear === year;
                  return (
                    <Pressable
                      key={year}
                      onPress={() => setHeatmapYear(year)}
                      style={[
                        styles.scopeChip,
                        {
                          backgroundColor: selected
                            ? colors.ink
                            : colors.surface,
                          borderColor: colors.line,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        weight="semibold"
                        style={{
                          color: selected ? colors.bg : colors.inkMuted,
                        }}
                      >
                        {year === 'all' ? 'All years' : year}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
            <Heatmap
              animationKey="overview-calendar"
              days={heatmapDays}
              year={selectedHeatmapYear}
              accent={colors.accent}
              onSelectDay={(date) => openTimeline({ date })}
            />
            <Text variant="caption" color="secondary">
              Tap a day to open its shows
            </Text>
          </Card>
          <Card style={styles.chartCard}>
            <SectionTitle>RATING HABITS</SectionTitle>
            <Histogram
              animationKey="overview-ratings"
              values={overview.rating_histogram.map((bucket) => bucket.count)}
              average={overview.avg_rating}
              color={colors.accent}
            />
            <View style={styles.ratingScale}>
              <Text variant="caption" color="secondary">
                0.5★
              </Text>
              <Text variant="caption" weight="bold">
                {overview.avg_rating == null
                  ? 'No ratings'
                  : overview.avg_rating >= 4
                    ? 'Generous'
                    : overview.avg_rating >= 3
                      ? 'Balanced'
                      : 'Harsh critic'}
              </Text>
              <Text variant="caption" color="secondary">
                5★
              </Text>
            </View>
            <View style={styles.bestStats}>
              <Text variant="caption" color="secondary">
                Best venue:
              </Text>
              {overview.best_rated_venue_type ? (
                <VenueLabel
                  venue={overview.best_rated_venue_type.venue_type}
                  label={`${VENUE_TYPES[overview.best_rated_venue_type.venue_type].shortLabel} · ${overview.best_rated_venue_type.avg_rating}★`}
                  size="xs"
                />
              ) : (
                <Text variant="caption" color="secondary">
                  Not enough ratings
                </Text>
              )}
              <Text variant="caption" color="secondary">
                · Best year:{' '}
                {overview.best_rated_year
                  ? `${overview.best_rated_year.year} · ${overview.best_rated_year.avg_rating}★`
                  : '—'}
              </Text>
            </View>
          </Card>
          <Card style={styles.chartCard}>
            <View style={styles.artistHeader}>
              <Text variant="title" weight="bold">
                Top artists
              </Text>
              <SegmentedControl
                options={ARTIST_OPTIONS}
                value={artistMode}
                onChange={setArtistMode}
              />
            </View>
            {artistRows.map((artist, index) => (
              <Pressable
                key={artist.artist_id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${artist.artist} artist card`}
                onPress={() => handleOpenArtist(artist)}
                style={styles.artistRow}
              >
                <Text variant="label" weight="bold" style={styles.rank}>
                  {index + 1}
                </Text>
                <Avatar
                  name={artist.artist}
                  imageUrl={artist.image_url}
                  size="sm"
                />
                <Text
                  variant="body"
                  weight="semibold"
                  numberOfLines={1}
                  style={styles.flexOne}
                >
                  {artist.artist}
                </Text>
                <Text variant="caption" color="secondary">
                  {artistMode === 'count'
                    ? `${artist.count}×`
                    : `${artist.avg_rating ?? '—'}★`}
                </Text>
              </Pressable>
            ))}
          </Card>
          <Card style={styles.chartCard}>
            <SectionTitle>LOYALTY</SectionTitle>
            <View style={styles.loyaltyRow}>
              <Donut
                animationKey="overview-loyalty"
                values={[overview.repeat_artists, overview.one_time_artists]}
                colors={[colors.accent, colors.inkMuted]}
                size={128}
                center={`${overview.unique_artists}`}
              />
              <View style={styles.loyaltyLegend}>
                <Text variant="label" weight="bold">
                  {overview.repeat_artists} repeat artists
                </Text>
                <Text variant="caption" color="secondary">
                  {overview.one_time_artists} seen once
                </Text>
                <View style={styles.spacerSmall} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${overview.most_seen_artist?.artist ?? 'artist'} card`}
                  disabled={!mostSeenArtistId}
                  onPress={() => {
                    if (mostSeenArtistId && overview.most_seen_artist) {
                      handleOpenArtist({
                        artist_id: mostSeenArtistId,
                        name: overview.most_seen_artist.artist,
                        image_url: overview.most_seen_artist.image_url,
                      });
                    }
                  }}
                >
                  <Text variant="caption" color="secondary">
                    Your most-seen artist
                  </Text>
                  <Text variant="body" weight="bold">
                    {overview.most_seen_artist?.artist ?? '—'}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {overview.most_seen_artist?.count ?? 0} shows
                  </Text>
                </Pressable>
              </View>
            </View>
          </Card>
          <View style={styles.recordsStrip}>
            <Record
              label="Longest streak"
              value={`${overview.longest_streak_weeks} wk`}
            />
            <Record
              label="Longest gap"
              value={`${overview.longest_gap_days} d`}
            />
            <Record
              label="Biggest week"
              value={`${overview.most_shows_in_one_week}`}
            />
            <Record
              label="Biggest day"
              value={`${overview.most_shows_in_one_day}`}
            />
            <Record
              label={
                overview.first_show
                  ? `First · ${new Date(`${overview.first_show.date}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric' })}`
                  : 'First show'
              }
              value={overview.first_show?.artist ?? '—'}
            />
            <Record
              label={
                overview.latest_show
                  ? `Latest · ${new Date(`${overview.latest_show.date}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric' })}`
                  : 'Latest show'
              }
              value={overview.latest_show?.artist ?? '—'}
            />
          </View>

          {/* Music Identity Hero Card */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Your music identity. Tap to view full breakdown."
            onPress={() => setIdentitySheetVisible(true)}
            style={({ pressed }) => [
              styles.identityHeroCard,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor:
                  identityQuery.computed?.prototype?.accentColor ?? colors.line,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={styles.identityHeroHeader}>
              <View style={styles.identityPillRow}>
                <View
                  style={[
                    styles.prototypePill,
                    {
                      backgroundColor: `${identityQuery.computed?.prototype?.accentColor ?? colors.accent}20`,
                      borderColor:
                        identityQuery.computed?.prototype?.accentColor ??
                        colors.accent,
                    },
                  ]}
                >
                  <Sparkles
                    size={13}
                    color={
                      identityQuery.computed?.prototype?.accentColor ??
                      colors.accent
                    }
                  />
                  <Text
                    variant="caption"
                    weight="bold"
                    style={{
                      color:
                        identityQuery.computed?.prototype?.accentColor ??
                        colors.accent,
                    }}
                  >
                    {identityQuery.computed?.prototype?.title ??
                      'Music Identity'}
                  </Text>
                </View>

                {identityQuery.computed?.musicalAge ? (
                  <View
                    style={[
                      styles.musicalAgePill,
                      { backgroundColor: `${colors.accent}15` },
                    ]}
                  >
                    <Text
                      variant="caption"
                      weight="bold"
                      style={{ color: colors.accent }}
                    >
                      Age: {identityQuery.computed.musicalAge.year}
                    </Text>
                  </View>
                ) : null}
              </View>

              <ChevronRight size={18} color={colors.inkMuted} />
            </View>

            <View style={styles.identityHeroBody}>
              <Text variant="title" weight="bold">
                {identityQuery.computed?.eraLabel ?? 'Your Live Music Identity'}
              </Text>
              <Text variant="caption" color="secondary" numberOfLines={2}>
                {identityQuery.computed?.prototype?.tagline ??
                  'Tap to explore your musical eras, venue persona, and identity card.'}
              </Text>
            </View>
          </Pressable>

          <Card style={styles.chartCard}>
            <SectionTitle>TASTE DIVERSITY</SectionTitle>
            <View style={styles.gaugeRow}>
              <Gauge
                animationKey="overview-diversity"
                value={diversityQuery.data?.score ?? 0}
                color={colors.accent}
              />
              <View style={styles.flexOne}>
                <Text variant="title" weight="bold">
                  {(diversityQuery.data?.score ?? 0) < 25
                    ? 'Specialist'
                    : (diversityQuery.data?.score ?? 0) < 65
                      ? 'Explorer'
                      : 'Omnivore'}
                </Text>
                <Text variant="caption" color="secondary">
                  {diversityQuery.data?.dominant_genre_share ?? 0}% of shows are{' '}
                  {diversityQuery.data?.dominant_genre
                    ? (MACRO_GENRES[
                        diversityQuery.data
                          .dominant_genre as keyof typeof MACRO_GENRES
                      ]?.label ?? diversityQuery.data.dominant_genre)
                    : 'one genre'}
                  .
                </Text>
              </View>
            </View>
          </Card>
          {archetype ? (
            <Card
              style={[styles.archetypeCard, { borderColor: colors.accent }]}
            >
              <Crown size={20} color={colors.accent} />
              <View style={styles.flexOne}>
                <Text variant="title" weight="bold">
                  {archetype.title}
                </Text>
                <Text variant="caption" color="secondary">
                  {archetype.description}
                </Text>
              </View>
            </Card>
          ) : null}
          <Card style={styles.chartCard}>
            <SectionTitle>MILESTONES</SectionTitle>
            <View style={styles.badgeGrid}>
              {earnedBadges.map((badge) => (
                <View
                  key={badge.id}
                  style={[
                    styles.badge,
                    { borderColor: colors.accent },
                    hardShadow.sm,
                  ]}
                >
                  <Star size={15} fill={colors.accent} color={colors.accent} />
                  <Text variant="caption" weight="semibold">
                    {badge.title}
                  </Text>
                </View>
              ))}
            </View>
            {nextBadge ? (
              <View style={styles.progressBlock}>
                <View style={styles.sectionTitleRow}>
                  <Text variant="caption" weight="bold">
                    {nextBadge.title}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {nextBadge.progress}/{nextBadge.target}
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: colors.surfaceRaised },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: colors.accent,
                        width: `${Math.round((nextBadge.progress / nextBadge.target) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : null}
          </Card>
          {leaderboardQuery.data && leaderboardQuery.data.length > 1 ? (
            <Card style={styles.chartCard}>
              <SectionTitle>FRIENDS LEADERBOARD</SectionTitle>
              {leaderboardQuery.data.map((row) => (
                <View
                  key={row.user_id}
                  style={[
                    styles.artistRow,
                    row.user_id === userId && {
                      backgroundColor: colors.surfaceRaised,
                    },
                  ]}
                >
                  <Text variant="label" weight="bold" style={styles.rank}>
                    #{row.rank}
                  </Text>
                  <Avatar
                    name={row.display_name ?? row.username}
                    imageUrl={row.avatar_url}
                    size="sm"
                  />
                  <Text variant="body" weight="semibold" style={styles.flexOne}>
                    {row.display_name ?? row.username}
                    {row.user_id === userId ? ' · You' : ''}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {row.show_count} shows
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}
        </View>
      ) : null}

      {overview && overview.total_shows > 0 && tab === 'genres' ? (
        <View style={styles.tabContent}>
          <Card style={styles.chartCard}>
            <SegmentedControl
              options={[
                { label: 'By shows', value: 'shows' },
                { label: 'By artists', value: 'artists' },
              ]}
              value={genreMetric}
              onChange={setGenreMetric}
            />
            <View style={styles.genreDonutRow}>
              <Donut
                animationKey="genres-distribution"
                values={genreValues}
                colors={genres.map(
                  (genre) =>
                    MACRO_GENRES[genre.macro_genre as keyof typeof MACRO_GENRES]
                      ?.color ?? colors.accent,
                )}
                center={`${genreValues.reduce((sum, value) => sum + value, 0)}`}
              />
              <View style={styles.genreLegend}>
                {genres.slice(0, 5).map((genre) => (
                  <View key={genre.macro_genre} style={styles.legendRow}>
                    <View
                      style={[
                        styles.legendDot,
                        {
                          backgroundColor:
                            MACRO_GENRES[
                              genre.macro_genre as keyof typeof MACRO_GENRES
                            ]?.color ?? colors.accent,
                        },
                      ]}
                    />
                    <GenreLabel
                      genre={genre.macro_genre as keyof typeof MACRO_GENRES}
                      label={
                        MACRO_GENRES[
                          genre.macro_genre as keyof typeof MACRO_GENRES
                        ]?.label ?? genre.macro_genre
                      }
                      size="xs"
                    />
                  </View>
                ))}
              </View>
            </View>
          </Card>
          <Card style={styles.chartCard}>
            <SectionTitle>GENRES</SectionTitle>
            {genres.map((genre, index) => {
              const childStats = (subgenresQuery.data ?? []).filter(
                (item) => item.parent_macro === genre.macro_genre,
              );
              const childPercentages = largestRemainder(
                childStats.map((item) => item.log_count),
                100,
              );
              const expanded = expandedGenre === genre.macro_genre;
              return (
                <View key={genre.macro_genre}>
                  <Pressable
                    onPress={() => setSelectedGenre(genre.macro_genre)}
                    style={[
                      styles.genreRow,
                      { borderBottomColor: colors.line },
                    ]}
                  >
                    <View style={styles.genreTitle}>
                      <Text variant="label" weight="bold">
                        {String(index + 1).padStart(2, '0')}
                      </Text>
                      <GenreLabel
                        genre={genre.macro_genre as keyof typeof MACRO_GENRES}
                        label={
                          MACRO_GENRES[
                            genre.macro_genre as keyof typeof MACRO_GENRES
                          ]?.label ?? genre.macro_genre
                        }
                        size="xs"
                        interactive={false}
                      />
                      <Text variant="caption" weight="bold">
                        {genrePercentages[index] ?? 0}%
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.progressTrack,
                        { backgroundColor: colors.surfaceRaised },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor:
                              MACRO_GENRES[
                                genre.macro_genre as keyof typeof MACRO_GENRES
                              ]?.color ?? colors.accent,
                            width: `${genreValues.reduce((sum, value) => sum + value, 0) ? (genreValues[index]! / genreValues.reduce((sum, value) => sum + value, 0)) * 100 : 0}%`,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.genreMeta}>
                      <Text variant="caption" color="secondary">
                        {genre.log_count} shows · {genre.artist_count} artists ·{' '}
                        {genre.avg_rating == null
                          ? '—'
                          : `${genre.avg_rating}★`}
                      </Text>
                      {genre.top_artist ? (
                        <Text variant="caption" color="secondary">
                          Top: {genre.top_artist.name} ({genre.top_artist.count}
                          ×)
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={`About ${genre.macro_genre.replaceAll('_', ' ')}`}
                      hitSlop={8}
                      onPress={(event) => {
                        event.stopPropagation();
                        router.push({
                          pathname: '/genre/[slug]',
                          params: { slug: genre.macro_genre },
                        });
                      }}
                      style={styles.genreAbout}
                    >
                      <Text variant="caption" weight="bold" color="accent">
                        About
                      </Text>
                    </Pressable>
                  </Pressable>
                  {childStats.length ? (
                    <View style={styles.subgenreExpansion}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded }}
                        onPress={() =>
                          setExpandedGenre(expanded ? null : genre.macro_genre)
                        }
                        style={styles.expandSubgenres}
                      >
                        <Text variant="caption" weight="bold" color="accent">
                          {expanded ? 'Hide sub-genres' : 'Show sub-genres'}
                        </Text>
                      </Pressable>
                      {expanded
                        ? childStats.map((subgenre, subIndex) => (
                            <View
                              key={subgenre.sub_genre}
                              style={styles.subgenreRow}
                            >
                              <GenreLabel
                                genre={subgenre.sub_genre}
                                size="xs"
                              />
                              <Text variant="caption" color="secondary">
                                {subgenre.log_count} shows ·{' '}
                                {subgenre.artist_count} artists ·{' '}
                                {childPercentages[subIndex] ?? 0}%
                              </Text>
                            </View>
                          ))
                        : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>
        </View>
      ) : null}

      {overview && overview.total_shows > 0 && tab === 'venues' ? (
        <View style={styles.tabContent}>
          <Card style={styles.chartCard}>
            <SectionTitle>YOUR VENUE MIX</SectionTitle>
            <StackedBar
              animationKey="venues-distribution"
              values={venues.map((venue) => venue.log_count)}
              colors={venues.map(
                (venue) => VENUE_TYPES[venue.venue_type].primaryColor,
              )}
            />
            {venues.map((venue, index) => {
              return (
                <Pressable
                  key={venue.venue_type}
                  onPress={() => setSelectedVenue(venue.venue_type)}
                  style={styles.venueRow}
                >
                  <VenueLabel venue={venue.venue_type} size="xs" />
                  <Text variant="caption" color="secondary">
                    {venue.log_count} · {venuePercentages[index] ?? 0}% ·{' '}
                    {venue.avg_rating == null ? '—' : `${venue.avg_rating}★`}
                  </Text>
                </Pressable>
              );
            })}
          </Card>
          {activeVenue ? (
            <Card style={styles.chartCard}>
              <View style={styles.sectionTitleRow}>
                <Text variant="title" weight="bold">
                  {VENUE_TYPES[selectedVenue].shortLabel} artists
                </Text>
                <Pressable
                  onPress={() => setExclusiveOnly((value) => !value)}
                  style={[
                    styles.scopeChip,
                    {
                      backgroundColor: exclusiveOnly
                        ? colors.accent
                        : colors.surface,
                      borderColor: colors.line,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    weight="semibold"
                    style={{
                      color: exclusiveOnly ? colors.accentInk : colors.inkMuted,
                    }}
                  >
                    Only seen here
                  </Text>
                </Pressable>
              </View>
              <View style={styles.artistGrid}>
                {(exclusiveOnly
                  ? (exclusiveQuery.data ?? [])
                  : (venueArtistsQuery.data ?? [])
                ).map((artist) => (
                  <Pressable
                    key={artist.artist_id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${artist.name} artist card`}
                    onPress={() => handleOpenArtist(artist)}
                    style={styles.artistTile}
                  >
                    <Avatar
                      name={artist.name}
                      imageUrl={artist.image_url}
                      size="md"
                    />
                    <Text variant="caption" weight="semibold" numberOfLines={1}>
                      {artist.name}
                    </Text>
                    <Text variant="caption" color="secondary">
                      {artist.times_seen}×
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Button
                label="Open in Timeline"
                onPress={() =>
                  openTimeline({
                    venueType: selectedVenue,
                    ...(scope ? { year: String(scope) } : {}),
                  })
                }
              />
            </Card>
          ) : null}
          <Card style={styles.chartCard}>
            <SectionTitle>MOST VISITED VENUES</SectionTitle>
            {overview.top_venues_by_name.length ? (
              overview.top_venues_by_name.map((venue) => (
                <View
                  key={`${venue.name}-${venue.venue_type}`}
                  style={styles.venueRow}
                >
                  <Text variant="body" weight="bold" style={styles.flexOne}>
                    {venue.name}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {venue.count} shows
                  </Text>
                  <VenueLabel venue={venue.venue_type} size="xs" />
                </View>
              ))
            ) : (
              <Text variant="caption" color="secondary">
                Venue names will appear here as you log shows.
              </Text>
            )}
          </Card>
        </View>
      ) : null}

      {overview && overview.total_shows > 0 ? (
        <Card style={styles.wallCard}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.wallTitle}>
              <Star size={18} color={colors.accent} fill={colors.accent} />
              <Text variant="title" weight="bold">
                Wall of Fame
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/stats/wall-of-fame' as never)}
            >
              <ChevronRight size={20} color={colors.inkMuted} />
            </Pressable>
          </View>
          <Text variant="caption" color="secondary">
            {overview.five_star_count} five-star shows
          </Text>
          {overview.five_star_count === 0 ? (
            <Text variant="body" color="secondary">
              Your first five-star night is waiting.
            </Text>
          ) : (
            <View style={styles.wallPreview}>
              <Star size={24} color={colors.accent} fill={colors.accent} />
              <Text variant="body" weight="semibold">
                Make room for your best nights.
              </Text>
            </View>
          )}
        </Card>
      ) : null}
      <Sheet
        visible={selectedGenre != null}
        title={
          selectedGenre
            ? `${MACRO_GENRES[selectedGenre as keyof typeof MACRO_GENRES]?.label ?? selectedGenre} artists`
            : undefined
        }
        snapPoints={['60%', '88%']}
        onDismiss={() => setSelectedGenre(null)}
      >
        <ScrollView contentContainerStyle={styles.sheetArtists}>
          {(genreArtistsQuery.data ?? []).map((artist) => (
            <Pressable
              key={artist.artist_id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${artist.name} artist card`}
              onPress={() => {
                setSelectedGenre(null);
                handleOpenArtist(artist);
              }}
              style={styles.artistRow}
            >
              <Avatar
                name={artist.name}
                imageUrl={artist.image_url}
                size="md"
              />
              <Text variant="body" weight="semibold" style={styles.flexOne}>
                {artist.name}
              </Text>
              <Text variant="caption" color="secondary">
                {artist.times_seen}×
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
      <IdentitySheet
        visible={identitySheetVisible}
        onDismiss={() => setIdentitySheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bestStats: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  content: { gap: spacing.lg },
  scopeRow: { gap: 8, paddingVertical: 2 },
  scopeChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  wrappedHero: {
    borderWidth: 1.5,
    minHeight: 148,
    padding: spacing.lg,
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 7,
  },
  wrappedTopline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newBadge: {
    marginLeft: 5,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newBadgeText: { fontSize: 9, lineHeight: 12 },
  heroTitle: { fontSize: 25, lineHeight: 31 },
  heroArrow: { position: 'absolute', right: 18, bottom: 18 },
  summaryBlock: { gap: 12 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  metric: { width: '33.333%', minHeight: 68, gap: 2 },
  metricRule: { height: 1, width: '78%', marginTop: 8 },
  mostSeenMetric: {
    width: '33.333%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingRight: 4,
  },
  flexOne: { flex: 1, minWidth: 0 },
  tabContent: { gap: spacing.md },
  loadingCard: { padding: spacing.lg },
  loadingSummary: { gap: spacing.md },
  errorCard: { padding: spacing.md, gap: spacing.sm, borderWidth: 1.5 },
  thinCard: {
    padding: spacing.md,
    borderLeftWidth: 3,
  },
  insightsRow: { gap: 10 },
  insightCard: {
    width: 225,
    minHeight: 88,
    padding: spacing.md,
    gap: 8,
    justifyContent: 'center',
  },
  chartCard: { padding: spacing.md, gap: spacing.md },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chartLabels: { flexDirection: 'row' },
  chartLabel: { flex: 1, textAlign: 'center' },
  ratingScale: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  artistHeader: { gap: 8 },
  artistGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  artistTile: {
    width: '29%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  sheetArtists: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  artistRow: {
    flexDirection: 'row',
    minHeight: 48,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
  },
  rank: { width: 23, textAlign: 'center' },
  loyaltyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  loyaltyLegend: { flex: 1, gap: 4 },
  spacerSmall: { height: 6 },
  recordsStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  record: {
    width: '48%',
    minHeight: 78,
    padding: spacing.md,
    borderRadius: radius.sm,
    gap: 2,
  },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  archetypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
  },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  progressBlock: { gap: 8, marginTop: 4 },
  progressTrack: { height: 7, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  genreDonutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  genreLegend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  genreRow: {
    gap: 7,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  genreTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  genreMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  genreAbout: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
  },
  subgenreExpansion: { paddingLeft: 28, paddingBottom: 8, gap: 5 },
  expandSubgenres: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 36,
  },
  subgenreRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 34,
  },
  venueRow: {
    flexDirection: 'row',
    minHeight: 44,
    alignItems: 'center',
    gap: 10,
  },
  wallCard: { padding: spacing.md, gap: 12 },
  wallTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wallPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
  },
  identityHeroCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  identityHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  identityPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prototypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  musicalAgePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  identityHeroBody: {
    gap: 3,
  },
});

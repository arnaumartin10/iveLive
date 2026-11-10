import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, useScrollToTop } from 'expo-router';
import { routes } from '../../navigation/routes';
import {
  Check,
  MapPin,
  Plus,
  Search,
  Ticket as TicketIcon,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMyLogs } from '../concerts/hooks';
import { useFeed } from '../social/hooks';
import { FeedCard } from '../../components/social/FeedCard';
import { useMe } from '../auth/hooks';
import { useArtistCard } from '../artists/ArtistCardProvider';
import { ArtistSearchResultRow } from '../artists/ArtistSearchResultRow';
import { useArtistSearch, useEnsureArtist } from '../artists/hooks';
import type { ArtistRow, ArtistSearchResult } from '../artists/types';
import {
  useAddWishlistItem,
  useDeleteWishlistItem,
  useFullWishlist,
  useProfileOverview,
} from '../profile/hooks';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, hardShadow, radius, spacing } from '../../theme/tokens';
import {
  MACRO_GENRES,
  MACRO_GENRE_ORDER,
  type MacroGenre,
} from '../genres/macroGenres';
import { VENUE_TYPE_ORDER, type VenueType } from '../venues/venueTypes';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Skeleton } from '../../components/ui/Skeleton';
import { Text } from '../../components/ui/Text';
import {
  GenreLabel,
  Stamp,
  Stub,
  Ticket,
  VenueLabel,
} from '../../components/paper';
import { useHomeLocation } from './useHomeLocation';
import { countryNameFromCode } from './location';
import { LocationPreferenceSheet } from './LocationPreferenceSheet';
import { ConcertSearchFilters } from './ConcertSearchFilters';
import {
  useArtistsOnTour,
  useTopRated,
  useTrendingGlobal,
  useTrendingInApp,
  useConcertSearch,
} from './hooks';
import { selectUpcomingTourArtists } from './api';
import {
  concertWishlistDraft,
  concertDateRangeError,
  findWishlistConcert,
  type OfficialConcertSearchResult,
} from './concertSearch';
import { selectTrendingDisplay } from './trending';
import type { HomeArtist, TourScope } from './types';

const TREND_OPTIONS = [
  { label: 'Worldwide', value: 'global' },
  { label: 'Country', value: 'country' },
  { label: 'On IveLive', value: 'app' },
];
const TOUR_SCOPES: { label: string; value: TourScope }[] = [
  { label: 'All', value: 'all' },
  { label: 'Mine', value: 'mine' },
  { label: 'Popular', value: 'popular' },
];
const VENUE_LABELS: Record<VenueType, string> = {
  festival: 'Festival',
  concert_hall_club: 'Hall / club',
  stadium: 'Stadium',
  indoor_arena: 'Arena',
  festa_major: 'Festa Major',
  other: 'Other',
};
function SectionError({ message }: { message: string }) {
  return (
    <Text variant="caption" color="danger">
      {message}
    </Text>
  );
}

function SectionSkeleton() {
  return (
    <View style={styles.skeletonRack}>
      <Skeleton width={132} height={160} />
      <Skeleton width={132} height={160} />
    </View>
  );
}

export function HomeHub() {
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const profileQuery = useMe();
  const profile = profileQuery.data;
  const overviewQuery = useProfileOverview(profile?.username ?? '');
  const profileOverview = overviewQuery.data;
  const wishlistQuery = useFullWishlist(profile?.username ?? '', profile?.id);
  const logsQuery = useMyLogs();
  const allLogs = logsQuery.data?.pages.flatMap((page) => page) ?? [];
  const logs = allLogs.slice(0, 3);
  const friendsFeed = useFeed();
  const featuredFriendPost = friendsFeed.data?.pages[0]?.[0];
  const { openArtistCard } = useArtistCard();
  const {
    location,
    isLoading: isLocationLoading,
    error: locationError,
  } = useHomeLocation(true);
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const [trendingMode, setTrendingMode] = useState('global');
  const [tourScope, setTourScope] = useState<TourScope>('all');
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [venueType, setVenueType] = useState<VenueType | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [ratingPeriod, setRatingPeriod] = useState('all');
  const [concertSearchText, setConcertSearchText] = useState('');
  const [selectedConcertArtist, setSelectedConcertArtist] =
    useState<ArtistRow | null>(null);
  const [concertCountry, setConcertCountry] = useState<string | null>(null);
  const [concertDateFrom, setConcertDateFrom] = useState('');
  const [concertDateTo, setConcertDateTo] = useState('');
  const [isChoosingNewArtist, setIsChoosingNewArtist] = useState(false);
  const concertDateError = concertDateRangeError(
    concertDateFrom,
    concertDateTo,
  );
  const [savingConcertId, setSavingConcertId] = useState<string | null>(null);
  const [concertActionError, setConcertActionError] = useState<string | null>(
    null,
  );
  const artistMutation = useAddWishlistItem(profile?.username ?? '');
  const deleteWishlistMutation = useDeleteWishlistItem(profile?.username ?? '');
  const artistSearch = useArtistSearch(concertSearchText);
  const ensureArtist = useEnsureArtist();
  const concertSearchQuery = useConcertSearch({
    artistId:
      isChoosingNewArtist || concertDateError
        ? null
        : (selectedConcertArtist?.id ?? null),
    artistName:
      isChoosingNewArtist || concertDateError
        ? null
        : (selectedConcertArtist?.name ?? null),
    countryCode: concertCountry,
    dateFrom: concertDateFrom || null,
    dateTo: concertDateTo || null,
    isValid: !concertDateError,
  });

  const globalTrending = useTrendingGlobal(
    trendingMode === 'country' ? location.country : 'global',
    trendingMode !== 'country' || !!location.country,
  );
  const appTrending = useTrendingInApp();
  const hasCoordinates =
    location.latitude !== null && location.longitude !== null;
  const tourQuery = useArtistsOnTour(
    radiusKm !== null ? 'all' : tourScope,
    location.country || null,
    location.latitude,
    location.longitude,
    radiusKm,
    !isLocationLoading && !locationError,
  );
  const ratedQuery = useTopRated(
    venueType,
    genre,
    ratingPeriod === 'year' ? new Date().getFullYear() : null,
  );
  const trending = trendingMode === 'app' ? appTrending : globalTrending;
  const primaryTrendingArtists = trending.data ?? [];
  const trendingDisplay = selectTrendingDisplay(
    trendingMode,
    primaryTrendingArtists,
    appTrending.data ?? [],
  );
  const trendingArtists = trendingDisplay.artists;
  const isIveLiveChart =
    trendingDisplay.source === 'app' && trendingArtists.length > 0;
  const tourSelection = useMemo(
    () => selectUpcomingTourArtists(tourQuery.data ?? []),
    [tourQuery.data],
  );
  const tourArtists = tourSelection.artists;
  const ratedArtists = ratedQuery.data ?? [];
  const concertResults = concertSearchQuery.data ?? [];
  const shouldShowArtistSearch = isChoosingNewArtist || !selectedConcertArtist;
  const hasConcertQuery =
    selectedConcertArtist !== null && !isChoosingNewArtist;

  const upcomingWish = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (profileOverview?.wishlist?.items ?? [])
      .filter((item) => item.target_date && item.target_date >= today)
      .sort((a, b) =>
        (a.target_date ?? '').localeCompare(b.target_date ?? ''),
      )[0];
  }, [profileOverview?.wishlist?.items]);

  const marqueeArtist = upcomingWish
    ? tourArtists.find((artist) => artist.id === upcomingWish.artist_id)
    : tourArtists.find((artist) =>
        profileOverview?.favourite_picks?.some((pick) => pick.id === artist.id),
      );

  async function openTickets(url: string | null | undefined) {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(
        'Could not open tickets',
        error instanceof Error ? error.message : 'Try again.',
      );
    }
  }

  async function addTourToWishlist(artist: HomeArtist) {
    if (!profile || !artist.next_date) return;
    try {
      await artistMutation.mutateAsync({
        userId: profile.id,
        draft: {
          artist_id: artist.id,
          event_name: '',
          venue_name: artist.nearest_venue ?? '',
          city: artist.nearest_city ?? '',
          target_date: artist.next_date.slice(0, 10),
          date_flexible: false,
          venue_type: null,
          priority: 2,
          note: '',
          status: 'wanted',
          ticket_url: artist.ticket_url ?? null,
        },
      });
    } catch (error) {
      Alert.alert(
        'Could not save this date',
        error instanceof Error ? error.message : 'Try again.',
      );
    }
  }

  async function selectConcertArtist(result: ArtistSearchResult) {
    try {
      const artist = await ensureArtist.mutateAsync(result);
      setSelectedConcertArtist(artist);
      setConcertSearchText('');
      setIsChoosingNewArtist(false);
      setConcertActionError(null);
    } catch (error) {
      setConcertActionError(
        error instanceof Error
          ? error.message
          : 'Could not select this artist.',
      );
    }
  }

  async function toggleConcertWishlist(concert: OfficialConcertSearchResult) {
    if (!profile) {
      setConcertActionError('Sign in to save shows to your Wishlist.');
      return;
    }

    setSavingConcertId(concert.eventId);
    setConcertActionError(null);
    try {
      const savedItem = findWishlistConcert(concert, wishlistQuery.data ?? []);
      if (savedItem) {
        await deleteWishlistMutation.mutateAsync(savedItem.id);
        return;
      }

      await artistMutation.mutateAsync({
        userId: profile.id,
        draft: concertWishlistDraft(concert, concert.artistId),
      });
    } catch (error) {
      setConcertActionError(
        error instanceof Error ? error.message : 'Try again in a moment.',
      );
    } finally {
      setSavingConcertId(null);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[1]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: 124 + insets.bottom,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={
              profileQuery.isRefetching ||
              overviewQuery.isRefetching ||
              wishlistQuery.isRefetching ||
              logsQuery.isRefetching ||
              friendsFeed.isRefetching ||
              globalTrending.isRefetching ||
              appTrending.isRefetching ||
              tourQuery.isRefetching ||
              ratedQuery.isRefetching ||
              (hasConcertQuery && concertSearchQuery.isRefetching)
            }
            onRefresh={() => {
              if (hasConcertQuery) void concertSearchQuery.refetch();
              void Promise.all([
                profileQuery.refetch(),
                overviewQuery.refetch(),
                wishlistQuery.refetch(),
                logsQuery.refetch(),
                friendsFeed.refetch(),
                globalTrending.refetch(),
                appTrending.refetch(),
                tourQuery.refetch(),
                ratedQuery.refetch(),
              ]);
            }}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.masthead}>
          <View style={styles.mastheadCopy}>
            <Text variant="mono" color="secondary"></Text>
            <Text variant="display">IveLive</Text>
            <Text variant="caption" color="secondary">
              Your next night starts here.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
            onPress={() => router.navigate(routes.user('me'))}
            style={styles.avatarButton}
          >
            <Avatar
              imageUrl={profile?.avatar_url}
              name={profile?.display_name || profile?.username || 'You'}
              size="md"
            />
          </Pressable>
        </View>
        <View
          style={[styles.concertSearchSticky, { backgroundColor: colors.bg }]}
        >
          <Text variant="overline" color="secondary">
            OFFICIAL CONCERTS
          </Text>
          {selectedConcertArtist && !isChoosingNewArtist ? (
            <View
              style={[
                styles.selectedArtistRow,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.line,
                },
              ]}
            >
              <Avatar
                imageUrl={
                  selectedConcertArtist.image_url_thumb ??
                  selectedConcertArtist.image_url_large
                }
                name={selectedConcertArtist.name}
                size="sm"
              />
              <View style={styles.selectedArtistCopy}>
                <Text variant="caption" color="secondary">
                  TOUR DATES FOR
                </Text>
                <Text variant="label" weight="bold" numberOfLines={1}>
                  {selectedConcertArtist.name}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose a different artist"
                onPress={() => {
                  setIsChoosingNewArtist(true);
                  setConcertSearchText(selectedConcertArtist.name);
                }}
                style={styles.concertSearchClear}
              >
                <Text variant="caption" color="accent" weight="bold">
                  CHANGE
                </Text>
              </Pressable>
            </View>
          ) : (
            <View
              style={[
                styles.concertSearchInputWrap,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.line,
                },
              ]}
            >
              <Search size={18} color={colors.inkMuted} />
              <TextInput
                accessibilityLabel="Search for an official artist"
                value={concertSearchText}
                onChangeText={(value) => {
                  setConcertSearchText(value);
                  setConcertActionError(null);
                }}
                placeholder="Find an artist"
                placeholderTextColor={colors.inkMuted}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                style={[styles.concertSearchInput, { color: colors.ink }]}
              />
              {artistSearch.isLoading || ensureArtist.isPending ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : concertSearchText.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear artist search"
                  hitSlop={8}
                  onPress={() => setConcertSearchText('')}
                  style={styles.concertSearchClear}
                >
                  <X size={17} color={colors.inkMuted} />
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
        {shouldShowArtistSearch ? (
          <View style={styles.section}>
            <Text variant="caption" color="secondary">
              Choose the artist from the catalog to exclude tribute acts.
            </Text>
            {concertActionError ? (
              <SectionError message={concertActionError} />
            ) : null}
            {artistSearch.isError && !artistSearch.results.length ? (
              <SectionError
                message={artistSearch.error ?? 'Artist search is unavailable.'}
              />
            ) : null}
            {concertSearchText.trim().length >= 2 &&
            !artistSearch.isLoading &&
            !artistSearch.results.length &&
            !artistSearch.isError ? (
              <Text variant="caption" color="secondary">
                No artists found. Try another spelling.
              </Text>
            ) : null}
            {artistSearch.results.map((result) => (
              <ArtistSearchResultRow
                key={`${result.source}-${result.spotifyId ?? result.artistId ?? result.name}`}
                result={result}
                onPress={(selected) => void selectConcertArtist(selected)}
              />
            ))}
          </View>
        ) : null}
        {hasConcertQuery ? (
          <View style={styles.section}>
            <ConcertSearchFilters
              countryCode={concertCountry}
              dateFrom={concertDateFrom}
              dateTo={concertDateTo}
              onCountryChange={setConcertCountry}
              onDateFromChange={setConcertDateFrom}
              onDateToChange={setConcertDateTo}
            />
            {concertDateError ? (
              <SectionError message={concertDateError} />
            ) : null}
            {concertActionError ? (
              <SectionError message={concertActionError} />
            ) : null}
            {concertSearchQuery.isError && !concertSearchQuery.isDebouncing ? (
              <SectionError message="Official concert dates are unavailable right now. Please try again." />
            ) : null}
            {wishlistQuery.isError ? (
              <SectionError message="Your Wishlist could not be loaded. Refresh before changing saved shows." />
            ) : null}
            {concertSearchQuery.isDebouncing ||
            (concertSearchQuery.isLoading && !concertResults.length) ? (
              <SectionSkeleton />
            ) : null}
            {!concertDateError &&
            !concertSearchQuery.isDebouncing &&
            !concertSearchQuery.isError &&
            !concertSearchQuery.isFetching &&
            !concertResults.length ? (
              <Text variant="caption" color="secondary">
                No official upcoming dates found for{' '}
                {selectedConcertArtist.name}.
              </Text>
            ) : null}
            {!concertSearchQuery.isDebouncing
              ? concertResults.map((concert) => {
                  const savedItem = findWishlistConcert(
                    concert,
                    wishlistQuery.data ?? [],
                  );
                  return (
                    <OfficialConcertCard
                      key={concert.eventId}
                      concert={concert}
                      saved={!!savedItem}
                      saving={savingConcertId === concert.eventId}
                      busy={
                        savingConcertId === concert.eventId ||
                        wishlistQuery.isLoading ||
                        wishlistQuery.isError
                      }
                      onToggle={() => void toggleConcertWishlist(concert)}
                      onTickets={() => void openTickets(concert.ticketUrl)}
                    />
                  );
                })
              : null}
          </View>
        ) : null}
        {!location.country ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Set your private location"
            onPress={() => setLocationSheetVisible(true)}
            style={[styles.locationPrompt, { borderColor: colors.line }]}
          >
            <MapPin size={17} color={colors.accent} />
            <Text variant="caption" color="secondary" style={styles.flexOne}>
              Add your location to find nearby shows. It stays private.
            </Text>
            <Text variant="caption" color="accent">
              Set
            </Text>
          </Pressable>
        ) : null}
        {locationError ? (
          <SectionError message={locationError.message} />
        ) : null}

        {upcomingWish || marqueeArtist ? (
          <View style={styles.section}>
            <SectionHeading title="ON THE MARQUEE" />
            <Ticket serialNumber="NEXT UP" hasBarcode={false}>
              <Text variant="overline" color="accent">
                {upcomingWish ? 'YOUR NEXT SHOW' : 'FROM YOUR FAVOURITES'}
              </Text>
              <Text variant="title" style={styles.marqueeTitle}>
                {upcomingWish?.artist_name ?? marqueeArtist?.name}
              </Text>
              <Text variant="body" color="secondary">
                {[
                  upcomingWish?.event_name,
                  upcomingWish?.city ?? marqueeArtist?.nearest_city,
                  upcomingWish?.target_date
                    ? daysUntil(upcomingWish.target_date)
                    : marqueeArtist?.next_date
                      ? daysUntil(marqueeArtist.next_date)
                      : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'A favourite artist is on tour'}
              </Text>
              <View style={styles.buttonRow}>
                {(upcomingWish?.ticket_url ?? marqueeArtist?.ticket_url) ? (
                  <Button
                    label="Tickets"
                    size="sm"
                    leftIcon={<TicketIcon size={15} color={colors.accentInk} />}
                    onPress={() =>
                      void openTickets(
                        upcomingWish?.ticket_url ?? marqueeArtist?.ticket_url,
                      )
                    }
                  />
                ) : null}
                <Button
                  label="Open wishlist"
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    router.navigate(
                      routes.legacy.userWishlist(profile?.username ?? ''),
                    )
                  }
                />
              </View>
            </Ticket>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeading title="HOT RIGHT NOW" />
          <SegmentedControl
            options={[
              TREND_OPTIONS[0]!,
              {
                label: countryNameFromCode(location.country) || 'Country',
                value: 'country',
              },
              TREND_OPTIONS[2]!,
            ]}
            value={trendingMode}
            onChange={setTrendingMode}
          />
          {trendingMode === 'country' && !location.country ? (
            <Text variant="caption" color="secondary">
              Set a country in your private location preferences to see its
              chart.
            </Text>
          ) : null}
          {trending.isLoading ? <SectionSkeleton /> : null}
          {trending.isError ? (
            <SectionError message={trending.error.message} />
          ) : null}
          {!trending.isLoading && !trendingArtists.length ? (
            <EmptyState
              title="No chart yet"
              description={
                trendingMode === 'app'
                  ? 'The IveLive chart will appear as public concert logs are added.'
                  : 'Last.fm charts refresh daily. If this chart has never loaded, it will appear after the first successful refresh.'
              }
            />
          ) : null}
          {isIveLiveChart ? (
            <Text variant="caption" color="secondary">
              Based on recent public IveLive concert logs.
            </Text>
          ) : null}
          {trendingArtists.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.artistRack}
            >
              {trendingArtists.slice(0, 20).map((artist, index) => (
                <PosterCard
                  key={artist.id}
                  artist={artist}
                  rank={artist.rank ?? index + 1}
                  delta={artist.delta}
                  onPress={() => void openArtistCard(artist.id)}
                />
              ))}
            </ScrollView>
          ) : null}
          {trendingMode !== 'app' ? (
            <Text variant="caption" color="secondary">
              Charts: Last.fm · Artist photos: IveLive
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.headingRow}>
            <SectionHeading title="ON TOUR" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit private location"
              onPress={() => setLocationSheetVisible(true)}
              style={styles.locationButton}
            >
              <MapPin size={15} color={colors.inkMuted} />
              <Text variant="caption" color="secondary">
                {location.city ||
                  countryNameFromCode(location.country) ||
                  'Location'}
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {TOUR_SCOPES.map((option) => (
              <Chip
                key={option.value}
                selected={tourScope === option.value && radiusKm === null}
                onPress={() => {
                  setTourScope(option.value);
                  setRadiusKm(null);
                }}
              >
                {option.label}
              </Chip>
            ))}
            {[50, 150, 300].map((distance) => (
              <Chip
                key={distance}
                selected={radiusKm === distance}
                disabled={!hasCoordinates}
                onPress={() => {
                  setRadiusKm(distance);
                }}
              >
                Near · {distance} km
              </Chip>
            ))}
          </ScrollView>
          {!hasCoordinates ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Set device location for nearby shows"
              onPress={() => setLocationSheetVisible(true)}
            >
              <Text variant="caption" color="secondary">
                Choose device location to enable distance filters. A manually
                entered city only filters by country.
              </Text>
            </Pressable>
          ) : null}
          {tourQuery.isLoading ? <SectionSkeleton /> : null}
          {tourQuery.isError ? (
            <SectionError message={tourQuery.error.message} />
          ) : null}
          {!tourQuery.isLoading && !tourQuery.isError && !tourArtists.length ? (
            <EmptyState
              title="No shows in the next two weeks"
              description={
                tourScope === 'mine'
                  ? 'No followed or saved artists have a show in the next two weeks.'
                  : 'Upcoming Ticketmaster dates will appear here when available near your location.'
              }
            />
          ) : null}
          {tourArtists.map((artist) => (
            <TourCard
              key={artist.id}
              artist={artist}
              saved={
                !!artist.in_wishlist ||
                !!profileOverview?.wishlist?.items.some(
                  (item) => item.artist_id === artist.id,
                )
              }
              onOpen={() => void openArtistCard(artist.id)}
              onTickets={() => void openTickets(artist.ticket_url)}
              onSave={() => void addTourToWishlist(artist)}
            />
          ))}
          {tourSelection.includesDatesBeyondWindow ? (
            <Text variant="caption" color="secondary">
              No matching shows in the next 14 days. These are the next
              available dates.
            </Text>
          ) : null}
          {tourArtists.length ? (
            <Text variant="caption" color="secondary">
              Tour dates from Ticketmaster
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <SectionHeading title="BEST RATED LIVE" />
          <SegmentedControl
            options={[
              { label: 'All time', value: 'all' },
              { label: 'This year', value: 'year' },
            ]}
            value={ratingPeriod}
            onChange={setRatingPeriod}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <Chip
              selected={venueType === null}
              onPress={() => setVenueType(null)}
            >
              All venues
            </Chip>
            {VENUE_TYPE_ORDER.map((type) => (
              <Pressable
                key={type}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: venueType === type }}
                onPress={() => setVenueType(type)}
              >
                <VenueLabel
                  venue={type}
                  label={VENUE_LABELS[type]}
                  size="xs"
                  variant={venueType === type ? 'solid' : 'outline'}
                />
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <Chip selected={genre === null} onPress={() => setGenre(null)}>
              All genres
            </Chip>
            {Object.keys(MACRO_GENRES).map((key) => (
              <Pressable
                key={key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: genre === key }}
                onPress={() => setGenre(genre === key ? null : key)}
              >
                <GenreLabel
                  genre={key as keyof typeof MACRO_GENRES}
                  size="xs"
                  variant={genre === key ? 'solid' : 'outline'}
                  interactive={false}
                />
              </Pressable>
            ))}
          </ScrollView>
          {ratedQuery.isLoading ? <SectionSkeleton /> : null}
          {ratedQuery.isError ? (
            <SectionError message={ratedQuery.error.message} />
          ) : null}
          {!ratedQuery.isLoading &&
          !ratedQuery.isError &&
          !ratedArtists.length ? (
            <EmptyState
              title="Not enough shows logged yet"
              description="Artists appear after at least three fans have rated their shows."
            />
          ) : null}
          {ratedArtists.map((artist, index) => (
            <Pressable
              key={artist.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${artist.name}, rated ${artist.avg_show_rating?.toFixed(1) ?? 'not rated'} stars`}
              onPress={() => void openArtistCard(artist.id)}
              style={[styles.ratingRow, { borderBottomColor: colors.line }]}
            >
              <Text variant="display" style={styles.rank}>
                {index + 1}
              </Text>
              <Avatar
                imageUrl={artist.image_url_thumb ?? artist.image_url_large}
                name={artist.name}
                size="sm"
              />
              <View style={styles.ratingCopy}>
                <Text variant="label" weight="bold">
                  {artist.name}
                </Text>
                <Text variant="caption" color="secondary">
                  Based on {artist.rating_count ?? 0} shows by{' '}
                  {artist.rater_count ?? 0} fans
                </Text>
              </View>
              <View style={styles.stars}>
                <Text variant="label" weight="bold" color="accent">
                  ★ {artist.avg_show_rating?.toFixed(1) ?? '—'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.headingRow}>
            <SectionHeading title="FROM YOUR FRIENDS" />
            <Pressable
              accessibilityRole="link"
              onPress={() => router.navigate(routes.legacy.friends())}
              style={styles.seeAllButton}
            >
              <Text variant="caption" color="accent" weight="bold">
                SEE ALL
              </Text>
            </Pressable>
          </View>
          <View style={styles.friendsFeed}>
            {featuredFriendPost ? (
              <FeedCard
                item={featuredFriendPost}
                youWentToo={allLogs.some(
                  (log) =>
                    log.artist_id === featuredFriendPost.artist_id &&
                    log.event_date === featuredFriendPost.event_date,
                )}
                onPressLog={(logId) => router.navigate(routes.log(logId))}
                onOpenComments={(item) =>
                  router.navigate(routes.logComments(item.id))
                }
                onPressArtist={(artistId) => {
                  void openArtistCard({
                    artistId,
                    name: featuredFriendPost.artist.name,
                    imageUrl:
                      featuredFriendPost.artist.image_url_thumb ?? undefined,
                    macroGenres: featuredFriendPost.artist.macro_genres,
                    genres: [],
                  });
                }}
                onPressUser={(username) =>
                  router.navigate(routes.user(username, { tab: 'timeline' }))
                }
              />
            ) : friendsFeed.isLoading ? (
              <Text variant="caption" color="secondary">
                Gathering the latest from your crew…
              </Text>
            ) : friendsFeed.isError ? (
              <Text variant="caption" color="danger">
                Your friends’ activity could not be loaded.
              </Text>
            ) : (
              <Text variant="caption" color="secondary">
                Follow a friend to see their live moments here.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.headingRow}>
            <SectionHeading title="PICK UP WHERE YOU LEFT OFF" />
            <Stamp label="LOG A SHOW" tilt={false} style={styles.logStamp} />
          </View>
          <Button
            label="Log a show"
            size="sm"
            onPress={() => router.navigate(routes.logWizard())}
          />
          {logsQuery.isLoading ? <SectionSkeleton /> : null}
          {logsQuery.isError ? (
            <SectionError message={logsQuery.error.message} />
          ) : null}
          {!logsQuery.isLoading && !logsQuery.isError && !logs.length ? (
            <EmptyState
              title="Your live history starts here"
              description="Log a show and keep the night with you."
              action={
                <Button
                  label="Log a show"
                  onPress={() => router.navigate(routes.logWizard())}
                />
              }
            />
          ) : null}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stubRack}
          >
            {logs.map((log) => (
              <Pressable
                key={log.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${log.artist?.name ?? 'show'} log`}
                onPress={() => router.navigate(routes.log(log.id))}
                style={styles.logStub}
              >
                <Stub id={log.id}>
                  <Text variant="label" weight="bold">
                    {log.artist?.name ?? 'Live show'}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {new Date(
                      `${log.event_date}T12:00:00`,
                    ).toLocaleDateString()}
                  </Text>
                  {log.rating ? (
                    <Text variant="caption" color="accent">
                      {'★'.repeat(Math.round(log.rating))}
                    </Text>
                  ) : null}
                </Stub>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <View style={styles.section}>
          <View style={styles.headingRow}>
            <SectionHeading title="EXPLORE GENRES" />
            <Pressable
              accessibilityRole="link"
              onPress={() => router.navigate(routes.genres())}
              style={styles.seeAllButton}
            >
              <Text variant="caption" color="accent" weight="bold">
                SEE ALL GENRES
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genreStrip}
          >
            {MACRO_GENRE_ORDER.map((slug) => (
              <GenreLabel key={slug} genre={slug as MacroGenre} size="xs" />
            ))}
          </ScrollView>
        </View>
        <Text variant="mono" color="secondary" center>
          CHARTS: LAST.FM · TOUR DATES: TICKETMASTER
        </Text>
      </ScrollView>

      <LocationPreferenceSheet
        visible={locationSheetVisible}
        onDismiss={() => setLocationSheetVisible(false)}
        location={location}
        isLoading={isLocationLoading}
      />
    </View>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <Text variant="label" weight="bold">
      {title}
    </Text>
  );
}

function OfficialConcertCard({
  concert,
  saved,
  saving,
  busy,
  onToggle,
  onTickets,
}: {
  concert: OfficialConcertSearchResult;
  saved: boolean;
  saving: boolean;
  busy: boolean;
  onToggle: () => void;
  onTickets: () => void;
}) {
  const { colors } = useTheme();
  const date = new Date(`${concert.eventDate}T12:00:00Z`);
  const eventDate = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  const location = [concert.venueName, concert.city, concert.country]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        styles.officialConcertCard,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <View style={styles.officialConcertHeader}>
        <View style={styles.officialConcertCopy}>
          <Text variant="label" weight="bold">
            {concert.eventName}
          </Text>
          <Text variant="caption" color="secondary">
            {location || 'Venue to be announced'}
          </Text>
        </View>
        <View style={styles.officialConcertDate}>
          <Text variant="mono" weight="bold" color="accent">
            {eventDate}
          </Text>
        </View>
      </View>
      <Text variant="caption" color="secondary">
        {concert.lineup.length > 1
          ? `Line-up: ${concert.lineup.join(' · ')}`
          : concert.artistName}
      </Text>
      <View style={styles.officialConcertActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            saved
              ? `Remove ${concert.artistName} on ${eventDate} from Wishlist`
              : `Add ${concert.artistName} on ${eventDate} to Wishlist`
          }
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onToggle}
          style={[
            styles.wishlistAction,
            {
              backgroundColor: saved ? colors.surfaceRaised : colors.accent,
              borderColor: saved ? colors.line : colors.accent,
              opacity: busy ? 0.6 : 1,
            },
          ]}
        >
          {saved ? (
            <Check size={16} color={colors.ink} />
          ) : (
            <Plus size={16} color={colors.accentInk} />
          )}
          <Text
            variant="caption"
            weight="bold"
            color={saved ? 'secondary' : 'accent'}
          >
            {saving
              ? 'Saving…'
              : busy
                ? 'Loading…'
                : saved
                  ? 'Saved · remove'
                  : 'Add to Wishlist'}
          </Text>
        </Pressable>
        {concert.ticketUrl ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Official tickets for ${concert.artistName} on ${eventDate}`}
            onPress={onTickets}
            style={[
              styles.ticketAction,
              { borderColor: colors.line, backgroundColor: colors.bg },
            ]}
          >
            <TicketIcon size={15} color={colors.ink} />
            <Text variant="caption" weight="bold">
              Tickets
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PosterCard({
  artist,
  rank,
  delta,
  onPress,
}: {
  artist: HomeArtist;
  rank: number;
  delta?: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const macro = artist.primary_macro ?? artist.macro_genres[0] ?? 'other';
  const genre =
    MACRO_GENRES[macro as keyof typeof MACRO_GENRES] ?? MACRO_GENRES.other;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open trending artist ${artist.name}, number ${rank}`}
      onPress={onPress}
      style={[
        styles.poster,
        { backgroundColor: colors.surface, borderColor: colors.ink },
      ]}
    >
      <Text variant="display" style={styles.posterRank}>
        {String(rank).padStart(2, '0')}
      </Text>
      <Avatar
        imageUrl={artist.image_url_large ?? artist.image_url_thumb}
        name={artist.name}
        size="lg"
      />
      <Text variant="caption" weight="bold" style={styles.posterName}>
        {artist.name}
      </Text>
      <View style={styles.posterFooter}>
        <GenreLabel
          genre={macro as keyof typeof MACRO_GENRES}
          label={genre.label}
          size="xs"
        />
        {delta !== undefined ? (
          <Text variant="caption" weight="bold" color="accent">
            {delta > 0
              ? `↑${delta}`
              : delta < 0
                ? `↓${Math.abs(delta)}`
                : 'NEW'}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function TourCard({
  artist,
  saved,
  onOpen,
  onTickets,
  onSave,
}: {
  artist: HomeArtist;
  saved: boolean;
  onOpen: () => void;
  onTickets: () => void;
  onSave: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.tourCard,
        { backgroundColor: colors.surface, borderColor: colors.ink },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${artist.name} artist card`}
        onPress={onOpen}
        style={styles.tourHeader}
      >
        <Avatar
          imageUrl={artist.image_url_thumb ?? artist.image_url_large}
          name={artist.name}
          size="md"
        />
        <View style={styles.tourCopy}>
          <Text variant="title" weight="bold">
            {artist.name}
          </Text>
          <Text variant="caption" color="secondary">
            {[artist.nearest_venue, artist.nearest_city, artist.nearest_country]
              .filter(Boolean)
              .join(' · ') || 'Upcoming date'}
          </Text>
          {artist.distance_km != null ? (
            <Text variant="caption" color="secondary">
              {Math.round(artist.distance_km)} km away
            </Text>
          ) : null}
        </View>
        <View style={styles.dateBlock}>
          <Text variant="mono" color="accent">
            {artist.next_date
              ? new Date(artist.next_date).getDate().toString().padStart(2, '0')
              : '--'}
          </Text>
          <Text variant="caption" color="secondary">
            {artist.next_date
              ? new Intl.DateTimeFormat(undefined, { month: 'short' })
                  .format(new Date(artist.next_date))
                  .toUpperCase()
              : 'TBA'}
          </Text>
        </View>
      </Pressable>
      {artist.dates_count && artist.dates_count > 1 ? (
        <Text variant="caption" color="secondary">
          +{artist.dates_count - 1} more dates
        </Text>
      ) : null}
      <View style={styles.buttonRow}>
        {saved ? (
          <Stamp label="SAVED" variant="slate" tilt={false} />
        ) : (
          <Button
            label="Add to wishlist"
            variant="secondary"
            size="sm"
            onPress={onSave}
          />
        )}
        {artist.ticket_url ? (
          <Button label="Tickets" size="sm" onPress={onTickets} />
        ) : null}
      </View>
    </View>
  );
}

function daysUntil(date: string) {
  const day = new Date(`${date.slice(0, 10)}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const days = Math.ceil((day.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return 'today';
  return `in ${days} days`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: spacing.xl, paddingHorizontal: spacing.md },
  concertSearchSticky: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
    zIndex: 2,
  },
  concertSearchInputWrap: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  concertSearchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    height: 48,
    minWidth: 0,
  },
  selectedArtistRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.sm,
  },
  selectedArtistCopy: { flex: 1, gap: 2, minWidth: 0 },
  concertSearchClear: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 36,
  },
  officialConcertCard: {
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  officialConcertHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  officialConcertCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  officialConcertDate: { alignItems: 'flex-end', flexShrink: 0 },
  officialConcertActions: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  wishlistAction: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  ticketAction: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  masthead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  mastheadCopy: { flex: 1, gap: spacing.xs },
  avatarButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  locationPrompt: {
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  flexOne: { flex: 1, minWidth: 0 },
  section: { gap: spacing.md },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marqueeTitle: { marginVertical: spacing.xs },
  buttonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  skeletonRack: { flexDirection: 'row', gap: spacing.sm },
  friendsFeed: { gap: spacing.sm },
  genreStrip: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  seeAllButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  artistRack: {
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  poster: {
    borderWidth: 1.5,
    minHeight: 178,
    overflow: 'hidden',
    padding: spacing.sm,
    width: 148,
  },
  posterRank: { lineHeight: 48 },
  posterName: { marginTop: spacing.xs, minHeight: 34 },
  posterFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chipRow: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  locationButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  tourCard: {
    borderWidth: 1.5,
    gap: spacing.sm,
    padding: spacing.md,
    ...hardShadow.sm,
  },
  tourHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  tourCopy: { flex: 1, gap: 3, minWidth: 0 },
  dateBlock: {
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'transparent',
    minWidth: 44,
  },
  ratingRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 64,
    paddingVertical: spacing.xs,
  },
  rank: { fontSize: 28, minWidth: 38 },
  ratingCopy: { flex: 1, gap: 2, minWidth: 0 },
  stars: { alignItems: 'flex-end' },
  stubRack: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  logStub: { width: 180 },
  logStamp: { marginLeft: spacing.xs },
});

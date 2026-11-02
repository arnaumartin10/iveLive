import { useArtistConcertHistory, useDeleteConcert } from '../concerts/hooks';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import Animated, {
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ExternalLink,
  Flag,
  Camera,
  Music2,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { hardShadow, radius, spacing } from '../../theme/tokens';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Pill } from '../../components/ui/Pill';
import { Sheet } from '../../components/ui/Sheet';
import { Skeleton } from '../../components/ui/Skeleton';
import { PatternFill } from '../../components/paper';
import { Mascot } from '../../components/brand/Mascot';
import { isMacroGenre } from '../../components/brand/mascotColors';
import type { MacroGenre } from '../genres/macroGenres';
import { useAuthStore } from '../auth/store';
import type { ConcertWithRelations } from '../concerts/types';
import { useLogDraft } from '../log/store';
import { MACRO_GENRES } from '../genres/macroGenres';
import { VENUE_TYPES, type VenueType } from '../venues/venueTypes';
import {
  useArtist,
  useArtistFriends,
  useArtistImageGallery,
  useArtistManagePermissions,
  useArtistOverride,
  useEnrichArtist,
  useReportArtist,
  useSaveArtistOverride,
  useSaveUserArtistImageOverride,
  useUserArtistImageOverride,
} from './hooks';
import { CustomArtistForm } from './CustomArtistForm';
import type { ArtistAlbumRow, ArtistWithAlbums } from './types';
import { getArtistImageChoices, type ArtistImageRole } from './imageChoices';
import { useArtistRatingSummary, useArtistTourDates } from '../home/hooks';

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';
const macroOrder = Object.keys(MACRO_GENRES).filter(
  (key) => key !== 'unclassified',
);

type ArtistCardContentProps = {
  artistId: string | null;
  artistSeed?: ArtistWithAlbums | null;
  presentation: 'sheet' | 'route';
  onDismiss?: () => void;
};

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  try {
    return format(parseISO(value), 'MMM d, yyyy');
  } catch {
    return value;
  }
}

function PendingShimmer({
  width = '100%',
  height = 18,
}: {
  width?: number | `${number}%`;
  height?: number;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.55;
      return;
    }
    opacity.value = withRepeat(withTiming(0.95, { duration: 900 }), -1, true);
  }, [opacity, reduceMotion]);
  return (
    <Animated.View
      style={{
        width,
        height,
        opacity,
        borderRadius: 6,
        backgroundColor: colors.line,
      }}
    />
  );
}

function ProfilePhoto({
  name,
  uri,
  color,
  genre,
  size = 92,
}: {
  name: string;
  uri: string | null;
  color: string;
  genre: MacroGenre;
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.profilePhotoRing,
        {
          width: size + 10,
          height: size + 10,
          borderRadius: (size + 10) / 2,
          borderColor: `${color}A8`,
          shadowColor: color,
          backgroundColor: colors.bg,
        },
      ]}
    >
      {uri ? (
        <Image
          accessibilityLabel={`${name} profile photo`}
          source={{ uri }}
          placeholder={{ blurhash }}
          placeholderContentFit="cover"
          cachePolicy="memory-disk"
          contentFit="cover"
          style={{ width: size, height: size, borderRadius: size / 2 }}
          transition={160}
        />
      ) : (
        <View
          accessible
          accessibilityLabel={`${name} artist mascot`}
          style={[
            styles.photoFallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.surfaceRaised,
            },
          ]}
        >
          <Mascot genre={genre} size={size * 0.72} />
        </View>
      )}
    </View>
  );
}

function AlbumPreview({
  album,
  visible,
  onDismiss,
}: {
  album: ArtistAlbumRow | null;
  visible: boolean;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  if (!album) return null;
  return (
    <Sheet
      visible={visible}
      title={album.title}
      snapPoints={['65%', '92%']}
      onDismiss={onDismiss}
    >
      <View style={styles.albumPreview}>
        {album.cover_url ? (
          <Image
            accessibilityLabel={`${album.title} album cover`}
            source={{ uri: album.cover_url }}
            placeholder={{ blurhash }}
            placeholderContentFit="cover"
            cachePolicy="memory-disk"
            contentFit="cover"
            style={styles.albumPreviewCover}
          />
        ) : (
          <View
            accessible
            accessibilityLabel={`${album.title} album artwork placeholder`}
            style={[
              styles.albumPreviewCover,
              styles.albumPlaceholder,
              { backgroundColor: colors.surfaceRaised },
            ]}
          >
            <Music2 size={38} color={colors.inkMuted} />
          </View>
        )}
        <Text variant="title" weight="bold" center>
          {album.title}
        </Text>
        <Text variant="caption" color="secondary" center>
          {[album.type.toUpperCase(), album.year].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Sheet>
  );
}

export function ArtistCardContent({
  artistId,
  artistSeed,
  presentation,
  onDismiss,
}: ArtistCardContentProps) {
  const { colors } = useTheme();
  const userId = useAuthStore((state) => state.user?.id ?? '');
  const artistQuery = useArtist(artistId);
  const artist = artistQuery.data ?? artistSeed ?? undefined;
  const persistedArtistId = artistId ?? (artist?.id || null);
  const ratingSummaryQuery = useArtistRatingSummary(persistedArtistId ?? '');
  const tourDatesQuery = useArtistTourDates(persistedArtistId ?? '');
  const logsQuery = useArtistConcertHistory(userId, persistedArtistId ?? '');
  const friendsQuery = useArtistFriends(persistedArtistId ?? '', userId);
  const overrideQuery = useArtistOverride(persistedArtistId ?? '', userId);
  const imageOverrideQuery = useUserArtistImageOverride(
    persistedArtistId ?? '',
    userId,
  );
  const imageGalleryQuery = useArtistImageGallery(persistedArtistId ?? '');
  const enrichMutation = useEnrichArtist();
  const saveOverrideMutation = useSaveArtistOverride();
  const saveImageOverrideMutation = useSaveUserArtistImageOverride();
  const reportMutation = useReportArtist();
  const deleteConcertMutation = useDeleteConcert(userId);
  const startEdit = useLogDraft((state) => state.startEdit);
  const resetLogDraft = useLogDraft((state) => state.reset);
  const setLogArtist = useLogDraft((state) => state.setArtist);
  const goToDateStep = useLogDraft((state) => state.goNext);
  const permissionsQuery = useArtistManagePermissions(artist, userId);
  const canEditManualArtist =
    artist?.source === 'manual' && !!permissionsQuery.data?.canEdit;
  const [editManualSheetVisible, setEditManualSheetVisible] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<ArtistAlbumRow | null>(
    null,
  );
  const [genreSheetVisible, setGenreSheetVisible] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [reportDetails, setReportDetails] = useState('');
  const [draftGenres, setDraftGenres] = useState<string[]>([]);
  const [showHeroOriginal, setShowHeroOriginal] = useState(false);
  const [imageTarget, setImageTarget] = useState<ArtistImageRole | null>(null);

  const macroGenres = overrideQuery.data ?? artist?.macro_genres ?? [];
  const primaryMacro =
    macroGenres[0] ?? artist?.primary_macro ?? 'unclassified';
  const genreColor =
    MACRO_GENRES[primaryMacro as keyof typeof MACRO_GENRES]?.color ??
    colors.inkMuted;
  const sourceProfilePhoto =
    artist?.image_url_large ?? artist?.image_url_thumb ?? null;
  const profilePhoto =
    imageOverrideQuery.data?.profile_image_url ?? sourceProfilePhoto;
  const heroImage =
    imageOverrideQuery.data?.banner_image_url ??
    artist?.banner_image_url ??
    artist?.group_image_url ??
    sourceProfilePhoto;
  const imageChoices = useMemo(
    () =>
      artist && imageTarget
        ? getArtistImageChoices(
            artist,
            imageTarget,
            imageGalleryQuery.data ?? [],
          )
        : [],
    [artist, imageGalleryQuery.data, imageTarget],
  );
  const isPending = artist?.enrichment_status === 'pending';
  const ownLogs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const ratedLogs = ownLogs.filter((log) => log.rating != null);
  const averageRating = ratedLogs.length
    ? ratedLogs.reduce((sum, log) => sum + (log.rating ?? 0), 0) /
      ratedLogs.length
    : null;
  const firstSeen = ownLogs.length
    ? ownLogs.reduce(
        (first, log) => (log.event_date < first ? log.event_date : first),
        ownLogs[0]!.event_date,
      )
    : null;
  const lastSeen = ownLogs.length
    ? ownLogs.reduce(
        (last, log) => (log.event_date > last ? log.event_date : last),
        ownLogs[0]!.event_date,
      )
    : null;
  const venueTypes = [
    ...new Set(ownLogs.map((log) => log.venue_type)),
  ] as VenueType[];

  useEffect(() => {
    if (heroImage)
      void Image.prefetch(heroImage, { cachePolicy: 'memory-disk' });
  }, [heroImage]);

  function toggleDraftGenre(genre: string) {
    setDraftGenres((current) =>
      current.includes(genre)
        ? current.filter((value) => value !== genre)
        : current.length < 3
          ? [...current, genre]
          : current,
    );
  }

  function openGenreSheet() {
    setDraftGenres(overrideQuery.data ?? artist?.macro_genres ?? []);
    setGenreSheetVisible(true);
  }

  async function refreshArtist() {
    if (!persistedArtistId) return;
    try {
      await enrichMutation.mutateAsync({ artistId: persistedArtistId });
      await artistQuery.refetch();
    } catch (error) {
      Alert.alert(
        'Could not refresh artist',
        error instanceof Error ? error.message : 'Try again later.',
      );
    }
  }

  async function chooseArtistImage(url: string | null) {
    if (!persistedArtistId || !imageTarget) return;
    try {
      await saveImageOverrideMutation.mutateAsync({
        artistId: persistedArtistId,
        userId,
        profileImageUrl:
          imageTarget === 'profile'
            ? url
            : (imageOverrideQuery.data?.profile_image_url ?? null),
        bannerImageUrl:
          imageTarget === 'banner'
            ? url
            : (imageOverrideQuery.data?.banner_image_url ?? null),
      });
      setImageTarget(null);
    } catch (error) {
      Alert.alert(
        'Could not save artist photo',
        error instanceof Error ? error.message : 'Try again later.',
      );
    }
  }

  async function findMoreArtistImages() {
    if (!persistedArtistId) return;
    try {
      await enrichMutation.mutateAsync({ artistId: persistedArtistId });
      const [, galleryResult] = await Promise.all([
        artistQuery.refetch(),
        imageGalleryQuery.refetch(),
      ]);
      if (
        !galleryResult.data?.some((image) => image.image_role === imageTarget)
      ) {
        Alert.alert(
          'No additional photos found',
          'There are no extra source images available for this artist yet.',
        );
      }
    } catch (error) {
      Alert.alert(
        'Could not find more photos',
        error instanceof Error ? error.message : 'Try again later.',
      );
    }
  }

  async function openTicketUrl(url: string) {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(
        'Could not open tickets',
        error instanceof Error ? error.message : 'Try again later.',
      );
    }
  }

  function handleDeleteLog(log: ConcertWithRelations) {
    Alert.alert(
      'Delete concert log?',
      'This removes the show from your history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteConcertMutation.mutate(log.id),
        },
      ],
    );
  }

  function handleLogAgain() {
    if (!persistedArtistId || !artist) return;
    resetLogDraft();
    setLogArtist(artist);
    goToDateStep();
    onDismiss?.();
    router.push('/log');
  }

  async function handleReport() {
    if (!userId || !persistedArtistId || !reportDetails.trim()) return;
    try {
      await reportMutation.mutateAsync({
        userId,
        artistId: persistedArtistId,
        details: reportDetails,
      });
      setReportDetails('');
      setReportSheetVisible(false);
      Alert.alert(
        'Report sent',
        'Thanks for helping keep artist information accurate.',
      );
    } catch (error) {
      Alert.alert(
        'Could not send report',
        error instanceof Error ? error.message : 'Try again later.',
      );
    }
  }

  if (artistQuery.isLoading && !artist) {
    return <ArtistCardSkeleton presentation={presentation} />;
  }
  if ((artistQuery.isError && !artistSeed) || !artist) {
    return (
      <View style={styles.errorState}>
        <Text variant="title" weight="bold">
          Could not load artist
        </Text>
        <Text variant="caption" color="secondary" center>
          {artistQuery.error?.message ??
            'Artist details are temporarily unavailable.'}
        </Text>
        <Button
          label="Try again"
          variant="secondary"
          onPress={() => void artistQuery.refetch()}
        />
      </View>
    );
  }
  const ContentScroll = ScrollView;
  const sourceName =
    artist.bio_source === 'wikipedia'
      ? `From Wikipedia · ${artist.bio_attribution ?? 'CC BY-SA'}`
      : artist.bio_source === 'lastfm'
        ? 'From Last.fm'
        : artist.bio_source
          ? `From ${artist.bio_source}`
          : null;

  return (
    <>
      {presentation === 'route' ? (
        <View
          style={[
            styles.routeHeader,
            {
              backgroundColor: colors.bg,
              borderBottomColor: colors.line,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={styles.iconButton}
          >
            <ArrowLeft size={20} color={colors.ink} />
          </Pressable>
          <Text
            variant="label"
            weight="bold"
            numberOfLines={1}
            style={styles.routeTitle}
          >
            {artist.name}
          </Text>
          <View style={styles.iconButton} />
        </View>
      ) : null}
      <ContentScroll
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={enrichMutation.isPending}
            onRefresh={() => void refreshArtist()}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <View style={styles.hero}>
          {heroImage ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Press and hold to see the original ${artist.name} photo`}
              onPressIn={() => setShowHeroOriginal(true)}
              onPressOut={() => setShowHeroOriginal(false)}
              style={StyleSheet.absoluteFill}
            >
              <Image
                accessibilityLabel={`${artist.name} artist banner`}
                source={{ uri: heroImage }}
                placeholder={{ blurhash }}
                placeholderContentFit="cover"
                cachePolicy="memory-disk"
                contentFit="cover"
                style={StyleSheet.absoluteFill}
                transition={180}
              />
              <PatternFill
                pattern={
                  MACRO_GENRES[primaryMacro as keyof typeof MACRO_GENRES]
                    ?.pattern ?? 'dots'
                }
                colorA={genreColor}
                colorB={colors.surface}
                width={360}
                height={218}
                style={StyleSheet.flatten([
                  StyleSheet.absoluteFill,
                  { opacity: showHeroOriginal ? 0 : 0.08 },
                ])}
              />
            </Pressable>
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.surfaceRaised },
              ]}
            />
          )}
          {persistedArtistId && userId ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose artist profile photo and banner"
              disabled={
                imageOverrideQuery.isLoading ||
                saveImageOverrideMutation.isPending
              }
              onPress={() => {
                if (imageOverrideQuery.isError) {
                  Alert.alert(
                    'Could not load artist photos',
                    imageOverrideQuery.error instanceof Error
                      ? imageOverrideQuery.error.message
                      : 'Try again later.',
                  );
                  return;
                }
                setImageTarget('banner');
              }}
              style={[
                styles.imagePickerButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.ink,
                  opacity:
                    imageOverrideQuery.isLoading ||
                    saveImageOverrideMutation.isPending
                      ? 0.55
                      : 1,
                },
              ]}
            >
              <Camera size={16} color={colors.ink} />
              <Text variant="overline" weight="bold">
                PHOTOS
              </Text>
            </Pressable>
          ) : null}
        </View>
        <View
          style={[
            styles.heroIdentity,
            { backgroundColor: colors.surface, borderTopColor: colors.line },
          ]}
        >
          <ProfilePhoto
            name={artist.name}
            uri={profilePhoto}
            color={genreColor}
            genre={isMacroGenre(primaryMacro) ? primaryMacro : 'unclassified'}
          />
          <View style={styles.heroNameBlock}>
            <Text
              variant="title"
              weight="bold"
              numberOfLines={2}
              style={styles.artistName}
            >
              {artist.name}
            </Text>
            {artist.source === 'manual' ? (
              <View style={styles.manualRow}>
                <Text variant="caption" color="secondary">
                  Custom artist
                </Text>
                {canEditManualArtist ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Edit custom artist"
                    onPress={() => setEditManualSheetVisible(true)}
                    style={[
                      styles.editManualButton,
                      {
                        backgroundColor: `${colors.accent}20`,
                        borderColor: `${colors.accent}60`,
                      },
                    ]}
                  >
                    <Pencil size={11} color={colors.accent} />
                    <Text
                      variant="caption"
                      weight="bold"
                      style={{ color: colors.accent, fontSize: 11 }}
                    >
                      Edit
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
          {artist.spotify_id ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Open ${artist.name} in Spotify`}
              onPress={() =>
                void Linking.openURL(
                  `https://open.spotify.com/artist/${artist.spotify_id}`,
                )
              }
              style={[
                styles.spotifyButton,
                { backgroundColor: colors.surfaceRaised },
              ]}
            >
              <ExternalLink size={17} color={colors.ink} />
            </Pressable>
          ) : null}
          {presentation === 'sheet' && persistedArtistId ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open full artist page"
              onPress={() => {
                onDismiss?.();
                router.push({
                  pathname: '/artist/[id]',
                  params: { id: persistedArtistId },
                });
              }}
              style={[
                styles.spotifyButton,
                { backgroundColor: colors.surfaceRaised },
              ]}
            >
              <ArrowUpRight size={17} color={colors.ink} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.paddedContent}>
          <View style={styles.genreHeading}>
            <View style={styles.genrePills}>
              {macroGenres.map((macro) => {
                const config = MACRO_GENRES[macro as keyof typeof MACRO_GENRES];
                if (!config) return null;
                return (
                  <View
                    key={macro}
                    style={[
                      styles.macroPill,
                      { backgroundColor: `${config.color}24` },
                    ]}
                  >
                    <Text
                      variant="caption"
                      weight="semibold"
                      style={{
                        color:
                          macro === 'unclassified'
                            ? colors.inkMuted
                            : config.color,
                      }}
                    >
                      {config.label}
                    </Text>
                  </View>
                );
              })}
              {!macroGenres.length ? (
                <View
                  style={[
                    styles.macroPill,
                    { backgroundColor: colors.surfaceRaised },
                  ]}
                >
                  <Text variant="caption" color="secondary">
                    Unclassified
                  </Text>
                </View>
              ) : null}
            </View>
            {userId && persistedArtistId ? (
              <Pressable accessibilityRole="button" onPress={openGenreSheet}>
                <Text variant="caption" color="secondary">
                  Not right?
                </Text>
              </Pressable>
            ) : null}
          </View>
          {artist.genres.length ? (
            <View style={styles.detailTagRow}>
              {artist.genres.slice(0, 4).map((genre) => (
                <View
                  key={genre}
                  style={[
                    styles.detailTag,
                    { backgroundColor: colors.surfaceRaised },
                  ]}
                >
                  <Text variant="caption" color="secondary" numberOfLines={1}>
                    {genre}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {artist.spotify_id ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Open ${artist.name} in Spotify`}
              onPress={() =>
                void Linking.openURL(
                  `https://open.spotify.com/artist/${artist.spotify_id}`,
                )
              }
              style={[
                styles.spotifyBadge,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.ink,
                },
              ]}
            >
              <Music2 size={13} color={colors.accent} />
              <Text
                variant="caption"
                weight="bold"
                style={{ color: colors.accent }}
              >
                Open in Spotify
              </Text>
              <ExternalLink size={12} color={colors.accent} />
            </Pressable>
          ) : null}

          <View style={styles.section}>
            <Text variant="label" weight="bold">
              Your stats
            </Text>
            {logsQuery.isLoading ? (
              <View style={styles.statsStrip}>
                <Skeleton height={64} style={styles.statsSkeleton} />
                <Skeleton height={64} style={styles.statsSkeleton} />
              </View>
            ) : (
              <View style={[styles.statsStrip, { borderColor: colors.line }]}>
                <StatCell label="Shows" value={String(ownLogs.length)} />
                <StatCell
                  label="Average"
                  value={
                    averageRating == null
                      ? '—'
                      : `${averageRating.toFixed(1)} ★`
                  }
                />
                <StatCell
                  label="First seen"
                  value={formatDate(firstSeen) ?? '—'}
                />
                <StatCell
                  label="Last seen"
                  value={formatDate(lastSeen) ?? '—'}
                />
              </View>
            )}
            {venueTypes.length ? (
              <View style={styles.venueTypes}>
                {venueTypes.map((type) => {
                  const config = VENUE_TYPES[type];
                  const Icon = config.icon;
                  return (
                    <View
                      key={type}
                      style={[
                        styles.venueTypeItem,
                        { backgroundColor: `${config.primaryColor}20` },
                      ]}
                    >
                      <Icon
                        size={14}
                        color={config.primaryColor}
                        accessibilityLabel={config.label}
                      />
                      <Text
                        variant="caption"
                        style={{ color: config.primaryColor }}
                      >
                        {config.shortLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text variant="label" weight="bold">
              About
            </Text>
            {isPending ? (
              <View style={styles.pendingBio}>
                <PendingShimmer width="96%" />
                <PendingShimmer width="82%" />
                <PendingShimmer width="64%" />
              </View>
            ) : artist.bio ? (
              <>
                <Text
                  variant="body"
                  color="secondary"
                  numberOfLines={bioExpanded ? undefined : 5}
                >
                  {artist.bio}
                </Text>
                {artist.bio.length > 240 ? (
                  <Pressable onPress={() => setBioExpanded((value) => !value)}>
                    <Text variant="caption" color="accent" weight="semibold">
                      {bioExpanded ? 'Read less' : 'Read more'}
                    </Text>
                  </Pressable>
                ) : null}
                {sourceName && artist.bio_url ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => void Linking.openURL(artist.bio_url!)}
                    style={styles.sourceLine}
                  >
                    <Text variant="caption" color="secondary">
                      {sourceName}
                    </Text>
                    <ExternalLink size={13} color={colors.inkMuted} />
                  </Pressable>
                ) : sourceName ? (
                  <Text variant="caption" color="secondary">
                    {sourceName}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text variant="caption" color="secondary">
                No description yet
              </Text>
            )}
          </View>

          {persistedArtistId ? (
            <View style={styles.section}>
              <Text variant="label" weight="bold">
                IveLive ratings
              </Text>
              {ratingSummaryQuery.isLoading ? (
                <View style={styles.communitySkeleton}>
                  <Skeleton height={24} />
                  <Skeleton height={42} />
                </View>
              ) : ratingSummaryQuery.isError ? (
                <Text variant="caption" color="danger">
                  {ratingSummaryQuery.error.message}
                </Text>
              ) : ratingSummaryQuery.data?.rating_count ? (
                <>
                  <View style={styles.communityRating}>
                    <Text variant="display" style={styles.communityScore}>
                      {ratingSummaryQuery.data.avg_rating?.toFixed(1) ?? '—'}
                    </Text>
                    <View style={styles.communityCopy}>
                      <Text variant="label" color="accent">
                        ★★★★★
                      </Text>
                      <Text variant="caption" color="secondary">
                        {ratingSummaryQuery.data.rating_count} ratings from{' '}
                        {ratingSummaryQuery.data.rater_count} fans
                      </Text>
                      <Text variant="caption" color="secondary">
                        Weighted score{' '}
                        {ratingSummaryQuery.data.weighted_rating?.toFixed(2) ??
                          '—'}
                      </Text>
                    </View>
                  </View>
                  {ratingSummaryQuery.data.venue_averages.length ? (
                    <View style={styles.communityVenues}>
                      {ratingSummaryQuery.data.venue_averages.map((venue) => (
                        <View
                          key={venue.venue_type}
                          style={styles.communityVenue}
                        >
                          <Text variant="caption" weight="semibold">
                            {VENUE_TYPES[venue.venue_type].shortLabel}
                          </Text>
                          <Text variant="mono" color="secondary">
                            {venue.average.toFixed(1)} · {venue.count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : (
                <Text variant="caption" color="secondary">
                  No public ratings yet. Your show ratings help build the
                  picture.
                </Text>
              )}
            </View>
          ) : null}

          {persistedArtistId ? (
            <View style={styles.section}>
              <Text variant="label" weight="bold">
                Upcoming tour dates
              </Text>
              {tourDatesQuery.isLoading ? (
                <View style={styles.tourDateSkeletons}>
                  <Skeleton height={58} />
                  <Skeleton height={58} />
                </View>
              ) : tourDatesQuery.isError ? (
                <Text variant="caption" color="danger">
                  {tourDatesQuery.error.message}
                </Text>
              ) : tourDatesQuery.data?.length ? (
                tourDatesQuery.data.map((date) => (
                  <View key={date.id} style={styles.tourDateRow}>
                    <View style={styles.tourDateCopy}>
                      <Text variant="label" weight="semibold" numberOfLines={1}>
                        {date.event_name ?? date.venue_name ?? 'Live date'}
                      </Text>
                      <Text
                        variant="caption"
                        color="secondary"
                        numberOfLines={1}
                      >
                        {[
                          formatDate(date.event_date),
                          date.venue_name,
                          date.city,
                          date.country,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    {date.ticket_url ? (
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={`Tickets for ${date.event_name ?? artist.name}`}
                        onPress={() => void openTicketUrl(date.ticket_url!)}
                        style={styles.ticketLink}
                      >
                        <ExternalLink size={17} color={colors.accent} />
                      </Pressable>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text variant="caption" color="secondary">
                  No upcoming dates announced.
                </Text>
              )}
            </View>
          ) : null}

          {artist.albums.length || isPending ? (
            <View style={styles.section}>
              <Text variant="label" weight="bold">
                Albums
              </Text>
              {isPending && artist.albums.length === 0 ? (
                <View style={styles.albumSkeletonRow}>
                  {[0, 1, 2].map((item) => (
                    <PendingShimmer key={item} width={112} height={112} />
                  ))}
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.albumCarousel}
                >
                  {artist.albums.map((album) => (
                    <Pressable
                      key={album.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Preview ${album.title}${album.year ? `, ${album.year}` : ''}`}
                      onPress={() => setSelectedAlbum(album)}
                      style={styles.albumItem}
                    >
                      {album.cover_thumb_url || album.cover_url ? (
                        <Image
                          accessibilityLabel={`${album.title} cover`}
                          source={{
                            uri:
                              album.cover_thumb_url ??
                              album.cover_url ??
                              undefined,
                          }}
                          placeholder={{ blurhash }}
                          placeholderContentFit="cover"
                          cachePolicy="memory-disk"
                          contentFit="cover"
                          style={styles.albumCover}
                          transition={160}
                        />
                      ) : (
                        <View
                          accessible
                          accessibilityLabel={`${album.title} cover placeholder`}
                          style={[
                            styles.albumCover,
                            styles.albumPlaceholder,
                            { backgroundColor: colors.surfaceRaised },
                          ]}
                        >
                          <Music2 size={27} color={colors.inkMuted} />
                        </View>
                      )}
                      {album.year ? (
                        <Text variant="caption" color="secondary">
                          {album.year}
                        </Text>
                      ) : null}
                      <Text
                        variant="caption"
                        weight="semibold"
                        numberOfLines={2}
                        style={styles.albumTitle}
                      >
                        {album.title}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text variant="label" weight="bold">
                Your concert history
              </Text>
              <Text variant="caption" color="secondary">
                {ownLogs.length}
              </Text>
            </View>
            {logsQuery.isLoading ? (
              <View style={styles.historySkeletons}>
                <Skeleton height={64} />
                <Skeleton height={64} />
              </View>
            ) : ownLogs.length ? (
              ownLogs.map((log) => (
                <ConcertHistoryRow
                  key={log.id}
                  log={log}
                  expanded={expandedReview === log.id}
                  onToggleReview={() =>
                    setExpandedReview((current) =>
                      current === log.id ? null : log.id,
                    )
                  }
                  onEdit={() => {
                    startEdit(log);
                    onDismiss?.();
                    router.push('/log');
                  }}
                  onDelete={() => handleDeleteLog(log)}
                />
              ))
            ) : (
              <Text variant="caption" color="secondary">
                You have not logged a show yet.
              </Text>
            )}
            {persistedArtistId ? (
              <Button
                label="Log again"
                variant="secondary"
                leftIcon={<Plus size={16} color={colors.ink} />}
                onPress={handleLogAgain}
              />
            ) : null}
          </View>

          {friendsQuery.isLoading ? (
            <View style={styles.section}>
              <Text variant="label" weight="bold">
                Friends who have seen them
              </Text>
              <PendingShimmer width="58%" height={44} />
            </View>
          ) : friendsQuery.data?.length ? (
            <View style={styles.section}>
              <Text variant="label" weight="bold">
                Friends who have seen them
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.friendRow}
              >
                {friendsQuery.data.map((friend) => (
                  <Pressable
                    key={friend.user_id}
                    accessibilityRole="button"
                    accessibilityLabel={`${friend.display_name ?? friend.username}'s show on ${friend.event_date}`}
                    onPress={() => {
                      onDismiss?.();
                      router.push(`/log/${friend.id}`);
                    }}
                    style={styles.friendItem}
                  >
                    <Avatar
                      imageUrl={friend.avatar_url}
                      name={friend.display_name ?? friend.username}
                      size="md"
                      cachePolicy="memory-disk"
                    />
                    <Text
                      variant="caption"
                      numberOfLines={1}
                      style={styles.friendName}
                    >
                      {friend.display_name ?? friend.username}
                    </Text>
                    <Text variant="caption" color="secondary">
                      {formatDate(friend.event_date)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={[styles.footer, { borderTopColor: colors.line }]}>
            <Text
              variant="caption"
              color="secondary"
              style={styles.footerAttribution}
            >
              Artist data from Spotify, MusicBrainz, Last.fm and Wikipedia
            </Text>
            {persistedArtistId ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setReportSheetVisible(true)}
                style={styles.reportAction}
              >
                <Flag size={13} color={colors.inkMuted} />
                <Text variant="caption" color="secondary">
                  Wrong info? Report
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ContentScroll>

      <Sheet
        visible={genreSheetVisible}
        title="Your genre view"
        snapPoints={['55%', '82%']}
        onDismiss={() => setGenreSheetVisible(false)}
      >
        <ScrollView contentContainerStyle={styles.sheetOptions}>
          <Text variant="caption" color="secondary">
            Choose up to three genres for your Cloud and Stats.
          </Text>
          {macroOrder.map((macro) => {
            const config = MACRO_GENRES[macro as keyof typeof MACRO_GENRES];
            const checked = draftGenres.includes(macro);
            return (
              <Pressable
                key={macro}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => toggleDraftGenre(macro)}
                style={[styles.genreOption, { borderColor: colors.line }]}
              >
                <View
                  style={[
                    styles.macroPill,
                    { backgroundColor: `${config.color}24` },
                  ]}
                >
                  <Text
                    variant="caption"
                    weight="semibold"
                    style={{ color: config.color }}
                  >
                    {config.label}
                  </Text>
                </View>
                {checked ? (
                  <Check size={18} color={colors.accent} />
                ) : (
                  <View style={styles.checkSpacer} />
                )}
              </Pressable>
            );
          })}
          <Button
            label={saveOverrideMutation.isPending ? 'Saving...' : 'Save genres'}
            loading={saveOverrideMutation.isPending}
            onPress={async () => {
              try {
                if (!persistedArtistId) return;
                await saveOverrideMutation.mutateAsync({
                  userId,
                  artistId: persistedArtistId,
                  macroGenres: draftGenres,
                });
                setGenreSheetVisible(false);
              } catch (error) {
                Alert.alert(
                  'Could not save genres',
                  error instanceof Error ? error.message : 'Try again later.',
                );
              }
            }}
          />
        </ScrollView>
      </Sheet>

      <Sheet
        visible={reportSheetVisible}
        title="Report artist information"
        snapPoints={['48%', '72%']}
        onDismiss={() => setReportSheetVisible(false)}
      >
        <View style={styles.reportSheet}>
          <Text variant="caption" color="secondary">
            Tell us what looks wrong. Your report is only visible to you and the
            moderation team.
          </Text>
          <TextInput
            accessibilityLabel="Report details"
            multiline
            maxLength={1000}
            placeholder="Describe the issue..."
            placeholderTextColor={colors.inkMuted}
            value={reportDetails}
            onChangeText={setReportDetails}
            style={[
              styles.reportInput,
              {
                color: colors.ink,
                borderColor: colors.line,
                backgroundColor: colors.surfaceRaised,
              },
            ]}
          />
          <Button
            label="Send report"
            loading={reportMutation.isPending}
            disabled={reportDetails.trim().length < 3}
            onPress={() => void handleReport()}
          />
        </View>
      </Sheet>
      <Sheet
        visible={imageTarget !== null}
        title={
          imageTarget === 'profile'
            ? 'Choose profile photo'
            : 'Choose artist banner'
        }
        snapPoints={['62%', '88%']}
        onDismiss={() => setImageTarget(null)}
      >
        <ScrollView contentContainerStyle={styles.sheetOptions}>
          <Text variant="caption" color="secondary">
            Choose from photos already available for {artist?.name}. Your
            selection is only visible on your account.
          </Text>
          {imageOverrideQuery.isError ? (
            <Text variant="caption" color="danger">
              Could not load your saved photo choices. Try again later.
            </Text>
          ) : null}
          {imageGalleryQuery.isError ? (
            <Text variant="caption" color="danger">
              Could not load additional source photos.{' '}
              {imageGalleryQuery.error instanceof Error
                ? imageGalleryQuery.error.message
                : 'Try again later.'}
            </Text>
          ) : null}
          <View style={styles.imageTargetRow}>
            {(['profile', 'banner'] as const).map((role) => (
              <Pressable
                key={role}
                accessibilityRole="button"
                accessibilityLabel={
                  role === 'profile' ? 'Profile photo' : 'Banner'
                }
                accessibilityState={{ selected: imageTarget === role }}
                onPress={() => setImageTarget(role)}
                style={[
                  styles.imageTarget,
                  {
                    borderColor:
                      imageTarget === role ? colors.accent : colors.line,
                    backgroundColor:
                      imageTarget === role
                        ? colors.surface
                        : colors.surfaceRaised,
                  },
                ]}
              >
                <Text
                  variant="label"
                  weight="semibold"
                  color={imageTarget === role ? 'accent' : 'primary'}
                >
                  {role === 'profile' ? 'Profile photo' : 'Banner'}
                </Text>
              </Pressable>
            ))}
          </View>
          {imageChoices.length ? (
            <View style={styles.imageChoicesGrid}>
              {imageChoices.map((choice) => {
                const selectedUrl =
                  imageTarget === 'profile'
                    ? (imageOverrideQuery.data?.profile_image_url ??
                      sourceProfilePhoto)
                    : (imageOverrideQuery.data?.banner_image_url ??
                      artist?.banner_image_url ??
                      artist?.group_image_url ??
                      sourceProfilePhoto);
                const selected = choice.uri === selectedUrl;
                return (
                  <Pressable
                    key={choice.uri}
                    accessibilityRole="button"
                    accessibilityLabel={choice.label}
                    accessibilityState={{ selected }}
                    disabled={
                      imageOverrideQuery.isLoading ||
                      imageOverrideQuery.isError ||
                      saveImageOverrideMutation.isPending
                    }
                    onPress={() => void chooseArtistImage(choice.uri)}
                    style={[
                      styles.imageChoice,
                      {
                        borderColor: selected ? colors.accent : colors.line,
                        backgroundColor: colors.surfaceRaised,
                        opacity: saveImageOverrideMutation.isPending ? 0.6 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.imageChoicePreview,
                        imageTarget === 'profile'
                          ? styles.profileChoicePreview
                          : styles.bannerChoicePreview,
                      ]}
                    >
                      <Image
                        source={{ uri: choice.uri }}
                        contentFit="cover"
                        style={StyleSheet.absoluteFill}
                      />
                      {selected ? (
                        <View
                          style={[
                            styles.imageChoiceCheck,
                            { backgroundColor: colors.accent },
                          ]}
                        >
                          <Check size={14} color={colors.accentInk} />
                        </View>
                      ) : null}
                    </View>
                    <Text
                      variant="caption"
                      weight={selected ? 'semibold' : 'medium'}
                      numberOfLines={1}
                      style={styles.imageChoiceLabel}
                    >
                      {choice.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text variant="caption" color="secondary">
              No source photos are available for this artist yet.
            </Text>
          )}
          <Button
            label={
              enrichMutation.isPending ? 'Finding photos…' : 'Find more photos'
            }
            variant="secondary"
            loading={enrichMutation.isPending}
            disabled={imageGalleryQuery.isLoading || !persistedArtistId}
            onPress={() => void findMoreArtistImages()}
          />
          {imageTarget &&
          (imageTarget === 'profile'
            ? imageOverrideQuery.data?.profile_image_url
            : imageOverrideQuery.data?.banner_image_url) ? (
            <Button
              label="Use original source photo"
              loading={saveImageOverrideMutation.isPending}
              disabled={
                imageOverrideQuery.isLoading || imageOverrideQuery.isError
              }
              onPress={() => void chooseArtistImage(null)}
            />
          ) : null}
        </ScrollView>
      </Sheet>
      <AlbumPreview
        album={selectedAlbum}
        visible={!!selectedAlbum}
        onDismiss={() => setSelectedAlbum(null)}
      />
      {canEditManualArtist && artist ? (
        <Sheet
          visible={editManualSheetVisible}
          title={`Edit ${artist.name}`}
          snapPoints={['80%', '95%']}
          onDismiss={() => setEditManualSheetVisible(false)}
        >
          <CustomArtistForm
            existingArtist={artist}
            onSuccess={(_updated) => {
              setEditManualSheetVisible(false);
              void artistQuery.refetch();
            }}
            onCancel={() => setEditManualSheetVisible(false)}
          />
        </Sheet>
      ) : null}
    </>
  );
}

export function ArtistCardRoute({ artistId }: { artistId: string }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.route, { backgroundColor: colors.bg }]}>
      <ArtistCardContent artistId={artistId} presentation="route" />
    </SafeAreaView>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text variant="caption" color="secondary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="caption" weight="bold" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ConcertHistoryRow({
  log,
  expanded,
  onToggleReview,
  onEdit,
  onDelete,
}: {
  log: ConcertWithRelations;
  expanded: boolean;
  onToggleReview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.historyRow, { borderBottomColor: colors.line }]}>
      <View style={styles.historyTopRow}>
        <View style={styles.historyMain}>
          <View style={styles.historyDateRow}>
            <CalendarDays size={14} color={colors.inkMuted} />
            <Text variant="caption" weight="semibold">
              {formatDate(log.event_date)}
            </Text>
          </View>
          <Pill venueType={log.venue_type} />
          <Text
            variant="caption"
            color="secondary"
            numberOfLines={1}
            style={styles.historyVenue}
          >
            {log.venue_name || 'Venue not specified'}
          </Text>
          {log.rating != null ? (
            <View style={styles.historyRating}>
              <Star size={13} color={colors.accent} fill={colors.accent} />
              <Text
                variant="caption"
                weight="bold"
                style={{ color: colors.accent }}
              >
                {log.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.logActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit concert log"
            onPress={onEdit}
            style={styles.smallIconButton}
          >
            <Pencil size={15} color={colors.inkMuted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete concert log"
            onPress={onDelete}
            style={styles.smallIconButton}
          >
            <Trash2 size={15} color={colors.danger} />
          </Pressable>
        </View>
      </View>
      {log.review ? (
        <Pressable
          accessibilityRole="button"
          onPress={onToggleReview}
          style={styles.reviewPressable}
        >
          <Text
            variant="caption"
            color="secondary"
            numberOfLines={expanded ? undefined : 2}
          >
            {log.review}
          </Text>
          <Text variant="caption" color="accent">
            {expanded ? 'Show less' : 'Read review'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ArtistCardSkeleton({
  presentation,
}: {
  presentation: 'sheet' | 'route';
}) {
  const { colors } = useTheme();
  const ContentScroll =
    presentation === 'sheet' ? BottomSheetScrollView : ScrollView;
  return (
    <ContentScroll
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { backgroundColor: colors.surfaceRaised }]}>
        <Skeleton height={190} />
      </View>
      <View style={styles.paddedContent}>
        <View style={styles.statsStrip}>
          <Skeleton height={60} />
          <Skeleton height={60} />
        </View>
        <View style={styles.section}>
          <Skeleton height={18} width="30%" />
          <Skeleton height={82} />
        </View>
        <View style={styles.section}>
          <Skeleton height={18} width="24%" />
          <Skeleton height={18} width="92%" />
          <Skeleton height={18} width="72%" />
        </View>
        <View style={styles.albumSkeletonRow}>
          <Skeleton width={112} height={112} />
          <Skeleton width={112} height={112} />
          <Skeleton width={112} height={112} />
        </View>
      </View>
    </ContentScroll>
  );
}

const styles = StyleSheet.create({
  route: { flex: 1 },
  routeHeader: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  routeTitle: { flex: 1, textAlign: 'center' },
  iconButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  scrollContent: { paddingBottom: spacing.xl * 2 },
  hero: {
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  imagePickerButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
  },
  heroIdentity: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  profilePhotoRing: {
    alignItems: 'center',
    borderWidth: 3,
    justifyContent: 'center',
    ...hardShadow.sm,
  },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  heroNameBlock: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingBottom: 4,
  },
  manualRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  editManualButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  artistName: { fontSize: 22, lineHeight: 28 },
  spotifyButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  spotifyBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: -spacing.xs,
  },
  paddedContent: {
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  genreHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  genrePills: { flexDirection: 'row', flex: 1, flexWrap: 'wrap', gap: 6 },
  macroPill: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  detailTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: -spacing.sm,
  },
  detailTag: {
    borderRadius: radius.pill,
    maxWidth: '48%',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  section: { gap: spacing.sm },
  statsStrip: {
    borderColor: 'transparent',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  statsSkeleton: { flex: 1, minWidth: '42%' },
  statCell: { flexBasis: '46%', flexGrow: 1, gap: 3, minWidth: 0 },
  venueTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  communitySkeleton: { gap: spacing.sm },
  communityRating: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  communityScore: { fontSize: 36, lineHeight: 44 },
  communityCopy: { flex: 1, gap: 3 },
  communityVenues: { gap: spacing.xs },
  communityVenue: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 36,
    paddingHorizontal: spacing.xs,
  },
  tourDateSkeletons: { gap: spacing.sm },
  tourDateRow: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 56,
  },
  tourDateCopy: { flex: 1, gap: 2, minWidth: 0 },
  ticketLink: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  venueTypeItem: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  pendingBio: { gap: 8 },
  albumSkeletonRow: { flexDirection: 'row', gap: spacing.sm },
  albumCarousel: { gap: spacing.sm, paddingRight: spacing.md },
  albumItem: { gap: 5, width: 112 },
  albumCover: { aspectRatio: 1, borderRadius: 7, width: 112 },
  albumPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  albumTitle: { minHeight: 34 },
  albumPreview: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  albumPreviewCover: {
    aspectRatio: 1,
    borderRadius: radius.md,
    maxHeight: 340,
    width: '100%',
  },
  historySkeletons: { gap: spacing.sm },
  historyRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 7,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  historyTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  historyMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    minWidth: 0,
  },
  historyDateRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  historyVenue: { flexShrink: 1, maxWidth: '45%' },
  historyRating: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  reviewPressable: { gap: 3, paddingVertical: 2 },
  logActions: { flexDirection: 'row', gap: 1 },
  smallIconButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  friendRow: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  friendItem: { alignItems: 'center', gap: 4, width: 74 },
  friendName: { maxWidth: 74 },
  footer: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  footerAttribution: { flex: 1, minWidth: '58%' },
  reportAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 5,
  },
  sourceLine: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 3,
  },
  sheetOptions: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  imageTargetRow: { flexDirection: 'row', gap: spacing.sm },
  imageTarget: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  imageChoice: {
    alignItems: 'stretch',
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    overflow: 'hidden',
    padding: 6,
    width: '48%',
  },
  imageChoicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  imageChoicePreview: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  profileChoicePreview: {
    aspectRatio: 1,
    borderRadius: radius.sm,
  },
  bannerChoicePreview: {
    aspectRatio: 16 / 9,
    borderRadius: radius.sm,
  },
  imageChoiceCheck: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.xs,
    top: spacing.xs,
    width: 24,
  },
  imageChoiceLabel: { paddingHorizontal: spacing.xs, paddingVertical: 2 },
  genreOption: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
  },
  checkSpacer: { height: 18, width: 18 },
  reportSheet: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  reportInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 116,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  errorState: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 240,
    padding: spacing.xl,
  },
});

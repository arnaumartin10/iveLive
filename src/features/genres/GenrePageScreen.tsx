import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { BookmarkIcon } from '../../components/icons';
import { ArtistPhoto } from '../../components/ui/ArtistPhoto';
import { Button } from '../../components/ui/Button';
import { PatternFill } from '../../components/paper/PatternFill';
import { GenreLabel } from '../../components/paper/GenreLabel';
import { Text } from '../../components/ui/Text';
import { useArtistCard } from '../artists/ArtistCardProvider';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, hardShadow, spacing } from '../../theme/tokens';
import { RAW } from '../../theme/palette';
import { MACRO_GENRES, type MacroGenre } from './macroGenres';
import {
  getGenreContent,
  calculateGenreProgress,
  filterGenreArtists,
  getEditorialArtistFallbacks,
  isGenrePageSlug,
  type GenreFilter,
  type GenreArtist,
} from './content';
import { useGenrePage } from './hooks';
import { useGenreCatalog, type GenreCatalogEntry } from './catalog';

function isStubSlug(slug: string): boolean {
  return slug === 'other' || slug === 'unclassified';
}

export function GenrePageRoute() {
  const params = useLocalSearchParams<{ slug?: string; branch?: string }>();
  const rawSlug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const slug = rawSlug ?? '';
  const branch = Array.isArray(params.branch)
    ? params.branch[0]
    : params.branch;
  const isMacro = isGenrePageSlug(slug);
  const catalogQuery = useGenreCatalog(
    !isMacro && !isStubSlug(slug) && slug.length > 0,
  );

  if (!isMacro) {
    if (isStubSlug(slug)) return <GenreStub />;
    if (catalogQuery.isLoading) return <GenreLoadingState />;
    if (catalogQuery.isError) {
      return (
        <GenreStub
          message="We could not load this genre right now. Check your connection and try again."
          onRetry={() => void catalogQuery.refetch()}
        />
      );
    }
    const catalogEntry =
      catalogQuery.data?.find((entry) => entry.slug === slug) ?? null;
    if (!catalogEntry) return <Redirect href="/genre/other" />;
    return (
      <GenrePage slug={slug} branch={branch} catalogEntry={catalogEntry} />
    );
  }
  return <GenrePage slug={slug} branch={branch} />;
}

function GenreLoadingState() {
  const { colors } = useTheme();
  return (
    <View style={[styles.centerState, { backgroundColor: colors.bg }]}>
      <View
        style={[styles.loadingSquare, { backgroundColor: colors.surface }]}
      />
      <Text variant="mono" color="secondary">
        PRINTING THE PAGE…
      </Text>
    </View>
  );
}

function GenreStub({
  message = 'We could not place this one yet.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.centerState, { backgroundColor: colors.bg }]}>
      <Text variant="overline" color="secondary">
        GENRE NOTE
      </Text>
      <Text variant="headline" center>
        Not placed yet
      </Text>
      <Text variant="body" color="secondary" center>
        {message}
      </Text>
      {onRetry ? (
        <Button label="Try again" variant="secondary" onPress={onRetry} />
      ) : (
        <Button
          label="Back to music"
          variant="secondary"
          onPress={() => router.back()}
        />
      )}
    </View>
  );
}

function GenrePage({
  slug,
  branch,
  catalogEntry,
}: {
  slug: string;
  branch?: string;
  catalogEntry?: GenreCatalogEntry | null;
}) {
  const content = getGenreContent(slug);
  const pageQuery = useGenrePage(
    slug,
    Boolean(content) || Boolean(catalogEntry),
  );
  const catalogQuery = useGenreCatalog();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { openArtistCard } = useArtistCard();
  const [filter, setFilter] = useState<GenreFilter>('all');
  const pageData = pageQuery.data;
  const resolvedPage = pageQuery.data?.found ? pageQuery.data : null;

  const editorialFallbacks = content
    ? getEditorialArtistFallbacks(content)
    : { pillars: [], examples: [] };
  const hasSeededArtists = Boolean(
    resolvedPage?.pillars.length || resolvedPage?.examples.length,
  );
  const hasSeededExamples = Boolean(resolvedPage?.examples.length);
  const pillars = resolvedPage?.pillars.length
    ? resolvedPage.pillars
    : pageData?.pillars.length
      ? pageData.pillars
      : editorialFallbacks.pillars;
  const examples = resolvedPage?.examples.length
    ? resolvedPage.examples
    : pageData?.examples.length
      ? pageData.examples
      : editorialFallbacks.examples;
  const viewer = resolvedPage?.viewer;
  const columns =
    screenWidth >= 1200
      ? 6
      : screenWidth >= 900
        ? 5
        : screenWidth >= 640
          ? 4
          : 3;
  const maxContentWidth = Math.min(screenWidth, 1120);
  const horizontalPadding = screenWidth < 480 ? 18 : 28;
  const gap = 10;
  const tileWidth =
    (maxContentWidth - horizontalPadding * 2 - gap * (columns - 1)) / columns;
  const filteredExamples = filterGenreArtists(examples, filter);
  const parentSlug = catalogEntry?.parent_slug ?? slug;
  const parentGenre =
    MACRO_GENRES[parentSlug as MacroGenre] ?? MACRO_GENRES.other;
  const pattern = MACRO_GENRES[slug as MacroGenre] ?? parentGenre;
  const page = resolvedPage?.page;
  const displayTitle =
    content?.title ?? page?.title ?? catalogEntry?.label ?? slug;
  const tagline = content?.tagline ?? page?.tagline ?? '';
  const summary = content?.summary ?? page?.summary ?? '';
  const originPlace = content?.origin_place ?? page?.origin_place ?? '';
  const originYears = content?.origin_years ?? page?.origin_years ?? '';
  const history = content?.history ?? page?.history ?? [];
  const relatedSlugs = content?.related_slugs ?? page?.related_slugs ?? [];
  const wikipediaTitle =
    content?.wikipedia_title ?? page?.wikipedia_title ?? null;
  const sourceUrl = page?.auto_generated
    ? page.summary_url
    : wikipediaTitle
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(wikipediaTitle.replaceAll(' ', '_'))}`
      : null;
  const sourceLabel =
    page?.summary_source === 'lastfm'
      ? 'Read more on Last.fm'
      : 'Read more on Wikipedia';
  const autoPageSources = [
    page?.summary_source === 'wikipedia' ? 'WIKIPEDIA' : null,
    page?.lastfm_url ? 'LAST.FM' : null,
  ].filter((source): source is string => source !== null);
  const branches =
    catalogQuery.data?.filter((entry) => entry.parent_slug === slug) ?? [];
  const branchLabel = branch?.replaceAll('_', ' ').trim();

  function openArtist(artist: Pick<GenreArtist, 'id'>) {
    void openArtistCard(artist.id);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[
        styles.page,
        { maxWidth: 1120, paddingHorizontal: horizontalPadding },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={18} color={colors.ink} />
          <Text variant="caption" weight="bold">
            BACK
          </Text>
        </Pressable>
        {__DEV__ && !(content?.reviewed ?? page?.reviewed ?? false) ? (
          <View style={[styles.draftRibbon, { borderColor: colors.ink }]}>
            <Text variant="overline">DRAFT · NOT REVIEWED</Text>
          </View>
        ) : null}
      </View>

      {branchLabel ? (
        <View
          style={[
            styles.branchBanner,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.ink,
            },
          ]}
        >
          <Text variant="caption" weight="bold">
            Showing {displayTitle}. {branchLabel} is a branch of it.
          </Text>
        </View>
      ) : null}
      {catalogEntry?.parent_slug ? (
        <View style={styles.breadcrumb}>
          <GenreLabel
            genre={catalogEntry.parent_slug}
            label={
              catalogQuery.data?.find(
                (entry) => entry.slug === catalogEntry.parent_slug,
              )?.label
            }
            size="xs"
          />
          <Text variant="overline" color="secondary">
            ›
          </Text>
          <Text variant="overline" weight="bold">
            {displayTitle}
          </Text>
        </View>
      ) : null}

      <View style={styles.hero}>
        <Text
          variant="display"
          style={[styles.heroTitle, { color: colors.ink }]}
          accessibilityRole="header"
        >
          {displayTitle}
        </Text>
        <View
          style={[
            styles.patternFrame,
            {
              borderColor: colors.ink,
              backgroundColor: colors.surface,
              width: maxContentWidth - horizontalPadding * 2,
            },
          ]}
        >
          <PatternFill
            pattern={pattern.pattern}
            colorA={RAW[pattern.inkA]}
            colorB={RAW[pattern.inkB]}
            width={maxContentWidth - horizontalPadding * 2 - 4}
            height={70}
          />
        </View>
        <Text variant="overline" style={{ color: colors.ink }}>
          ORIGINS: {originPlace}, {originYears}
        </Text>
        {tagline ? (
          <Text variant="subtitle" color="secondary" style={styles.tagline}>
            {tagline}
          </Text>
        ) : null}
      </View>

      {content &&
      !pageQuery.isLoading &&
      !pageQuery.isError &&
      !hasSeededArtists ? (
        <SectionNotice message="Artist photos and cards load from existing profiles when available. Live marks appear after genre content is seeded." />
      ) : null}

      {summary ? (
        <>
          <SectionHeading title="In a nutshell" />
          <Text variant="body" color="secondary" style={styles.summary}>
            {summary}
          </Text>
        </>
      ) : page?.auto_generated ? (
        <SectionNotice message="No external summary is available for this genre yet." />
      ) : null}

      {history.length ? (
        <>
          <SectionHeading title="A short history" />
          <View style={[styles.timeline, { borderLeftColor: colors.ink }]}>
            {history.map((era) => (
              <View key={era.years} style={styles.era}>
                <View
                  style={[
                    styles.timelineTick,
                    { backgroundColor: colors.ink, borderColor: colors.bg },
                  ]}
                />
                <Text
                  variant="mono"
                  weight="bold"
                  style={{ color: colors.ink }}
                >
                  {era.years}
                </Text>
                <Text variant="title" style={styles.eraTitle}>
                  {era.heading}
                </Text>
                <Text variant="body" color="secondary">
                  {era.text}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : originPlace || originYears ? (
        <View style={[styles.originsBlock, { borderColor: colors.ink }]}>
          <Text variant="overline">ORIGINS</Text>
          <Text variant="body" color="secondary">
            {page?.auto_generated
              ? `Origin details for ${displayTitle} are not part of this auto-generated page.`
              : `${displayTitle} emerged in ${originPlace} around ${originYears}.`}
          </Text>
        </View>
      ) : null}

      {pillars.length || pageQuery.isLoading || content ? (
        <>
          <SectionHeading title="The three pillars" />
          {pageQuery.isError ? (
            <SectionNotice
              message="Pillar artist details could not be loaded. Showing the bundled editorial picks."
              isError
              onRetry={() => void pageQuery.refetch()}
            />
          ) : null}
          {pageQuery.isLoading ? (
            <PillarSkeletons />
          ) : pillars.length ? (
            <View style={styles.pillars}>
              {pillars.slice(0, 3).map((artist, index) => (
                <PillarCard
                  key={artist.id}
                  artist={artist}
                  index={index + 1}
                  onOpen={
                    artist.isArtistLinked ? () => openArtist(artist) : undefined
                  }
                />
              ))}
            </View>
          ) : (
            <SectionNotice message="No pillar artists are available for this genre yet." />
          )}
        </>
      ) : null}

      <SectionHeading title={`Your ${displayTitle}`} />
      {pageQuery.isError ? (
        <SectionNotice
          message="Your genre stats are temporarily unavailable."
          isError
        />
      ) : pageQuery.isLoading ? (
        <SectionNotice message="Checking your live diary…" />
      ) : viewer && viewer.shows > 0 ? (
        <YourGenre
          genre={displayTitle}
          stats={viewer}
          totalFeatures={pillars.length + examples.length || 23}
        />
      ) : (
        <View style={[styles.invitation, { borderColor: colors.ink }]}>
          <Text variant="body" color="secondary">
            The next song you see live can start your {displayTitle} story.
          </Text>
          <Button
            label="Log a show"
            size="sm"
            onPress={() => router.push('/log')}
          />
        </View>
      )}

      {examples.length || pageQuery.isLoading || content ? (
        <>
          <View style={styles.sectionHeadingRow}>
            <SectionHeading title="Essential artists" />
            <Text variant="mono" color="secondary">
              {examples.length ? `${examples.length} NAMES` : ''}
            </Text>
          </View>
          {pageQuery.isError ? (
            <SectionNotice
              message="Artist details could not be loaded. Showing the bundled editorial picks."
              isError
              onRetry={() => void pageQuery.refetch()}
            />
          ) : null}
          {pageQuery.isLoading ? (
            <ArtistGridSkeleton
              columns={columns}
              tileWidth={tileWidth}
              gap={gap}
            />
          ) : examples.length ? (
            <>
              {hasSeededExamples ? (
                <View style={styles.filters}>
                  {(
                    [
                      ['all', 'All'],
                      ['seen', 'Seen live'],
                      ['unseen', 'Not yet'],
                    ] as const
                  ).map(([key, label]) => {
                    const selected = filter === key;
                    return (
                      <Pressable
                        key={key}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setFilter(key)}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: selected
                              ? colors.ink
                              : colors.surface,
                            borderColor: colors.ink,
                          },
                        ]}
                      >
                        <Text
                          variant="caption"
                          weight="bold"
                          style={{ color: selected ? colors.bg : colors.ink }}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              {filteredExamples.length ? (
                <View style={[styles.artistGrid, { gap }]}>
                  {filteredExamples.map((artist) => (
                    <ArtistTile
                      key={artist.id}
                      artist={artist}
                      width={tileWidth}
                      onOpen={
                        artist.isArtistLinked
                          ? () => openArtist(artist)
                          : undefined
                      }
                    />
                  ))}
                </View>
              ) : (
                <SectionNotice
                  message={
                    filter === 'seen'
                      ? 'None of these artists are in your live diary yet.'
                      : 'You have seen every artist in this selection live.'
                  }
                />
              )}
            </>
          ) : (
            <SectionNotice message="No essential artists are available for this genre yet." />
          )}
        </>
      ) : null}

      {branches.length ? (
        <>
          <SectionHeading title="Branches" />
          <View style={styles.relatedGenres}>
            {branches.map((entry) => (
              <GenreLabel
                key={entry.slug}
                genre={entry.slug}
                label={entry.label}
                size="sm"
              />
            ))}
          </View>
        </>
      ) : null}

      {catalogEntry?.parent_slug ? (
        <>
          <SectionHeading title="Parent genre" />
          <GenreLabel
            genre={catalogEntry.parent_slug}
            label={
              catalogQuery.data?.find(
                (entry) => entry.slug === catalogEntry.parent_slug,
              )?.label
            }
            size="sm"
          />
        </>
      ) : null}

      {relatedSlugs.length ? (
        <>
          <SectionHeading title="Related genres" />
          <View style={styles.relatedGenres}>
            {relatedSlugs.map((related) => (
              <GenreLabel key={related} genre={related} size="sm" />
            ))}
          </View>
        </>
      ) : null}

      {sourceUrl ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${sourceLabel} for ${displayTitle}`}
          hitSlop={10}
          onPress={() => void Linking.openURL(sourceUrl)}
          style={styles.wikiLink}
        >
          <Text variant="caption" weight="bold">
            {sourceLabel}
          </Text>
          <ExternalLink size={16} color={colors.ink} />
        </Pressable>
      ) : null}
      {page?.wikipedia_attribution ? (
        <Text variant="overline" color="secondary">
          {page.wikipedia_attribution}
        </Text>
      ) : null}
      {page?.auto_generated ? (
        <Text
          variant="overline"
          color="secondary"
          style={styles.editorialFooter}
        >
          {autoPageSources.length
            ? `COMPILED FROM ${autoPageSources.join(' AND ')}`
            : 'AUTO-GENERATED · SOURCES NOT FOUND'}
        </Text>
      ) : null}
      <Text variant="overline" color="secondary" style={styles.editorialFooter}>
        EDITORIAL CONTENT BY IVELIVE
      </Text>
    </ScrollView>
  );
}

function SectionHeading({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionHeading, { borderBottomColor: colors.ink }]}>
      <Text variant="headline" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={[styles.headingRule, { backgroundColor: colors.ink }]} />
    </View>
  );
}

function SectionNotice({
  message,
  isError = false,
  onRetry,
}: {
  message: string;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole={isError ? 'alert' : undefined}
      style={[
        styles.notice,
        { borderColor: colors.line, backgroundColor: colors.surface },
      ]}
    >
      <Text variant="caption" color="secondary">
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          hitSlop={8}
          style={styles.retry}
        >
          <Text variant="caption" weight="bold" color="accent">
            Try again
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PillarSkeletons() {
  const { colors } = useTheme();
  return (
    <View style={styles.pillars}>
      {[1, 2, 3].map((index) => (
        <View
          key={index}
          style={[
            styles.pillarCard,
            styles.skeletonCard,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <View
            style={[styles.pillarPhotoSkeleton, { backgroundColor: colors.bg }]}
          />
          <View style={[styles.nameSkeleton, { backgroundColor: colors.bg }]} />
        </View>
      ))}
    </View>
  );
}

function PillarCard({
  artist,
  index,
  onOpen,
}: {
  artist: GenreArtist;
  index: number;
  onOpen?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.pillarCard,
        { backgroundColor: colors.surface, borderColor: colors.ink },
      ]}
    >
      <Text
        variant="display"
        style={[styles.pillarNumber, { color: colors.ink }]}
      >
        {index}
      </Text>
      <ArtistPhoto
        uri={artist.image_url_large ?? artist.image_url_thumb}
        width={112}
        height={112}
        treatment="original"
        onPress={onOpen}
        allowPeekOriginal={false}
      />
      {onOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${artist.name} artist card`}
          hitSlop={8}
          onPress={onOpen}
        >
          <Text variant="title" numberOfLines={2}>
            {artist.name}
          </Text>
        </Pressable>
      ) : (
        <Text variant="title" numberOfLines={2}>
          {artist.name}
        </Text>
      )}
      <Text variant="caption" color="secondary">
        {artist.why}
      </Text>
    </View>
  );
}

function YourGenre({
  genre,
  stats,
  totalFeatures,
}: {
  genre: string;
  stats: NonNullable<ReturnType<typeof useGenrePage>['data']>['viewer'];
  totalFeatures: number;
}) {
  const { colors } = useTheme();
  const progress = calculateGenreProgress(
    stats.seen_feature_count,
    totalFeatures,
  );
  return (
    <View
      style={[
        styles.yourGenre,
        { backgroundColor: colors.surface, borderColor: colors.ink },
      ]}
    >
      <View style={styles.statsGrid}>
        <Stat label="Shows" value={String(stats.shows)} />
        <Stat label="Artists" value={String(stats.unique_artists)} />
        <Stat
          label="Average"
          value={
            stats.average_rating == null ? '—' : `${stats.average_rating}★`
          }
        />
      </View>
      {stats.most_seen_artist ? (
        <Text variant="caption" color="secondary">
          Most seen: {stats.most_seen_artist.name} ·{' '}
          {stats.most_seen_artist.seen_count}×
        </Text>
      ) : null}
      <View style={styles.progressLabel}>
        <Text variant="overline">
          SEEN {progress} OF {totalFeatures}
        </Text>
        <Text variant="overline" color="secondary">
          {genre.toUpperCase()}
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
              width: `${totalFeatures ? (progress / totalFeatures) * 100 : 0}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text variant="display" style={{ color: colors.ink }}>
        {value}
      </Text>
      <Text variant="overline" color="secondary">
        {label}
      </Text>
    </View>
  );
}

function ArtistGridSkeleton({
  columns,
  tileWidth,
  gap,
}: {
  columns: number;
  tileWidth: number;
  gap: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.artistGrid, { gap }]}>
      {Array.from({ length: Math.min(columns * 2, 12) }, (_, index) => (
        <View key={index} style={{ width: tileWidth, gap: 7 }}>
          <View
            style={[
              styles.tileSkeleton,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          />
          <View
            style={[styles.nameSkeleton, { backgroundColor: colors.surface }]}
          />
        </View>
      ))}
    </View>
  );
}

function ArtistTile({
  artist,
  width,
  onOpen,
}: {
  artist: GenreArtist;
  width: number;
  onOpen?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { width }]}>
      <View style={[styles.photoFrame, { borderColor: colors.ink }]}>
        <ArtistPhoto
          uri={artist.image_url_thumb ?? artist.image_url_large}
          width={width - 3}
          height={width - 3}
          borderRadius={0}
          treatment="original"
          onPress={onOpen}
          allowPeekOriginal={false}
          style={styles.tilePhoto}
        />
        {artist.seen_count > 0 ? (
          <View
            style={[
              styles.seenStamp,
              { backgroundColor: colors.bg, borderColor: colors.ink },
            ]}
          >
            <Text variant="overline" style={styles.seenText}>
              SEEN {artist.seen_count > 1 ? `×${artist.seen_count}` : ''}
            </Text>
          </View>
        ) : null}
        {artist.in_wishlist ? (
          <View
            accessibilityLabel="Saved in wishlist"
            style={[
              styles.savedMark,
              { backgroundColor: colors.bg, borderColor: colors.ink },
            ]}
          >
            <BookmarkIcon size={14} color={colors.ink} />
          </View>
        ) : null}
      </View>
      {onOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${artist.name} artist card`}
          hitSlop={6}
          onPress={onOpen}
          style={styles.tileName}
        >
          <Text
            variant="caption"
            weight="bold"
            numberOfLines={2}
            style={styles.tileNameText}
          >
            {artist.name}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.tileName}>
          <Text
            variant="caption"
            weight="bold"
            numberOfLines={2}
            style={styles.tileNameText}
          >
            {artist.name}
          </Text>
        </View>
      )}
      {artist.note ? (
        <Text variant="caption" color="secondary" numberOfLines={2}>
          {artist.note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    alignSelf: 'center',
    gap: 22,
    paddingBottom: 52,
    paddingTop: 16,
    width: '100%',
  },
  topActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    minHeight: 44,
  },
  draftRibbon: {
    borderWidth: 1.5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    transform: [{ rotate: '-2deg' }],
  },
  branchBanner: {
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  breadcrumb: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  originsBlock: { borderWidth: 1.5, gap: 7, padding: 14 },
  hero: { alignItems: 'flex-start', gap: 12 },
  heroTitle: {
    fontFamily: fontFamily.display,
    fontSize: 64,
    includeFontPadding: false,
    lineHeight: 72,
    letterSpacing: -1.6,
  },
  patternFrame: { borderWidth: 1.5, padding: 1, overflow: 'hidden' },
  tagline: { maxWidth: 680 },
  summary: { maxWidth: 760 },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
    paddingBottom: 7,
    borderBottomWidth: 1.5,
  },
  sectionHeadingRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 29, lineHeight: 36 },
  headingRule: { flex: 1, height: 1.5, marginBottom: 7 },
  timeline: { borderLeftWidth: 1.5, marginLeft: 8, paddingLeft: 20, gap: 27 },
  era: { gap: 7, position: 'relative' },
  timelineTick: {
    position: 'absolute',
    left: -27,
    top: 5,
    width: 11,
    height: 11,
    borderWidth: 2,
    borderRadius: 6,
  },
  eraTitle: { marginTop: 1 },
  pillars: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  pillarCard: {
    flexBasis: '31%',
    flexGrow: 1,
    gap: 12,
    minWidth: 200,
    padding: 14,
    borderWidth: 1.5,
    ...hardShadow.sm,
  },
  pillarNumber: {
    fontFamily: fontFamily.display,
    fontSize: 52,
    lineHeight: 58,
  },
  skeletonCard: { minHeight: 220 },
  pillarPhotoSkeleton: { width: 112, height: 112 },
  nameSkeleton: { height: 18, width: '76%' },
  yourGenre: { borderWidth: 1.5, gap: 14, padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  stat: { gap: 3 },
  progressLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  progressTrack: { height: 8, overflow: 'hidden' },
  progressFill: { height: '100%' },
  invitation: {
    alignItems: 'flex-start',
    borderWidth: 1.5,
    gap: 12,
    padding: 16,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    minHeight: 44,
    paddingHorizontal: 13,
  },
  artistGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { gap: 7 },
  photoFrame: {
    aspectRatio: 1,
    borderWidth: 1.5,
    ...hardShadow.sm,
  },
  tilePhoto: { borderWidth: 0 },
  seenStamp: {
    bottom: 6,
    left: 6,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
    position: 'absolute',
  },
  seenText: { fontSize: 9, lineHeight: 12, letterSpacing: 0.3 },
  savedMark: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    padding: 3,
    position: 'absolute',
    right: 5,
    top: 5,
  },
  tileName: { minHeight: 36, justifyContent: 'flex-start' },
  tileNameText: { lineHeight: 17 },
  tileSkeleton: { aspectRatio: 1, borderWidth: 1.5 },
  relatedGenres: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  wikiLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  editorialFooter: { marginTop: 8 },
  notice: { borderWidth: 1, gap: 8, padding: 14 },
  retry: { alignSelf: 'flex-start', minHeight: 38, justifyContent: 'center' },
  centerState: {
    alignItems: 'center',
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    minHeight: 380,
    padding: spacing[6],
  },
  loadingSquare: { height: 52, width: 52, borderWidth: 1.5 },
});

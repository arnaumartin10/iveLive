import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { routes } from '../../navigation/routes';
import { useSafeBack } from '../../navigation/useSafeBack';
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
import {
  MACRO_GENRES,
  type MacroGenre,
  type MacroGenreDefinition,
} from './macroGenres';
import {
  getGenreContent,
  calculateGenreProgress,
  filterGenreArtists,
  getEditorialArtistFallbacks,
  isGenrePageSlug,
  type GenreFilter,
  type GenreArtist,
} from './content';
import { genrePageKeys, useGenrePage } from './hooks';
import {
  CatalogResolutionError,
  reportGenreArtist,
  resolveGenreArtist,
  useGenreCatalog,
  type GenreCatalogEntry,
} from './catalog';

function isStubSlug(slug: string): boolean {
  return slug === 'other' || slug === 'unclassified';
}

export function GenrePageRoute() {
  const safeBack = useSafeBack(routes.fallback.genre());
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
    if (isStubSlug(slug)) return <GenreStub onBack={safeBack} />;
    if (catalogQuery.isLoading) return <GenreLoadingState />;
    if (catalogQuery.isError) {
      return (
        <GenreStub
          message="We could not load this genre right now. Check your connection and try again."
          onRetry={() => void catalogQuery.refetch()}
          onBack={safeBack}
        />
      );
    }
    const catalogEntry =
      catalogQuery.data?.find((entry) => entry.slug === slug) ?? null;
    if (!catalogEntry) {
      return (
        <GenreStub
          message="This genre could not be found."
          onBack={safeBack}
        />
      );
    }
    return (
      <GenrePage
        slug={slug}
        branch={branch}
        catalogEntry={catalogEntry}
        onBack={safeBack}
      />
    );
  }
  return <GenrePage slug={slug} branch={branch} onBack={safeBack} />;
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
  onBack,
}: {
  message?: string;
  onRetry?: () => void;
  onBack: () => void;
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
          onPress={onBack}
        />
      )}
    </View>
  );
}

function GenrePage({
  slug,
  branch,
  catalogEntry,
  onBack,
}: {
  slug: string;
  branch?: string;
  catalogEntry?: GenreCatalogEntry | null;
  onBack: () => void;
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

  function openArtist(artistId: string) {
    void openArtistCard(artistId);
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
          onPress={onBack}
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
                  key={artist.catalogQueueId ?? artist.id ?? artist.name}
                  artist={artist}
                  index={index + 1}
                  genreSlug={slug}
                  pattern={pattern}
                  onOpen={openArtist}
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
            onPress={() => router.navigate(routes.logWizard())}
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
                      key={artist.catalogQueueId ?? artist.id ?? artist.name}
                      artist={artist}
                      width={tileWidth}
                      genreSlug={slug}
                      pattern={pattern}
                      onOpen={openArtist}
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
  genreSlug,
  pattern,
  onOpen,
}: {
  artist: GenreArtist;
  index: number;
  genreSlug: string;
  pattern: MacroGenreDefinition;
  onOpen: (artistId: string) => void;
}) {
  const { colors } = useTheme();
  const action = useCatalogArtistAction(artist, genreSlug, onOpen);
  const linkedArtist = artist.id && artist.isArtistLinked;
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
      <Pressable
        accessibilityRole="button"
        disabled={Boolean(linkedArtist)}
        accessibilityLabel={
          linkedArtist
            ? `Open ${artist.name} artist card`
            : `Find ${artist.name} artist page`
        }
        onPress={action.open}
      >
        {linkedArtist ? (
          <ArtistPhoto
            uri={artist.image_url_large ?? artist.image_url_thumb}
            width={112}
            height={112}
            treatment="original"
            onPress={() => artist.id && onOpen(artist.id)}
            allowPeekOriginal={false}
          />
        ) : (
          <PaperArtistSticker
            name={artist.name}
            width={112}
            pattern={pattern}
            resolving={action.status === 'resolving'}
          />
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          linkedArtist
            ? `Open ${artist.name} artist card`
            : `Find ${artist.name} artist page`
        }
        onPress={action.open}
      >
        <Text variant="title" numberOfLines={2}>
          {artist.name}
        </Text>
      </Pressable>
      <Text variant="caption" color="secondary">
        {artist.why}
      </Text>
      <CatalogActionNotice
        artist={artist}
        status={action.status}
        message={action.message}
        onRetry={action.retry}
        onReport={action.report}
      />
    </View>
  );
}

type CatalogUiStatus =
  | 'idle'
  | 'resolving'
  | 'cooldown'
  | 'not_found'
  | 'rate_limit'
  | 'offline'
  | 'pending'
  | 'reported';

function useCatalogArtistAction(
  artist: GenreArtist,
  genreSlug: string,
  onOpen: (artistId: string) => void,
) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<CatalogUiStatus>('idle');
  const [message, setMessage] = useState('');

  async function resolve() {
    if (!artist.catalogQueueId) {
      router.push(routes.artistNew(artist.name));
      return;
    }
    setStatus('resolving');
    setMessage('');
    try {
      const result = await resolveGenreArtist({
        queueId: artist.catalogQueueId,
        name: artist.name,
        genreSlug,
      });
      if (result.status === 'resolved') {
        onOpen(result.artistId);
        void queryClient.invalidateQueries({
          queryKey: genrePageKeys.page(genreSlug),
        });
      } else if (result.status === 'not_found') {
        setStatus('not_found');
      } else {
        setStatus('pending');
        setMessage('The first lookup found no exact match. Try again later.');
      }
    } catch (error) {
      if (error instanceof CatalogResolutionError) {
        if (error.code === 'SPOTIFY_COOLDOWN') {
          setStatus('cooldown');
          setMessage(
            'Spotify needs a short break, try again in a few minutes.',
          );
        } else if (error.code === 'CATALOG_RATE_LIMIT') {
          setStatus('rate_limit');
          setMessage('You have reached the artist lookup limit. Try again later.');
        } else if (error.code === 'RESOLUTION_IN_PROGRESS') {
          setStatus('pending');
          setMessage('This artist is already being looked up.');
        } else {
          setStatus('offline');
          setMessage('We could not reach the artist catalog. Check your connection and try again.');
        }
      } else {
        setStatus('offline');
        setMessage('We could not reach the artist catalog. Check your connection and try again.');
      }
    }
  }

  async function report() {
    if (!artist.catalogQueueId) return;
    try {
      await reportGenreArtist(artist.catalogQueueId);
      setStatus('reported');
      setMessage('Thanks. We will review this artist listing.');
    } catch {
      setStatus('offline');
      setMessage('Your report could not be sent. Check your connection and try again.');
    }
  }

  function open() {
    if (artist.id && artist.isArtistLinked) {
      onOpen(artist.id);
      return;
    }
    void resolve();
  }

  return {
    status,
    message,
    open,
    retry: () => void resolve(),
    report: () => void report(),
  };
}

function PaperArtistSticker({
  name,
  width,
  pattern,
  resolving,
  bordered = true,
}: {
  name: string;
  width: number;
  pattern: MacroGenreDefinition;
  resolving: boolean;
  bordered?: boolean;
}) {
  const { colors } = useTheme();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return (
    <View
      style={[
        styles.paperArtwork,
        {
          width,
          height: width,
          borderColor: colors.ink,
          borderWidth: bordered ? 1.5 : 0,
        },
      ]}
    >
      <PatternFill
        pattern={pattern.pattern}
        colorA={RAW[pattern.inkA]}
        colorB={RAW[pattern.inkB]}
        width={width - 3}
        height={width - 3}
      />
      <View
        style={[
          styles.artistSticker,
          {
            backgroundColor: colors.surface,
            borderColor: colors.ink,
            width: Math.max(42, width * 0.54),
            height: Math.max(42, width * 0.54),
          },
        ]}
      >
        {resolving ? (
          <ActivityIndicator
            accessibilityLabel="Resolving artist"
            color={colors.ink}
          />
        ) : (
          <Text
            variant="title"
            weight="bold"
            style={{ color: colors.ink, fontFamily: fontFamily.display }}
          >
            {initials}
          </Text>
        )}
      </View>
    </View>
  );
}

function CatalogActionNotice({
  artist,
  status,
  message,
  onRetry,
  onReport,
}: {
  artist: GenreArtist;
  status: CatalogUiStatus;
  message: string;
  onRetry: () => void;
  onReport: () => void;
}) {
  const { colors } = useTheme();
  if (status === 'idle' || status === 'resolving') return null;
  return (
    <View style={[styles.catalogNotice, { borderColor: colors.line }]}>
      <Text variant="caption" color={status === 'offline' ? 'danger' : 'secondary'}>
        {status === 'not_found'
          ? 'We could not find this artist on Spotify.'
          : status === 'reported'
            ? message
            : message}
      </Text>
      {status === 'cooldown' || status === 'offline' || status === 'pending' ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.catalogAction}
        >
          <Text variant="caption" weight="bold" color="accent">
            Try again
          </Text>
        </Pressable>
      ) : null}
      {status === 'not_found' ? (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(routes.artistNew(artist.name))}
            style={styles.catalogAction}
          >
            <Text variant="caption" weight="bold" color="accent">
              Add manually
            </Text>
          </Pressable>
          {artist.catalogQueueId ? (
            <Pressable
              accessibilityRole="button"
              onPress={onReport}
              style={styles.catalogAction}
            >
              <Text variant="caption" color="secondary">
                Report this listing
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
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
  genreSlug,
  pattern,
  onOpen,
}: {
  artist: GenreArtist;
  width: number;
  genreSlug: string;
  pattern: MacroGenreDefinition;
  onOpen: (artistId: string) => void;
}) {
  const { colors } = useTheme();
  const action = useCatalogArtistAction(artist, genreSlug, onOpen);
  const linkedArtist = Boolean(artist.id && artist.isArtistLinked);
  return (
    <View style={[styles.tile, { width }]}>
      <Pressable
        accessibilityRole="button"
        disabled={linkedArtist}
        accessibilityLabel={
          linkedArtist
            ? `Open ${artist.name} artist card`
            : `Find ${artist.name} artist page`
        }
        onPress={action.open}
      >
        <View
          style={[
            styles.photoFrame,
            {
              borderColor: colors.ink,
              width,
              height: width,
            },
          ]}
        >
          {linkedArtist ? (
            <ArtistPhoto
              uri={artist.image_url_thumb ?? artist.image_url_large}
              width={width - 3}
              height={width - 3}
              borderRadius={0}
              treatment="original"
              onPress={() => artist.id && onOpen(artist.id)}
              allowPeekOriginal={false}
              style={styles.tilePhoto}
            />
          ) : (
            <PaperArtistSticker
              name={artist.name}
              width={width - 3}
              pattern={pattern}
              resolving={action.status === 'resolving'}
              bordered={false}
            />
          )}
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
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          linkedArtist
            ? `Open ${artist.name} artist card`
            : `Find ${artist.name} artist page`
        }
        onPress={action.open}
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
      <CatalogActionNotice
        artist={artist}
        status={action.status}
        message={action.message}
        onRetry={action.retry}
        onReport={action.report}
      />
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
  paperArtwork: {
    alignItems: 'center',
    borderWidth: 1.5,
    justifyContent: 'center',
    overflow: 'hidden',
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
  artistSticker: {
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 1.5,
    justifyContent: 'center',
    position: 'absolute',
    top: '23%',
    transform: [{ rotate: '-4deg' }],
  },
  catalogNotice: { borderTopWidth: 1, gap: 4, paddingTop: 6 },
  catalogAction: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 36 },
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

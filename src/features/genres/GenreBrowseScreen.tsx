import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { router } from 'expo-router';
import { routes } from '../../navigation/routes';
import { useSafeBack } from '../../navigation/useSafeBack';
import { ArrowLeft, ArrowRight, Info, Search } from 'lucide-react-native';
import { GenreLabel } from '../../components/paper/GenreLabel';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { hardShadow } from '../../theme/tokens';
import {
  MACRO_GENRES,
  MACRO_GENRE_ORDER,
  type MacroGenre,
} from './macroGenres';
import {
  normalizeGenreLookup,
  useGenreCatalog,
  type GenreCatalogEntry,
} from './catalog';

export function GenreBrowseScreen() {
  const { colors } = useTheme();
  const safeBack = useSafeBack(routes.fallback.genres());
  const catalogQuery = useGenreCatalog();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMacro, setSelectedMacro] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 180);
    return () => clearTimeout(timer);
  }, [search]);

  const catalog = useMemo(() => {
    const entries = catalogQuery.data ?? [];
    return [
      ...entries,
      ...MACRO_GENRE_ORDER.filter(
        (slug) => !entries.some((entry) => entry.slug === slug),
      ).map(macroCatalogEntry),
    ];
  }, [catalogQuery.data]);
  const normalizedSearch = normalizeGenreLookup(debouncedSearch);
  const searchResults = useMemo(() => {
    if (!normalizedSearch) return [];
    return catalog.filter((genre) =>
      [genre.label, genre.slug, ...genre.aliases].some((value) =>
        normalizeGenreLookup(value).includes(normalizedSearch),
      ),
    );
  }, [catalog, normalizedSearch]);
  const selected = catalog.find((genre) => genre.slug === selectedMacro);
  const children = catalog.filter(
    (genre) => genre.parent_slug === selectedMacro,
  );

  function openGenre(genre: GenreCatalogEntry) {
    router.navigate(routes.genre(genre.slug));
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={10}
            onPress={safeBack}
            style={styles.back}
          >
            <ArrowLeft size={18} color={colors.ink} />
            <Text variant="caption" weight="bold">
              BACK
            </Text>
          </Pressable>
          <Text variant="overline" color="secondary">
            THE GENRE INDEX
          </Text>
        </View>

        <Text variant="display" style={styles.title}>
          Browse genres
        </Text>
        <View
          style={[
            styles.search,
            { backgroundColor: colors.surface, borderColor: colors.ink },
          ]}
        >
          <Search size={18} color={colors.inkMuted} />
          <TextInput
            accessibilityLabel="Search genres and aliases"
            onChangeText={setSearch}
            placeholder="Search genres and aliases"
            placeholderTextColor={colors.inkMuted}
            style={[styles.input, { color: colors.ink }]}
            value={search}
          />
        </View>

        {catalogQuery.isLoading ? (
          <Text variant="caption" color="secondary">
            Loading the genre index…
          </Text>
        ) : catalogQuery.isError ? (
          <View style={[styles.notice, { borderColor: colors.line }]}>
            <Text variant="caption" color="secondary">
              The genre index could not be loaded. Check your connection and try
              again.
            </Text>
            <Pressable onPress={() => void catalogQuery.refetch()} hitSlop={8}>
              <Text variant="caption" color="accent" weight="bold">
                Try again
              </Text>
            </Pressable>
          </View>
        ) : normalizedSearch ? (
          <View style={styles.results}>
            <Text variant="label" weight="bold">
              {searchResults.length ? 'MATCHING GENRES' : 'NO MATCHES'}
            </Text>
            {searchResults.map((genre) => (
              <GenreListRow
                key={genre.slug}
                genre={genre}
                parent={catalog.find((item) => item.slug === genre.parent_slug)}
                onPress={() => openGenre(genre)}
              />
            ))}
          </View>
        ) : selected ? (
          <Animated.View
            entering={FadeInDown.duration(180)}
            layout={LinearTransition.duration(180)}
            style={styles.results}
          >
            <Pressable
              onPress={() => setSelectedMacro(null)}
              hitSlop={8}
              style={styles.parentLink}
            >
              <Text variant="caption" color="accent" weight="bold">
                ALL MACRO-GENRES
              </Text>
            </Pressable>
            <GenreLabel genre={selected.slug} size="md" interactive={false} />
            <Text variant="caption" color="secondary">
              {children.length} sub-genres · {selected.artist_count} artists in
              IveLive
            </Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Open ${selected.label} genre page`}
              onPress={() => openGenre(selected)}
              style={[
                styles.openMacroRow,
                { borderColor: colors.ink, backgroundColor: colors.surface },
                hardShadow.sm,
              ]}
            >
              <View style={styles.openMacroCopy}>
                <Text variant="label" weight="bold">
                  Open {selected.label}
                </Text>
                <Text variant="caption" color="secondary">
                  The whole genre, history and essential artists
                </Text>
              </View>
              <ArrowRight size={19} color={colors.accent} />
            </Pressable>
            {children.map((genre) => (
              <GenreListRow
                key={genre.slug}
                genre={genre}
                parent={selected}
                onPress={() => openGenre(genre)}
              />
            ))}
          </Animated.View>
        ) : (
          <View style={styles.macroGrid}>
            {MACRO_GENRE_ORDER.filter((slug) => slug !== 'unclassified').map(
              (slug) => {
                const definition = MACRO_GENRES[slug];
                const entry = catalog.find((genre) => genre.slug === slug);
                return (
                  <View
                    key={slug}
                    style={[
                      styles.macroTile,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.ink,
                      },
                      hardShadow.sm,
                    ]}
                  >
                    <View style={styles.macroTileHeader}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Browse ${definition.label} sub-genres`}
                        accessibilityState={{ expanded: selectedMacro === slug }}
                        onPress={() =>
                          setSelectedMacro((current) =>
                            current === slug ? null : slug,
                          )
                        }
                        style={styles.macroExpandTarget}
                      >
                        <GenreLabel
                          genre={slug}
                          size="sm"
                          interactive={false}
                        />
                        <Text variant="overline">EXPLORE</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`About ${definition.label}`}
                        onPress={() =>
                          router.navigate(routes.genre(entry?.slug ?? slug))
                        }
                        style={styles.aboutButton}
                      >
                        <Info size={17} color={colors.ink} />
                      </Pressable>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Browse ${definition.label} sub-genres`}
                      onPress={() =>
                        setSelectedMacro((current) =>
                          current === slug ? null : slug,
                        )
                      }
                      style={styles.macroCountTarget}
                    >
                      <Text variant="caption" color="secondary">
                        {entry?.artist_count ?? 0} artists
                      </Text>
                    </Pressable>
                  </View>
                );
              },
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function macroCatalogEntry(slug: MacroGenre): GenreCatalogEntry {
  return {
    slug,
    label: MACRO_GENRES[slug].label,
    parent_slug: null,
    level: 1,
    aliases: [],
    wikipedia_title: null,
    lastfm_tag: null,
    origin_years: null,
    has_editorial: false,
    artist_count: 0,
    viewer_seen_count: 0,
  };
}

function GenreListRow({
  genre,
  parent,
  onPress,
}: {
  genre: GenreCatalogEntry;
  parent?: GenreCatalogEntry;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open ${genre.label} genre page`}
      onPress={onPress}
      style={[styles.genreRow, { borderBottomColor: colors.line }]}
    >
      <View style={styles.rowTitle}>
        <GenreLabel
          genre={parent?.slug ?? genre.parent_slug ?? 'other'}
          label={genre.label}
          size="xs"
          interactive={false}
        />
        {parent ? (
          <Text variant="overline" color="secondary">
            {parent.label}
          </Text>
        ) : null}
      </View>
      <Text variant="caption" color="secondary">
        {genre.artist_count} artists · {genre.viewer_seen_count} seen
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    alignSelf: 'center',
    gap: 20,
    maxWidth: 1120,
    padding: 20,
    paddingBottom: 52,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  back: { alignItems: 'center', flexDirection: 'row', gap: 7, minHeight: 44 },
  title: { fontSize: 46, lineHeight: 54 },
  search: {
    alignItems: 'center',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  input: { flex: 1, fontSize: 16, minHeight: 46 },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  macroTile: {
    borderWidth: 1.5,
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 120,
    padding: 14,
  },
  macroTileHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  macroExpandTarget: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 10,
    minWidth: 0,
  },
  aboutButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  macroCountTarget: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 5,
  },
  openMacroRow: {
    alignItems: 'center',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  openMacroCopy: { flex: 1, gap: 3, minWidth: 0 },
  results: { gap: 12 },
  notice: { borderWidth: 1, gap: 12, padding: 14 },
  parentLink: {
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
  },
  genreRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: 8,
  },
  rowTitle: { gap: 4 },
});

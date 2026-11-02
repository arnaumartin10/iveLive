/**
 * Step 1 – Artist Search
 *
 * - Auto-focused search input with clear button (via ArtistSearch)
 * - FlashList of ArtistSearchResultRow items + skeleton rows while loading
 * - Empty state with 'Add manually' action
 * - Rate-limit message with retry hint
 * - Tapping a result calls useEnsureArtist, shows a brief spinner on that row,
 *   stores the artist in the draft, and auto-advances with a haptic.
 * - Recently-logged artists shown as quick-pick chips when search box is empty.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { AlertCircle, Info, Music2, RefreshCw, Search, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { useLogDraft } from '../../features/log/store';
import { useArtistCard } from '../../features/artists/ArtistCardProvider';
import {
  useArtistSearch,
  useEnsureArtist,
} from '../../features/artists/hooks';
import { useUserConcerts as useConcertList } from '../../features/concerts/hooks';
import type { ArtistSearchResult, ArtistRow } from '../../features/artists/types';
import { useAuthStore } from '../../features/auth/store';
import { WizardStepView } from '../../components/log/WizardStepView';
import { Skeleton } from '../../components/ui/Skeleton';
import { Text } from '../../components/ui/Text';
import { ArtistSearchResultRow } from '../../features/artists/ArtistSearchResultRow';
import { AddManuallyRow } from '../../features/artists/AddManuallyRow';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, radius, spacing } from '../../theme/tokens';

const SKELETON_COUNT = 6;

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <Skeleton width={56} height={56} rounded style={styles.skeletonAvatar} />
      <View style={styles.skeletonText}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="35%" height={11} style={styles.skeletonSub} />
      </View>
    </View>
  );
}

// ─── Quick-pick chip ──────────────────────────────────────────────────────────

function RecentArtistChip({
  artist,
  onPick,
  onOpenDetails,
  isLoading,
}: {
  artist: ArtistRow;
  onPick: (artist: ArtistRow) => void;
  onOpenDetails: (artist: ArtistRow) => void;
  isLoading: boolean;
}) {
  const { colors } = useTheme();
  const imageUrl = artist.image_url_thumb ?? artist.image_url_large;

  return (
    <View style={styles.recentArtistItem}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Quick pick ${artist.name}`}
        onPress={() => onPick(artist)}
        style={({ pressed }) => [
          styles.recentChip,
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: colors.line,
            opacity: pressed || isLoading ? 0.7 : 1,
          },
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.recentChipAvatar}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.recentChipAvatar,
              styles.recentChipAvatarFallback,
              { backgroundColor: colors.line },
            ]}
          >
            <Music2 size={14} color={colors.inkMuted} />
          </View>
        )}
        <Text variant="caption" weight="semibold" numberOfLines={1} style={styles.recentChipLabel}>
          {artist.name}
        </Text>
        {isLoading && (
          <ActivityIndicator size="small" color={colors.accent} style={styles.recentChipSpinner} />
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${artist.name} artist card`}
        hitSlop={6}
        onPress={() => onOpenDetails(artist)}
        style={[
          styles.recentArtistInfo,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.line },
        ]}
      >
        <Info size={16} color={colors.inkMuted} />
      </Pressable>
    </View>
  );
}

// ─── Step 1 screen ────────────────────────────────────────────────────────────

export default function StepArtist() {
  const { colors } = useTheme();
  const { openArtistCard } = useArtistCard();
  const setArtist = useLogDraft((s) => s.setArtist);
  const draftArtist = useLogDraft((s) => s.artist);
  const goNext = useLogDraft((s) => s.goNext);

  const userId = useAuthStore((s) => s.user?.id);

  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const { results, isLoading, rateLimited, error } = useArtistSearch(query);
  const ensureArtist = useEnsureArtist();

  // Recently logged artists for quick-pick (from concert list)
  const concertsQuery = useConcertList(userId ?? '');
  const recentArtists: ArtistRow[] = React.useMemo(() => {
    if (!concertsQuery.data) return [];
    const seen = new Set<string>();
    const out: ArtistRow[] = [];
    for (const c of concertsQuery.data) {
      if (c.artist && !seen.has(c.artist.id)) {
        seen.add(c.artist.id);
        out.push(c.artist);
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [concertsQuery.data]);

  // Per-row loading state for ensureArtist spinner
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handleSelectResult = useCallback(
    (result: ArtistSearchResult) => {
      const key = result.spotifyId ?? result.artistId ?? result.name;
      setLoadingKey(key);
      ensureArtist.mutate(result, {
        onSuccess: (artist) => {
          setArtist(artist);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          goNext();
        },
        onError: () => {
          setLoadingKey(null);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
        onSettled: () => setLoadingKey(null),
      });
    },
    [ensureArtist, setArtist, goNext],
  );

  const handlePickRecentArtist = useCallback(
    (artist: ArtistRow) => {
      setArtist(artist);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goNext();
    },
    [setArtist, goNext],
  );

  function handleAddManually() {
    router.push('/artist/new');
  }

  function handleRetry() {
    setQuery((q) => q + ' ');
    setTimeout(() => setQuery((q) => q.trimEnd()), 50);
  }

  const hasQuery = query.trim().length >= 2;
  const showSkeletons = hasQuery && isLoading;
  const showEmpty = hasQuery && !isLoading && results.length === 0 && !error;
  const showRecents = !hasQuery && recentArtists.length > 0;

  // ── Render item for FlashList ────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: ArtistSearchResult }) => {
      const key = item.spotifyId ?? item.artistId ?? item.name;
      const isThisLoading = loadingKey === key;
      return (
        <View>
          <ArtistSearchResultRow
            result={item}
            onPress={isThisLoading ? () => {} : handleSelectResult}
            onOpenDetails={(artist) => void openArtistCard(artist)}
          />
          {isThisLoading && (
            <View style={styles.rowSpinnerOverlay}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}
        </View>
      );
    },
    [handleSelectResult, loadingKey, colors.accent, openArtistCard],
  );

  return (
    <WizardStepView step={1} continueLabel="Continue" disableContinue={!draftArtist}>
      <View style={[styles.container, { paddingHorizontal: spacing[4] }]}>
        {/* ── Search input ─────────────────────────────────────────────── */}
        <View
          style={[
            styles.inputWrap,
            { backgroundColor: colors.surfaceRaised, borderColor: colors.line },
          ]}
        >
          <Search size={18} color={colors.inkMuted} />
          <TextInput
            ref={inputRef}
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search Spotify or custom artists…"
            placeholderTextColor={colors.inkMuted}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={[styles.input, { color: colors.ink }]}
            accessibilityLabel="Search for artist"
          />
          {isLoading && hasQuery ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => { setQuery(''); inputRef.current?.focus(); }}
              hitSlop={8}
            >
              <X size={16} color={colors.inkMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* ── Rate-limit banner ────────────────────────────────────────── */}
        {rateLimited && (
          <View style={[styles.banner, { backgroundColor: `${colors.warning}1A`, borderColor: `${colors.warning}40` }]}>
            <AlertCircle size={15} color={colors.warning} />
            <Text variant="caption" color="secondary" style={styles.bannerText}>
              Spotify search is temporarily busy. Manual and local artists still work.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry search"
              onPress={handleRetry}
              hitSlop={8}
            >
              <RefreshCw size={14} color={colors.accent} />
            </Pressable>
          </View>
        )}

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {error && !rateLimited && (
          <View style={[styles.banner, { backgroundColor: `${colors.danger}18`, borderColor: `${colors.danger}40` }]}>
            <AlertCircle size={15} color={colors.danger} />
            <Text variant="caption" color="danger" style={styles.bannerText}>
              {error}
            </Text>
          </View>
        )}

        {/* ── Quick-pick recents ───────────────────────────────────────── */}
        {showRecents && (
          <View style={styles.recentsSection}>
            <Text variant="caption" weight="semibold" color="secondary" style={styles.sectionLabel}>
              RECENTLY LOGGED
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentsScroll}
            >
              {recentArtists.map((a) => (
                <RecentArtistChip
                  key={a.id}
                  artist={a}
                  isLoading={false}
                  onPick={handlePickRecentArtist}
                  onOpenDetails={(recentArtist) =>
                    void openArtistCard(recentArtist.id)
                  }
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Skeleton rows ────────────────────────────────────────────── */}
        {showSkeletons && (
          <View style={styles.skeletonList}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </View>
        )}

        {/* ── Results list ─────────────────────────────────────────────── */}
        {!showSkeletons && hasQuery && (
          <FlashList
            data={results}
            keyExtractor={(item) =>
              `${item.source}-${item.spotifyId ?? item.artistId ?? item.name}`
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={renderItem}
            ListEmptyComponent={
              showEmpty ? (
                <View style={styles.emptyState}>
                  <Music2 size={40} color={colors.inkMuted} />
                  <Text variant="label" weight="bold" center>
                    No artists found
                  </Text>
                  <Text variant="caption" color="secondary" center>
                    Try a different spelling or add them manually.
                  </Text>
                  <AddManuallyRow query={query} onPress={handleAddManually} />
                </View>
              ) : null
            }
            ListFooterComponent={
              hasQuery && results.length > 0 ? (
                <AddManuallyRow query={query} onPress={handleAddManually} />
              ) : null
            }
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}

        {/* ── Empty/prompt state when no query ────────────────────────── */}
        {!hasQuery && !showRecents && (
          <View style={styles.promptState}>
            <Search size={36} color={colors.inkMuted} />
            <Text variant="caption" color="secondary" center>
              Type at least 2 characters to search artists.
            </Text>
            <AddManuallyRow query="" onPress={handleAddManually} />
          </View>
        )}

        {!hasQuery && showRecents && results.length === 0 && (
          <View style={styles.manualSection}>
            <AddManuallyRow query="" onPress={handleAddManually} />
          </View>
        )}
      </View>
    </WizardStepView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing[2],
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 50,
    gap: 10,
    marginBottom: spacing[3],
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: fontFamily.regular,
    height: '100%',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: spacing[2],
  },
  bannerText: {
    flex: 1,
    lineHeight: 16,
  },
  recentsSection: {
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  sectionLabel: {
    letterSpacing: 0.8,
  },
  recentsScroll: {
    gap: 8,
    paddingRight: 4,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    gap: 8,
    maxWidth: 160,
  },
  recentArtistItem: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  recentArtistInfo: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  recentChipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  recentChipAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentChipLabel: {
    flexShrink: 1,
  },
  recentChipSpinner: {
    marginLeft: 4,
  },
  skeletonList: {
    gap: 0,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    minHeight: 76,
  },
  skeletonAvatar: {
    flexShrink: 0,
  },
  skeletonText: {
    flex: 1,
    gap: 8,
  },
  skeletonSub: {
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  promptState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  manualSection: {
    marginTop: spacing[2],
  },
  rowSpinnerOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
});

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Check, Search } from 'lucide-react-native';
import { Sheet } from '../ui/Sheet';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';
import { ArtistSearch } from '../../features/artists/ArtistSearch';
import { CustomArtistForm } from '../../features/artists/CustomArtistForm';
import { useEnsureArtist } from '../../features/artists/hooks';
import { useStatsOverview } from '../../features/stats/hooks';
import { useAuthStore } from '../../features/auth/store';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { MAX_PROFILE_PICKS, reorderPicks } from '../../features/profile/logic';
import type {
  ArtistRow,
  ArtistSearchResult,
} from '../../features/artists/types';
import type { ProfilePick } from '../../features/profile/types';
import { PickRow } from './PickRow';

function toSearchResult(artist: {
  artist_id: string;
  artist: string;
  image_url?: string | null;
}): ArtistSearchResult {
  return {
    artistId: artist.artist_id,
    spotifyId: null,
    name: artist.artist,
    imageLarge: artist.image_url ?? null,
    imageThumb: artist.image_url ?? null,
    genres: [],
    macroGenres: [],
    popularity: null,
    source: 'manual',
    existingArtistId: artist.artist_id,
    artist: null,
  };
}

function asPick(
  artist: Pick<
    ArtistRow,
    | 'id'
    | 'name'
    | 'image_url_large'
    | 'image_url_thumb'
    | 'macro_genres'
    | 'primary_macro'
  >,
  position: number,
): ProfilePick {
  return {
    id: artist.id,
    name: artist.name,
    image_url: artist.image_url_large ?? artist.image_url_thumb,
    macro_genres: artist.macro_genres,
    primary_macro: artist.primary_macro,
    position,
    updated_at: new Date().toISOString(),
  };
}

export function PicksEditorSheet({
  visible,
  list,
  initialPicks,
  onDismiss,
  onSave,
}: {
  visible: boolean;
  list: 'recent' | 'favourite';
  initialPicks: ProfilePick[];
  onDismiss: () => void;
  onSave: (picks: ProfilePick[]) => Promise<void>;
}) {
  const { colors } = useTheme();
  const userId = useAuthStore((state) => state.user?.id ?? '');
  const ensureArtist = useEnsureArtist();
  const stats = useStatsOverview(userId);
  const [picks, setPicks] = useState(initialPicks.slice(0, MAX_PROFILE_PICKS));
  const [searching, setSearching] = useState(false);
  const [manualArtistQuery, setManualArtistQuery] = useState<string | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mostSeen = stats.data?.top_artists_by_count ?? [];
  const highestRated = stats.data?.top_artists_by_rating ?? [];
  const selectedIds = useMemo(
    () => new Set(picks.map((pick) => pick.id)),
    [picks],
  );

  async function addArtist(result: ArtistSearchResult) {
    if (
      selectedIds.has(
        result.artistId ?? result.existingArtistId ?? result.spotifyId ?? '',
      )
    )
      return;
    try {
      const artist = await ensureArtist.mutateAsync(result);
      setPicks((current) =>
        current.length >= MAX_PROFILE_PICKS
          ? current
          : [...current, asPick(artist, current.length + 1)],
      );
      setSearching(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not add artist.',
      );
    }
  }

  function addManualArtist(artist: ArtistRow) {
    if (selectedIds.has(artist.id)) return;
    setPicks((current) =>
      current.length >= MAX_PROFILE_PICKS
        ? current
        : [...current, asPick(artist, current.length + 1)],
    );
    setManualArtistQuery(null);
    setSearching(false);
  }

  function movePick(from: number, to: number) {
    setPicks((current) =>
      reorderPicks(current, from, to).map((pick, index) => ({
        ...pick,
        position: index + 1,
      })),
    );
    void Haptics.selectionAsync();
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      await onSave(
        picks.map((pick, index) => ({ ...pick, position: index + 1 })),
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDismiss();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not save picks.',
      );
    } finally {
      setBusy(false);
    }
  }

  const title =
    list === 'recent' ? 'What I’m into recently' : 'My all-time favourites';
  return (
    <Sheet
      visible={visible}
      title={`Edit ${title}`}
      snapPoints={['72%', '92%']}
      useScrollableContent
      onDismiss={onDismiss}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="caption" color="secondary">
          Drag a pick up or down to change its order. Choose up to five artists.
        </Text>
        <View style={styles.slotRow}>
          {Array.from({ length: MAX_PROFILE_PICKS }, (_, index) => (
            <PickRow
              key={picks[index]?.id ?? `empty-${index}`}
              pick={picks[index]}
              position={index + 1}
              list={list}
              editable
              onMove={movePick}
              onRemove={() =>
                setPicks((current) =>
                  current
                    .filter((_pick, pickIndex) => pickIndex !== index)
                    .map((pick, pickIndex) => ({
                      ...pick,
                      position: pickIndex + 1,
                    })),
                )
              }
              onAdd={() => setSearching(true)}
            />
          ))}
        </View>
        {picks.length < MAX_PROFILE_PICKS ? (
          <Button
            label="Add artist"
            leftIcon={<Search size={16} color={colors.ink} />}
            variant="secondary"
            onPress={() => setSearching((current) => !current)}
          />
        ) : null}
        {manualArtistQuery != null ? (
          <View style={styles.searchPanel}>
            <CustomArtistForm
              initialName={manualArtistQuery}
              onSuccess={addManualArtist}
              onCancel={() => setManualArtistQuery(null)}
            />
          </View>
        ) : searching ? (
          <View style={styles.searchPanel}>
            <ArtistSearch
              onSelectArtist={(result) => void addArtist(result)}
              onAddManually={(query) => setManualArtistQuery(query)}
              placeholder="Search Spotify, local, or manual artists"
              autoFocus
            />
          </View>
        ) : (
          <>
            <SuggestionGroup
              title="Most seen by you"
              artists={mostSeen}
              selectedIds={selectedIds}
              onPress={(artist) => void addArtist(toSearchResult(artist))}
            />
            <SuggestionGroup
              title="Highest rated"
              artists={highestRated}
              selectedIds={selectedIds}
              onPress={(artist) => void addArtist(toSearchResult(artist))}
            />
          </>
        )}
        {ensureArtist.isPending || stats.isLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : null}
        {error ? (
          <Toast
            visible
            message={error}
            variant="danger"
            onDismiss={() => setError('')}
          />
        ) : null}
        <Button
          label={busy ? 'Saving…' : 'Save picks'}
          loading={busy}
          disabled={busy}
          leftIcon={<Check size={17} color={colors.accentInk} />}
          onPress={() => void save()}
        />
      </BottomSheetScrollView>
    </Sheet>
  );
}

function SuggestionGroup({
  title,
  artists,
  selectedIds,
  onPress,
}: {
  title: string;
  artists: { artist_id: string; artist: string; image_url?: string | null }[];
  selectedIds: Set<string>;
  onPress: (artist: {
    artist_id: string;
    artist: string;
    image_url?: string | null;
  }) => void;
}) {
  const { colors } = useTheme();
  const candidates = artists
    .filter((artist) => !selectedIds.has(artist.artist_id))
    .slice(0, 5);
  if (!candidates.length) return null;
  return (
    <View style={styles.suggestionGroup}>
      <Text variant="label" weight="bold">
        {title}
      </Text>
      {candidates.map((artist) => (
        <Pressable
          key={artist.artist_id}
          onPress={() => onPress(artist)}
          style={[styles.suggestion, { borderBottomColor: colors.line }]}
        >
          <Text
            variant="body"
            weight="semibold"
            numberOfLines={1}
            style={styles.flexOne}
          >
            {artist.artist}
          </Text>
          <Text variant="caption" color="secondary">
            Add
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    gap: spacing.md,
    maxWidth: 560,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    width: '100%',
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-around',
  },
  searchPanel: { height: 350 },
  suggestionGroup: { gap: spacing.xs },
  suggestion: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  flexOne: { flex: 1 },
});

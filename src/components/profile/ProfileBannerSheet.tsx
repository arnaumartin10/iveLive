import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import { Sheet } from '../ui/Sheet';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';
import { ArtistSearch } from '../../features/artists/ArtistSearch';
import { useEnsureArtist } from '../../features/artists/hooks';
import { fetchArtistImageGallery } from '../../features/artists/api';
import {
  getArtistImageChoices,
  type ArtistImageChoice,
} from '../../features/artists/imageChoices';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import type {
  ArtistImageGalleryRow,
  ArtistRow,
  ArtistSearchResult,
} from '../../features/artists/types';

export interface SuggestedArtist {
  artistId: string;
  name: string;
  image_url?: string | null;
}

interface ProfileBannerSheetProps {
  visible: boolean;
  onDismiss: () => void;
  currentBannerUrl: string | null;
  defaultBackdropUrl: string | null;
  defaultArtistName?: string;
  suggestedArtists?: SuggestedArtist[];
  onSaveBanner: (bannerUrl: string | null) => Promise<void>;
}

export function ProfileBannerSheet({
  visible,
  onDismiss,
  currentBannerUrl,
  defaultBackdropUrl,
  defaultArtistName,
  suggestedArtists = [],
  onSaveBanner,
}: ProfileBannerSheetProps) {
  const { colors } = useTheme();
  const ensureArtist = useEnsureArtist();

  const [selectedArtist, setSelectedArtist] = useState<ArtistRow | null>(null);
  const [galleryImages, setGalleryImages] = useState<ArtistImageGalleryRow[]>(
    [],
  );
  const [selectedChoiceUri, setSelectedChoiceUri] = useState<string | null>(
    currentBannerUrl,
  );
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // When an artist is chosen from search
  async function handleSelectArtist(result: ArtistSearchResult) {
    setLoadingPhotos(true);
    setToastMessage(null);
    try {
      void Haptics.selectionAsync();
      const artist = await ensureArtist.mutateAsync(result);
      setSelectedArtist(artist);
      const gallery = await fetchArtistImageGallery(artist.id).catch(() => []);
      setGalleryImages(gallery);
      // Preselect the first available photo or wide banner
      const choices = computeImageChoices(artist, gallery);
      if (choices[0]) {
        setSelectedChoiceUri(choices[0].uri);
      }
    } catch (error) {
      setToastMessage(
        error instanceof Error
          ? error.message
          : 'Could not load artist photos.',
      );
    } finally {
      setLoadingPhotos(false);
    }
  }

  function handleBackToSearch() {
    void Haptics.selectionAsync();
    setSelectedArtist(null);
    setGalleryImages([]);
  }

  function computeImageChoices(
    artist: ArtistRow,
    gallery: ArtistImageGalleryRow[],
  ): ArtistImageChoice[] {
    const bannerChoices = getArtistImageChoices(artist, 'banner', gallery);
    const profileChoices = getArtistImageChoices(artist, 'profile', gallery);
    const seen = new Set<string>();
    const list: ArtistImageChoice[] = [];
    for (const choice of [...bannerChoices, ...profileChoices]) {
      if (choice.uri && !seen.has(choice.uri)) {
        seen.add(choice.uri);
        list.push(choice);
      }
    }
    return list;
  }

  const availableChoices = useMemo(() => {
    if (!selectedArtist) return [];
    return computeImageChoices(selectedArtist, galleryImages);
  }, [selectedArtist, galleryImages]);

  async function handleApplyBanner() {
    if (!selectedChoiceUri) return;
    setSaving(true);
    try {
      await onSaveBanner(selectedChoiceUri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDismiss();
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : 'Could not save banner.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToDefault() {
    setSaving(true);
    try {
      await onSaveBanner(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDismiss();
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : 'Could not reset banner.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      title={selectedArtist ? selectedArtist.name : 'Customize Profile Banner'}
      snapPoints={['75%', '92%']}
      useScrollableContent
      onDismiss={() => {
        setSelectedArtist(null);
        setGalleryImages([]);
        onDismiss();
      }}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {toastMessage ? (
          <Toast
            visible={!!toastMessage}
            message={toastMessage}
            onDismiss={() => setToastMessage(null)}
          />
        ) : null}

        {selectedArtist ? (
          /* ── View 2: Choose Photo from Selected Artist ── */
          <View style={styles.photoSelectionContainer}>
            <View style={styles.artistHeaderRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to search"
                onPress={handleBackToSearch}
                style={[
                  styles.backButton,
                  { backgroundColor: colors.surfaceRaised },
                ]}
              >
                <ArrowLeft size={16} color={colors.ink} />
                <Text variant="caption" weight="medium">
                  Search other artist
                </Text>
              </Pressable>
            </View>

            <Text variant="body" color="secondary" style={styles.sectionSubtitle}>
              Select a photo from {selectedArtist.name} to display as your header
              backdrop:
            </Text>

            {loadingPhotos ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text variant="caption" color="secondary">
                  Loading available photos...
                </Text>
              </View>
            ) : availableChoices.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text variant="body" color="secondary" center>
                  No photos found for this artist.
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {availableChoices.map((choice) => {
                  const isSelected = selectedChoiceUri === choice.uri;
                  return (
                    <Pressable
                      key={choice.uri}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${choice.label}`}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setSelectedChoiceUri(choice.uri);
                      }}
                      style={[
                        styles.photoCard,
                        {
                          backgroundColor: colors.surfaceRaised,
                          borderColor: isSelected
                            ? colors.accent
                            : colors.line,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: choice.uri }}
                        contentFit="cover"
                        style={styles.bannerImage}
                      />
                      <View style={styles.photoCardFooter}>
                        <Text
                          variant="caption"
                          weight={isSelected ? 'bold' : 'regular'}
                          numberOfLines={1}
                          style={{
                            color: isSelected ? colors.accent : colors.ink,
                            flex: 1,
                          }}
                        >
                          {choice.label}
                        </Text>
                        {isSelected ? (
                          <View
                            style={[
                              styles.checkBadge,
                              { backgroundColor: colors.accent },
                            ]}
                          >
                            <Check size={12} color="#FFFFFF" />
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {availableChoices.length > 0 ? (
              <View style={styles.actionsFooter}>
                <Button
                  label={saving ? 'Saving...' : 'Set as Profile Banner'}
                  variant="primary"
                  disabled={!selectedChoiceUri || saving}
                  onPress={() => void handleApplyBanner()}
                />
              </View>
            ) : null}
          </View>
        ) : (
          /* ── View 1: Search Artist ── */
          <View style={styles.searchContainer}>
            <Text variant="body" color="secondary" style={styles.sectionSubtitle}>
              Search for any artist to feature as your profile backdrop.
            </Text>

            {/* If a custom banner is already active, offer reset option */}
            {currentBannerUrl ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reset to #1 favorite artist banner"
                onPress={() => void handleResetToDefault()}
                disabled={saving}
                style={[
                  styles.resetCard,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderColor: colors.line,
                  },
                ]}
              >
                <RotateCcw size={16} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text variant="caption" weight="bold">
                    Reset to default banner
                  </Text>
                  <Text variant="caption" color="secondary" numberOfLines={1}>
                    Uses your #1 favorite artist
                    {defaultArtistName ? ` (${defaultArtistName})` : ''}
                  </Text>
                </View>
              </Pressable>
            ) : null}

            {/* Quick favorites suggestions */}
            {suggestedArtists.length > 0 ? (
              <View style={styles.suggestionsSection}>
                <View style={styles.sectionTitleRow}>
                  <Sparkles size={14} color={colors.accent} />
                  <Text variant="caption" weight="bold" color="secondary">
                    From your favorites
                  </Text>
                </View>
                <View style={styles.suggestionsRow}>
                  {suggestedArtists.slice(0, 4).map((item) => (
                    <Pressable
                      key={item.artistId}
                      accessibilityRole="button"
                      accessibilityLabel={`Pick ${item.name}`}
                      onPress={() =>
                        void handleSelectArtist({
                          artistId: item.artistId,
                          spotifyId: null,
                          name: item.name,
                          imageLarge: item.image_url ?? null,
                          imageThumb: item.image_url ?? null,
                          genres: [],
                          macroGenres: [],
                          popularity: null,
                          source: 'manual',
                          existingArtistId: item.artistId,
                          artist: null,
                        })
                      }
                      style={[
                        styles.suggestionChip,
                        {
                          backgroundColor: colors.surfaceRaised,
                          borderColor: colors.line,
                        },
                      ]}
                    >
                      {item.image_url ? (
                        <Image
                          source={{ uri: item.image_url }}
                          contentFit="cover"
                          style={styles.suggestionThumb}
                        />
                      ) : null}
                      <Text variant="caption" weight="medium" numberOfLines={1}>
                        {item.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Artist Search Field */}
            <View style={styles.searchWrapper}>
              <ArtistSearch
                onSelectArtist={(result) => void handleSelectArtist(result)}
                onAddManually={() => {}}
                placeholder="Search any artist (e.g. Charli xcx, Radiohead)..."
                autoFocus={false}
              />
            </View>
          </View>
        )}
      </BottomSheetScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sectionSubtitle: {
    marginBottom: spacing.xs,
  },
  searchContainer: {
    gap: spacing.md,
  },
  resetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  suggestionsSection: {
    gap: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: '48%',
  },
  suggestionThumb: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
  },
  searchWrapper: {
    marginTop: spacing.xs,
  },
  photoSelectionContainer: {
    gap: spacing.md,
  },
  artistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  loaderContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  grid: {
    gap: spacing.md,
  },
  photoCard: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  photoCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsFooter: {
    paddingTop: spacing.sm,
  },
});

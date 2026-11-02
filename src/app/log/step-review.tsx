import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Crown } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { ArtistAvatar } from '../../components/ui/ArtistAvatar';
import { Card } from '../../components/ui/Card';
import { Pill } from '../../components/ui/Pill';
import { StarRating } from '../../components/ui/StarRating';
import { Toast } from '../../components/ui/Toast';
import { Text } from '../../components/ui/Text';
import { WizardStepView } from '../../components/log/WizardStepView';
import { SetlistImportPanel } from '../../features/setlist/SetlistImportPanel';
import { saveConcertSetlist } from '../../features/setlist/api';
import type { ParsedSetlist } from '../../features/setlist/parse';
import { useCreateLog, useUpdateLog } from '../../features/concerts/hooks';
import { fetchUserTerritoryStats } from '../../features/cloud/api';
import {
  cloudTerritoryBeforeLogKey,
  cloudTerritoryStatsKey,
} from '../../features/cloud/hooks';
import { useLogDraft } from '../../features/log/store';
import { useAuthStore } from '../../features/auth/store';
import { markWishlistItemSeen } from '../../features/profile/api';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, radius, spacing, spring } from '../../theme/tokens';

export default function StepReview() {
  const { colors } = useTheme();
  const { wishlistId } = useLocalSearchParams<{ wishlistId?: string }>();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? '');
  const artist = useLogDraft((state) => state.artist);
  const eventDate = useLogDraft((state) => state.eventDate);
  const venueType = useLogDraft((state) => state.venueType);
  const venueName = useLogDraft((state) => state.venueName);
  const rating = useLogDraft((state) => state.rating);
  const review = useLogDraft((state) => state.review);
  const isEditing = useLogDraft((state) => state.isEditing);
  const editingConcertId = useLogDraft((state) => state.editingConcertId);
  const reset = useLogDraft((state) => state.reset);
  const setRating = useLogDraft((state) => state.setRating);
  const setReview = useLogDraft((state) => state.setReview);
  const setStep = useLogDraft((state) => state.setStep);
  const createLog = useCreateLog();
  const updateLog = useUpdateLog();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState(
    'Could not save this show. Try again.',
  );
  const [importedSetlist, setImportedSetlist] = useState<ParsedSetlist | null>(
    null,
  );
  const ratingScale = useSharedValue(1);

  useEffect(() => {
    ratingScale.value = 0.82;
    ratingScale.value = withSpring(1, {
      ...spring.snappy,
      overshootClamping: true,
    });
  }, [rating, ratingScale]);

  const ratingValueStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ratingScale.value }],
  }));

  async function saveShow() {
    if (!artist || !venueType || rating === null) {
      Alert.alert(
        'Unable to save show',
        'Add a rating and check the show details.',
      );
      return;
    }

    setToastVisible(false);
    try {
      if (isEditing && editingConcertId) {
        await updateLog.mutateAsync({
          id: editingConcertId,
          formData: {
            venue_type: venueType,
            venue_name: venueName.trim(),
            concert_date: format(eventDate, 'yyyy-MM-dd'),
            notes: review.trim(),
            rating,
          },
        });
        void queryClient.invalidateQueries({ queryKey: ['profile-overview'] });
        void queryClient.invalidateQueries({ queryKey: ['profile-wishlist'] });
        reset();
        router.back();
        return;
      }

      let territorySnapshot = queryClient.getQueryData(
        cloudTerritoryStatsKey(userId),
      );
      if (!territorySnapshot && userId) {
        try {
          territorySnapshot = await queryClient.fetchQuery({
            queryKey: cloudTerritoryStatsKey(userId),
            queryFn: () => fetchUserTerritoryStats(userId),
            staleTime: 0,
          });
        } catch (error) {
          console.warn(
            '[cloud] Previous territory stats unavailable for discovery comparison.',
            error,
          );
        }
      }

      const newConcert = await createLog.mutateAsync({
        artist,
        formData: {
          artist_id: artist.id,
          artist_name: artist.name,
          spotify_artist_id: artist.spotify_id,
          venue_type: venueType,
          venue_name: venueName.trim(),
          concert_date: format(eventDate, 'yyyy-MM-dd'),
          notes: review.trim(),
          rating,
        },
      });
      if (territorySnapshot) {
        queryClient.setQueryData(
          cloudTerritoryBeforeLogKey(newConcert.id),
          territorySnapshot,
        );
      }
      let setlistSaveFailed = false;
      if (importedSetlist) {
        try {
          await saveConcertSetlist(newConcert.id, userId, importedSetlist);
        } catch {
          setlistSaveFailed = true;
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['profile-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['profile-wishlist'] });
      if (wishlistId) {
        try {
          await markWishlistItemSeen(wishlistId);
          void queryClient.invalidateQueries({
            queryKey: ['profile-overview'],
          });
          void queryClient.invalidateQueries({
            queryKey: ['profile-wishlist'],
          });
        } catch {
          Alert.alert(
            'Show saved',
            'The show was saved, but the wishlist status could not be updated.',
          );
        }
      }
      setStep(6);
      router.replace(
        `/log/step-keepsakes?id=${encodeURIComponent(newConcert.id)}${setlistSaveFailed ? '&setlistSaveFailed=true' : ''}` as Href,
      );
    } catch (error) {
      setToastMessage(
        error instanceof Error
          ? error.message
          : 'Could not save this show. Try again.',
      );
      setToastVisible(true);
    }
  }

  const isPending = createLog.isPending || updateLog.isPending;
  const continueLabel = isPending
    ? isEditing
      ? 'Saving changes...'
      : 'Adding to archive...'
    : isEditing
      ? 'Save changes'
      : 'Add to my archive';

  return (
    <WizardStepView
      step={5}
      continueLabel={continueLabel}
      onContinue={saveShow}
      disableContinue={isPending}
      footerSlot={
        <Toast
          visible={toastVisible}
          message={toastMessage}
          variant="danger"
          onDismiss={() => setToastVisible(false)}
        />
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text variant="title" weight="bold">
            Rate the show
          </Text>
          <Text color="secondary">
            Your rating is required. The note is optional.
          </Text>
        </View>

        {artist && venueType ? (
          <Card padding={spacing[3]} style={styles.summaryCard}>
            <View style={styles.summaryArtist}>
              <ArtistAvatar
                name={artist.name}
                imageUrl={artist.image_url_thumb ?? artist.image_url_large}
                size={48}
              />
              <View style={styles.summaryArtistCopy}>
                <Text variant="label" numberOfLines={1}>
                  {artist.name}
                </Text>
                <Text variant="caption" color="secondary">
                  {format(eventDate, 'EEE, d MMM yyyy')}
                </Text>
              </View>
            </View>
            <View style={styles.summaryVenue}>
              <Pill venueType={venueType} />
              <Text
                variant="caption"
                color={venueName.trim() ? 'primary' : 'secondary'}
                numberOfLines={1}
                style={styles.summaryVenueName}
              >
                {venueName.trim() || 'Venue name not added'}
              </Text>
            </View>
            <View style={styles.summaryRating}>
              <StarRating value={rating ?? 0} size={14} />
              <Text
                variant="caption"
                weight="semibold"
                color={rating === null ? 'secondary' : 'amber'}
              >
                {rating === null ? 'Rating required' : rating.toFixed(1)}
              </Text>
            </View>
          </Card>
        ) : null}

        <View style={styles.ratingSection}>
          <View style={styles.ratingRow}>
            <StarRating
              value={rating ?? 0}
              onChange={setRating}
              size={34}
              showGlow={rating === 5}
            />
            <Animated.View style={ratingValueStyle}>
              <Text
                variant="display"
                weight="bold"
                color={rating === null ? 'secondary' : 'amber'}
                style={styles.ratingValue}
              >
                {rating?.toFixed(1) ?? '0.0'}
              </Text>
            </Animated.View>
          </View>
          {rating === 5 ? (
            <View
              style={[
                styles.wallOfFame,
                { backgroundColor: `${colors.accent}18` },
              ]}
            >
              <Crown size={16} color={colors.accent} />
              <Text variant="caption" weight="semibold" color="amber">
                Wall of Fame
              </Text>
            </View>
          ) : (
            <Text variant="caption" color="secondary">
              Tap a star or slide to rate in half steps.
            </Text>
          )}
        </View>

        {!isEditing ? (
          <View style={styles.setlistSection}>
            <SetlistImportPanel
              editable
              logContext={{
                artistName: artist?.name ?? null,
                eventDate: format(eventDate, 'yyyy-MM-dd'),
                venueName: venueName.trim(),
              }}
              onSelect={setImportedSetlist}
            />
            {importedSetlist ? (
              <Text variant="caption" color="secondary">
                Setlist ready · {importedSetlist.songs.length} songs
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.reviewSection}>
          <View style={styles.reviewHeading}>
            <Text variant="label">Add a note</Text>
            <Text variant="caption" color="secondary">
              Optional
            </Text>
          </View>
          <View
            style={[
              styles.reviewBox,
              { borderColor: colors.line, backgroundColor: colors.surface },
            ]}
          >
            <TextInput
              accessibilityLabel="Show notes"
              maxLength={2000}
              multiline
              onChangeText={setReview}
              placeholder="Setlist highlights, who you went with, that one moment..."
              placeholderTextColor={colors.inkMuted}
              textAlignVertical="top"
              style={[styles.input, { color: colors.ink }]}
              value={review}
            />
            <Text
              variant="caption"
              color="secondary"
              style={styles.characterCount}
            >
              {review.length} / 2000
            </Text>
          </View>
        </View>
      </ScrollView>
    </WizardStepView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing[4],
    padding: spacing[4],
    paddingBottom: spacing[5],
  },
  heading: { gap: spacing[1] },
  summaryCard: { gap: spacing[3] },
  summaryArtist: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
  },
  summaryArtistCopy: { flex: 1, gap: spacing[1] },
  summaryVenue: { alignItems: 'center', flexDirection: 'row', gap: spacing[3] },
  summaryVenueName: { flex: 1 },
  summaryRating: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  ratingSection: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  setlistSection: { gap: spacing[2] },
  ratingRow: { alignItems: 'center', flexDirection: 'row', gap: spacing[3] },
  ratingValue: { minWidth: 76, textAlign: 'center' },
  wallOfFame: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  reviewSection: { gap: spacing[2] },
  reviewHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 150,
    padding: spacing[3],
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
  },
  characterCount: { alignSelf: 'flex-end', paddingTop: spacing[2] },
});

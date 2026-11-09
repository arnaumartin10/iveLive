import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { routes } from '../../navigation/routes';
import { KeepsakeFrames } from '../../components/media/KeepsakeFrames';
import { Text } from '../../components/ui/Text';
import { Toast } from '../../components/ui/Toast';
import { WizardStepView } from '../../components/log/WizardStepView';
import { useLogMedia, useMediaQueue } from '../../features/media/hooks';
import { deleteLocalFiles } from '../../features/media/api';
import { useLogDraft } from '../../features/log/store';
import { useCreateLog } from '../../features/concerts/hooks';
import { useAuthStore } from '../../features/auth/store';
import { fetchUserTerritoryStats } from '../../features/cloud/api';
import {
  cloudTerritoryBeforeLogKey,
  cloudTerritoryStatsKey,
} from '../../features/cloud/hooks';
import { saveConcertSetlist } from '../../features/setlist/api';
import { markWishlistItemSeen } from '../../features/profile/api';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

export default function StepKeepsakes() {
  const { colors } = useTheme();
  const { id, setlistSaveFailed, wishlistId } = useLocalSearchParams<{
    id?: string;
    setlistSaveFailed?: string;
    wishlistId?: string;
  }>();
  const userId = useAuthStore((state) => state.user?.id ?? '');
  const queryClient = useQueryClient();
  const artist = useLogDraft((state) => state.artist);
  const eventDate = useLogDraft((state) => state.eventDate);
  const venueType = useLogDraft((state) => state.venueType);
  const venueName = useLogDraft((state) => state.venueName);
  const rating = useLogDraft((state) => state.rating);
  const review = useLogDraft((state) => state.review);
  const importedSetlist = useLogDraft((state) => state.importedSetlist);
  const pendingKeepsakes = useLogDraft((state) => state.pendingKeepsakes);
  const stageKeepsake = useLogDraft((state) => state.stageKeepsake);
  const removeStagedKeepsake = useLogDraft(
    (state) => state.removeStagedKeepsake,
  );
  const resetDraft = useLogDraft((state) => state.reset);
  const mediaQuery = useLogMedia(id ?? '');
  const queue = useMediaQueue(id ?? 'draft-keepsakes');
  const createLog = useCreateLog();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isDraft = !id;
  const hasKeepsakes = isDraft
    ? pendingKeepsakes.length > 0
    : (mediaQuery.data?.length ?? 0) > 0 || queue.items.length > 0;

  async function saveDraftKeepsake(
    keepsake: (typeof pendingKeepsakes)[number],
  ) {
    const previous = pendingKeepsakes.find(
      (item) => item.slot === keepsake.slot,
    );
    if (previous) {
      await deleteLocalFiles([
        previous.localPath,
        previous.thumbLocalPath,
        previous.posterLocalPath,
      ]);
    }
    stageKeepsake(keepsake);
  }

  async function removeDraftKeepsake(
    slot: (typeof pendingKeepsakes)[number]['slot'],
  ) {
    const item = pendingKeepsakes.find((keepsake) => keepsake.slot === slot);
    if (item) {
      await deleteLocalFiles([
        item.localPath,
        item.thumbLocalPath,
        item.posterLocalPath,
      ]);
      removeStagedKeepsake(slot);
    }
  }

  async function finish(skipped: boolean) {
    if (isSaving) return;
    if (id) {
      router.replace(
        routes.logDone(id, skipped, setlistSaveFailed === 'true'),
      );
      return;
    }
    if (!artist || !venueType || rating === null) {
      setToastMessage('Check the show details and add a rating before saving.');
      setToastVisible(true);
      return;
    }

    setIsSaving(true);
    setToastVisible(false);
    try {
      let territorySnapshot = queryClient.getQueryData(
        cloudTerritoryStatsKey(userId),
      );
      if (!territorySnapshot && userId) {
        try {
          territorySnapshot = await queryClient.fetchQuery({
            queryKey: cloudTerritoryStatsKey(userId),
            queryFn: () => fetchUserTerritoryStats(userId),
            staleTime: 0,
            retry: false,
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

      let failedToSaveSetlist = false;
      if (importedSetlist) {
        try {
          await saveConcertSetlist(newConcert.id, userId, importedSetlist);
        } catch (error) {
          console.error('[setlist] Could not save the imported setlist.', error);
          failedToSaveSetlist = true;
        }
      }

      for (const keepsake of pendingKeepsakes) {
        queue.enqueue(userId, newConcert.id, keepsake);
      }

      if (wishlistId) {
        try {
          await markWishlistItemSeen(wishlistId);
          void queryClient.invalidateQueries({
            queryKey: ['profile-overview'],
          });
          void queryClient.invalidateQueries({
            queryKey: ['profile-wishlist'],
          });
        } catch (error) {
          console.error(
            '[wishlist] The saved show could not be marked as seen.',
            error,
          );
          Alert.alert(
            'Show saved',
            'The show was saved, but the wishlist status could not be updated.',
          );
        }
      }

      resetDraft();
      router.replace(
        routes.logDone(newConcert.id, skipped, failedToSaveSetlist),
      );
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : 'Could not save this show.',
      );
      setToastVisible(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <WizardStepView
      step={6}
      continueLabel={
        isSaving
          ? 'Saving to archive...'
          : isDraft
            ? 'Save to my archive'
            : 'Finish'
      }
      disableContinue={isSaving}
      onContinue={() => finish(!hasKeepsakes)}
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
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title" weight="bold">
          Keep a little piece of the night
        </Text>
        <Text variant="body" color="secondary">
          {isDraft
            ? 'Add photos or a short reel. Your log will be saved when you finish.'
            : 'Add a concert photo, a crew photo, or a short reel. Your log is already saved.'}
        </Text>
        <KeepsakeFrames
          logId={id ?? ''}
          mode="edit"
          stagedKeepsakes={isDraft ? pendingKeepsakes : undefined}
          onStageKeepsake={isDraft ? saveDraftKeepsake : undefined}
          onRemoveStagedKeepsake={isDraft ? removeDraftKeepsake : undefined}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => void finish(true)}
          style={styles.skipButton}
        >
          <Text variant="mono" style={{ color: colors.accentText }}>
            Skip for now
          </Text>
        </Pressable>
      </ScrollView>
    </WizardStepView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  skipButton: { alignSelf: 'center', padding: spacing.sm },
});

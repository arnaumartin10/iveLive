import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  Platform,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Camera, Clapperboard, Play, Plus, Users } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Tape } from '../paper/Tape';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { hardShadow, spacing } from '../../theme/tokens';
import { RAW } from '../../theme/palette';
import { getSeededRotation } from '../paper/hash';
import { useAuthStore } from '../../features/auth/store';
import {
  removeLogMedia,
  updateMediaCaption,
} from '../../features/media/api';
import { useLogMedia, useMediaQueue, mediaKeys } from '../../features/media/hooks';
import { useSignedMediaUrls } from '../../features/media/signedUrls';
import { pickKeepsakePhoto, pickKeepsakeVideo } from '../../features/media/picker';
import type {
  FeedMedia,
  LogMedia,
  MediaSlot,
  SignedLogMedia,
} from '../../features/media/types';
import { MediaViewer } from './MediaViewer';
import { getKeepsakeFrameLayout } from './framesLayout';

const SLOTS = [
  { slot: 'concert_photo', label: 'THE SHOW' },
  { slot: 'companions_photo', label: 'THE CREW' },
  { slot: 'concert_video', label: 'THE REEL' },
] as const;

type FrameMedia = (SignedLogMedia | FeedMedia) & {
  thumb_url?: string;
  poster_url?: string | null;
};

export function KeepsakeFrames({
  logId,
  mode,
  media: mediaProp,
  onMediaChange,
}: {
  logId: string;
  mode: 'edit' | 'view';
  media?: FrameMedia[];
  onMediaChange?: (media: FrameMedia[]) => void;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const userId = useAuthStore((state) => state.user?.id ?? '');
  const client = useQueryClient();
  const { data: fromQueryData = [], refetch: refetchLogMedia } = useLogMedia(logId);
  const queue = useMediaQueue(logId);
  const fromQuery = fromQueryData;
  const media: FrameMedia[] = mediaProp ?? fromQuery;
  const queuedCount = queue.items.length;
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LogMedia | null>(null);
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({});
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousQueueCount = useRef(queuedCount);
  const mediaPaths = media.flatMap((item) =>
    item.thumb_url
      ? []
      : [item.thumb_path, ...(item.poster_path ? [item.poster_path] : [])],
  );
  const signed = useSignedMediaUrls(mediaPaths);
  const displayedMedia = useMemo(
    () =>
      media.map((item) => ({
        ...item,
        thumb_url:
          item.thumb_url ??
          (item.poster_path
            ? signed.data?.[item.poster_path]
            : signed.data?.[item.thumb_path]),
        poster_url:
          item.poster_url ??
          (item.poster_path ? signed.data?.[item.poster_path] : null),
      })),
    [media, signed.data],
  );
  const orderedSlots = SLOTS.map(({ slot }) => slot);
  const layout = getKeepsakeFrameLayout(displayedMedia.length, mode);
  const orderedMedia = orderedSlots.flatMap((slot) => {
    const index = displayedMedia.findIndex((item) => item.slot === slot);
    const item = index < 0 ? undefined : displayedMedia[index];
    return item ? [{ media: item, index }] : [];
  });

  useEffect(() => {
    onMediaChange?.(displayedMedia);
  }, [displayedMedia, onMediaChange]);

  useEffect(() => {
    if (previousQueueCount.current > 0 && queuedCount === 0) {
      void client.invalidateQueries({ queryKey: mediaKeys.log(logId) });
      void client.invalidateQueries({
        queryKey: ['concerts', 'detail', logId],
      });
      void client.invalidateQueries({
        queryKey: ['concerts', 'media-count', userId],
      });
      void refetchLogMedia();
    }
    previousQueueCount.current = queuedCount;
  }, [client, logId, mediaProp, queuedCount, refetchLogMedia, userId]);

  useEffect(
    () => () => {
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
    },
    [],
  );

  async function choose(slot: MediaSlot, source: 'library' | 'camera' = 'library') {
    try {
      const processed =
        slot === 'concert_video'
          ? await pickKeepsakeVideo()
          : await pickKeepsakePhoto(slot, source);
      if (!processed) return;
      if (!userId) {
        Alert.alert('Sign in to save keepsakes', 'Your concert log is safe; sign in to add media.');
        return;
      }
      queue.enqueue(userId, logId, processed);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Try a different photo or reel.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Could not prepare that keepsake\n\n${message}`);
      } else {
        Alert.alert('Could not prepare that keepsake', message);
      }
    }
  }

  function scheduleDelete(item: FrameMedia) {
    if (!isStoredMedia(item)) return;
    setPendingDelete(item);
    deleteTimer.current = setTimeout(() => {
      void removeLogMedia(item)
        .then(() => {
          void client.invalidateQueries({
            queryKey: ['concerts', 'media-count', userId],
          });
          void client.invalidateQueries({
            queryKey: ['concerts', 'detail', logId],
          });
          return refetchLogMedia();
        })
        .catch((error: unknown) => {
          Alert.alert(
            'Could not remove keepsake',
            error instanceof Error ? error.message : 'Try again.',
          );
        })
        .finally(() => setPendingDelete(null));
    }, 5000);
  }

  function undoDelete() {
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    deleteTimer.current = null;
    setPendingDelete(null);
  }

  function saveCaption(slot: MediaSlot, item: FrameMedia, value: string) {
    const caption = value.trim().slice(0, 120) || null;
    const pending = queue.items.find((candidate) => candidate.slot === slot);
    if (pending) queue.update(pending.id, { caption });
    if ('id' in item && item.id) {
      void updateMediaCaption(item.id, caption)
        .then(() => {
          void client.invalidateQueries({ queryKey: mediaKeys.log(logId) });
          return client.invalidateQueries({
            queryKey: ['concerts', 'detail', logId],
          });
        })
        .catch((error: unknown) => {
          Alert.alert(
            'Could not save caption',
            error instanceof Error ? error.message : 'Try again.',
          );
        });
    }
  }

  function openOrManage(slot: MediaSlot) {
    const match = orderedMedia.find((entry) => entry.media.slot === slot);
    if (match) {
      setViewerIndex(match.index);
    } else {
      void choose(slot);
    }
  }

  const frameWidth = Math.min(112, (width - spacing.xl * 2 - spacing.md * 2) / 3);
  const ownerMode = mode === 'edit';
  const [first, second, third] = orderedMedia;

  return (
    <View style={styles.root}>
      {mode === 'edit' ? (
        <View style={styles.editRow}>
          {SLOTS.map(({ slot, label }) => {
            const item = displayedMedia.find((entry) => entry.slot === slot);
            const pending = queue.items.find((entry) => entry.slot === slot);
            return (
              <View key={slot} style={{ width: frameWidth }}>
                {item ? (
                  <Print
                    id={`${logId}-${slot}`}
                    item={item}
                    width={frameWidth}
                    onPress={() => openOrManage(slot)}
                  />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${label.toLowerCase()} keepsake`}
                    onPress={() => openOrManage(slot)}
                    style={[
                      styles.emptyFrame,
                      { width: frameWidth, borderColor: colors.line },
                    ]}
                  >
                    <Plus size={18} color={colors.inkMuted} />
                    <SlotIcon slot={slot} size={16} color={colors.inkMuted} />
                    <Text variant="mono" style={{ color: colors.inkMuted, fontSize: 9 }}>
                      {label}
                    </Text>
                  </Pressable>
                )}
                {!pending ? (
                  <View style={styles.editActions}>
                    {slot === 'concert_video' ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Choose a concert video"
                        onPress={() => void choose(slot)}
                      >
                        <Text variant="mono" style={[styles.actionText, { color: colors.accent }]}>
                          {item ? 'REPLACE' : 'CHOOSE VIDEO'}
                        </Text>
                      </Pressable>
                    ) : (
                      <>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${item ? 'Replace' : 'Add'} ${label.toLowerCase()} from library`}
                          onPress={() => void choose(slot, 'library')}
                        >
                          <Text variant="mono" style={[styles.actionText, { color: colors.accent }]}>
                            {item ? 'REPLACE' : 'LIBRARY'}
                          </Text>
                        </Pressable>
                        {!item ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Take ${label.toLowerCase()} with camera`}
                            onPress={() => void choose(slot, 'camera')}
                          >
                            <Text variant="mono" style={[styles.actionText, { color: colors.accent }]}>
                              CAMERA
                            </Text>
                          </Pressable>
                        ) : null}
                      </>
                    )}
                    {item ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${label.toLowerCase()}`}
                        onPress={() => scheduleDelete(item)}
                      >
                        <Text variant="mono" style={[styles.actionText, { color: colors.accent }]}>
                          REMOVE
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                {pending ? (
                  <Text variant="mono" style={[styles.uploadStamp, { color: colors.accent }]}>
                    {pending.status === 'failed'
                      ? 'UPLOAD FAILED'
                      : queue.isOffline
                        ? 'PAUSED · OFFLINE'
                      : `${pending.status === 'uploading' ? 'UPLOADING' : 'WAITING'} ${pending.progress}%`}
                  </Text>
                ) : null}
                {item ? (
                  <TextInput
                    accessibilityLabel={`Caption for ${label.toLowerCase()}`}
                    value={captionDrafts[slot] ?? item.caption ?? ''}
                    onChangeText={(value) =>
                      setCaptionDrafts((drafts) => ({ ...drafts, [slot]: value }))
                    }
                    onEndEditing={(event) =>
                      saveCaption(slot, item, event.nativeEvent.text)
                    }
                    maxLength={120}
                    placeholder={
                      slot === 'companions_photo'
                        ? 'Who came with you?'
                        : 'Add a caption'
                    }
                    placeholderTextColor={colors.inkMuted}
                    style={[
                      styles.captionInput,
                      { color: colors.ink, borderColor: colors.line },
                    ]}
                  />
                ) : null}
                {pending?.status === 'failed' ? (
                  <Pressable onPress={() => queue.retry(pending.id)}>
                    <Text variant="mono" style={[styles.retryText, { color: colors.accent }]}>RETRY</Text>
                  </Pressable>
                ) : null}
                {pending && pending.status !== 'failed' ? (
                  <Pressable onPress={() => queue.cancel(pending.id)}>
                    <Text variant="mono" style={[styles.retryText, { color: colors.accent }]}>CANCEL</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.viewLayout}>
          {layout === 'single' && first ? (
            <Print
              id={`${logId}-${first.media.slot}`}
              item={first.media}
              width={Math.min(width - spacing.xl * 2, 360)}
              large
              onPress={() => setViewerIndex(first.index)}
            />
          ) : layout === 'pair' && first && second ? (
            <View style={styles.pairRow}>
              {orderedMedia.map(({ media: item, index }) => (
                <Print
                  key={item.slot}
                  id={`${logId}-${item.slot}`}
                  item={item}
                  width={(width - spacing.xl * 2 - spacing.md) / 2}
                  onPress={() => setViewerIndex(index)}
                />
              ))}
            </View>
          ) : layout === 'hero_stack' && first && second && third ? (
            <View style={styles.threeLayout}>
              <Print
                id={`${logId}-${first.media.slot}`}
                item={first.media}
                width={(width - spacing.xl * 2 - spacing.md) * 0.62}
                large
                onPress={() => setViewerIndex(first.index)}
              />
              <View style={styles.smallStack}>
                {orderedMedia.slice(1).map(({ media: item, index }) => (
                  <Print
                    key={item.slot}
                    id={`${logId}-${item.slot}`}
                    item={item}
                    width={(width - spacing.xl * 2 - spacing.md) * 0.38}
                    onPress={() => setViewerIndex(index)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      )}

      {ownerMode && queuedCount > 0 ? (
        <Text variant="mono" style={styles.uploadStamp}>
          {queue.isOffline
            ? 'Uploads paused · offline'
            : `Uploading ${queue.items.filter((item) => item.status === 'uploading').length} of 3`}
        </Text>
      ) : null}

      {pendingDelete ? (
        <View style={[styles.undoToast, { backgroundColor: colors.ink }]}>
          <Text variant="mono" style={{ color: colors.surface }}>Keepsake removed soon</Text>
          <Pressable onPress={undoDelete}>
            <Text variant="mono" style={{ color: colors.accentInk }}>UNDO</Text>
          </Pressable>
        </View>
      ) : null}

      <MediaViewer
        visible={viewerIndex !== null}
        media={orderedMedia.map(({ media: item }) => ({
          id: isStoredMedia(item) ? item.id : undefined,
          log_id: logId,
          slot: item.slot,
          kind: item.kind,
          storage_path: item.storage_path,
          width: item.width,
          height: item.height,
          duration_ms: item.duration_ms,
          caption: item.caption,
        }))}
        initialIndex={viewerIndex ?? 0}
        isOwner={ownerMode}
        onDismiss={() => setViewerIndex(null)}
        onDelete={(mediaId) => {
          const item = media.find((entry) => 'id' in entry && entry.id === mediaId);
          if (item) scheduleDelete(item);
          setViewerIndex(null);
        }}
      />
    </View>
  );
}

function isStoredMedia(item: FrameMedia): item is SignedLogMedia {
  return 'id' in item && typeof item.id === 'string';
}

function Print({
  id,
  item,
  width,
  large = false,
  onPress,
}: {
  id: string;
  item: FrameMedia;
  width: number;
  large?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const source =
    item.kind === 'video'
      ? item.poster_url ?? item.thumb_url
      : item.thumb_url;
  const aspect = item.width > 0 && item.height > 0 ? item.width / item.height : 1;
  const height = Math.max(large ? 210 : 100, Math.min(width * 1.25, width / aspect));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${SLOTS.find((slot) => slot.slot === item.slot)?.label ?? 'keepsake'}`}
      onPress={onPress}
      style={[
        styles.print,
        {
          width,
          height: height + 34,
          borderColor: colors.ink,
          backgroundColor: RAW.wheat,
          transform: [{ rotate: `${getSeededRotation(id, 1.4)}deg` }],
        },
      ]}
    >
      <Tape id={id} width={44} height={12} style={styles.tape} />
      <View
        style={[
          styles.photo,
          {
            height,
            backgroundColor: colors.bgSunken,
            borderColor: RAW.wheat,
          },
        ]}
      >
        {source ? (
          <Image
            source={{ uri: source }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : null}
        {item.kind === 'video' ? (
          <View style={styles.playStamp}>
            <Play size={14} color={colors.ink} fill={colors.ink} />
          </View>
        ) : null}
        <View style={styles.slotTag}>
          <SlotIcon slot={item.slot} size={12} color={colors.ink} />
        </View>
      </View>
      <View style={styles.printCaption}>
        <Text variant="mono" style={{ color: colors.ink, fontSize: 9 }} numberOfLines={1}>
          {SLOTS.find((slot) => slot.slot === item.slot)?.label}
          {item.kind === 'video' && item.duration_ms
            ? ` · ${Math.floor(item.duration_ms / 1000)}s`
            : ''}
        </Text>
        {item.caption ? (
          <Text
            variant="mono"
            style={[styles.caption, { color: colors.ink }]}
            numberOfLines={2}
          >
            {item.caption}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function SlotIcon({
  slot,
  ...props
}: React.ComponentProps<typeof Camera> & { slot: MediaSlot }) {
  if (slot === 'concert_photo') return <Camera {...props} />;
  if (slot === 'companions_photo') return <Users {...props} />;
  return <Clapperboard {...props} />;
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  editRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  emptyFrame: {
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    gap: 5,
    height: 132,
    justifyContent: 'center',
    padding: 5,
  },
  print: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
    ...hardShadow.sm,
    padding: 5,
    position: 'relative',
  },
  photo: {
    borderWidth: 4,
    overflow: 'hidden',
    width: '100%',
  },
  tape: { position: 'absolute', right: 7, top: -5, zIndex: 2 },
  slotTag: {
    alignItems: 'center',
    backgroundColor: RAW.wheat,
    borderWidth: 1,
    left: 3,
    padding: 2,
    position: 'absolute',
    top: 3,
  },
  playStamp: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: RAW.wheat,
    borderWidth: 1,
    borderRadius: 20,
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    top: '42%',
    width: 34,
  },
  printCaption: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  captionInput: {
    borderBottomWidth: 1,
    fontFamily: 'DMMono_400Regular',
    fontSize: 10,
    marginTop: 4,
    paddingVertical: 3,
    textAlign: 'center',
  },
  viewLayout: { alignItems: 'center', gap: spacing.sm },
  pairRow: { flexDirection: 'row', gap: spacing.md },
  threeLayout: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  smallStack: { flex: 1, gap: spacing.sm },
  caption: { fontSize: 9, marginTop: 3, textAlign: 'center' },
  uploadStamp: { fontSize: 10, textAlign: 'center' },
  retryText: { fontSize: 10, textAlign: 'center' },
  undoToast: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  editActions: {
    alignItems: 'center',
    gap: 3,
    paddingTop: spacing.xs,
  },
  actionText: {
    fontSize: 8,
  },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import * as Sharing from 'expo-sharing';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
} from 'react-native-reanimated';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import {
  ArrowLeft,
  Flag,
  Share2,
  Trash2,
  Volume2,
  VolumeOff,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';
import { useSignedMediaUrls } from '../../features/media/signedUrls';
import { submitReport } from '../../features/social/api';
import type { LogMedia, MediaSlot } from '../../features/media/types';

type ViewerMedia = Pick<
  LogMedia,
  | 'log_id'
  | 'slot'
  | 'kind'
  | 'storage_path'
  | 'width'
  | 'height'
  | 'duration_ms'
  | 'caption'
> & {
  id?: string;
  poster_url?: string | null;
};

const SLOT_NAMES: Record<MediaSlot, string> = {
  concert_photo: 'THE SHOW',
  companions_photo: 'THE CREW',
  concert_video: 'THE REEL',
};

export function MediaViewer({
  visible,
  media,
  initialIndex,
  isOwner,
  onDismiss,
  onDelete,
}: {
  visible: boolean;
  media: ViewerMedia[];
  initialIndex: number;
  isOwner: boolean;
  onDismiss: () => void;
  onDelete?: (mediaId: string) => void;
}) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<ViewerMedia>>(null);
  const paths = media.map((item) => item.storage_path);
  const signedUrls = useSignedMediaUrls(paths, visible);
  const refreshSignedUrls = signedUrls.refresh;
  const refreshExpiredUrl = useCallback(() => {
    void refreshSignedUrls().catch((error: unknown) => {
      Alert.alert(
        'Could not refresh keepsake',
        error instanceof Error ? error.message : 'Try again in a moment.',
      );
    });
  }, [refreshSignedUrls]);

  async function shareCurrent() {
    const item = media[activeIndex];
    if (!item) {
      Alert.alert(
        'Still getting your keepsake',
        'Try sharing again in a moment.',
      );
      return;
    }
    const url = signedUrls.data?.[item.storage_path];
    if (!url) {
      Alert.alert(
        'Still getting your keepsake',
        'Try sharing again in a moment.',
      );
      return;
    }
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(
        'Sharing is unavailable',
        'This device cannot share files right now.',
      );
      return;
    }
    const extension =
      item.kind === 'video'
        ? item.storage_path.split('.').pop() || 'mp4'
        : 'jpg';
    const localFile = new File(
      Paths.cache,
      `keepsake-share-${Crypto.randomUUID()}.${extension}`,
    );
    let downloaded: File | null = null;
    try {
      downloaded = await File.downloadFileAsync(url, localFile);
      await Sharing.shareAsync(downloaded.uri);
    } catch (error) {
      Alert.alert(
        'Could not share this keepsake',
        error instanceof Error ? error.message : 'Try again.',
      );
    } finally {
      if (downloaded?.exists) downloaded.delete();
    }
  }

  function reportCurrent() {
    const item = media[activeIndex];
    if (!item) return;
    Alert.alert(
      'Report this keepsake?',
      'Let us know if this media should be reviewed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: () => {
            void submitReport({
              reportedLog: item.log_id,
              reason: 'inappropriate',
              details: `Keepsake slot: ${item.slot}`,
            }).catch((error: unknown) => {
              Alert.alert(
                'Could not send report',
                error instanceof Error ? error.message : 'Try again.',
              );
            });
          },
        },
      ],
    );
  }

  function confirmDelete() {
    const item = media[activeIndex];
    if (!item?.id || !onDelete) return;
    Alert.alert(
      'Remove this keepsake?',
      'The media will be removed from this log.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onDelete(item.id!),
        },
      ],
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={onDismiss}
      onShow={() => {
        const index = Math.min(initialIndex, Math.max(media.length - 1, 0));
        setActiveIndex(index);
        if (media.length > 0) {
          requestAnimationFrame(() =>
            listRef.current?.scrollToOffset({
              offset: width * index,
              animated: false,
            }),
          );
        }
      }}
      statusBarTranslucent
    >
      <View style={[styles.root, { backgroundColor: colors.ink }]}>
        <View style={[styles.toolbar, { paddingTop: spacing.xl }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close keepsake viewer"
            onPress={onDismiss}
            style={styles.toolbarButton}
          >
            <ArrowLeft size={22} color={colors.surface} />
          </Pressable>
          <Text variant="mono" style={{ color: colors.surface }}>
            {media[activeIndex] ? SLOT_NAMES[media[activeIndex].slot] : ''}
          </Text>
          <View style={styles.toolbarActions}>
            {isOwner ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Share keepsake"
                  onPress={() => void shareCurrent()}
                  style={styles.toolbarButton}
                >
                  <Share2 size={20} color={colors.surface} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete keepsake"
                  onPress={confirmDelete}
                  style={styles.toolbarButton}
                >
                  <Trash2 size={20} color={colors.surface} />
                </Pressable>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Report keepsake"
                onPress={reportCurrent}
                style={styles.toolbarButton}
              >
                <Flag size={20} color={colors.surface} />
              </Pressable>
            )}
          </View>
        </View>
        <FlatList
          ref={listRef}
          data={media}
          horizontal
          pagingEnabled
          initialScrollIndex={Math.min(
            initialIndex,
            Math.max(media.length - 1, 0),
          )}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          keyExtractor={(item) => `${item.log_id}:${item.slot}`}
          onMomentumScrollEnd={(event) => {
            setActiveIndex(
              Math.round(event.nativeEvent.contentOffset.x / width),
            );
          }}
          renderItem={({ item, index }) => (
            <ViewerSlide
              item={item}
              url={signedUrls.data?.[item.storage_path]}
              onExpired={refreshExpiredUrl}
              active={visible && activeIndex === index}
              width={width}
              height={height}
            />
          )}
        />
        {media[activeIndex]?.caption ? (
          <Text
            variant="mono"
            style={[styles.caption, { color: colors.surface }]}
          >
            {media[activeIndex]?.caption}
          </Text>
        ) : null}
      </View>
    </Modal>
  );
}

function ViewerSlide({
  item,
  url,
  onExpired,
  active,
  width,
  height,
}: {
  item: ViewerMedia;
  url?: string;
  onExpired: () => void;
  active: boolean;
  width: number;
  height: number;
}) {
  const { colors } = useTheme();
  if (item.kind === 'video') {
    return (
      <VideoSlide
        url={url}
        posterUrl={item.poster_url}
        active={active}
        width={width}
        height={height}
      />
    );
  }
  return (
    <View style={[styles.slide, { width, height }]}>
      {url ? (
        <ZoomablePhoto url={url} onExpired={onExpired} />
      ) : (
        <Text variant="caption" style={{ color: colors.surface }}>
          Loading keepsake…
        </Text>
      )}
    </View>
  );
}

function ZoomablePhoto({
  url,
  onExpired,
}: {
  url: string;
  onExpired: () => void;
}) {
  const scale = useSharedValue(1);
  const gesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(1, Math.min(4, event.scale));
    })
    .onEnd(() => {
      if (scale.value < 1.05) scale.value = 1;
    });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.zoomImage, animatedStyle]}>
        <Image
          source={{ uri: url }}
          style={styles.fullImage}
          contentFit="contain"
          cachePolicy="disk"
          onError={onExpired}
        />
      </Animated.View>
    </GestureDetector>
  );
}

function VideoSlide({
  url,
  posterUrl,
  active,
  width,
  height,
}: {
  url?: string;
  posterUrl?: string | null;
  active: boolean;
  width: number;
  height: number;
}) {
  const { colors } = useTheme();
  const player = useVideoPlayer(url ?? null, (videoPlayer) => {
    videoPlayer.muted = true;
  });
  const [muted, setMuted] = useState(true);
  const [unplayableUrl, setUnplayableUrl] = useState<string | null>(null);
  const unplayable = Boolean(url) && unplayableUrl === url;

  useEffect(() => {
    const subscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'error' && url) setUnplayableUrl(url);
    });
    if (!active) player.pause();
    return () => {
      subscription.remove();
      player.pause();
    };
  }, [active, player, url]);

  function openOriginal() {
    if (!url) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    void Linking.openURL(url).catch((error: unknown) => {
      Alert.alert(
        'Could not open this video',
        error instanceof Error ? error.message : 'Try downloading it instead.',
      );
    });
  }

  return (
    <View style={[styles.slide, { width, height }]}>
      {unplayable ? (
        <View
          accessibilityRole="alert"
          style={[styles.unplayable, { backgroundColor: colors.bgSunken }]}
        >
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={styles.fullImage}
              contentFit="contain"
            />
          ) : null}
          <Text variant="body" weight="semibold" center>
            This video cannot be played in this browser
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={openOriginal}
            style={[
              styles.openOriginalButton,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text variant="label" weight="semibold">
              Open original / Download
            </Text>
          </Pressable>
        </View>
      ) : url ? (
        <VideoView
          player={player}
          style={styles.fullImage}
          nativeControls
          contentFit="contain"
        />
      ) : (
        <Text variant="caption" style={{ color: colors.surface }}>
          Loading reel…
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={muted ? 'Unmute reel' : 'Mute reel'}
        onPress={() => {
          setPlayerMuted(player, !muted);
          setMuted(!muted);
        }}
        style={[styles.unmuteButton, { backgroundColor: colors.surface }]}
      >
        {muted ? (
          <VolumeOff size={18} color={colors.ink} />
        ) : (
          <Volume2 size={18} color={colors.ink} />
        )}
      </Pressable>
    </View>
  );
}

function setPlayerMuted(player: VideoPlayer, muted: boolean): void {
  player.muted = muted;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  toolbarActions: { flexDirection: 'row', gap: spacing.sm },
  toolbarButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  slide: { alignItems: 'center', justifyContent: 'center' },
  zoomImage: { width: '100%', height: '100%' },
  fullImage: { width: '100%', height: '100%' },
  unplayable: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
    width: '100%',
  },
  openOriginalButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  unmuteButton: {
    alignItems: 'center',
    borderWidth: 2,
    bottom: spacing.xl,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    position: 'absolute',
    right: spacing.lg,
  },
  caption: { padding: spacing.md, textAlign: 'center' },
});

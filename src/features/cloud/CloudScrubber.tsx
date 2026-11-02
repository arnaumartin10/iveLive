import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Pause, Play, RotateCcw } from 'lucide-react-native';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../theme/ThemeProvider';

export type CloudScrubberProps = {
  progress: number; // 0.0 to 1.0
  onProgressChange: (progress: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: 1 | 2 | 4;
  onCycleSpeed: () => void;
  currentYearLabel: string;
  totalArtistsCount: number;
  revealedArtistsCount: number;
  onReset?: () => void;
  reduceMotion?: boolean;
};

export function CloudScrubber({
  progress,
  onProgressChange,
  isPlaying,
  onTogglePlay,
  speed,
  onCycleSpeed,
  currentYearLabel,
  totalArtistsCount,
  revealedArtistsCount,
  onReset,
  reduceMotion = false,
}: CloudScrubberProps) {
  const { colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(1);
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;

    let playAnimId: number | null = null;
    let lastTime = performance.now();

    // Base duration: 12 seconds for full scrubber at 1x
    const baseDurationMs = 12000;
    const effectiveDurationMs = baseDurationMs / speed;

    const step = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;

      const increment = delta / effectiveDurationMs;
      const nextProgress = Math.min(1, progressRef.current + increment);
      progressRef.current = nextProgress;

      if (nextProgress >= 1) {
        onProgressChange(1);
        onTogglePlay(); // Stop at end
      } else {
        onProgressChange(nextProgress);
        playAnimId = requestAnimationFrame(step);
      }
    };

    playAnimId = requestAnimationFrame(step);
    return () => {
      if (playAnimId != null) {
        cancelAnimationFrame(playAnimId);
      }
    };
  }, [isPlaying, onProgressChange, onTogglePlay, speed]);

  const handleTogglePlay = useCallback(() => {
    if (!isPlaying && progress >= 0.999) {
      onProgressChange(0);
    }
    onTogglePlay();
  }, [isPlaying, onProgressChange, onTogglePlay, progress]);

  const handleSeek = useCallback(
    (x: number) => {
      const width = Math.max(1, trackWidth);
      const ratio = Math.max(0, Math.min(1, x / width));
      onProgressChange(ratio);
    },
    [onProgressChange, trackWidth],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onUpdate((event) => {
          handleSeek(event.x);
        }),
    [handleSeek],
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .onEnd((event) => {
          handleSeek(event.x);
        }),
    [handleSeek],
  );

  const scrubberGestures = useMemo(
    () => Gesture.Race(panGesture, tapGesture),
    [panGesture, tapGesture],
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.labelSection}>
          <Text variant="caption" color="secondary" weight="medium">
            Time Travel Archive
          </Text>
          <Text variant="mono" weight="bold" style={styles.yearDisplay}>
            {currentYearLabel}
          </Text>
        </View>

        <View style={styles.statusSection}>
          <Text variant="caption" color="secondary">
            {revealedArtistsCount} / {totalArtistsCount} artists
          </Text>
        </View>

        <View style={styles.controlsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Playback speed ${speed}x`}
            onPress={onCycleSpeed}
            style={[styles.speedBtn, { borderColor: colors.line, backgroundColor: colors.surfaceRaised }]}
          >
            <Text style={styles.speedBtnText} weight="bold">
              {speed}x
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause time travel' : 'Play time travel'}
            onPress={handleTogglePlay}
            style={[styles.playBtn, { backgroundColor: colors.accent }]}
          >
            {isPlaying ? (
              <Pause size={14} color={colors.accentInk} fill={colors.accentInk} />
            ) : (
              <Play size={14} color={colors.accentInk} fill={colors.accentInk} style={{ marginLeft: 1 }} />
            )}
          </Pressable>

          {progress < 0.999 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset to full cloud"
              onPress={() => onProgressChange(1)}
              style={[styles.resetBtn, { borderColor: colors.line }]}
              hitSlop={6}
            >
              <RotateCcw size={14} color={colors.inkMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <GestureDetector gesture={scrubberGestures}>
        <View
          style={styles.trackTouchArea}
          onLayout={(e) => {
            setTrackWidth(e.nativeEvent.layout.width);
          }}
        >
          <View style={[styles.trackBg, { backgroundColor: colors.line }]}>
            <View
              style={[
                styles.trackFill,
                {
                  width: `${Math.max(0, Math.min(100, progress * 100))}%`,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>
          <View
            style={[
              styles.thumb,
              {
                left: `${Math.max(0, Math.min(100, progress * 100))}%`,
                backgroundColor: colors.surface,
                borderColor: colors.accent,
              },
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelSection: {
    gap: 1,
  },
  yearDisplay: {
    fontSize: 15,
  },
  statusSection: {
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speedBtn: {
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedBtnText: {
    fontSize: 11,
  },
  playBtn: {
    width: 28,
    height: 28,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtn: {
    width: 28,
    height: 28,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackTouchArea: {
    height: 26,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    height: 5,
    borderRadius: 0,
    overflow: 'hidden',
    width: '100%',
  },
  trackFill: {
    height: '100%',
    borderRadius: 0,
  },
  thumb: {
    position: 'absolute',
    top: 5,
    width: 16,
    height: 16,
    borderRadius: 0,
    borderWidth: 2,
    marginLeft: -8,
  },
});

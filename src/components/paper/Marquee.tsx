import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  AccessibilityInfo,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../ui/Text';

export interface MarqueeProps {
  text: string;
  repeat?: number;
  speed?: number; // duration in ms for one full cycle
  style?: ViewStyle;
}

export function Marquee({
  text,
  repeat = 6,
  speed = 12000,
  style,
}: MarqueeProps) {
  const { colors } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [scrollAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const anim = Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: -200,
        duration: speed,
        useNativeDriver: true,
      }),
    );
    anim.start();

    return () => {
      anim.stop();
    };
  }, [reduceMotion, scrollAnim, speed]);

  const repeatedString = Array(repeat).fill(text).join('   ✦   ');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.ink,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.textRow,
          !reduceMotion && {
            transform: [{ translateX: scrollAnim }],
          },
        ]}
      >
        <Text variant="mono" style={[styles.monoText, { color: colors.ink }]}>
          {repeatedString}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 32,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textRow: {
    flexDirection: 'row',
  },
  monoText: {
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});

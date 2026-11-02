/**
 * PAPER & INK — SegmentedControl (Taped Tabs)
 *
 * Tab segments styled like taped tabs on paper:
 * 1.5px ink border track, translucent taped active tab indicator, hard shadow.
 */
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spring, hardShadow } from '../../theme/tokens';
import { wheatTints, mauveTints } from '../../theme/palette';
import { Text } from './Text';

export type SegmentOption = { label: string; value: string };

type SegmentedControlProps = {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
};

export function SegmentedControl({
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  const { colors, scheme } = useTheme();
  const [width, setWidth] = useState(0);
  const offset = useSharedValue(0);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const itemWidth = options.length ? width / options.length : 0;

  useEffect(() => {
    offset.value = withSpring(selectedIndex * itemWidth, spring.paper);
  }, [itemWidth, offset, selectedIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(Math.max(0, event.nativeEvent.layout.width - 8));
  }

  const tapeColor = scheme === 'dark' ? mauveTints[300] : wheatTints[200];

  return (
    <View
      accessible
      accessibilityRole="radiogroup"
      onLayout={handleLayout}
      style={[
        styles.track,
        hardShadow.sm,
        {
          backgroundColor: colors.bgSunken,
          borderColor: colors.ink,
        },
      ]}
    >
      {itemWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            indicatorStyle,
            {
              backgroundColor: tapeColor,
              borderColor: colors.ink,
              width: itemWidth,
            },
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={styles.option}
          >
            <Text
              variant="label"
              style={[
                styles.label,
                {
                  color: selected ? colors.ink : colors.inkMuted,
                  fontWeight: selected ? '700' : '500',
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: radius.sm,
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 44,
    padding: 3,
    position: 'relative',
  },
  indicator: {
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderStyle: 'solid',
    bottom: 3,
    left: 4,
    position: 'absolute',
    top: 3,
  },
  option: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    zIndex: 1,
  },
  label: {
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

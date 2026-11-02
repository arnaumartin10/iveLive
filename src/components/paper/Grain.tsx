import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';

export function Grain({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();

  return (
    <View pointerEvents="none" style={[styles.container, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="paper-grain-tile"
            width={24}
            height={24}
            patternUnits="userSpaceOnUse"
          >
            <Circle cx={3} cy={5} r={0.7} fill={colors.ink} />
            <Circle cx={12} cy={2} r={0.5} fill={colors.ink} />
            <Circle cx={20} cy={8} r={0.65} fill={colors.ink} />
            <Circle cx={7} cy={16} r={0.55} fill={colors.ink} />
            <Circle cx={17} cy={20} r={0.7} fill={colors.ink} />
            <Circle cx={23} cy={15} r={0.45} fill={colors.ink} />
          </Pattern>
        </Defs>
        <Rect
          width="100%"
          height="100%"
          fill="url(#paper-grain-tile)"
          opacity={0.16}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});

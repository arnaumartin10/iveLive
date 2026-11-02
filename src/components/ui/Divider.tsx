import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  inset?: number;
  color?: string;
  hasTicks?: boolean;
  style?: ViewStyle;
}

export function Divider({
  orientation = 'horizontal',
  inset = 0,
  color,
  hasTicks = false,
  style,
}: DividerProps) {
  const { colors } = useTheme();
  const ruleColor = color ?? colors.line;

  if (hasTicks && orientation === 'horizontal') {
    return (
      <View style={[styles.ticksContainer, { marginHorizontal: inset }, style]}>
        <Svg height={6} width="100%">
          {/* Main printed rule */}
          <Line x1="0" y1="3" x2="1000" y2="3" stroke={ruleColor} strokeWidth={1.5} />
          {/* Edge ticks */}
          <Line x1="1" y1="0" x2="1" y2="6" stroke={ruleColor} strokeWidth={1.5} />
          <Line x1="40" y1="1" x2="40" y2="5" stroke={ruleColor} strokeWidth={1} />
        </Svg>
      </View>
    );
  }

  const baseStyle: ViewStyle =
    orientation === 'horizontal'
      ? { height: 1.5, marginHorizontal: inset }
      : { width: 1.5, marginVertical: inset };

  return <View style={[baseStyle, { backgroundColor: ruleColor }, style]} />;
}

// Rule alias for Paper & Ink printed line
export const Rule = Divider;

const styles = StyleSheet.create({
  ticksContainer: {
    height: 6,
    justifyContent: 'center',
    marginVertical: 4,
    overflow: 'hidden',
  },
});

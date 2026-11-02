import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { mauveTints, wheatTints } from '../../theme/palette';
import { getSeededRotation } from './hash';

export interface TapeProps {
  id?: string;
  width?: number;
  height?: number;
  color?: string;
  style?: ViewStyle;
  tilt?: boolean;
}

export function Tape({
  id = 'tape',
  width = 70,
  height = 18,
  color,
  style,
  tilt = true,
}: TapeProps) {
  const { colors, scheme } = useTheme();
  const rotation = tilt ? getSeededRotation(id, 4) : 0;
  const tapeColor = color || (scheme === 'dark' ? mauveTints[300] : wheatTints[200]);

  return (
    <View
      style={[
        styles.tape,
        {
          width,
          height,
          backgroundColor: tapeColor,
          opacity: 0.85,
          borderColor: colors.line,
          transform: [{ rotate: `${rotation}deg` }],
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  tape: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderStyle: 'dashed',
    zIndex: 20,
  },
});

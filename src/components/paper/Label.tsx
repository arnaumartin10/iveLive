import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../ui/Text';
import { hardShadow } from '../../theme/tokens';
import { getSeededRotation } from './hash';

export interface LabelProps {
  id?: string;
  text: string;
  color?: 'accent' | 'ink' | 'slate' | 'mauve';
  tilt?: boolean;
  style?: ViewStyle;
}

export function Label({
  id = 'label',
  text,
  color = 'accent',
  tilt = true,
  style,
}: LabelProps) {
  const { colors } = useTheme();
  const rotation = tilt ? getSeededRotation(id, 2) : 0;

  const bgMap = {
    accent: colors.accent,
    ink: colors.ink,
    slate: colors.positive,
    mauve: colors.surfaceRaised,
  };

  const textMap = {
    accent: colors.accentInk,
    ink: colors.accentInk,
    slate: colors.accentInk,
    mauve: colors.ink,
  };

  return (
    <View
      style={[
        styles.wrap,
        hardShadow.sm,
        {
          backgroundColor: bgMap[color],
          borderColor: colors.ink,
          transform: [{ rotate: `${rotation}deg` }],
        },
        style,
      ]}
    >
      <Text
        variant="label"
        style={[
          styles.text,
          {
            color: textMap[color],
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1.5,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 1,
  },
});

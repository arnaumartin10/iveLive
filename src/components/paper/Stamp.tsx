import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../ui/Text';
import { getSeededRotation } from './hash';

export interface StampProps {
  id?: string;
  label?: string;
  children?: React.ReactNode;
  variant?: 'orange' | 'slate' | 'mauve' | 'violet';
  style?: ViewStyle;
  tilt?: boolean;
  shape?: 'rect' | 'circle' | 'scalloped';
}

export function Stamp({
  id = 'stamp',
  label,
  children,
  variant = 'orange',
  style,
  tilt = true,
  shape = 'rect',
}: StampProps) {
  const { colors } = useTheme();
  const rotation = tilt ? getSeededRotation(id, 2.5) : 0;

  const colorVariants = {
    orange: { border: colors.accent, text: colors.accent, bg: 'transparent' },
    slate:  { border: colors.positive, text: colors.positive, bg: 'transparent' },
    mauve:  { border: colors.inkMuted, text: colors.inkMuted, bg: 'transparent' },
    violet: { border: colors.ink, text: colors.ink, bg: 'transparent' },
  };

  const currentVariant = colorVariants[variant] || colorVariants.orange;

  return (
    <View
      style={[
        styles.stampWrap,
        {
          transform: [{ rotate: `${rotation}deg` }],
        },
        style,
      ]}
    >
      <View
        style={[
          styles.stampBorder,
          shape === 'circle' && styles.circle,
          {
            borderColor: currentVariant.border,
            backgroundColor: currentVariant.bg,
          },
        ]}
      >
        {children ? (
          children
        ) : label ? (
          <Text
            variant="label"
            style={[
              styles.labelText,
              {
                color: currentVariant.text,
              },
            ]}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stampWrap: {
    alignSelf: 'flex-start',
  },
  stampBorder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  labelText: {
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});

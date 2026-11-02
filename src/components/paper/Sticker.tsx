import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { hardShadow } from '../../theme/tokens';
import { RAW } from '../../theme/palette';
import { getSeededRotation } from './hash';

export interface StickerProps {
  id?: string;
  size?: number;
  children: React.ReactNode;
  style?: ViewStyle;
  tilt?: boolean;
  accessible?: boolean;
  accessibilityLabel?: string;
}

export function Sticker({
  id = 'sticker',
  size = 48,
  children,
  style,
  tilt = true,
  accessible,
  accessibilityLabel,
}: StickerProps) {
  const { colors } = useTheme();
  const rotation = tilt ? getSeededRotation(id, 3) : 0;

  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.outer,
        hardShadow.sm,
        {
          width: size + 6,
          height: size + 6,
          transform: [{ rotate: `${rotation}deg` }],
        },
        style,
      ]}
    >
      <View
        style={[
          styles.borderWrap,
          {
            width: size + 6,
            height: size + 6,
            borderRadius: (size + 6) / 2,
            backgroundColor: RAW.wheat, // thick die-cut wheat border
            borderColor: colors.ink,
          },
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  borderWrap: {
    padding: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inner: {
    overflow: 'hidden',
  },
});

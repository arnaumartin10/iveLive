import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
} from 'react-native';
import { palette, fontFamily, fontSize } from '@theme/tokens';

type Variant =
  | 'display'
  | 'headline'
  | 'title'
  | 'subtitle'
  | 'base'
  | 'body'
  | 'caption'
  | 'label'
  | 'overline';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'black';
type Color = 'primary' | 'secondary' | 'muted' | 'crimson' | 'amber' | 'steel' | 'inverse';

interface TextProps extends RNTextProps {
  variant?: Variant;
  weight?: Weight;
  color?: Color;
  center?: boolean;
}

const colorMap: Record<Color, string> = {
  primary: palette.textPrimary,
  secondary: palette.textSecondary,
  muted: palette.muted,
  crimson: palette.crimson,
  amber: palette.amber,
  steel: palette.steel,
  inverse: palette.navy,
};

const variantStyles: Record<Variant, { fontSize: number; fontFamily: string; lineHeight: number }> =
  {
    display: { fontSize: fontSize['4xl'], fontFamily: fontFamily.black, lineHeight: fontSize['4xl'] * 1.1 },
    headline: { fontSize: fontSize['2xl'], fontFamily: fontFamily.bold, lineHeight: fontSize['2xl'] * 1.2 },
    title: { fontSize: fontSize.xl, fontFamily: fontFamily.bold, lineHeight: fontSize.xl * 1.25 },
    subtitle: { fontSize: fontSize.lg, fontFamily: fontFamily.semibold, lineHeight: fontSize.lg * 1.35 },
    base: { fontSize: fontSize.base, fontFamily: fontFamily.regular, lineHeight: fontSize.base * 1.5 },
    body: { fontSize: fontSize.base, fontFamily: fontFamily.regular, lineHeight: fontSize.base * 1.5 },
    caption: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, lineHeight: fontSize.sm * 1.45 },
    label: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, lineHeight: fontSize.sm * 1.3 },
    overline: { fontSize: fontSize.xs, fontFamily: fontFamily.semibold, lineHeight: fontSize.xs * 1.4 },
  };

export function Text({
  variant = 'body',
  weight,
  color = 'primary',
  center,
  style,
  ...props
}: TextProps) {
  const vStyle = variantStyles[variant];
  const fontFamilyOverride = weight ? fontFamily[weight] : vStyle.fontFamily;

  return (
    <RNText
      style={[
        styles.base,
        {
          fontSize: vStyle.fontSize,
          fontFamily: fontFamilyOverride,
          lineHeight: vStyle.lineHeight,
          color: colorMap[color],
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});

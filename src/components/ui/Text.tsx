/**
 * PAPER & INK — Text component
 *
 * Uses Young Serif for display/headline, Schibsted Grotesk for UI text,
 * DM Mono for data, dates, counters, and labels.
 *
 * Variants map directly to typeScale entries.
 */
import {
  StyleSheet,
  Text as RNText,
  type TextProps as RNTextProps,
} from 'react-native';
import { fontFamily, typeScale } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import type { SemanticColors } from '../../theme/tokens';

type Variant =
  | 'display'
  | 'headline'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'caption'
  | 'label'
  | 'overline'
  | 'mono';

type Weight = keyof typeof fontFamily;

type Color =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'inverse'
  | 'accent'
  | 'accentInk'
  | 'positive'
  | 'danger'
  | 'warning'
  // Legacy compat
  | 'crimson'
  | 'amber'
  | 'steel'
  | keyof SemanticColors;

export interface TextProps extends RNTextProps {
  variant?: Variant;
  weight?: Weight;
  color?: Color;
  center?: boolean;
}

export function Text({
  variant = 'body',
  weight,
  color = 'primary',
  center,
  style,
  ...props
}: TextProps) {
  const { colors } = useTheme();
  const preset = typeScale[variant] ?? typeScale.body;

  const colorMap: Record<string, string> = {
    // Fall through to any direct color token
    ...colors,
    // Semantic roles
    primary:    colors.ink,
    secondary:  colors.inkMuted,
    muted:      colors.inkMuted,
    inverse:    colors.accentInk,
    accent:     colors.accentText,
    positive:   colors.positiveText,
    warning:    colors.warningText,
    danger:     colors.dangerText,
    // Legacy compat
    crimson:    colors.accentText,
    amber:      colors.accentText,
    steel:      colors.inkMuted,
  };

  const resolvedColor = colorMap[color] ?? colors.ink;
  const flattenedStyle = StyleSheet.flatten(style);
  const inlineTextColor = flattenedStyle?.color;
  const safeInlineColor =
    inlineTextColor === colors.accent
      ? colors.accentText
      : inlineTextColor === colors.positive
        ? colors.positiveText
        : inlineTextColor === colors.warning
          ? colors.warningText
          : inlineTextColor === colors.danger
            ? colors.dangerText
            : null;
  const resolvedStyle =
    safeInlineColor && flattenedStyle
      ? { ...flattenedStyle, color: safeInlineColor }
      : style;

  return (
    <RNText
      style={[
        styles.base,
        {
          color:      resolvedColor,
          fontFamily: weight ? fontFamily[weight] : preset.fontFamily,
          fontSize:   preset.fontSize,
          lineHeight: preset.lineHeight,
          letterSpacing: 'letterSpacing' in preset ? (preset as any).letterSpacing : undefined,
          textTransform: center ? undefined : ('textTransform' in preset ? (preset as any).textTransform : undefined),
          textAlign:  center ? 'center' : undefined,
        },
        resolvedStyle,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
});

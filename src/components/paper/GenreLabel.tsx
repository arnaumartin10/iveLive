import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import {
  fontFamily,
  hardShadow,
  colors as themeColors,
  type ColorScheme,
} from '../../theme/tokens';
import {
  MACRO_GENRES,
  type MacroGenre,
} from '../../features/genres/macroGenres';
import { VENUE_TYPES, type VenueType } from '../../features/venues/venueTypes';
import {
  labelColors,
  type LabelSurface,
} from '../../features/genres/labelColors';
import { RAW } from '../../theme/palette';
import { Text } from '../ui/Text';
import { PatternFill } from './PatternFill';

export type LabelSize = 'xs' | 'sm' | 'md';
export type LabelVariant = 'solid' | 'outline' | 'stamp';

type LabelMetrics = {
  swatch: number;
  gap: number;
  horizontal: number;
  vertical: number;
  fontSize: number;
  lineHeight: number;
};

export const MIN_LABEL_FONT_SIZE = 11;
const SIZE_METRICS: Record<LabelSize, LabelMetrics> = {
  xs: {
    swatch: 14,
    gap: 5,
    horizontal: 7,
    vertical: 3,
    fontSize: MIN_LABEL_FONT_SIZE,
    lineHeight: 14,
  },
  sm: {
    swatch: 18,
    gap: 6,
    horizontal: 8,
    vertical: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  md: {
    swatch: 24,
    gap: 8,
    horizontal: 10,
    vertical: 6,
    fontSize: 14,
    lineHeight: 18,
  },
};

type PlateColors = ReturnType<typeof labelColors>;

function LabelPlate({
  children,
  label,
  size = 'sm',
  variant = 'solid',
  colors,
  style,
}: {
  children: React.ReactNode;
  label: string;
  size?: LabelSize;
  variant?: LabelVariant;
  colors: PlateColors;
  style?: StyleProp<ViewStyle>;
}) {
  const metrics = SIZE_METRICS[size];
  const useOutline = variant === 'outline' && colors.outlineAllowed;
  const stamp = variant === 'stamp';
  const plateColor = useOutline ? 'transparent' : colors.plate;
  const inkColor = useOutline ? colors.outline : colors.ink;

  return (
    <View
      accessibilityRole="text"
      style={[
        styles.plate,
        stamp ? hardShadow.md : hardShadow.sm,
        {
          backgroundColor: plateColor,
          borderColor: useOutline ? colors.outline : colors.solidOutline,
          borderWidth: stamp ? 2 : 1.5,
          gap: metrics.gap,
          paddingHorizontal: metrics.horizontal,
          paddingVertical: metrics.vertical,
        },
        style,
      ]}
    >
      {children}
      <Text
        variant="label"
        weight="monoMedium"
        numberOfLines={1}
        style={{
          color: inkColor,
          fontFamily: fontFamily.monoMedium,
          fontSize: metrics.fontSize,
          lineHeight: metrics.lineHeight,
          letterSpacing: size === 'xs' ? 0.6 : size === 'sm' ? 0.9 : 1.1,
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function GenreLabel({
  genre,
  label,
  size = 'sm',
  variant = 'solid',
  surface = 'surface',
  schemeOverride,
  style,
}: {
  genre: MacroGenre;
  label?: string;
  size?: LabelSize;
  variant?: LabelVariant;
  surface?: LabelSurface;
  schemeOverride?: ColorScheme;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: contextColors } = useTheme();
  const theme = schemeOverride ? themeColors[schemeOverride] : contextColors;
  const metrics = SIZE_METRICS[size];
  const definition = MACRO_GENRES[genre];
  const selection = labelColors(genre, theme, surface);
  return (
    <LabelPlate
      size={size}
      variant={variant}
      colors={selection}
      label={label ?? definition.label}
      style={style}
    >
      <View
        style={[
          styles.swatchFrame,
          {
            backgroundColor: selection.swatchKeyline,
            borderColor: selection.swatchKeyline,
          },
        ]}
      >
        <PatternFill
          pattern={definition.pattern}
          colorA={RAW[definition.inkA]}
          colorB={RAW[definition.inkB]}
          width={metrics.swatch}
          height={metrics.swatch}
          style={{
            ...styles.swatch,
            borderColor: selection.swatchInkKeyline,
            backgroundColor: selection.swatchInkKeyline,
          }}
        />
      </View>
    </LabelPlate>
  );
}

export function VenueLabel({
  venue,
  label,
  size = 'sm',
  variant = 'solid',
  surface = 'surface',
  schemeOverride,
  style,
}: {
  venue: VenueType;
  label?: string;
  size?: LabelSize;
  variant?: LabelVariant;
  surface?: LabelSurface;
  schemeOverride?: ColorScheme;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: contextColors } = useTheme();
  const theme = schemeOverride ? themeColors[schemeOverride] : contextColors;
  const selection = labelColors(venue, theme, surface);
  const Icon = VENUE_TYPES[venue].icon;
  const iconColor =
    variant === 'outline' && selection.outlineAllowed
      ? selection.outline
      : selection.ink;

  return (
    <LabelPlate
      size={size}
      variant={variant}
      colors={selection}
      label={label ?? VENUE_TYPES[venue].shortLabel}
      style={style}
    >
      <Icon
        size={SIZE_METRICS[size].swatch}
        color={iconColor}
        strokeWidth={2}
      />
    </LabelPlate>
  );
}

const styles = StyleSheet.create({
  plate: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
    maxWidth: '100%',
    borderRadius: 2,
    overflow: 'visible',
  },
  swatchFrame: {
    borderWidth: 1,
    padding: 1,
  },
  swatch: {
    borderWidth: 1,
  },
});

import {
  getContrastRatio,
  getLuminance,
  RAW,
  type SemanticColors,
} from '../../theme/palette';
import { MACRO_GENRES, type MacroGenre } from './macroGenres';
import { VENUE_TYPES, type VenueType } from '../venues/venueTypes';

export type LabelSurface = 'bg' | 'surface' | 'surfaceRaised' | 'sunken';

export type LabelColorSelection = {
  plate: string;
  ink: string;
  solidOutline: string;
  outline: string;
  swatchKeyline: string;
  swatchInkKeyline: string;
  outlineAllowed: boolean;
};

function getSurfaceColor(theme: SemanticColors, surface: LabelSurface): string {
  return surface === 'sunken' ? theme.bgSunken : theme[surface];
}

export function labelColors(
  genre: MacroGenre | VenueType,
  theme: SemanticColors,
  surface: LabelSurface,
): LabelColorSelection {
  const identityColor =
    genre in MACRO_GENRES
      ? MACRO_GENRES[genre as MacroGenre].color
      : VENUE_TYPES[genre as VenueType].primaryColor;
  const pageColor = getSurfaceColor(theme, surface);
  const pageIsDark = getLuminance(pageColor) < 0.35;

  const candidatePairs = [
    {
      plate: pageIsDark ? RAW.wheat : theme.ink,
      ink: pageIsDark ? RAW.violet : RAW.wheat,
    },
    {
      plate: pageIsDark ? theme.bgSunken : theme.surface,
      ink: pageIsDark ? theme.ink : theme.bg,
    },
    {
      plate: pageIsDark ? theme.surfaceRaised : theme.surface,
      ink: pageIsDark ? theme.ink : theme.bg,
    },
    {
      plate: pageIsDark ? RAW.wheat : theme.surface,
      ink: pageIsDark ? RAW.violet : theme.ink,
    },
    {
      plate: pageIsDark ? theme.bgSunken : theme.surfaceRaised,
      ink: pageIsDark ? theme.ink : theme.ink,
    },
    { plate: theme.positive, ink: theme.positiveText },
    {
      plate: pageIsDark ? theme.bg : theme.surface,
      ink: pageIsDark ? theme.ink : theme.bg,
    },
    { plate: identityColor, ink: pageIsDark ? theme.surface : theme.bg },
    { plate: theme.accent, ink: theme.accentInk },
    { plate: theme.surfaceRaised, ink: theme.ink },
  ];

  const selected = candidatePairs.find(
    ({ plate, ink }) =>
      getContrastRatio(ink, plate) >= 4.5 &&
      getContrastRatio(plate, pageColor) >= 3,
  ) ?? { plate: RAW.wheat, ink: RAW.violet };

  const outlineCandidates = pageIsDark
    ? [theme.ink, RAW.violet, RAW.slate, theme.bgSunken, selected.ink]
    : [theme.bg, RAW.wheat, theme.surface, theme.accentText, selected.ink];
  const outline =
    outlineCandidates.find(
      (candidate) => getContrastRatio(candidate, pageColor) >= 4.5,
    ) ?? selected.ink;

  return {
    ...selected,
    solidOutline: selected.ink,
    outline,
    swatchKeyline:
      getContrastRatio(selected.plate, pageColor) >= 3
        ? selected.plate
        : outline,
    swatchInkKeyline: selected.ink,
    outlineAllowed: getContrastRatio(outline, pageColor) >= 4.5,
  };
}

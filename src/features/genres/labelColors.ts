import {
  getContrastRatio,
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
  const candidates = [
    { plate: theme.ink, ink: theme.bg },
    { plate: theme.ink, ink: theme.surface },
    { plate: theme.surface, ink: theme.ink },
    { plate: theme.ink, ink: theme.bgSunken },
    { plate: theme.bgSunken, ink: theme.ink },
    { plate: theme.positive, ink: theme.positiveText },
    { plate: theme.accent, ink: theme.accentInk },
    { plate: theme.surfaceRaised, ink: theme.ink },
    { plate: identityColor, ink: theme.surface },
    { plate: theme.bg, ink: theme.ink },
  ];
  const selected = candidates.find(
    ({ plate, ink }) =>
      getContrastRatio(ink, plate) >= 4.5 &&
      getContrastRatio(plate, pageColor) >= 3,
  ) ?? { plate: RAW.wheat, ink: RAW.violet };

  const outlineCandidates = [
    theme.ink,
    theme.accentText,
    theme.positiveText,
    theme.warningText,
    selected.ink,
  ];
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

import {
  MACRO_GENRES,
  type MacroGenre,
} from '../../features/genres/macroGenres';
import { getContrastRatio, RAW } from '../../theme/palette';

export type MascotRoleColors = {
  body: string;
  accent: string;
  outline: string;
  feature: string;
};

const paletteInks = Object.values(RAW);

export function isMacroGenre(value: string): value is MacroGenre {
  return Object.prototype.hasOwnProperty.call(MACRO_GENRES, value);
}

function highestContrastInk(background: string) {
  const ranked = paletteInks
    .map((ink) => ({ ink, contrast: getContrastRatio(ink, background) }))
    .sort((left, right) => right.contrast - left.contrast);
  const best = ranked[0];

  if (!best || best.contrast < 3) {
    throw new Error(`No palette ink meets 3:1 contrast against ${background}.`);
  }

  return best.ink;
}

export function resolveMascotColors(
  genre: MacroGenre,
  background: string,
): MascotRoleColors {
  const definition = MACRO_GENRES[genre];
  const contrastingInk = highestContrastInk(background);

  return {
    body: RAW[definition.inkA],
    accent: RAW[definition.inkB],
    outline: contrastingInk,
    feature: contrastingInk,
  };
}

export function getMascotTilt(id: string) {
  let hash = 0;
  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return (Math.abs(hash) % 7) - 3;
}

export const MASCOT_MOODS = [
  'happy',
  'listening',
  'hyped',
  'sleepy',
  'sad',
  'celebrate',
] as const;

export type MascotMood = (typeof MASCOT_MOODS)[number];

export function resolveMascotMood(_mood: MascotMood): 'neutral' {
  return 'neutral';
}

import { RAW, type PaletteAnchor } from '../../theme/palette';

export type GenrePattern =
  | 'dots'
  | 'stripes'
  | 'checker'
  | 'waves'
  | 'grid'
  | 'rays'
  | 'diamonds'
  | 'crosshatch'
  | 'scallops'
  | 'zigzag'
  | 'scales'
  | 'herringbone'
  | 'mesh'
  | 'diagonal_bars'
  | 'none';

export type MacroGenreDefinition = {
  slug: string;
  label: string;
  pattern: GenrePattern;
  inkA: PaletteAnchor;
  inkB: PaletteAnchor;
  /** Primary ink color for single-color fallbacks */
  color: string;
};

export const MACRO_GENRES = {
  rock: {
    slug: 'rock',
    label: 'Rock',
    pattern: 'dots',
    inkA: 'orange',
    inkB: 'wheat',
    color: RAW.orange,
  },
  indie: {
    slug: 'indie',
    label: 'Indie',
    pattern: 'stripes',
    inkA: 'slate',
    inkB: 'wheat',
    color: RAW.slate,
  },
  pop: {
    slug: 'pop',
    label: 'Pop',
    pattern: 'checker',
    inkA: 'mauve',
    inkB: 'wheat',
    color: RAW.mauve,
  },
  electronic: {
    slug: 'electronic',
    label: 'Electronic',
    pattern: 'waves',
    inkA: 'violet',
    inkB: 'wheat',
    color: RAW.violet,
  },
  hip_hop: {
    slug: 'hip_hop',
    label: 'Hip-Hop',
    pattern: 'grid',
    inkA: 'orange',
    inkB: 'slate',
    color: RAW.orange,
  },
  rnb_soul: {
    slug: 'rnb_soul',
    label: 'R&B / Soul',
    pattern: 'rays',
    inkA: 'mauve',
    inkB: 'slate',
    color: RAW.mauve,
  },
  metal: {
    slug: 'metal',
    label: 'Metal',
    pattern: 'diamonds',
    inkA: 'violet',
    inkB: 'slate',
    color: RAW.violet,
  },
  punk: {
    slug: 'punk',
    label: 'Punk',
    pattern: 'crosshatch',
    inkA: 'orange',
    inkB: 'violet',
    color: RAW.orange,
  },
  folk_acoustic: {
    slug: 'folk_acoustic',
    label: 'Folk / Acoustic',
    pattern: 'scallops',
    inkA: 'wheat',
    inkB: 'slate',
    color: RAW.slate,
  },
  jazz_blues: {
    slug: 'jazz_blues',
    label: 'Jazz / Blues',
    pattern: 'zigzag',
    inkA: 'wheat',
    inkB: 'mauve',
    color: RAW.mauve,
  },
  latin: {
    slug: 'latin',
    label: 'Latin',
    pattern: 'scales',
    inkA: 'orange',
    inkB: 'mauve',
    color: RAW.orange,
  },
  classical: {
    slug: 'classical',
    label: 'Classical',
    pattern: 'herringbone',
    inkA: 'wheat',
    inkB: 'violet',
    color: RAW.violet,
  },
  world: {
    slug: 'world',
    label: 'World',
    pattern: 'mesh',
    inkA: 'slate',
    inkB: 'mauve',
    color: RAW.slate,
  },
  other: {
    slug: 'other',
    label: 'Other',
    pattern: 'diagonal_bars',
    inkA: 'mauve',
    inkB: 'violet',
    color: RAW.mauve,
  },
  unclassified: {
    slug: 'unclassified',
    label: 'Unclassified',
    pattern: 'none',
    inkA: 'mauve',
    inkB: 'mauve',
    color: RAW.mauve,
  },
} as const satisfies Record<string, MacroGenreDefinition>;

export type MacroGenre = keyof typeof MACRO_GENRES;
export type MacroGenreConfig = (typeof MACRO_GENRES)[MacroGenre];

export const MACRO_GENRE_ORDER = Object.keys(MACRO_GENRES).filter(
  (genre): genre is MacroGenre => genre !== 'unclassified',
);

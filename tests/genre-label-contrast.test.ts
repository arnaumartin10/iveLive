import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getContrastRatio, nightTheme, paperTheme } from '../src/theme/palette';
import {
  MACRO_GENRES,
  MACRO_GENRE_ORDER,
  type MacroGenre,
} from '../src/features/genres/macroGenres';
import {
  VENUE_TYPES,
  VENUE_TYPE_ORDER,
  type VenueType,
} from '../src/features/venues/venueTypes';
import {
  labelColors,
  type LabelSurface,
} from '../src/features/genres/labelColors';
import { MIN_LABEL_FONT_SIZE } from '../src/components/paper/GenreLabel';

const themes = [
  ['light', paperTheme],
  ['dark', nightTheme],
] as const;
const surfaces: LabelSurface[] = ['bg', 'surface', 'surfaceRaised', 'sunken'];
const sizes = ['xs', 'sm', 'md'] as const;
const variants = ['solid', 'outline', 'stamp'] as const;
const genres = [...MACRO_GENRE_ORDER, 'unclassified'] as MacroGenre[];

function expectContrastAtLeast(
  contrast: number,
  minimum: number,
  context: string,
) {
  if (!Number.isFinite(contrast) || contrast < minimum) {
    throw new Error(
      `${context}: ${contrast.toFixed(2)}:1 is below ${minimum}:1`,
    );
  }
}

describe('genre and venue label contrast', () => {
  it('keeps label text at 4.5:1 and swatch/outline edges at 3:1 across the full matrix', () => {
    for (const [themeName, theme] of themes) {
      for (const genre of genres) {
        for (const surface of surfaces) {
          const selection = labelColors(genre, theme, surface);
          const page = surface === 'sunken' ? theme.bgSunken : theme[surface];

          expectContrastAtLeast(
            getContrastRatio(selection.ink, selection.plate),
            4.5,
            `${themeName}/${genre}/${surface}/solid`,
          );
          expectContrastAtLeast(
            getContrastRatio(selection.solidOutline, selection.plate),
            3,
            `${themeName}/${genre}/${surface}/solid-outline`,
          );
          expectContrastAtLeast(
            getContrastRatio(selection.outline, page),
            3,
            `${themeName}/${genre}/${surface}/outline`,
          );
          expectContrastAtLeast(
            getContrastRatio(selection.swatchKeyline, page),
            3,
            `${themeName}/${genre}/${surface}/swatch-to-page`,
          );
          expectContrastAtLeast(
            getContrastRatio(selection.swatchInkKeyline, selection.plate),
            3,
            `${themeName}/${genre}/${surface}/swatch-to-plate`,
          );

          for (const size of sizes) {
            for (const variant of variants) {
              const rendersOutline =
                variant === 'outline' && selection.outlineAllowed;
              const textContrast = rendersOutline
                ? getContrastRatio(selection.outline, page)
                : getContrastRatio(selection.ink, selection.plate);
              expectContrastAtLeast(
                textContrast,
                4.5,
                `${themeName}/${genre}/${size}/${variant}/${surface}`,
              );
            }
          }
        }
      }
    }

    for (const [themeName, theme] of themes) {
      for (const venue of VENUE_TYPE_ORDER as VenueType[]) {
        for (const surface of surfaces) {
          const selection = labelColors(venue, theme, surface);
          const page = surface === 'sunken' ? theme.bgSunken : theme[surface];
          for (const size of sizes) {
            for (const variant of variants) {
              const rendersOutline =
                variant === 'outline' && selection.outlineAllowed;
              const textContrast = rendersOutline
                ? getContrastRatio(selection.outline, page)
                : getContrastRatio(selection.ink, selection.plate);
              expectContrastAtLeast(
                textContrast,
                4.5,
                `${themeName}/${venue}/${size}/${variant}/${surface}/venue`,
              );
            }
          }
        }
      }
    }
  });

  it('keeps the minimum label text size at 11pt mono', () => {
    expect(sizes).toContain('xs');
    expect(MIN_LABEL_FONT_SIZE).toBe(11);
    expect(MACRO_GENRES.unclassified.label).toBe('Unclassified');
  });
});

describe('pattern text source guard', () => {
  const roots = ['src/app', 'src/components', 'src/features'];
  const sourceFiles = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return /\.(?:ts|tsx)$/.test(path) ? [path] : [];
    });

  it('does not allow JSX text descendants inside PatternFill elements', () => {
    const openingPatternFillWithChildren =
      /<PatternFill\b[^>]*>([\s\S]*?)<\/PatternFill>/g;
    const patternFillChildrenProp = /<PatternFill\b[^>]*\bchildren\s*=/;

    for (const root of roots) {
      for (const file of sourceFiles(root)) {
        const source = readFileSync(file, 'utf8');
        if (
          openingPatternFillWithChildren.test(source) ||
          patternFillChildrenProp.test(source)
        ) {
          throw new Error(
            `Text or children rendered inside PatternFill: ${file}`,
          );
        }
      }
    }

    const patternFillSource = readFileSync(
      'src/components/paper/PatternFill.tsx',
      'utf8',
    );
    expect(patternFillSource).not.toMatch(/<Text\b/);
  });
});

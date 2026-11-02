import { MACRO_GENRES } from '../genres/macroGenres';
import type { AtlasTerritory } from './atlas';
import type { CloudArtistNode } from './simulation';

export type PosterFormat = 'print' | 'story';
export type PosterVariant = 'whole-world' | 'biggest-territory';

export type PosterRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PosterLayout = {
  width: number;
  height: number;
  margin: number;
  cartouche: PosterRect;
  map: PosterRect;
  legend: PosterRect;
  stats: PosterRect;
  titleSize: number;
  subtitleSize: number;
};

export function getPosterDimensions(format: PosterFormat) {
  return format === 'print'
    ? { width: 3000, height: 4200 }
    : { width: 1080, height: 1920 };
}

export function getPosterRenderPlan(
  format: PosterFormat,
  deviceMemoryBytes: number | null,
) {
  const requested = getPosterDimensions(format);
  if (
    format === 'print' &&
    deviceMemoryBytes !== null &&
    deviceMemoryBytes < 4 * 1024 * 1024 * 1024
  ) {
    return {
      dimensions: { width: 2000, height: 2800 },
      fellBack: true,
    };
  }
  return { dimensions: requested, fellBack: false };
}

export function calculatePosterLayout(
  width: number,
  height: number,
): PosterLayout {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new RangeError('Poster dimensions must be positive finite numbers.');
  }
  const margin = Math.round(width * 0.065);
  const contentWidth = width - margin * 2;
  const cartoucheY = Math.round(height * 0.055);
  const cartoucheHeight = Math.round(height * 0.105);
  const mapY = Math.round(height * 0.18);
  const mapHeight = Math.round(height * 0.52);
  const legendY = Math.round(height * 0.725);
  const legendHeight = Math.round(height * 0.12);
  const statsY = Math.round(height * 0.875);
  const statsHeight = Math.round(height * 0.075);
  return {
    width,
    height,
    margin,
    cartouche: {
      x: margin,
      y: cartoucheY,
      width: contentWidth,
      height: cartoucheHeight,
    },
    map: {
      x: margin,
      y: mapY,
      width: contentWidth,
      height: mapHeight,
    },
    legend: {
      x: margin,
      y: legendY,
      width: contentWidth,
      height: legendHeight,
    },
    stats: {
      x: margin,
      y: statsY,
      width: contentWidth,
      height: statsHeight,
    },
    titleSize: Math.round(width * 0.046),
    subtitleSize: Math.round(width * 0.013),
  };
}

export function biggestTerritory(
  territories: AtlasTerritory[],
): AtlasTerritory | null {
  return (
    territories
      .filter((territory) => territory.count > 0)
      .slice()
      .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))[0] ??
    null
  );
}

export function selectPosterArtists(
  artists: CloudArtistNode[],
  territories: AtlasTerritory[],
  variant: PosterVariant,
) {
  if (variant === 'whole-world') return { artists, territory: null };
  const territory = biggestTerritory(territories);
  if (!territory) return { artists: [], territory: null };
  const selected = artists
    .filter((artist) => artist.genreSlugs.includes(territory.slug))
    .sort((a, b) => b.logCount - a.logCount || a.name.localeCompare(b.name));
  return { artists: selected, territory };
}

export function posterTerritoryLabel(slug: string): string {
  return (
    MACRO_GENRES[slug as keyof typeof MACRO_GENRES]?.label ??
    slug.replaceAll('_', ' ')
  );
}
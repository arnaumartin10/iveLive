import {
  MACRO_GENRES,
  MACRO_GENRE_ORDER,
  type GenrePattern,
} from '../genres/macroGenres';

export type AtlasTerritory = {
  slug: string;
  label: string;
  pattern: GenrePattern;
  color: string;
  x: number;
  y: number;
  radius: number;
  count: number;
};

type Point = { x: number; y: number };

const SILHOUETTES: Point[][] = [
  [
    { x: -0.92, y: -0.12 },
    { x: -0.72, y: -0.58 },
    { x: -0.2, y: -0.82 },
    { x: 0.28, y: -0.74 },
    { x: 0.72, y: -0.48 },
    { x: 0.91, y: -0.08 },
    { x: 0.72, y: 0.38 },
    { x: 0.31, y: 0.72 },
    { x: -0.18, y: 0.83 },
    { x: -0.61, y: 0.56 },
    { x: -0.88, y: 0.22 },
  ],
  [
    { x: -0.88, y: -0.3 },
    { x: -0.58, y: -0.7 },
    { x: -0.12, y: -0.86 },
    { x: 0.24, y: -0.63 },
    { x: 0.65, y: -0.68 },
    { x: 0.88, y: -0.23 },
    { x: 0.68, y: 0.14 },
    { x: 0.83, y: 0.53 },
    { x: 0.32, y: 0.8 },
    { x: -0.08, y: 0.62 },
    { x: -0.48, y: 0.77 },
    { x: -0.82, y: 0.39 },
  ],
  [
    { x: -0.95, y: -0.06 },
    { x: -0.7, y: -0.48 },
    { x: -0.44, y: -0.39 },
    { x: -0.2, y: -0.82 },
    { x: 0.18, y: -0.69 },
    { x: 0.46, y: -0.84 },
    { x: 0.82, y: -0.43 },
    { x: 0.69, y: -0.02 },
    { x: 0.93, y: 0.28 },
    { x: 0.51, y: 0.63 },
    { x: 0.12, y: 0.78 },
    { x: -0.23, y: 0.6 },
    { x: -0.62, y: 0.77 },
    { x: -0.84, y: 0.39 },
  ],
  [
    { x: -0.91, y: -0.23 },
    { x: -0.6, y: -0.77 },
    { x: -0.24, y: -0.6 },
    { x: 0.04, y: -0.88 },
    { x: 0.42, y: -0.67 },
    { x: 0.82, y: -0.57 },
    { x: 0.71, y: -0.14 },
    { x: 0.92, y: 0.2 },
    { x: 0.59, y: 0.42 },
    { x: 0.47, y: 0.79 },
    { x: 0.04, y: 0.66 },
    { x: -0.34, y: 0.83 },
    { x: -0.56, y: 0.42 },
    { x: -0.87, y: 0.19 },
  ],
  [
    { x: -0.9, y: -0.14 },
    { x: -0.71, y: -0.62 },
    { x: -0.3, y: -0.77 },
    { x: 0.07, y: -0.58 },
    { x: 0.41, y: -0.84 },
    { x: 0.77, y: -0.51 },
    { x: 0.88, y: -0.05 },
    { x: 0.61, y: 0.21 },
    { x: 0.79, y: 0.6 },
    { x: 0.35, y: 0.77 },
    { x: -0.02, y: 0.61 },
    { x: -0.41, y: 0.82 },
    { x: -0.77, y: 0.48 },
    { x: -0.63, y: 0.12 },
  ],
];

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function buildTerritoryOutline(slug: string, radius: number): Point[] {
  const silhouette =
    SILHOUETTES[stableHash(slug) % SILHOUETTES.length] ?? SILHOUETTES[0]!;
  const phase = (stableHash(`${slug}:edge`) % 628) / 100;
  const amplitude = Math.max(0, Math.min(2.5, radius * 0.035));
  return silhouette.map((point, index) => {
    const edge = Math.sin(index * 2.17 + phase) * amplitude;
    return {
      x: point.x * radius + point.x * edge,
      y: point.y * radius + point.y * edge,
    };
  });
}

export function buildAtlasTerritories(
  hubs: {
    slug: string;
    label: string;
    x: number;
    y: number;
    radius: number;
    count: number;
  }[],
): AtlasTerritory[] {
  const hubsBySlug = new Map(hubs.map((hub) => [hub.slug, hub]));
  return MACRO_GENRE_ORDER.map((slug, index) => {
    const genre = MACRO_GENRES[slug];
    const hub = hubsBySlug.get(slug);
    const angle = (Math.PI * 2 * index) / MACRO_GENRE_ORDER.length;
    const fallbackRadius = 360;
    return {
      slug: genre.slug,
      label: genre.label,
      pattern: genre.pattern,
      color: genre.color,
      x: hub?.x ?? Math.cos(angle) * fallbackRadius,
      y: hub?.y ?? Math.sin(angle) * fallbackRadius,
      radius: hub ? Math.max(hub.radius * 1.8, 74) : 88,
      count: hub?.count ?? 0,
    };
  });
}

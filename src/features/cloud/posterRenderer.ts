import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import {
  ClipOp,
  ImageFormat,
  PaintStyle,
  Skia,
  type SkCanvas,
  type SkFont,
  type SkPaint,
} from '@shopify/react-native-skia';
import { YoungSerif_400Regular } from '@expo-google-fonts/young-serif';
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono';
import { buildTerritoryOutline } from './atlas';
import {
  calculatePosterLayout,
  getPosterRenderPlan,
  posterTerritoryLabel,
  selectPosterArtists,
  type PosterFormat,
  type PosterVariant,
} from './poster';
import type { AtlasTerritory } from './atlas';
import type { CloudArtistNode } from './simulation';

export type AtlasPosterStats = {
  shows: number;
  artists: number;
  territoriesExplored: number;
  musicalAge: string;
  prototype: string;
  fiveStarCount: number;
};

export type AtlasPosterRequest = {
  format: PosterFormat;
  variant: PosterVariant;
  title: string;
  username: string;
  date: string;
  artists: CloudArtistNode[];
  territories: AtlasTerritory[];
  stats: AtlasPosterStats;
  deviceMemoryBytes?: number | null;
  watermark?: boolean;
  dimensions?: { width: number; height: number };
};

export type RenderedAtlasPoster = {
  bytes: Uint8Array;
  width: number;
  height: number;
  fellBack: boolean;
  missingStickerCount: number;
};

const INK = '#211e1a';
const PAPER = '#f2ead8';
const SECONDARY_INK = '#726b5e';

function makePaint(color: string, alpha = 1, strokeWidth?: number): SkPaint {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(color));
  paint.setAlphaf(alpha);
  if (strokeWidth != null) {
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(strokeWidth);
  }
  return paint;
}

async function loadYoungSerif() {
  const asset = Asset.fromModule(YoungSerif_400Regular);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not load the Young Serif font.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  const face = Skia.Typeface.MakeFreeTypeFaceFromData(
    Skia.Data.fromBytes(bytes),
  );
  if (!face) throw new Error('Could not decode the Young Serif font.');
  return face;
}

async function loadDMMono() {
  const asset = Asset.fromModule(DMMono_400Regular);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not load the DM Mono font.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  const face = Skia.Typeface.MakeFreeTypeFaceFromData(
    Skia.Data.fromBytes(bytes),
  );
  if (!face) throw new Error('Could not decode the DM Mono font.');
  return face;
}

function text(
  canvas: SkCanvas,
  value: string,
  x: number,
  baseline: number,
  font: SkFont,
  paint: SkPaint,
  centered = false,
) {
  const drawX = centered ? x - font.measureText(value).width / 2 : x;
  canvas.drawText(value, drawX, baseline, paint, font);
}

function fitLabel(value: string, maxWidth: number, font: SkFont): string {
  if (font.measureText(value).width <= maxWidth) return value;
  let label = value;
  while (label.length > 1 && font.measureText(`${label}…`).width > maxWidth)
    label = label.slice(0, -1);
  return `${label}…`;
}

function posterBounds(request: AtlasPosterRequest) {
  const selected = selectPosterArtists(
    request.artists,
    request.territories,
    request.variant,
  );
  if (request.variant === 'biggest-territory' && selected.territory) {
    const territory = selected.territory;
    return {
      artists: selected.artists,
      territory,
      bounds: {
        minX: territory.x - territory.radius * 1.15,
        maxX: territory.x + territory.radius * 1.15,
        minY: territory.y - territory.radius * 1.15,
        maxY: territory.y + territory.radius * 1.15,
      },
    };
  }
  const points = [
    ...request.artists.map((artist) => ({
      x: artist.x ?? 0,
      y: artist.y ?? 0,
      radius: artist.radius,
    })),
    ...request.territories.map((territory) => ({
      x: territory.x,
      y: territory.y,
      radius: territory.radius,
    })),
  ];
  return {
    artists: request.artists,
    territory: null,
    bounds: points.length
      ? {
          minX: Math.min(...points.map(({ x, radius }) => x - radius)),
          maxX: Math.max(...points.map(({ x, radius }) => x + radius)),
          minY: Math.min(...points.map(({ y, radius }) => y - radius)),
          maxY: Math.max(...points.map(({ y, radius }) => y + radius)),
        }
      : { minX: -1, maxX: 1, minY: -1, maxY: 1 },
  };
}

async function loadStickerImage(uri: string, signal: AbortSignal) {
  try {
    if (signal.aborted) return null;
    const response = await fetch(uri, { signal });
    if (!response.ok) return null;
    const encoded = Skia.Data.fromBytes(
      new Uint8Array(await response.arrayBuffer()),
    );
    try {
      return Skia.Image.MakeImageFromEncoded(encoded);
    } finally {
      encoded.dispose();
    }
  } catch {
    return null;
  }
}

function drawArtistSticker(
  canvas: SkCanvas,
  artist: CloudArtistNode,
  image: ReturnType<typeof Skia.Image.MakeImageFromEncoded>,
  position: { x: number; y: number },
  radius: number,
) {
  const shadow = makePaint(INK, 0.18);
  const fill = makePaint(artist.color);
  const outline = makePaint(INK, 0.9, Math.max(1, radius * 0.08));
  try {
    canvas.drawCircle(
      position.x + radius * 0.12,
      position.y + radius * 0.18,
      radius * 1.08,
      shadow,
    );
    if (image) {
      const clip = Skia.Path.Make();
      clip.addCircle(position.x, position.y, radius);
      canvas.save();
      try {
        canvas.clipPath(clip, ClipOp.Intersect, true);
        canvas.drawImageRect(
          image,
          Skia.XYWHRect(0, 0, image.width(), image.height()),
          Skia.XYWHRect(
            position.x - radius,
            position.y - radius,
            radius * 2,
            radius * 2,
          ),
          fill,
        );
      } finally {
        canvas.restore();
      }
    } else {
      canvas.drawCircle(position.x, position.y, radius, fill);
    }
    canvas.drawCircle(position.x, position.y, radius, outline);
  } finally {
    shadow.dispose();
    fill.dispose();
    outline.dispose();
  }
}

async function drawPoster(
  canvas: SkCanvas,
  request: AtlasPosterRequest,
  width: number,
  height: number,
  titleTypeface: NonNullable<
    ReturnType<typeof Skia.Typeface.MakeFreeTypeFaceFromData>
  >,
  monoTypeface: NonNullable<
    ReturnType<typeof Skia.Typeface.MakeFreeTypeFaceFromData>
  >,
) {
  const layout = calculatePosterLayout(width, height);
  const titleFont = Skia.Font(titleTypeface, layout.titleSize);
  const subtitleFont = Skia.Font(monoTypeface, layout.subtitleSize);
  const labelFont = Skia.Font(undefined, Math.max(12, width * 0.012));
  const smallFont = Skia.Font(monoTypeface, Math.max(10, width * 0.009));
  const ink = makePaint(INK);
  const subdued = makePaint(SECONDARY_INK);
  const paper = makePaint(PAPER);
  canvas.drawPaint(paper);

  const title = request.title.endsWith('Atlas of Live Music')
    ? request.title
    : `${request.title}'s Atlas of Live Music`;
  text(
    canvas,
    fitLabel(title, layout.cartouche.width * 0.92, titleFont),
    width / 2,
    layout.cartouche.y + layout.cartouche.height * 0.55,
    titleFont,
    ink,
    true,
  );
  const subtitle = `${request.date}  ·  @${request.username}`;
  text(
    canvas,
    subtitle,
    width / 2,
    layout.cartouche.y + layout.cartouche.height * 0.88,
    subtitleFont,
    subdued,
    true,
  );

  const map = layout.map;
  const bounds = posterBounds(request);
  const worldWidth = Math.max(1, bounds.bounds.maxX - bounds.bounds.minX);
  const worldHeight = Math.max(1, bounds.bounds.maxY - bounds.bounds.minY);
  const mapScale = Math.min(
    (map.width * 0.82) / worldWidth,
    (map.height * 0.78) / worldHeight,
  );
  const centerX = (bounds.bounds.minX + bounds.bounds.maxX) / 2;
  const centerY = (bounds.bounds.minY + bounds.bounds.maxY) / 2;
  const point = (worldX: number, worldY: number) => ({
    x: map.x + map.width / 2 + (worldX - centerX) * mapScale,
    y: map.y + map.height / 2 + (worldY - centerY) * mapScale,
  });

  const border = makePaint(INK, 0.8, Math.max(1, width * 0.0007));
  canvas.drawRect(Skia.XYWHRect(map.x, map.y, map.width, map.height), border);
  const tickLength = Math.max(5, width * 0.005);
  const tickStep = Math.max(1, Math.floor(map.width / (width * 0.035)));
  for (let x = map.x; x <= map.x + map.width; x += tickStep) {
    canvas.drawLine(x, map.y, x, map.y + tickLength, ink);
    canvas.drawLine(
      x,
      map.y + map.height,
      x,
      map.y + map.height - tickLength,
      ink,
    );
  }
  for (let y = map.y; y <= map.y + map.height; y += tickStep) {
    canvas.drawLine(map.x, y, map.x + tickLength, y, ink);
    canvas.drawLine(
      map.x + map.width,
      y,
      map.x + map.width - tickLength,
      y,
      ink,
    );
  }

  const territories =
    request.variant === 'whole-world'
      ? request.territories
      : bounds.territory
        ? [bounds.territory]
        : [];
  for (const territory of territories) {
    const center = point(territory.x, territory.y);
    const outline = buildTerritoryOutline(
      territory.slug,
      territory.radius * mapScale,
    );
    const path = Skia.Path.Make();
    outline.forEach((offset, index) => {
      const x = center.x + offset.x;
      const y = center.y + offset.y;
      if (index === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    });
    path.close();
    canvas.drawPath(path, makePaint(territory.color, 0.16));
    canvas.drawPath(path, makePaint(INK, 0.75, Math.max(1, width * 0.00055)));
    const hatch = makePaint(territory.color, 0.8);
    const markRadius = Math.max(1.2, mapScale * territory.radius * 0.018);
    for (let index = 0; index < 14; index += 1) {
      const angle = (index / 14) * Math.PI * 2;
      canvas.drawCircle(
        center.x + Math.cos(angle) * territory.radius * mapScale * 0.42,
        center.y + Math.sin(angle) * territory.radius * mapScale * 0.42,
        markRadius,
        hatch,
      );
    }
    text(
      canvas,
      posterTerritoryLabel(territory.slug).toUpperCase(),
      center.x,
      center.y,
      smallFont,
      ink,
      true,
    );
  }

  const artists = bounds.artists;
  const territoryArtists = bounds.territory
    ? artists.slice().sort((a, b) => b.logCount - a.logCount)
    : [];
  const maxRadius = request.variant === 'whole-world' ? 14 : 22;
  let missingStickerCount = 0;
  const imageController = new AbortController();
  const imageTimeout = setTimeout(() => imageController.abort(), 15_000);
  try {
    for (let offset = 0; offset < artists.length; offset += 12) {
      const batch = artists.slice(offset, offset + 12);
      const images = await Promise.all(
        batch.map((artist) =>
          artist.imageUrl
            ? loadStickerImage(artist.imageUrl, imageController.signal)
            : Promise.resolve(null),
        ),
      );
      batch.forEach((artist, index) => {
        const image = images[index] ?? null;
        if (artist.imageUrl && !image) missingStickerCount += 1;
        const position = point(artist.x ?? 0, artist.y ?? 0);
        const radius = Math.max(
          width * 0.0014,
          Math.min(maxRadius, artist.radius * mapScale * 0.55),
        );
        try {
          drawArtistSticker(canvas, artist, image, position, radius);
        } finally {
          image?.dispose();
        }
      });
    }
  } finally {
    clearTimeout(imageTimeout);
    imageController.abort();
  }

  if (request.variant === 'biggest-territory' && bounds.territory) {
    text(
      canvas,
      posterTerritoryLabel(bounds.territory.slug).toUpperCase(),
      map.x + map.width * 0.06,
      map.y + map.height * 0.09,
      labelFont,
      ink,
    );
    territoryArtists.slice(0, 5).forEach((artist, index) => {
      text(
        canvas,
        `${index + 1}. ${fitLabel(artist.name, map.width * 0.35, smallFont)}`,
        map.x + map.width * 0.06,
        map.y + map.height * (0.16 + index * 0.055),
        smallFont,
        ink,
      );
    });
  }

  const explored = request.territories.filter(({ count }) => count > 0);
  const rowCount = Math.max(
    1,
    Math.ceil((request.variant === 'whole-world' ? explored.length : 1) / 2),
  );
  const legendRowHeight = layout.legend.height / rowCount;
  const legendItems =
    request.variant === 'whole-world'
      ? explored.slice(0, 14)
      : explored.slice(0, 1);
  legendItems.forEach((territory, index) => {
    const column = request.variant === 'whole-world' ? index % 2 : 0;
    const row = request.variant === 'whole-world' ? Math.floor(index / 2) : 0;
    const itemWidth = layout.legend.width / 2;
    const itemX = layout.legend.x + column * itemWidth;
    const y = layout.legend.y + row * legendRowHeight;
    const marker = Math.max(5, width * 0.004);
    canvas.drawCircle(
      itemX + marker,
      y + legendRowHeight * 0.48,
      marker,
      makePaint(territory.color),
    );
    const shows = request.artists
      .filter((artist) => artist.genreSlugs.includes(territory.slug))
      .reduce((sum, artist) => sum + artist.logCount, 0);
    const share = request.stats.shows
      ? Math.round((shows / request.stats.shows) * 100)
      : 0;
    const label = `${posterTerritoryLabel(territory.slug)} · ${territory.pattern} · ${shows} shows · ${share}%`;
    text(
      canvas,
      fitLabel(label, itemWidth * 0.88, smallFont),
      itemX + marker * 2.4,
      y + legendRowHeight * 0.58,
      smallFont,
      ink,
    );
  });

  const stats = request.stats;
  const statColumns = [
    `${stats.shows} SHOWS`,
    `${stats.artists} ARTISTS`,
    `${stats.territoriesExplored}/14 TERRITORIES`,
    `AGE ${stats.musicalAge}`,
    stats.prototype,
    `★ ${stats.fiveStarCount}`,
  ];
  const columnWidth = layout.stats.width / statColumns.length;
  canvas.drawLine(
    layout.stats.x,
    layout.stats.y,
    layout.stats.x + layout.stats.width,
    layout.stats.y,
    border,
  );
  statColumns.forEach((value, index) => {
    text(
      canvas,
      fitLabel(value.toUpperCase(), columnWidth * 0.94, smallFont),
      layout.stats.x + columnWidth * (index + 0.5),
      layout.stats.y + layout.stats.height * 0.58,
      smallFont,
      ink,
      true,
    );
  });

  let seed = request.artists.length * 31337 + width * 97 + height;
  const grainPaint = makePaint(INK, 0.06);
  for (let index = 0; index < 750; index += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const x = (seed / 0xffffffff) * width;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const y = (seed / 0xffffffff) * height;
    canvas.drawCircle(x, y, Math.max(1, width * 0.00045), grainPaint);
  }

  if (request.watermark) {
    const watermarkFont = Skia.Font(undefined, Math.max(12, width * 0.012));
    text(
      canvas,
      'IVE LIVE · PRINTED FROM YOUR ATLAS',
      layout.margin,
      height - layout.margin * 0.32,
      watermarkFont,
      subdued,
    );
  }
  if (missingStickerCount > 0) {
    console.warn(
      `[cloud] ${missingStickerCount} poster sticker image(s) were unavailable; printed their genre marks instead.`,
    );
  }
  return missingStickerCount;
}

async function renderAtSize(
  request: AtlasPosterRequest,
  width: number,
  height: number,
): Promise<{ bytes: Uint8Array; missingStickerCount: number }> {
  const face = await loadYoungSerif();
  let monoTypeface: NonNullable<
    ReturnType<typeof Skia.Typeface.MakeFreeTypeFaceFromData>
  >;
  try {
    monoTypeface = await loadDMMono();
  } catch (error) {
    face.dispose();
    throw error;
  }
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) {
    face.dispose();
    monoTypeface.dispose();
    throw new Error(`Skia could not allocate ${width}×${height}.`);
  }
  try {
    const missingStickerCount = await drawPoster(
      surface.getCanvas(),
      request,
      width,
      height,
      face,
      monoTypeface,
    );
    surface.flush();
    const image = surface.makeImageSnapshot();
    try {
      const bytes = image.encodeToBytes(ImageFormat.PNG);
      if (bytes.length === 0) throw new Error('PNG encoding returned no data.');
      return { bytes, missingStickerCount };
    } finally {
      image.dispose();
    }
  } finally {
    surface.dispose();
    face.dispose();
    monoTypeface.dispose();
  }
}

export async function renderAtlasPoster(
  request: AtlasPosterRequest,
): Promise<RenderedAtlasPoster> {
  const plan = request.dimensions
    ? { dimensions: request.dimensions, fellBack: false }
    : getPosterRenderPlan(request.format, request.deviceMemoryBytes ?? null);
  const dimensions = plan.dimensions;
  try {
    return {
      ...(await renderAtSize(request, dimensions.width, dimensions.height)),
      ...dimensions,
      fellBack: plan.fellBack,
    };
  } catch (error) {
    if (dimensions.width <= 2000) throw error;
    console.warn(
      '[cloud] High-resolution poster allocation failed; retrying at 2000px width.',
      error,
    );
    const ratio = dimensions.height / dimensions.width;
    const fallback = { width: 2000, height: Math.round(2000 * ratio) };
    return {
      ...(await renderAtSize(request, fallback.width, fallback.height)),
      ...fallback,
      fellBack: true,
    };
  }
}

export function writePosterFile(bytes: Uint8Array, filename: string): string {
  const file = new File(Paths.cache, filename);
  file.write(bytes);
  return file.uri;
}

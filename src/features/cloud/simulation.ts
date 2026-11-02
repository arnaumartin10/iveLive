import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
} from 'd3-force';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCloudLayout, saveCloudLayout } from './api';
import type {
  ConcertWithRelations,
  UserArtistSummary,
} from '../concerts/types';
import { MACRO_GENRES } from '../genres/macroGenres';
import { VENUE_TYPES } from '../venues/venueTypes';
import type {
  CloudArtistData,
  CloudCoattendanceLink,
  CloudLogTuple,
} from './types';
import { RAW } from '../../theme/palette';

export type CloudMode = 'genre' | 'venue' | 'era' | 'year';

export type Point = { x: number; y: number };
export type Camera = Point & { scale: number };

export type CloudArtistNode = {
  id: string;
  type: 'artist';
  artistId: string;
  name: string;
  imageUrl: string | null;
  primaryMacro: string; // The artist's actual macro genre (e.g. 'indie')
  clusterTarget: string; // Current clustering target (genre macro, venue type, era decade, or year)
  logCount: number;
  avgRating: number;
  maxRating: number | null;
  beginYear: number | null;
  firstSeen: string | null;
  lastSeen: string | null;
  venueTypeCounts: Partial<Record<keyof typeof VENUE_TYPES, number>>;
  logs: CloudLogTuple[];
  hubTargets: string[];
  genreSlugs: string[];
  radius: number;
  color: string; // Genre color for outer glow and accents
  clusterColor: string; // Color of current cluster
  phaseOffset: number; // Deterministic phase offset for breathing
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export type CloudHubNode = {
  id: string;
  type: 'hub';
  hubType: CloudMode;
  slug: string;
  label: string;
  color: string;
  count: number;
  radius: number;
  anchorX?: number;
  anchorY?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export type CloudNode = CloudArtistNode | CloudHubNode;

export type CloudLink = {
  source: string;
  target: string;
  weight?: number;
  type?: 'hub' | 'constellation';
  sharedDates?: string[];
  venueNames?: string[];
};

export type CloudArtistInput = UserArtistSummary | CloudArtistData;

export const cloudPositionCache = new Map<
  string,
  Map<string, { x: number; y: number }>
>();
const CLOUD_LAYOUT_VERSION = 1;
const CLOUD_LAYOUT_STORAGE_PREFIX = '@ivelive/cloud-layout';

type StoredCloudLayout = {
  version: number;
  positions: Record<string, { x: number; y: number }>;
};

function isStoredCloudLayout(value: unknown): value is StoredCloudLayout {
  if (!value || typeof value !== 'object') return false;
  const layout = value as Partial<StoredCloudLayout>;
  if (
    layout.version !== CLOUD_LAYOUT_VERSION ||
    !layout.positions ||
    typeof layout.positions !== 'object'
  ) {
    return false;
  }
  return Object.values(layout.positions).every(
    (position) =>
      !!position &&
      typeof position === 'object' &&
      Number.isFinite(position.x) &&
      Number.isFinite(position.y),
  );
}

export async function restoreCloudPositions(
  userId: string,
  mode: CloudMode,
  nodes: CloudNode[],
): Promise<boolean> {
  const storageKey = `${CLOUD_LAYOUT_STORAGE_PREFIX}:${userId}:${mode}`;
  const serialized = await AsyncStorage.getItem(storageKey);
  let positions = new Map<string, { x: number; y: number }>();
  if (serialized) {
    const parsed: unknown = JSON.parse(serialized);
    if (isStoredCloudLayout(parsed)) {
      positions = new Map(Object.entries(parsed.positions));
      applyPositions(nodes, positions);
    }
  }
  if (positions.size > 0)
    cloudPositionCache.set(`${userId}:${mode}`, positions);

  const remotePositions = await fetchCloudLayout(userId, mode);
  if (remotePositions) {
    positions = new Map(Object.entries(remotePositions));
    applyPositions(nodes, positions);
    const layout: StoredCloudLayout = {
      version: CLOUD_LAYOUT_VERSION,
      positions: remotePositions,
    };
    await AsyncStorage.setItem(storageKey, JSON.stringify(layout));
  }
  if (positions.size > 0)
    cloudPositionCache.set(`${userId}:${mode}`, positions);
  return positions.size > 0;
}

export async function persistCloudPositions(
  userId: string,
  mode: CloudMode,
  nodes: CloudNode[],
): Promise<void> {
  const positions = Object.fromEntries(
    nodes.map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]),
  );
  const layout: StoredCloudLayout = {
    version: CLOUD_LAYOUT_VERSION,
    positions,
  };
  await AsyncStorage.setItem(
    `${CLOUD_LAYOUT_STORAGE_PREFIX}:${userId}:${mode}`,
    JSON.stringify(layout),
  );
  await saveCloudLayout(userId, mode, positions);
}

function applyPositions(
  nodes: CloudNode[],
  positions: Map<string, { x: number; y: number }>,
): void {
  for (const node of nodes) {
    const position = positions.get(node.id);
    if (!position) continue;
    node.x = position.x;
    node.y = position.y;
  }
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export function artistNodeRadius(logCount: number, avgRating: number): number {
  return clamp(14 + 7 * Math.sqrt(logCount) + 3 * (avgRating - 3), 14, 44);
}

export function getArtistMacro(artist: CloudArtistInput): string {
  const primary = artist.primary_macro;
  if (primary === 'other' && artist.genres.length === 0) return 'unclassified';
  if (primary && primary in MACRO_GENRES) return primary;
  const firstMacro = artist.macro_genres?.find(
    (macro) => macro in MACRO_GENRES,
  );
  if (firstMacro === 'other' && artist.genres.length === 0)
    return 'unclassified';
  return firstMacro ?? 'unclassified';
}

export function eraSlugFromYear(year: number | null | undefined): string {
  if (year == null || !Number.isFinite(year) || year < 1000)
    return 'unknown-era';
  return `${Math.floor(year / 10) * 10}s`;
}

const ERA_COLORS: Record<string, keyof typeof RAW> = {
  'pre-70s': 'orange',
  '70s': 'orange',
  '80s': 'mauve',
  '90s': 'violet',
  '00s': 'slate',
  '10s': 'slate',
  '20s': 'wheat',
  '1960s': 'orange',
  '1970s': 'orange',
  '1980s': 'mauve',
  '1990s': 'violet',
  '2000s': 'slate',
  '2010s': 'slate',
  '2020s': 'wheat',
  'unknown-era': 'mauve',
};

const YEAR_COLORS = [RAW.slate, RAW.mauve, RAW.orange, RAW.violet, RAW.wheat];

export function isCloudArtistData(
  artist: CloudArtistInput,
): artist is CloudArtistData {
  return 'logs' in artist;
}

export function labelForMode(mode: CloudMode, slug: string): string {
  if (mode === 'genre')
    return MACRO_GENRES[slug as keyof typeof MACRO_GENRES]?.label ?? slug;
  if (mode === 'venue')
    return VENUE_TYPES[slug as keyof typeof VENUE_TYPES]?.label ?? slug;
  if (mode === 'era') {
    if (slug === 'unknown-era') return 'Unknown era';
    return slug;
  }
  return slug;
}

export function colorForMode(mode: CloudMode, slug: string): string {
  if (mode === 'genre')
    return MACRO_GENRES[slug as keyof typeof MACRO_GENRES]?.color ?? RAW.mauve;
  if (mode === 'venue')
    return (
      VENUE_TYPES[slug as keyof typeof VENUE_TYPES]?.primaryColor ?? RAW.mauve
    );
  if (mode === 'era') {
    if (slug === 'unknown-era') return RAW.mauve;
    const decadeNum = Number.parseInt(slug, 10);
    const shortDecade = Math.abs(decadeNum % 100);
    const shortSlug = shortDecade < 10 ? `0${shortDecade}s` : `${shortDecade}s`;
    return RAW[ERA_COLORS[slug] ?? ERA_COLORS[shortSlug] ?? 'mauve'];
  }
  const year = Number.parseInt(slug, 10);
  return YEAR_COLORS[Math.abs(year) % YEAR_COLORS.length] ?? RAW.mauve;
}

export function toLegacyLogs(
  artistId: string,
  concerts: ConcertWithRelations[],
): CloudLogTuple[] {
  return concerts
    .filter((concert) => concert.artist_id === artistId)
    .map(
      (concert) =>
        [
          concert.event_date,
          concert.venue_type,
          concert.rating,
        ] as CloudLogTuple,
    );
}

// ---------------------------------------------------------------------------
// SPATIAL HASH GRID: O(1) hit testing for hundreds of nodes
// ---------------------------------------------------------------------------
export class SpatialHashGrid {
  private cellSize: number;
  private cells = new Map<string, CloudNode[]>();

  constructor(cellSize = 80) {
    this.cellSize = cellSize;
  }

  private hash(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx}:${cy}`;
  }

  clear(): void {
    this.cells.clear();
  }

  insert(node: CloudNode): void {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const key = this.hash(x, y);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }
    cell.push(node);
  }

  rebuild(nodes: CloudNode[]): void {
    this.clear();
    for (const node of nodes) {
      this.insert(node);
    }
  }

  query(worldX: number, worldY: number, maxRadius = 80): CloudNode[] {
    const minCx = Math.floor((worldX - maxRadius) / this.cellSize);
    const maxCx = Math.floor((worldX + maxRadius) / this.cellSize);
    const minCy = Math.floor((worldY - maxRadius) / this.cellSize);
    const maxCy = Math.floor((worldY + maxRadius) / this.cellSize);
    const results: CloudNode[] = [];
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.cells.get(`${cx}:${cy}`);
        if (cell) {
          for (const node of cell) {
            results.push(node);
          }
        }
      }
    }
    return results;
  }
}

// ---------------------------------------------------------------------------
// COORDINATE TRANSFORMS
// ---------------------------------------------------------------------------
export function screenPoint(
  node: { x?: number; y?: number },
  camera: Camera,
  width: number,
  height: number,
): Point {
  return {
    x: width / 2 + camera.x + (node.x ?? 0) * camera.scale,
    y: height / 2 + camera.y + (node.y ?? 0) * camera.scale,
  };
}

export function toWorld(
  point: Point,
  camera: Camera,
  width: number,
  height: number,
): Point {
  return {
    x: (point.x - width / 2 - camera.x) / camera.scale,
    y: (point.y - height / 2 - camera.y) / camera.scale,
  };
}

export function fitNodes(
  nodes: CloudNode[],
  width: number,
  height: number,
): Camera {
  if (nodes.length === 0) return { x: 0, y: 0, scale: 1 };
  const xs = nodes.flatMap((node) => [
    (node.x ?? 0) - node.radius,
    (node.x ?? 0) + node.radius,
  ]);
  const ys = nodes.flatMap((node) => [
    (node.y ?? 0) - node.radius,
    (node.y ?? 0) + node.radius,
  ]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.max(
    0.3,
    Math.min(1.25, (width - 50) / spanX, (height - 50) / spanY),
  );
  return { x: -centerX * scale, y: -centerY * scale, scale };
}

// ---------------------------------------------------------------------------
// HIT-TESTING WITH CAMERA TRANSFORMS & SPATIAL GRID
// ---------------------------------------------------------------------------
export function hitTestCloudNode(
  nodes: CloudNode[],
  worldX: number,
  worldY: number,
  extraTouchRadius = 8,
  grid?: SpatialHashGrid,
): CloudNode | undefined {
  const candidates = grid ? grid.query(worldX, worldY, 120) : nodes;
  // Prioritize artists over hubs, and topmost (reverse array order) first
  const artists = candidates.filter(
    (node): node is CloudArtistNode => node.type === 'artist',
  );
  for (let i = artists.length - 1; i >= 0; i--) {
    const node = artists[i];
    if (!node) continue;
    if (
      Math.hypot((node.x ?? 0) - worldX, (node.y ?? 0) - worldY) <=
      node.radius + extraTouchRadius
    ) {
      return node;
    }
  }
  const hubs = candidates.filter(
    (node): node is CloudHubNode => node.type === 'hub',
  );
  for (let i = hubs.length - 1; i >= 0; i--) {
    const node = hubs[i];
    if (!node) continue;
    if (
      Math.hypot((node.x ?? 0) - worldX, (node.y ?? 0) - worldY) <=
      node.radius + extraTouchRadius
    ) {
      return node;
    }
  }
  return undefined;
}

export function hitTestAtScreenCoords(
  screenCoords: Point,
  camera: Camera,
  width: number,
  height: number,
  nodes: CloudNode[],
  extraTouchRadius = 8,
  grid?: SpatialHashGrid,
): CloudNode | undefined {
  const world = toWorld(screenCoords, camera, width, height);
  return hitTestCloudNode(nodes, world.x, world.y, extraTouchRadius, grid);
}

// ---------------------------------------------------------------------------
// NODE & LINK BUILDERS
// ---------------------------------------------------------------------------
function computePhaseOffset(name: string, id: string): number {
  let hash = 0;
  const str = name + id;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return (Math.abs(hash) % 628) / 100; // 0 to 2*PI
}

export function buildCloudNodes(
  summary: CloudArtistInput[],
  mode: CloudMode,
  concerts: ConcertWithRelations[] = [],
): { nodes: CloudNode[]; links: CloudLink[]; backboneLinks: CloudLink[] } {
  const artists: CloudArtistNode[] = summary.map((artist) => {
    const primaryMacro = getArtistMacro(artist);
    const avgRating = artist.avg_rating ?? 3;
    const logs = isCloudArtistData(artist)
      ? artist.logs
      : toLegacyLogs(artist.id, concerts);
    const venueTypeCounts = isCloudArtistData(artist)
      ? artist.venue_type_counts
      : logs.reduce<Partial<Record<keyof typeof VENUE_TYPES, number>>>(
          (counts, log) => {
            counts[log[1]] = (counts[log[1]] ?? 0) + 1;
            return counts;
          },
          {},
        );
    const beginYear = isCloudArtistData(artist) ? artist.begin_year : null;
    const firstSeen = artist.first_seen ?? null;
    const lastSeen = artist.last_seen ?? null;
    const genreSlugs = (artist.macro_genres ?? []).filter(
      (macro) => macro in MACRO_GENRES && macro !== 'unclassified',
    );
    const genreColor =
      MACRO_GENRES[primaryMacro as keyof typeof MACRO_GENRES]?.color ??
      MACRO_GENRES.other.color;

    let hubTargets: string[] = [primaryMacro];
    let clusterTarget = primaryMacro;
    let clusterColor: string = genreColor;

    if (mode === 'venue') {
      const preferred = Object.entries(venueTypeCounts).sort(
        (left, right) => (right[1] ?? 0) - (left[1] ?? 0),
      )[0]?.[0];
      const target = preferred ?? 'other';
      hubTargets = [target];
      clusterTarget = target;
      clusterColor = colorForMode(mode, target);
    } else if (mode === 'era') {
      const target = eraSlugFromYear(beginYear);
      hubTargets = [target];
      clusterTarget = target;
      clusterColor = colorForMode(mode, target);
    } else if (mode === 'year') {
      const yearsSeen = [
        ...new Set(logs.map(([date]) => date.slice(0, 4))),
      ].sort();
      if (yearsSeen.length > 0) {
        hubTargets = yearsSeen;
      } else if (firstSeen) {
        hubTargets = [firstSeen.slice(0, 4)];
      } else {
        hubTargets = ['unknown-year'];
      }
      clusterTarget = hubTargets[0] ?? 'unknown-year';
      clusterColor = colorForMode(mode, clusterTarget);
    }

    return {
      id: artist.id,
      type: 'artist' as const,
      artistId: artist.id,
      name: artist.name,
      imageUrl: isCloudArtistData(artist)
        ? (artist.image_url_thumb ?? artist.image_url_large)
        : artist.image_url_thumb,
      primaryMacro,
      clusterTarget,
      logCount: artist.log_count,
      avgRating,
      maxRating: artist.max_rating,
      beginYear,
      firstSeen,
      lastSeen,
      venueTypeCounts,
      logs,
      hubTargets,
      genreSlugs: genreSlugs.length ? genreSlugs : [primaryMacro],
      radius: artistNodeRadius(artist.log_count, avgRating),
      color: genreColor,
      clusterColor,
      phaseOffset: computePhaseOffset(artist.name, artist.id),
    };
  });

  const hubCounts = new Map<string, number>();
  for (const artist of artists) {
    for (const target of artist.hubTargets) {
      hubCounts.set(target, (hubCounts.get(target) ?? 0) + 1);
    }
  }

  const hubEntries = [...hubCounts.entries()];
  if (mode === 'era') {
    hubEntries.sort((a, b) => {
      if (a[0] === 'unknown-era') return 1;
      if (b[0] === 'unknown-era') return -1;
      return a[0].localeCompare(b[0]);
    });
  } else if (mode === 'year') {
    hubEntries.sort((a, b) => a[0].localeCompare(b[0]));
  } else {
    hubEntries.sort((a, b) => b[1] - a[1]);
  }

  const numHubs = hubEntries.length;
  // Tighter baseRadius so hubs are closer together and form a connected network feel
  const baseRadius = Math.max(
    150,
    Math.min(320, 110 + artists.length * 3.5 + numHubs * 18),
  );

  const hubs: CloudHubNode[] = hubEntries.map(([slug, count], index) => {
    let anchorX = 0;
    let anchorY = 0;
    if (numHubs > 1) {
      const angle = (Math.PI * 2 * index) / numHubs - Math.PI / 2;
      anchorX = Math.round(Math.cos(angle) * baseRadius);
      anchorY = Math.round(Math.sin(angle) * baseRadius);
    }
    return {
      id: `${mode}:${slug}`,
      type: 'hub',
      hubType: mode,
      slug,
      label: labelForMode(mode, slug),
      color: colorForMode(mode, slug),
      count,
      radius: clamp(35 + Math.sqrt(count) * 6, 42, 96),
      anchorX,
      anchorY,
      x: anchorX,
      y: anchorY,
    };
  });

  const hubBySlug = new Map(hubs.map((hub) => [hub.slug, hub]));
  for (const artist of artists) {
    if (artist.x === undefined || artist.y === undefined) {
      const hub = hubBySlug.get(artist.clusterTarget);
      const angle = artist.phaseOffset;
      const dist = (hub?.radius ?? 40) + artist.radius + 15;
      artist.x = (hub?.anchorX ?? 0) + Math.cos(angle) * dist;
      artist.y = (hub?.anchorY ?? 0) + Math.sin(angle) * dist;
    }
  }

  const hubIdBySlug = new Map(hubs.map((hub) => [hub.slug, hub.id]));
  const links: CloudLink[] = artists.flatMap((artist) =>
    artist.hubTargets.flatMap((slug) => {
      const hubId = hubIdBySlug.get(slug);
      return hubId
        ? [{ source: artist.id, target: hubId, type: 'hub' as const }]
        : [];
    }),
  );

  // Add hub-to-hub backbone links so clusters are connected as a network.
  // Connect each hub to its two nearest neighbours (wrapping around the circle)
  // so there is always a path between every cluster hub.
  const backboneLinks: CloudLink[] = [];
  if (hubs.length >= 2) {
    for (let i = 0; i < hubs.length; i++) {
      const a = hubs[i];
      const b = hubs[(i + 1) % hubs.length];
      if (a && b) {
        backboneLinks.push({
          source: a.id,
          target: b.id,
          type: 'hub' as const,
        });
      }
    }
  }

  return {
    nodes: [...hubs, ...artists],
    links: [...links, ...backboneLinks],
    backboneLinks,
  };
}

// ---------------------------------------------------------------------------
// SMOOTH MODE MORPHING
// ---------------------------------------------------------------------------
export function reassignCloudMode(
  existingNodes: CloudNode[],
  newMode: CloudMode,
  summary: CloudArtistInput[],
  concerts: ConcertWithRelations[] = [],
): { nodes: CloudNode[]; links: CloudLink[]; backboneLinks: CloudLink[] } {
  const existingArtistsById = new Map(
    existingNodes
      .filter((n): n is CloudArtistNode => n.type === 'artist')
      .map((n) => [n.id, n]),
  );

  const fresh = buildCloudNodes(summary, newMode, concerts);
  const mergedArtists = fresh.nodes
    .filter((n): n is CloudArtistNode => n.type === 'artist')
    .map((freshArtist) => {
      const prev = existingArtistsById.get(freshArtist.id);
      if (prev && prev.x !== undefined && prev.y !== undefined) {
        freshArtist.x = prev.x;
        freshArtist.y = prev.y;
        freshArtist.vx = prev.vx;
        freshArtist.vy = prev.vy;
      }
      return freshArtist;
    });

  const mergedHubs = fresh.nodes.filter(
    (n): n is CloudHubNode => n.type === 'hub',
  );

  return {
    nodes: [...mergedHubs, ...mergedArtists],
    links: fresh.links,
    backboneLinks: fresh.backboneLinks,
  };
}

// ---------------------------------------------------------------------------
// CO-ATTENDANCE LINK BUILDER (FOR CONSTELLATION MODE)
// ---------------------------------------------------------------------------
export function buildCoattendanceLinks(
  rawLinks: CloudCoattendanceLink[],
  artists: CloudArtistNode[],
): CloudLink[] {
  const artistIdSet = new Set(artists.map((a) => a.id));
  return rawLinks
    .filter(
      (link) =>
        artistIdSet.has(link.source_id) && artistIdSet.has(link.target_id),
    )
    .map((link) => ({
      source: link.source_id,
      target: link.target_id,
      weight: link.weight,
      type: 'constellation' as const,
      sharedDates: link.shared_dates,
      venueNames: link.venue_names,
    }));
}

// ---------------------------------------------------------------------------
// SIMULATION ENGINE
// ---------------------------------------------------------------------------
export function createCloudSimulation(
  nodes: CloudNode[],
  links: CloudLink[],
): Simulation<CloudNode, CloudLink> {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  return forceSimulation<CloudNode>(nodes)
    .force(
      'charge',
      forceManyBody<CloudNode>().strength((node) =>
        node.type === 'artist' ? -50 : -900,
      ),
    )
    .force(
      'collide',
      forceCollide<CloudNode>()
        .radius((node) =>
          node.type === 'hub' ? node.radius + 25 : node.radius + 4,
        )
        .iterations(2),
    )
    .force(
      'link',
      forceLink<CloudNode, CloudLink>(
        links.filter((l) => l.type !== 'constellation'),
      )
        .id((node) => node.id)
        .distance((link) => {
          const target = link.target as unknown as string | CloudNode;
          const targetNode =
            typeof target === 'string' ? nodeById.get(target) : target;
          const source = link.source as unknown as string | CloudNode;
          const sourceNode =
            typeof source === 'string' ? nodeById.get(source) : source;
          const hubRadius = targetNode?.type === 'hub' ? targetNode.radius : 40;
          const artistRadius = sourceNode?.radius ?? 20;
          return hubRadius + artistRadius + 18;
        })
        .strength(0.7),
    )
    .force(
      'x',
      forceX<CloudNode>((node) => {
        if (node.type === 'hub') return (node as CloudHubNode).anchorX ?? 0;
        return 0;
      }).strength((node) => (node.type === 'hub' ? 0.15 : 0.01)),
    )
    .force(
      'y',
      forceY<CloudNode>((node) => {
        if (node.type === 'hub') return (node as CloudHubNode).anchorY ?? 0;
        return 0;
      }).strength((node) => (node.type === 'hub' ? 0.15 : 0.01)),
    )
    .force('center', forceCenter<CloudNode>(0, 0).strength(0.12))
    .alphaDecay(0.025)
    .velocityDecay(0.35)
    .stop();
}

export function warmCloudSimulation(
  userId: string,
  mode: CloudMode,
  nodes: CloudNode[],
  links: CloudLink[],
): Simulation<CloudNode, CloudLink> {
  const cacheKey = `${userId}:${mode}`;
  const positions = cloudPositionCache.get(cacheKey);
  const hasCompleteCache = hasCloudPositionCache(userId, mode, nodes);
  for (const node of nodes) {
    const position = positions?.get(node.id);
    if (position) {
      node.x = position.x;
      node.y = position.y;
    }
  }
  const simulation = createCloudSimulation(nodes, links);
  if (!hasCompleteCache) simulation.tick(150);
  simulation.alpha(0);
  cacheCloudPositions(cacheKey, nodes);
  return simulation;
}

export function hasCloudPositionCache(
  userId: string,
  mode: CloudMode,
  nodes: CloudNode[],
): boolean {
  const positions = cloudPositionCache.get(`${userId}:${mode}`);
  return !!positions && nodes.every((node) => positions.has(node.id));
}

export function cacheCloudPositions(
  cacheKey: string,
  nodes: CloudNode[],
): void {
  cloudPositionCache.set(
    cacheKey,
    new Map(nodes.map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }])),
  );
}

// ---------------------------------------------------------------------------
// TIMELINE SCRUBBER
// ---------------------------------------------------------------------------
export function getScrubberTimelineBounds(artists: CloudArtistNode[]): {
  minYear: number;
  maxYear: number;
  minDate: string;
  maxDate: string;
} {
  const dates = artists
    .map((a) => a.firstSeen)
    .filter((d): d is string => !!d)
    .sort();

  if (dates.length === 0) {
    const currentYear = new Date().getFullYear();
    return {
      minYear: currentYear - 5,
      maxYear: currentYear,
      minDate: `${currentYear - 5}-01-01`,
      maxDate: `${currentYear}-12-31`,
    };
  }

  const currentYear = new Date().getFullYear();
  const minDate = dates[0] ?? `${currentYear - 5}-01-01`;
  const maxDate = dates[dates.length - 1] ?? `${currentYear}-12-31`;
  const minYear = Number.parseInt(minDate.slice(0, 4), 10) || currentYear - 5;
  const maxYear = Number.parseInt(maxDate.slice(0, 4), 10) || currentYear;

  return { minYear, maxYear, minDate, maxDate };
}

export function getScrubberRevealedArtists(
  artists: CloudArtistNode[],
  progress: number,
): Set<string> {
  if (progress >= 0.999) {
    return new Set(artists.map((a) => a.id));
  }

  const bounds = getScrubberTimelineBounds(artists);
  const minTime = new Date(bounds.minDate).getTime();
  const maxTime = new Date(bounds.maxDate).getTime();
  const cutoffTime = minTime + clamp(progress, 0, 1) * (maxTime - minTime);

  const revealed = new Set<string>();
  for (const artist of artists) {
    if (!artist.firstSeen) {
      // Artists without firstSeen appear at the end
      if (progress >= 0.9) revealed.add(artist.id);
      continue;
    }
    const artistTime = new Date(artist.firstSeen).getTime();
    if (artistTime <= cutoffTime) {
      revealed.add(artist.id);
    }
  }

  // Ensure at least 1 artist is shown if any exist and progress > 0
  if (revealed.size === 0 && artists.length > 0 && progress > 0) {
    const sorted = [...artists].sort((a, b) =>
      (a.firstSeen ?? '').localeCompare(b.firstSeen ?? ''),
    );
    if (sorted[0]) revealed.add(sorted[0].id);
  }

  return revealed;
}

export function getScrubberYearLabel(
  artists: CloudArtistNode[],
  progress: number,
): string {
  if (progress >= 0.999) return 'All time';
  const bounds = getScrubberTimelineBounds(artists);
  const minTime = new Date(bounds.minDate).getTime();
  const maxTime = new Date(bounds.maxDate).getTime();
  const cutoffTime = minTime + clamp(progress, 0, 1) * (maxTime - minTime);
  const year = new Date(cutoffTime).getFullYear();
  return Number.isNaN(year) ? 'All time' : String(year);
}

// ---------------------------------------------------------------------------
// FLOATING INFO CARD PLACEMENT (SCREEN BOUNDS CLAMPING)
// ---------------------------------------------------------------------------
export type ClampedCardPlacement = {
  left: number;
  top: number;
  placement: 'top' | 'bottom';
};

export function calculateCardPlacement(
  nodeScreen: Point,
  cardSize: { width: number; height: number },
  screenBounds: { width: number; height: number },
  nodeRadius: number,
  padding = 12,
): ClampedCardPlacement {
  const cardW = cardSize.width;
  const cardH = cardSize.height;

  // Center horizontally over node, clamped to screen edges
  const idealLeft = nodeScreen.x - cardW / 2;
  const left = clamp(idealLeft, padding, screenBounds.width - cardW - padding);

  // Check if there is room above the node
  const clearanceAbove = nodeScreen.y - nodeRadius - cardH - padding;
  if (clearanceAbove >= padding) {
    return {
      left,
      top: nodeScreen.y - nodeRadius - cardH - 10,
      placement: 'top',
    };
  }

  // Otherwise place below the node
  const clearanceBelow =
    screenBounds.height - (nodeScreen.y + nodeRadius + cardH + padding);
  const top =
    clearanceBelow >= 0
      ? nodeScreen.y + nodeRadius + 10
      : clamp(
          nodeScreen.y + nodeRadius + 10,
          padding,
          screenBounds.height - cardH - padding,
        );

  return {
    left,
    top,
    placement: 'bottom',
  };
}

// ---------------------------------------------------------------------------
// GESTURE CONFLICT RESOLVER STATE MACHINE
// ---------------------------------------------------------------------------
/**
 * Conflict Resolution Rule:
 * 1. Touch on empty space:
 *    - Moving immediately pans camera.
 *    - Holding for >= 250ms enters Touch Inspect mode.
 *    - In inspect mode, dragging across tests nodes with hitRadius + 12 and haptic ticks.
 * 2. Touch starting on a node:
 *    - Quick tap (<250ms, move < 8px): single tap -> opens Artist Card sheet.
 *    - Hold for >= 350ms and move: activates Node Dragging (moves the node, reheats simulation).
 *    - Short hold (250-349ms) or drag: enters Touch Inspect mode.
 * 3. Release:
 *    - If released over a node in inspect mode: keeps card pinned until tapped away.
 *    - If released over empty space: closes inspect mode.
 */
export type TouchGestureState =
  'idle' | 'panning' | 'inspecting' | 'dragging_node' | 'pinned';

export type TouchEventParams = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  elapsedMs: number;
  startedOnNode: boolean;
};

export function resolveTouchGesture(
  params: TouchEventParams,
): TouchGestureState {
  const distanceMoved = Math.hypot(
    params.currentX - params.startX,
    params.currentY - params.startY,
  );

  if (params.startedOnNode) {
    if (params.elapsedMs >= 350 && distanceMoved >= 6) {
      return 'dragging_node';
    }
    if (params.elapsedMs >= 250) {
      return 'inspecting';
    }
    if (distanceMoved >= 8) {
      return 'panning';
    }
    return 'idle';
  }

  // Started on empty space
  if (params.elapsedMs >= 250) {
    return 'inspecting';
  }
  if (distanceMoved >= 6) {
    return 'panning';
  }
  return 'idle';
}

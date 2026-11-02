import type { CloudArtistData } from './types';
import type { ComputedIdentity } from '../identity/types';
import { cloudExperienceStrings } from './experienceStrings';

export type TerritoryStat = {
  macro_slug: string;
  artist_count: number;
  concert_count: number;
  average_rating: number | null;
  first_seen: string | null;
  last_seen: string | null;
};

export type CloudLogArrival = {
  artist_id: string;
  created_at: string;
};

export type TourStop = {
  id: string;
  kicker: string;
  caption: string;
  macroSlug?: string;
  artistId?: string;
  year?: number;
};

export type TouchForce = {
  id: string;
  dx: number;
  dy: number;
  distance: number;
};

export type Tilt = { pitch: number; roll: number };
export type AtlasStep = {
  key: string;
  year: number;
  quarter?: number;
  cutoff: string;
};

export function detectNewTerritories(
  before: TerritoryStat[],
  after: TerritoryStat[],
): TerritoryStat[] {
  const previouslyExplored = new Set(
    before
      .filter((stat) => stat.concert_count > 0)
      .map((stat) => stat.macro_slug),
  );
  return after.filter(
    (stat) =>
      stat.concert_count > 0 && !previouslyExplored.has(stat.macro_slug),
  );
}

export function getNewArrivals(
  artists: CloudArtistData[],
  logs: CloudLogArrival[],
  lastViewedAt: string | null,
): CloudArtistData[] {
  if (!lastViewedAt) return [];
  const viewedAt = Date.parse(lastViewedAt);
  if (!Number.isFinite(viewedAt)) return [];
  const firstLoggedAt = new Map<string, number>();
  for (const log of logs) {
    const timestamp = Date.parse(log.created_at);
    if (!Number.isFinite(timestamp)) continue;
    firstLoggedAt.set(
      log.artist_id,
      Math.min(firstLoggedAt.get(log.artist_id) ?? Infinity, timestamp),
    );
  }
  return artists.filter((artist) => {
    const firstLog = firstLoggedAt.get(artist.id);
    return firstLog != null && firstLog > viewedAt;
  });
}

export function buildTourStops(
  stats: TerritoryStat[],
  identity: ComputedIdentity | null,
  cloudData: CloudArtistData[],
  prototypeTitle: string | null = null,
): TourStop[] {
  const stops: TourStop[] = [
    {
      id: 'overview',
      kicker: 'THE ATLAS',
      caption: cloudExperienceStrings.tour.overview,
    },
  ];
  const explored = stats.filter((territory) => territory.concert_count > 0);
  const biggest = [...explored].sort(
    (a, b) => b.concert_count - a.concert_count,
  )[0];
  if (biggest) {
    stops.push({
      id: 'biggest-territory',
      kicker: 'YOUR BIGGEST TERRITORY',
      caption: cloudExperienceStrings.tour.biggestTerritory(
        biggest.macro_slug.replaceAll('_', ' '),
      ),
      macroSlug: biggest.macro_slug,
    });
  }

  const artists = [...cloudData].filter((artist) => artist.log_count > 0);
  const mostSeen = [...artists].sort((a, b) => b.log_count - a.log_count)[0];
  if (mostSeen) {
    stops.push({
      id: 'most-seen-artist',
      kicker: 'A FAMILIAR FACE',
      caption: cloudExperienceStrings.tour.mostSeenArtist(
        mostSeen.name,
        mostSeen.log_count,
      ),
      artistId: mostSeen.id,
    });
  }

  const rated = artists.filter((artist) => artist.avg_rating != null);
  const highestRated = [...rated].sort(
    (a, b) =>
      (b.avg_rating ?? 0) - (a.avg_rating ?? 0) || b.log_count - a.log_count,
  )[0];
  if (highestRated) {
    stops.push({
      id: 'highest-rated-artist',
      kicker: 'FIVE-STAR MEMORY',
      caption: cloudExperienceStrings.tour.highestRatedArtist(
        highestRated.name,
      ),
      artistId: highestRated.id,
    });
  }

  const oldest = [...artists]
    .filter((artist) => artist.first_seen)
    .sort((a, b) => (a.first_seen ?? '').localeCompare(b.first_seen ?? ''))[0];
  if (oldest) {
    stops.push({
      id: 'oldest-artist',
      kicker: 'THE FIRST CHAPTER',
      caption: cloudExperienceStrings.tour.oldestArtist(oldest.name),
      artistId: oldest.id,
    });
  }

  const latest = [...artists]
    .filter((artist) => artist.last_seen)
    .sort((a, b) => (b.last_seen ?? '').localeCompare(a.last_seen ?? ''))[0];
  if (latest) {
    stops.push({
      id: 'most-recent-show',
      kicker: 'FRESH INK',
      caption: cloudExperienceStrings.tour.recentShow(latest.name),
      artistId: latest.id,
    });
  }

  const rarest = [...explored]
    .filter((territory) => territory !== biggest)
    .sort((a, b) => a.concert_count - b.concert_count)[0];
  if (rarest) {
    stops.push({
      id: 'rarest-territory',
      kicker: 'A RARE PRESSING',
      caption: cloudExperienceStrings.tour.rarestTerritory(
        rarest.macro_slug.replaceAll('_', ' '),
      ),
      macroSlug: rarest.macro_slug,
    });
  }

  if (identity?.musicalAge) {
    stops.push({
      id: 'musical-age',
      kicker: 'YOUR MUSICAL AGE',
      caption: identity.musicalAge.formattedText,
      year: identity.musicalAge.year,
    });
  }
  stops.push({
    id: 'closing',
    kicker: 'THE LAST PAGE',
    caption: cloudExperienceStrings.tour.closing(prototypeTitle),
  });
  return stops;
}

export function filterTilt(previous: Tilt, incoming: Tilt, alpha = 0.12): Tilt {
  const weight = Math.max(0, Math.min(1, alpha));
  const clampAngle = (angle: number) => Math.max(-0.35, Math.min(0.35, angle));
  return {
    pitch: clampAngle(
      previous.pitch + (incoming.pitch - previous.pitch) * weight,
    ),
    roll: clampAngle(previous.roll + (incoming.roll - previous.roll) * weight),
  };
}

export function touchFieldForces(
  nodes: { id: string; x?: number; y?: number; type?: string }[],
  touch: { x: number; y: number },
  radius = 90,
  maximum = 60,
): TouchForce[] {
  return nodes
    .filter((node) => node.type !== 'hub')
    .map((node) => {
      const dx = (node.x ?? 0) - touch.x;
      const dy = (node.y ?? 0) - touch.y;
      return { id: node.id, dx, dy, distance: Math.hypot(dx, dy) };
    })
    .filter((node) => node.distance > 0 && node.distance < radius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maximum)
    .map((node) => {
      const falloff = (1 - node.distance / radius) ** 2;
      return {
        id: node.id,
        dx: (node.dx / node.distance) * falloff,
        dy: (node.dy / node.distance) * falloff,
        distance: node.distance,
      };
    });
}

export function buildAtlasSteps(dates: string[], maximum = 30): AtlasStep[] {
  const limit = Math.max(1, Math.floor(maximum));
  const years = [
    ...new Set(dates.map((date) => Number.parseInt(date.slice(0, 4), 10))),
  ]
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (years.length === 0) return [];
  const firstYear = years[0]!;
  const lastYear = years[years.length - 1]!;
  if (lastYear - firstYear + 1 <= limit) {
    return Array.from(
      { length: lastYear - firstYear + 1 },
      (_, index) => firstYear + index,
    ).map((year) => ({
      key: `${year}`,
      year,
      cutoff: `${year}-12-31`,
    }));
  }
  const candidates: AtlasStep[] = [];
  for (let year = firstYear; year <= lastYear; year += 1) {
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      const month = quarter * 3;
      const cutoff = new Date(Date.UTC(year, month, 0))
        .toISOString()
        .slice(0, 10);
      candidates.push({ key: `${year}-Q${quarter}`, year, quarter, cutoff });
    }
  }
  const selectedCount = Math.min(limit, candidates.length);
  const selected = Array.from(
    { length: selectedCount },
    (_, index) =>
      candidates[
        Math.round(
          (index * (candidates.length - 1)) / Math.max(1, selectedCount - 1),
        )
      ]!,
  );
  selected[selected.length - 1] = {
    key: `${lastYear}-Q4`,
    year: lastYear,
    quarter: 4,
    cutoff: `${lastYear}-12-31`,
  };
  return selected;
}

export function atlasPictureCacheKey(userId: string, step: AtlasStep): string {
  return `cloud-atlas:${userId}:v1:${step.key}`;
}

export function buildDensityGrid(
  points: { x: number; y: number }[],
  resolution = 48,
): number[] {
  const size = Math.max(1, Math.floor(resolution));
  const grid = new Array<number>(size * size).fill(0);
  for (const point of points) {
    const x = Math.max(0, Math.min(size - 1, Math.floor(point.x * size)));
    const y = Math.max(0, Math.min(size - 1, Math.floor(point.y * size)));
    const index = y * size + x;
    grid[index] = (grid[index] ?? 0) + 1;
  }
  const max = Math.max(1, ...grid);
  return grid.map((value) => Math.round((value / max) * 255));
}

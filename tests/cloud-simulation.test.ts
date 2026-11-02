import { describe, expect, it } from '@jest/globals';
import {
  SpatialHashGrid,
  artistNodeRadius,
  buildCloudNodes,
  buildCoattendanceLinks,
  cacheCloudPositions,
  calculateCardPlacement,
  cloudPositionCache,
  getScrubberRevealedArtists,
  getScrubberTimelineBounds,
  getScrubberYearLabel,
  hasCloudPositionCache,
  hitTestAtScreenCoords,
  hitTestCloudNode,
  reassignCloudMode,
  resolveTouchGesture,
  toWorld,
  type Camera,
  type CloudArtistNode,
} from '../src/features/cloud/simulation';
import type { ConcertWithRelations, UserArtistSummary } from '../src/features/concerts/types';
import type { CloudArtistData, CloudCoattendanceLink } from '../src/features/cloud/types';

const artist = (id: string, macro: string, logCount: number, overrides: Partial<UserArtistSummary> = {}): UserArtistSummary => ({
  id,
  name: `Artist ${id}`,
  name_normalized: `artist ${id}`,
  spotify_id: null,
  image_url_large: null,
  image_url_thumb: null,
  genres: [],
  macro_genres: [macro],
  primary_macro: macro,
  popularity: null,
  source: 'manual',
  created_by: null,
  last_synced_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  log_count: logCount,
  avg_rating: 4,
  max_rating: 5,
  first_seen: null,
  last_seen: null,
  ...overrides,
}) as unknown as UserArtistSummary;

describe('cloud simulation & graph model', () => {
  describe('1. radius function', () => {
    it('scales artist radius with log count and rating clamped between 14 and 44', () => {
      expect(artistNodeRadius(1, 1)).toBe(15);
      expect(artistNodeRadius(100, 5)).toBe(44);
      expect(artistNodeRadius(4, 4)).toBeGreaterThan(artistNodeRadius(1, 3));
      // Clamping checks
      expect(artistNodeRadius(0, 0)).toBe(14);
      expect(artistNodeRadius(1000, 5)).toBe(44);
    });
  });

  describe('2. hit-testing with camera transforms & spatial grid', () => {
    it('hit-tests top node with extra touch radius allowance', () => {
      const { nodes } = buildCloudNodes([artist('a', 'indie', 1)], 'genre');
      const node = nodes.find((item) => item.type === 'artist');
      if (!node) throw new Error('Artist node was not created');
      node.x = 10;
      node.y = -5;

      expect(hitTestCloudNode([node], 10 + node.radius + 7, -5)).toBe(node);
      expect(hitTestCloudNode([node], 10 + node.radius + 9, -5)).toBeUndefined();
    });

    it('transforms screen touch coordinates through camera translation and scale', () => {
      const camera: Camera = { x: 50, y: -30, scale: 2.0 };
      const screenWidth = 400;
      const screenHeight = 600;

      const { nodes } = buildCloudNodes([artist('a', 'indie', 2)], 'genre');
      const node = nodes.find((n) => n.type === 'artist');
      if (!node) throw new Error('Node not created');
      node.x = 20;
      node.y = 40;

      // Screen coords: width/2 + camera.x + worldX * scale
      // 200 + 50 + 20 * 2 = 290
      // 300 - 30 + 40 * 2 = 350
      const hit = hitTestAtScreenCoords(
        { x: 290, y: 350 },
        camera,
        screenWidth,
        screenHeight,
        nodes,
        8,
      );
      expect(hit).toBe(node);

      // Miss at far coordinate
      const miss = hitTestAtScreenCoords(
        { x: 50, y: 50 },
        camera,
        screenWidth,
        screenHeight,
        nodes,
        8,
      );
      expect(miss).toBeUndefined();
    });

    it('spatial hash grid correctly indexes and queries nearby nodes in O(1)', () => {
      const grid = new SpatialHashGrid(80);
      const { nodes } = buildCloudNodes([
        artist('a', 'indie', 1),
        artist('b', 'rock', 1),
      ], 'genre');
      const a = nodes[0]!;
      const b = nodes[1]!;
      a.x = 100;
      a.y = 100;
      b.x = 800;
      b.y = 800;

      grid.rebuild([a, b]);

      const nearbyA = grid.query(105, 95, 50);
      expect(nearbyA).toContain(a);
      expect(nearbyA).not.toContain(b);

      const nearbyB = grid.query(810, 790, 50);
      expect(nearbyB).toContain(b);
      expect(nearbyB).not.toContain(a);
    });
  });

  describe('3. hover/inspect state machine (conflict resolution)', () => {
    it('touch on empty space held for >= 250ms enters inspecting mode', () => {
      const state = resolveTouchGesture({
        startX: 100,
        startY: 100,
        currentX: 102,
        currentY: 101,
        elapsedMs: 260,
        startedOnNode: false,
      });
      expect(state).toBe('inspecting');
    });

    it('touch on empty space dragged immediately activates camera panning', () => {
      const state = resolveTouchGesture({
        startX: 100,
        startY: 100,
        currentX: 120,
        currentY: 130,
        elapsedMs: 80,
        startedOnNode: false,
      });
      expect(state).toBe('panning');
    });

    it('long-press on a node >= 350ms with movement activates node dragging', () => {
      const state = resolveTouchGesture({
        startX: 50,
        startY: 50,
        currentX: 65,
        currentY: 60,
        elapsedMs: 380,
        startedOnNode: true,
      });
      expect(state).toBe('dragging_node');
    });

    it('short hold (250ms-349ms) on a node enters inspecting mode instead of dragging', () => {
      const state = resolveTouchGesture({
        startX: 50,
        startY: 50,
        currentX: 52,
        currentY: 51,
        elapsedMs: 270,
        startedOnNode: true,
      });
      expect(state).toBe('inspecting');
    });

    it('quick tap (<250ms with minimal movement) remains idle until tap event fires', () => {
      const state = resolveTouchGesture({
        startX: 50,
        startY: 50,
        currentX: 51,
        currentY: 50,
        elapsedMs: 90,
        startedOnNode: true,
      });
      expect(state).toBe('idle');
    });
  });

  describe('4. mode-morph assignment', () => {
    it('smooth morph reassignCloudMode preserves existing node identities and coordinates', () => {
      const summary = [artist('a', 'indie', 3), artist('b', 'rock', 5)];
      const initial = buildCloudNodes(summary, 'genre');
      const artistA = initial.nodes.find((n) => n.id === 'a')!;
      artistA.x = 123;
      artistA.y = 456;
      artistA.vx = 2;
      artistA.vy = -3;

      const morphed = reassignCloudMode(initial.nodes, 'venue', summary);
      const morphedA = morphed.nodes.find((n) => n.id === 'a')!;

      expect(morphedA.x).toBe(123);
      expect(morphedA.y).toBe(456);
      expect(morphedA.vx).toBe(2);
      expect(morphedA.vy).toBe(-3);
      expect(morphedA.type).toBe('artist');
    });

    it('morph to era mode groups artists by decade and creates unknown era hub for null begin_year', () => {
      const summary: CloudArtistData[] = [
        {
          id: 'vintage',
          name: 'The 70s Band',
          image_url_thumb: null,
          image_url_large: null,
          primary_macro: 'rock',
          macro_genres: ['rock'],
          genres: ['classic rock'],
          begin_year: 1974,
          log_count: 2,
          avg_rating: 4.5,
          max_rating: 5,
          first_seen: '2020-01-01',
          last_seen: '2022-01-01',
          venue_type_counts: {},
          logs: [],
        },
        {
          id: 'modern',
          name: 'New Band',
          image_url_thumb: null,
          image_url_large: null,
          primary_macro: 'pop',
          macro_genres: ['pop'],
          genres: [],
          begin_year: null,
          log_count: 1,
          avg_rating: 3.5,
          max_rating: 4,
          first_seen: '2023-01-01',
          last_seen: '2023-01-01',
          venue_type_counts: {},
          logs: [],
        },
      ];

      const { nodes } = buildCloudNodes(summary, 'era');
      const hub70s = nodes.find((n) => n.type === 'hub' && n.slug === '1970s');
      const hubUnknown = nodes.find((n) => n.type === 'hub' && n.slug === 'unknown-era');

      expect(hub70s).toBeDefined();
      expect(hub70s).toMatchObject({ label: '1970s', count: 1 });
      expect(hubUnknown).toBeDefined();
      expect(hubUnknown).toMatchObject({ label: 'Unknown era', count: 1 });
    });

    it('morph to year mode groups artists by years the user attended', () => {
      const summary: CloudArtistData[] = [
        {
          id: 'touring',
          name: 'Touring Artist',
          image_url_thumb: null,
          image_url_large: null,
          primary_macro: 'indie',
          macro_genres: ['indie'],
          genres: [],
          begin_year: 2010,
          log_count: 2,
          avg_rating: 4,
          max_rating: 4,
          first_seen: '2019-06-01',
          last_seen: '2023-08-15',
          venue_type_counts: {},
          logs: [
            ['2019-06-01', 'festival', 4],
            ['2023-08-15', 'stadium', 4],
          ],
        },
      ];

      const { nodes, links } = buildCloudNodes(summary, 'year');
      const hub2019 = nodes.find((n) => n.type === 'hub' && n.slug === '2019');
      const hub2023 = nodes.find((n) => n.type === 'hub' && n.slug === '2023');

      expect(hub2019).toBeDefined();
      expect(hub2023).toBeDefined();
      const artistLinks = links.filter((l) => l.source === 'touring');
      expect(artistLinks).toHaveLength(2);
    });
  });

  describe('5. timeline scrubber reveal order', () => {
    const testArtists: CloudArtistNode[] = [
      {
        id: 'early',
        type: 'artist',
        artistId: 'early',
        name: 'Early Artist',
        imageUrl: null,
        primaryMacro: 'rock',
        clusterTarget: 'rock',
        logCount: 1,
        avgRating: 4,
        maxRating: 4,
        beginYear: 2000,
        firstSeen: '2018-05-10',
        lastSeen: '2018-05-10',
        venueTypeCounts: {},
        logs: [],
        hubTargets: ['rock'],
        genreSlugs: ['rock'],
        radius: 20,
        color: '#FF5D73',
        clusterColor: '#FF5D73',
        phaseOffset: 0,
      },
      {
        id: 'mid',
        type: 'artist',
        artistId: 'mid',
        name: 'Mid Artist',
        imageUrl: null,
        primaryMacro: 'indie',
        clusterTarget: 'indie',
        logCount: 2,
        avgRating: 4,
        maxRating: 4,
        beginYear: 2012,
        firstSeen: '2021-08-20',
        lastSeen: '2021-08-20',
        venueTypeCounts: {},
        logs: [],
        hubTargets: ['indie'],
        genreSlugs: ['indie'],
        radius: 24,
        color: '#B68CFF',
        clusterColor: '#B68CFF',
        phaseOffset: 1,
      },
      {
        id: 'recent',
        type: 'artist',
        artistId: 'recent',
        name: 'Recent Artist',
        imageUrl: null,
        primaryMacro: 'electronic',
        clusterTarget: 'electronic',
        logCount: 1,
        avgRating: 5,
        maxRating: 5,
        beginYear: 2020,
        firstSeen: '2024-03-15',
        lastSeen: '2024-03-15',
        venueTypeCounts: {},
        logs: [],
        hubTargets: ['electronic'],
        genreSlugs: ['electronic'],
        radius: 22,
        color: '#4DE3D1',
        clusterColor: '#4DE3D1',
        phaseOffset: 2,
      },
    ];

    it('calculates timeline bounds spanning earliest to latest first_seen', () => {
      const bounds = getScrubberTimelineBounds(testArtists);
      expect(bounds.minYear).toBe(2018);
      expect(bounds.maxYear).toBe(2024);
      expect(bounds.minDate).toBe('2018-05-10');
      expect(bounds.maxDate).toBe('2024-03-15');
    });

    it('reveals artists chronologically according to scrubber progress', () => {
      // At progress 0: only earliest artist is visible
      const atStart = getScrubberRevealedArtists(testArtists, 0.0);
      expect(atStart.has('early')).toBe(true);
      expect(atStart.has('recent')).toBe(false);

      // At progress 0.6: early and mid are visible, recent is not yet
      const atMid = getScrubberRevealedArtists(testArtists, 0.6);
      expect(atMid.has('early')).toBe(true);
      expect(atMid.has('mid')).toBe(true);
      expect(atMid.has('recent')).toBe(false);

      // At progress 1.0: all artists revealed
      const atEnd = getScrubberRevealedArtists(testArtists, 1.0);
      expect(atEnd.size).toBe(3);
      expect(atEnd.has('recent')).toBe(true);
    });

    it('formats scrubber year label accurately along the timeline', () => {
      expect(getScrubberYearLabel(testArtists, 0.0)).toBe('2018');
      expect(getScrubberYearLabel(testArtists, 1.0)).toBe('All time');
    });
  });

  describe('6. co-attendance link builder', () => {
    it('converts raw RPC links into constellation links between active artist nodes', () => {
      const { nodes } = buildCloudNodes([
        artist('a', 'indie', 2),
        artist('b', 'rock', 2),
        artist('c', 'pop', 1),
      ], 'genre');
      const artistNodes = nodes.filter((n): n is CloudArtistNode => n.type === 'artist');

      const rawLinks: CloudCoattendanceLink[] = [
        {
          source_id: 'a',
          target_id: 'b',
          weight: 3,
          shared_dates: ['2023-06-01', '2023-06-02', '2024-05-10'],
          venue_names: ['Primavera Sound', 'Razzmatazz'],
        },
        {
          source_id: 'a',
          target_id: 'non_existent',
          weight: 1,
          shared_dates: ['2024-01-01'],
          venue_names: [],
        },
      ];

      const constellationLinks = buildCoattendanceLinks(rawLinks, artistNodes);

      expect(constellationLinks).toHaveLength(1);
      expect(constellationLinks[0]).toMatchObject({
        source: 'a',
        target: 'b',
        weight: 3,
        type: 'constellation',
        sharedDates: ['2023-06-01', '2023-06-02', '2024-05-10'],
        venueNames: ['Primavera Sound', 'Razzmatazz'],
      });
    });
  });

  describe('7. floating card placement near screen edges', () => {
    const cardSize = { width: 250, height: 180 };
    const screenBounds = { width: 400, height: 700 };

    it('places card above node when there is sufficient clearance', () => {
      const nodeScreen = { x: 200, y: 400 };
      const placement = calculateCardPlacement(nodeScreen, cardSize, screenBounds, 25, 12);

      expect(placement.placement).toBe('top');
      expect(placement.top).toBeLessThan(nodeScreen.y);
      expect(placement.left).toBeGreaterThanOrEqual(12);
      expect(placement.left + cardSize.width).toBeLessThanOrEqual(screenBounds.width - 12);
    });

    it('flips card below node when near top edge of the screen', () => {
      const nodeScreen = { x: 200, y: 60 };
      const placement = calculateCardPlacement(nodeScreen, cardSize, screenBounds, 25, 12);

      expect(placement.placement).toBe('bottom');
      expect(placement.top).toBeGreaterThan(nodeScreen.y);
    });

    it('clamps horizontal position when node is near the left edge', () => {
      const nodeScreen = { x: 20, y: 350 };
      const placement = calculateCardPlacement(nodeScreen, cardSize, screenBounds, 25, 12);

      expect(placement.left).toBe(12);
    });

    it('clamps horizontal position when node is near the right edge', () => {
      const nodeScreen = { x: 390, y: 350 };
      const placement = calculateCardPlacement(nodeScreen, cardSize, screenBounds, 25, 12);

      expect(placement.left).toBe(screenBounds.width - cardSize.width - 12);
    });
  });

  describe('8. caching settled positions', () => {
    it('caches positions per user and mode and detects cache completeness', () => {
      const { nodes } = buildCloudNodes([artist('a', 'indie', 1)], 'genre');
      const firstArtist = nodes.find((node) => node.type === 'artist')!;
      firstArtist.x = 30;
      firstArtist.y = -12;
      cacheCloudPositions('user-a:genre', nodes);

      expect(cloudPositionCache.get('user-a:genre')?.get(firstArtist.id)).toEqual({ x: 30, y: -12 });
      expect(hasCloudPositionCache('user-a', 'genre', nodes)).toBe(true);
      expect(hasCloudPositionCache('user-a', 'genre', [...nodes, { ...firstArtist, id: 'new' }])).toBe(false);
      expect(cloudPositionCache.get('user-a:venue')).toBeUndefined();
    });
  });
});
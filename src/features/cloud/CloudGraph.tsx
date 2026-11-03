import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  AppState,
  ActivityIndicator,
  Pressable,
  Platform,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceMotion } from 'expo-sensors';
import {
  Atlas,
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Image as SkiaImage,
  Line,
  Path,
  Picture,
  PaintStyle,
  Rect,
  Skia,
  rect,
  useTexture,
  useImage,
} from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  ListFilter,
  LocateFixed,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp as reanimatedClamp,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  useFrameCallback,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '../../components/ui/Text';
import { Mascot } from '../../components/brand/Mascot';
import { isMacroGenre } from '../../components/brand/mascotColors';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  useTerritoryDiscoveries,
  useUserCloudData,
  useUserTerritoryStats,
} from './hooks';
import { useUserArtistSummary, useUserConcerts } from '../concerts/hooks';
import { useArtistCard } from '../artists/ArtistCardProvider';
import { useMe } from '../auth/hooks';
import {
  MACRO_GENRES,
  MACRO_GENRE_ORDER,
  type MacroGenre,
} from '../genres/macroGenres';
import { VENUE_TYPES } from '../venues/venueTypes';
import { useAuthStore } from '../auth/store';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily } from '../../theme/tokens';
import { GenreLabel, Grain, Stamp, VenueLabel } from '../../components/paper';
import {
  buildAtlasTerritories,
  buildTerritoryOutline,
  type AtlasTerritory,
} from './atlas';
import { CloudInfoCard } from './CloudInfoCard';
import { CloudScrubber } from './CloudScrubber';
import { CloudMiniMap } from './CloudMiniMap';
import { CloudExperienceHud } from './CloudExperienceHud';
import { CloudAccessibleList } from './CloudAccessibleList';
import { CloudEmptyWorld } from './CloudEmptyWorld';
import { CloudPosterSheet } from './CloudPosterSheet';
import { CloudComparePanel } from './CloudComparePanel';
import { CloudTerritoryCard } from './CloudTerritoryCard';
import { IdentitySheet } from '../identity';
import { useMusicIdentity } from '../identity/hooks';
import {
  SpatialHashGrid,
  buildCloudNodes,
  buildCoattendanceLinks,
  cacheCloudPositions,
  calculateCardPlacement,
  clamp,
  createCloudSimulation,
  fitNodes,
  getScrubberRevealedArtists,
  getScrubberYearLabel,
  hitTestAtScreenCoords,
  persistCloudPositions,
  reassignCloudMode,
  restoreCloudPositions,
  screenPoint,
  toWorld,
  warmCloudSimulation,
  type Camera,
  type CloudArtistNode,
  type CloudHubNode,
  type CloudLink,
  type CloudMode,
  type CloudNode,
  type Point,
} from './simulation';
import type { CloudCoattendanceLink } from './types';
import {
  atlasPictureCacheKey,
  buildAtlasSteps,
  buildDensityGrid,
  buildTourStops,
  filterTilt,
  getNewArrivals,
  touchFieldForces,
  type TourStop,
} from './experience';
import { cloudExperienceStrings } from './experienceStrings';
import { cloudExperiencePreferences } from './experiencePrefs';
import { playCloudSound } from './sounds';
import {
  chooseDefaultCloudTier,
  cloudTierSettings,
  FrameTimeMonitor,
  lowerCloudTier,
  percentile95,
  type CloudQualitySetting,
  type CloudVisualTier,
} from './performance';
import { compareFeatureAvailable, type CompareAtlas } from './compare';
import { isAccessibleListRequired } from './accessibility';
import { normalizeCloudArtists, normalizeUserCloudData } from './normalize';
let introRunInSession: string | null = null;

// ---------------------------------------------------------------------------
// SKIA GLYPH: Die-cut artist sticker with hard ink edge and venue satellites
// ---------------------------------------------------------------------------
function CloudArtistGlyph({
  node,
  x,
  y,
  radius,
  opacity,
  showImage,
  showSatellites,
  pulseProgress,
  isHovered,
  isDimmed,
  compareOutline = false,
  onImageLoaded,
  inkColor,
  accentColor,
}: {
  node: CloudArtistNode;
  x: number;
  y: number;
  radius: number;
  opacity: number;
  showImage: boolean;
  showSatellites: boolean;
  pulseProgress: number;
  isHovered: boolean;
  isDimmed: boolean;
  compareOutline?: boolean;
  onImageLoaded?: (id: string) => void;
  inkColor: string;
  accentColor: string;
}) {
  const image = useImage(node.imageUrl ?? undefined);

  useEffect(() => {
    if (image) onImageLoaded?.(node.id);
  }, [image, node.id, onImageLoaded]);

  const effectiveRadius = radius * (isHovered ? 1.7 : 1);

  const clip = useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(x, y, Math.max(1, effectiveRadius - 2));
    return path;
  }, [effectiveRadius, x, y]);

  // Five-star artists receive a printed orange mark.
  const isFiveStar =
    (node.avgRating >= 4.95 || node.avgRating === 5) && node.logCount > 0;

  // Satellites calculation (max 8 visible)
  const satellites = useMemo(() => {
    if (!showSatellites || node.logs.length === 0) return [];
    const count = Math.min(8, node.logs.length);
    const dots: { cx: number; cy: number; color: string; radius: number }[] =
      [];

    for (let i = 0; i < count; i++) {
      const log = node.logs[i];
      const venueType = log ? log[1] : 'other';
      const venueColor = VENUE_TYPES[venueType]?.primaryColor ?? inkColor;
      const orbitDistance = effectiveRadius + 8 + (i % 2) * 5;
      const angle = (2 * Math.PI * i) / count;

      dots.push({
        cx: x + Math.cos(angle) * orbitDistance,
        cy: y + Math.sin(angle) * orbitDistance,
        color: venueColor,
        radius: Math.max(1.8, Math.min(3.2, effectiveRadius * 0.11)),
      });
    }
    return dots;
  }, [showSatellites, node.logs, effectiveRadius, x, y, inkColor]);

  return (
    <Group opacity={isDimmed ? 0.35 : opacity}>
      {/* Five-star artists receive a printed orange ink ring. */}
      {isFiveStar ? (
        <Circle
          cx={x}
          cy={y}
          r={effectiveRadius + 4}
          color={accentColor}
          opacity={1}
          style="stroke"
          strokeWidth={1.8}
        />
      ) : null}

      {/* Pulse ring for search locate */}
      {pulseProgress > 0 ? (
        <Circle
          cx={x}
          cy={y}
          r={effectiveRadius + pulseProgress * 18}
          color={accentColor}
          opacity={1 - pulseProgress}
          style="stroke"
          strokeWidth={2}
        />
      ) : null}

      {/* Solid base fill */}
      <Circle
        cx={x}
        cy={y}
        r={effectiveRadius}
        color={node.color}
        opacity={compareOutline ? 0.12 : 1}
      />

      {/* Circular photo cutout */}
      {showImage && image && !compareOutline ? (
        <Group clip={clip}>
          <SkiaImage
            image={image}
            x={x - effectiveRadius + 2}
            y={y - effectiveRadius + 2}
            width={(effectiveRadius - 2) * 2}
            height={(effectiveRadius - 2) * 2}
            fit="cover"
          />
        </Group>
      ) : null}

      {/* Ink outline */}
      {compareOutline ? (
        <Path
          path={(() => {
            const outline = Skia.Path.Make();
            outline.addCircle(x, y, effectiveRadius);
            return outline;
          })()}
          color={inkColor}
          style="stroke"
          strokeWidth={2}
        >
          <DashPathEffect intervals={[5, 4]} />
        </Path>
      ) : (
        <Circle
          cx={x}
          cy={y}
          r={effectiveRadius}
          color={isHovered ? inkColor : inkColor}
          style="stroke"
          strokeWidth={isHovered ? 2.5 : 1.8}
        />
      )}

      {/* Satellites: individual concert dots orbiting artist bubble */}
      {satellites.map((sat, idx) => (
        <Path
          key={`sat-${idx}`}
          path={makeVenueStamp(sat.cx, sat.cy, sat.radius)}
          color={sat.color}
        />
      ))}
    </Group>
  );
}

function makeVenueStamp(x: number, y: number, radius: number) {
  const width = radius * 2.2;
  const height = radius * 1.65;
  const notch = radius * 0.3;
  const path = Skia.Path.Make();
  path.moveTo(x - width / 2, y - height / 2);
  path.lineTo(x + width / 2, y - height / 2);
  path.lineTo(x + width / 2, y - notch);
  path.lineTo(x + width / 2 - notch, y);
  path.lineTo(x + width / 2, y + notch);
  path.lineTo(x + width / 2, y + height / 2);
  path.lineTo(x - width / 2, y + height / 2);
  path.lineTo(x - width / 2, y + notch);
  path.lineTo(x - width / 2 + notch, y);
  path.lineTo(x - width / 2, y - notch);
  path.close();
  return path;
}

// ---------------------------------------------------------------------------
// SKIA GLYPH: Genre / Cluster Hub with a printed ink outline
// ---------------------------------------------------------------------------
function CloudHubGlyph({
  node,
  x,
  y,
  radius,
  opacity,
  inkColor,
  shadowColor,
}: {
  node: CloudHubNode;
  x: number;
  y: number;
  radius: number;
  opacity: number;
  inkColor: string;
  shadowColor: string;
}) {
  const effectiveRadius = radius;

  return (
    <Group opacity={opacity}>
      {/* Offset shadow and low-contrast print fill. */}
      <Circle cx={x + 3} cy={y + 3} r={effectiveRadius} color={shadowColor} />

      {/* Soft translucent disc (no hard outlines) */}
      <Circle
        cx={x}
        cy={y}
        r={effectiveRadius}
        color={node.color}
        opacity={0.16}
      />

      {/* Sharp edge replaces the former blurred halo. */}
      <Circle
        cx={x}
        cy={y}
        r={effectiveRadius}
        color={inkColor}
        opacity={0.8}
        style="stroke"
        strokeWidth={1.5}
      />
    </Group>
  );
}

function AtlasTerritoriesLayer({
  territories,
  nodes,
  revealedArtistIds,
  camera,
  width,
  height,
  backgroundColor,
  inkColor,
  reliefLevels,
  waterlines,
}: {
  territories: AtlasTerritory[];
  nodes: CloudNode[];
  revealedArtistIds?: Set<string>;
  camera: Camera;
  width: number;
  height: number;
  backgroundColor: string;
  inkColor: string;
  reliefLevels: number;
  waterlines: boolean;
}) {
  const artistsByTerritory = new Map<string, CloudArtistNode[]>();
  for (const node of nodes) {
    if (node.type !== 'artist') continue;
    for (const slug of node.genreSlugs) {
      const artists = artistsByTerritory.get(slug) ?? [];
      artists.push(node);
      artistsByTerritory.set(slug, artists);
    }
  }
  return (
    <>
      {territories.map((territory) => {
        const territoryArtists = artistsByTerritory.get(territory.slug) ?? [];
        const revealedCount = revealedArtistIds
          ? territoryArtists.filter((artist) =>
              revealedArtistIds.has(artist.id),
            ).length
          : territoryArtists.length;
        const printProgress = territoryArtists.length
          ? revealedCount / territoryArtists.length
          : 0;
        const center = screenPoint(territory, camera, width, height);
        const radius = territory.radius * camera.scale;
        const points = buildTerritoryOutline(territory.slug, radius);
        const path = Skia.Path.Make();
        const firstPoint = points[0];
        if (!firstPoint) return null;
        path.moveTo(center.x + firstPoint.x, center.y + firstPoint.y);
        for (const point of points.slice(1))
          path.lineTo(center.x + point.x, center.y + point.y);
        path.close();

        const shadow = path.copy();
        shadow.offset(4, 5);
        const bounds = path.getBounds();
        const waterlinePaths: React.ReactNode[] = [];
        if (waterlines) {
          for (let level = 1; level < reliefLevels; level += 1) {
            const contour = buildTerritoryOutline(
              territory.slug,
              radius * (1 - level * 0.1),
            );
            const contourPath = Skia.Path.Make();
            contour.forEach((point, index) => {
              const x = center.x + point.x;
              const y = center.y + point.y;
              if (index === 0) contourPath.moveTo(x, y);
              else contourPath.lineTo(x, y);
            });
            contourPath.close();
            waterlinePaths.push(
              <Path
                key={`waterline-${level}`}
                path={contourPath}
                color={inkColor}
                opacity={0.12}
                style="stroke"
                strokeWidth={0.8}
              />,
            );
          }
        }
        const patternElements: React.ReactNode[] = [];
        const spacing = Math.max(12, 19 * camera.scale);
        const inside = (x: number, y: number) => {
          let result = false;
          for (
            let i = 0, j = points.length - 1;
            i < points.length;
            j = i, i += 1
          ) {
            const a = points[i]!;
            const b = points[j]!;
            const crosses =
              a.y > y !== b.y > y &&
              x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x;
            if (crosses) result = !result;
          }
          return result;
        };

        if (territory.pattern === 'dots' || territory.pattern === 'checker') {
          for (
            let y = bounds.y + spacing / 2;
            y < bounds.y + bounds.height;
            y += spacing
          ) {
            for (
              let x = bounds.x + spacing / 2;
              x < bounds.x + bounds.width;
              x += spacing
            ) {
              const localX = x - center.x;
              const localY = y - center.y;
              if (!inside(localX, localY)) continue;
              patternElements.push(
                <Circle
                  key={`${x}:${y}`}
                  cx={x}
                  cy={y}
                  r={Math.max(1, spacing * 0.09)}
                  color={territory.color}
                />,
              );
            }
          }
        } else {
          const diagonal =
            territory.pattern === 'stripes' ||
            territory.pattern === 'crosshatch' ||
            territory.pattern === 'diagonal_bars' ||
            territory.pattern === 'zigzag';
          const stride = Math.max(10, 17 * camera.scale);
          for (
            let offset = -bounds.height;
            offset < bounds.width + bounds.height;
            offset += stride
          ) {
            const line = diagonal ? Skia.Path.Make() : null;
            if (line) {
              line.moveTo(bounds.x + offset, bounds.y + bounds.height);
              line.lineTo(bounds.x + offset + bounds.height, bounds.y);
              patternElements.push(
                <Path
                  key={`pattern-${offset}`}
                  path={line}
                  color={territory.color}
                  opacity={0.45}
                  style="stroke"
                  strokeWidth={0.8}
                />,
              );
            } else {
              patternElements.push(
                <Line
                  key={`pattern-${offset}`}
                  p1={{ x: bounds.x + offset, y: bounds.y }}
                  p2={{ x: bounds.x + offset, y: bounds.y + bounds.height }}
                  color={territory.color}
                  opacity={0.45}
                  strokeWidth={0.8}
                />,
              );
            }
          }
        }

        return (
          <Group key={territory.slug}>
            <Path
              path={shadow}
              color={backgroundColor}
              opacity={0.8 * printProgress}
            />
            <Path
              path={path}
              color={territory.color}
              opacity={0.1 * printProgress}
            />
            <Group clip={path} opacity={printProgress}>
              {patternElements}
            </Group>
            {waterlinePaths}
            <Path
              path={path}
              color={inkColor}
              opacity={0.55}
              style="stroke"
              strokeWidth={1.2}
            />
          </Group>
        );
      })}
    </>
  );
}

const CachedAtlasTerritoriesLayer = memo(AtlasTerritoriesLayer);

function CloudStickerShadows({
  artists,
  activeArtistId,
  scale,
  shadowColor,
}: {
  artists: { node: CloudArtistNode; point: Point }[];
  activeArtistId: string | null | undefined;
  scale: number;
  shadowColor: string;
}) {
  const texture = useTexture(
    <Circle cx={10} cy={10} r={10} color={shadowColor} />,
    { width: 20, height: 20 },
    [shadowColor],
  );
  const sprite = useMemo(() => rect(0, 0, 20, 20), []);
  const sprites = artists.map(() => sprite);
  const transforms = artists.map(({ node, point }) => {
    const radius = Math.max(2.5, node.radius * scale);
    const effectiveRadius = radius * (node.id === activeArtistId ? 1.7 : 1);
    const shadowRadius = effectiveRadius + 2;
    const spriteScale = shadowRadius / 10;
    return Skia.RSXform(
      spriteScale,
      0,
      point.x - shadowRadius + 3,
      point.y - shadowRadius + 3,
    );
  });

  return <Atlas image={texture} sprites={sprites} transforms={transforms} />;
}

// ---------------------------------------------------------------------------
// MAIN CLOUD CANVAS
// ---------------------------------------------------------------------------
function CloudCanvas({
  nodes,
  territories,
  links,
  coattendanceLinks,
  backboneLinks,
  constellationMode,
  camera,
  width,
  height,
  selectedSlug,
  focusedArtistId,
  hoveredArtistId,
  inspectedArtistId,
  pulseArtistId,
  pulseProgress,
  revealedArtistIds,
  onImageLoaded,
  onDrawCallsChange,
  backgroundColor,
  inkColor,
  shadowColor,
  accentColor,
  tier,
  compareArtists,
}: {
  nodes: CloudNode[];
  territories: AtlasTerritory[];
  links: CloudLink[];
  coattendanceLinks: CloudLink[];
  backboneLinks: CloudLink[];
  constellationMode: boolean;
  camera: Camera;
  width: number;
  height: number;
  selectedSlug?: string | null;
  focusedArtistId?: string | null;
  hoveredArtistId?: string | null;
  inspectedArtistId?: string | null;
  pulseArtistId?: string | null;
  pulseProgress: number;
  revealedArtistIds?: Set<string>;
  onImageLoaded?: (id: string) => void;
  onDrawCallsChange?: (count: number) => void;
  backgroundColor: string;
  inkColor: string;
  shadowColor: string;
  accentColor: string;
  tier: CloudVisualTier;
  compareArtists: {
    node: CloudArtistNode;
    shared: boolean;
    sourceNode: CloudArtistNode | null;
  }[];
}) {
  const activeArtistId = hoveredArtistId ?? inspectedArtistId;
  const rawReliefLevel =
    camera.scale < 0.25
      ? 1
      : camera.scale < 0.5
        ? 2
        : camera.scale < 1
          ? 3
          : camera.scale < 2
            ? 4
            : 5;
  const reliefLevel = Math.min(
    cloudTierSettings[tier].reliefLevels,
    rawReliefLevel,
  );

  // Viewport culling: filter onscreen nodes
  const onscreen = useMemo(() => {
    return nodes
      .map((node) => ({
        node,
        point: screenPoint(node, camera, width, height),
      }))
      .filter(({ node, point }) => {
        const rad = node.radius * camera.scale;
        return (
          point.x > -rad - 40 &&
          point.x < width + rad + 40 &&
          point.y > -rad - 40 &&
          point.y < height + rad + 40
        );
      });
  }, [nodes, camera, width, height]);

  const artists = onscreen.filter(
    (item): item is { node: CloudArtistNode; point: Point } =>
      item.node.type === 'artist',
  );
  const maxArtists = cloudTierSettings[tier].smallAtlasOnly
    ? 250
    : tier === 'balanced'
      ? 700
      : 1200;
  const visibleArtists = artists
    .filter(({ node }) => !revealedArtistIds || revealedArtistIds.has(node.id))
    .slice(0, maxArtists);
  const visibleCompareArtists = compareArtists
    .map((artist) => ({
      ...artist,
      point: screenPoint(artist.node, camera, width, height),
    }))
    .filter(({ node, point }) => {
      const radius = node.radius * camera.scale;
      return (
        point.x > -radius - 40 &&
        point.x < width + radius + 40 &&
        point.y > -radius - 40 &&
        point.y < height + radius + 40
      );
    });
  const hubs = onscreen.filter(({ node }) => node.type === 'hub');
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const sceneDrawCalls =
    1 +
    territories.length *
      (3 +
        (cloudTierSettings[tier].waterlines
          ? cloudTierSettings[tier].reliefLevels - 1
          : 0)) +
    hubs.length * 3 +
    visibleArtists.length * 4 +
    artists.length +
    backboneLinks.length +
    (constellationMode ? coattendanceLinks.length : 0);
  const totalDrawCalls = sceneDrawCalls + visibleCompareArtists.length * 5;

  useEffect(() => {
    onDrawCallsChange?.(totalDrawCalls);
  }, [onDrawCallsChange, totalDrawCalls]);

  // Focus set: focused artist + same-cluster neighbors + co-attendance partners
  const focusedNeighbors = useMemo(() => {
    if (!focusedArtistId) return null;
    const focal = nodeById.get(focusedArtistId);
    if (!focal || focal.type !== 'artist') return null;

    const ids = new Set<string>([focusedArtistId]);
    for (const link of coattendanceLinks) {
      if (link.source === focusedArtistId) ids.add(link.target);
      if (link.target === focusedArtistId) ids.add(link.source);
    }
    for (const node of nodes) {
      if (
        node.type === 'artist' &&
        node.clusterTarget === focal.clusterTarget
      ) {
        ids.add(node.id);
      }
    }
    return ids;
  }, [focusedArtistId, nodeById, coattendanceLinks, nodes]);

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={width} height={height} color={backgroundColor} />
      <CachedAtlasTerritoriesLayer
        territories={territories}
        nodes={nodes}
        revealedArtistIds={revealedArtistIds}
        camera={camera}
        width={width}
        height={height}
        backgroundColor={backgroundColor}
        inkColor={inkColor}
        reliefLevels={cloudTierSettings[tier].reliefLevels}
        waterlines={cloudTierSettings[tier].waterlines}
      />

      {/* 5. Hub backbone strands — faint connections between cluster hubs */}
      {backboneLinks.map((link, idx) => {
        const sNode =
          typeof link.source === 'string'
            ? nodeById.get(link.source)
            : (link.source as unknown as CloudNode);
        const tNode =
          typeof link.target === 'string'
            ? nodeById.get(link.target)
            : (link.target as unknown as CloudNode);
        if (!sNode || !tNode) return null;
        const p1 = screenPoint(sNode, camera, width, height);
        const p2 = screenPoint(tNode, camera, width, height);
        // Curved backbone strand between hubs
        const midX = (p1.x + p2.x) / 2 + Math.sin(idx * 1.3) * 20;
        const midY = (p1.y + p2.y) / 2 + Math.cos(idx * 1.7) * 20;
        const path = Skia.Path.Make();
        path.moveTo(p1.x, p1.y);
        path.quadTo(midX, midY, p2.x, p2.y);
        const hubA = sNode as CloudHubNode;
        return (
          <Path
            key={`backbone-${idx}`}
            path={path}
            color={hubA.color ?? inkColor}
            opacity={0.12}
            style="stroke"
            strokeWidth={1.5}
          />
        );
      })}

      {/* 6. Curved ink strands from artists to their cluster hubs */}
      {artists.map(({ node: artist }) => {
        if (artist.type !== 'artist') return null;
        if (revealedArtistIds && !revealedArtistIds.has(artist.id)) return null;

        const hub = nodeById.get(
          `${artist.hubTargets[0] ? nodes.find((n) => n.type === 'hub' && (n as CloudHubNode).slug === artist.hubTargets[0])?.id : ''}`,
        );
        const sourcePt = screenPoint(artist, camera, width, height);
        const targetPt = hub ? screenPoint(hub, camera, width, height) : null;
        if (!targetPt) return null;

        const isDimmed =
          (selectedSlug != null && artist.clusterTarget !== selectedSlug) ||
          (focusedNeighbors != null && !focusedNeighbors.has(artist.id)) ||
          (activeArtistId != null && activeArtistId !== artist.id);

        const linkOpacity = isDimmed
          ? 0.02
          : clamp(0.04 + artist.logCount * 0.022, 0.05, 0.22);

        // Curved strand via Skia path
        const midX = (sourcePt.x + targetPt.x) / 2 + artist.radius * 0.4;
        const midY = (sourcePt.y + targetPt.y) / 2;
        const path = Skia.Path.Make();
        path.moveTo(sourcePt.x, sourcePt.y);
        path.quadTo(midX, midY, targetPt.x, targetPt.y);

        return (
          <Path
            key={`link-${artist.id}`}
            path={path}
            color={artist.clusterColor}
            opacity={linkOpacity}
            style="stroke"
            strokeWidth={1}
          />
        );
      })}

      {/* 7. Constellation lines: co-attendance pairs */}
      {constellationMode &&
        coattendanceLinks.map((link, idx) => {
          const sNode = nodeById.get(link.source);
          const tNode = nodeById.get(link.target);
          if (!sNode || !tNode) return null;
          if (
            revealedArtistIds &&
            (!revealedArtistIds.has(sNode.id) ||
              !revealedArtistIds.has(tNode.id))
          )
            return null;

          const p1 = screenPoint(sNode, camera, width, height);
          const p2 = screenPoint(tNode, camera, width, height);

          const isConnectedToActive =
            activeArtistId === sNode.id || activeArtistId === tNode.id;
          const weight = link.weight ?? 1;
          const strokeW = isConnectedToActive
            ? 2.5
            : Math.min(2.8, 1 + weight * 0.5);
          const strokeOpacity = isConnectedToActive
            ? 0.8
            : clamp(0.25 + weight * 0.1, 0.25, 0.7);

          return (
            <Line
              key={`constellation-${idx}`}
              p1={p1}
              p2={p2}
              color={inkColor}
              opacity={strokeOpacity}
              strokeWidth={strokeW}
            />
          );
        })}

      {/* 8. Cluster Hubs */}
      {hubs.map(({ node, point }) => {
        if (node.type !== 'hub') return null;
        const isDimmed = selectedSlug != null && selectedSlug !== node.slug;
        return (
          <CloudHubGlyph
            key={node.id}
            node={node}
            x={point.x}
            y={point.y}
            radius={node.radius * camera.scale}
            opacity={isDimmed ? 0.2 : 1}
            inkColor={inkColor}
            shadowColor={shadowColor}
          />
        );
      })}

      {/* 9. Artist Nodes */}
      {Platform.OS === 'web' ? (
        visibleArtists.map(({ node, point }) => {
          const radius = Math.max(2.5, node.radius * camera.scale);
          const shadowRadius =
            radius * (node.id === activeArtistId ? 1.7 : 1) + 2;
          return (
            <Circle
              key={`sticker-shadow-${node.id}`}
              cx={point.x + 3}
              cy={point.y + 3}
              r={shadowRadius}
              color={shadowColor}
            />
          );
        })
      ) : (
        <CloudStickerShadows
          artists={visibleArtists}
          activeArtistId={activeArtistId}
          scale={camera.scale}
          shadowColor={shadowColor}
        />
      )}
      {visibleArtists
        // Sort hovered / active artist to end so it renders on top
        .sort((a, b) => {
          const aActive = a.node.id === activeArtistId ? 1 : 0;
          const bActive = b.node.id === activeArtistId ? 1 : 0;
          return aActive - bActive;
        })
        .map(({ node, point }) => {
          if (revealedArtistIds && !revealedArtistIds.has(node.id)) return null;

          const radius = Math.max(2.5, node.radius * camera.scale);
          const isHovered = node.id === activeArtistId;
          const isDimmed =
            (selectedSlug != null && node.clusterTarget !== selectedSlug) ||
            (focusedNeighbors != null && !focusedNeighbors.has(node.id)) ||
            (activeArtistId != null && !isHovered);

          return (
            <CloudArtistGlyph
              key={node.id}
              node={node}
              x={point.x}
              y={point.y}
              radius={radius}
              opacity={isDimmed ? 0.35 : 1}
              showImage={radius >= 8}
              showSatellites={
                (cloudTierSettings[tier].ambientLife ||
                  cloudTierSettings[tier].scraps) &&
                reliefLevel >= 5
              }
              pulseProgress={pulseArtistId === node.id ? pulseProgress : 0}
              isHovered={isHovered}
              isDimmed={isDimmed}
              onImageLoaded={onImageLoaded}
              inkColor={inkColor}
              accentColor={accentColor}
            />
          );
        })}
      {visibleCompareArtists.map(({ node, point, shared, sourceNode }) => {
        const source = sourceNode
          ? screenPoint(sourceNode, camera, width, height)
          : null;
        const stringPath = source ? Skia.Path.Make() : null;
        if (stringPath && source) {
          stringPath.moveTo(source.x, source.y);
          stringPath.lineTo(point.x, point.y);
        }
        return (
          <Group key={`compare-${node.id}`}>
            {stringPath ? (
              <Path
                path={stringPath}
                color={inkColor}
                opacity={0.72}
                style="stroke"
                strokeWidth={1.5}
              >
                <DashPathEffect intervals={[5, 4]} />
              </Path>
            ) : null}
            <CloudArtistGlyph
              node={node}
              x={point.x}
              y={point.y}
              radius={Math.max(3, node.radius * camera.scale)}
              opacity={0.9}
              showImage={shared && node.radius * camera.scale >= 8}
              showSatellites={false}
              pulseProgress={0}
              isHovered={false}
              isDimmed={false}
              compareOutline={!shared}
              onImageLoaded={(id) => onImageLoaded?.(`compare:${id}`)}
              inkColor={inkColor}
              accentColor={accentColor}
            />
          </Group>
        );
      })}
    </Canvas>
  );
}

// ---------------------------------------------------------------------------
// HTML/REACT NATIVE LABELS OVERLAY (Hub labels + Artist name badges at zoom >= 1.2)
// ---------------------------------------------------------------------------
function CloudLabelsOverlay({
  nodes,
  camera,
  width,
  height,
  selectedSlug,
  hoveredArtistId,
  inspectedArtistId,
  revealedArtistIds,
}: {
  nodes: CloudNode[];
  camera: Camera;
  width: number;
  height: number;
  selectedSlug?: string | null;
  hoveredArtistId?: string | null;
  inspectedArtistId?: string | null;
  revealedArtistIds?: Set<string>;
}) {
  const { colors } = useTheme();
  const activeArtistId = hoveredArtistId ?? inspectedArtistId;
  const hubs = nodes.filter((n): n is CloudHubNode => n.type === 'hub');
  const artists = nodes.filter(
    (n): n is CloudArtistNode => n.type === 'artist',
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Hub labels use the display face without shadow or glow. */}
      {hubs.map((hub) => {
        const pt = screenPoint(hub, camera, width, height);
        const size = Math.max(hub.radius * camera.scale, 32);
        const isDimmed = selectedSlug && selectedSlug !== hub.slug;

        return (
          <View
            key={`hub-lbl-${hub.id}`}
            style={{
              position: 'absolute',
              left: pt.x - size,
              top: pt.y - 12,
              width: size * 2,
              alignItems: 'center',
              opacity: isDimmed ? 0.25 : 0.9,
            }}
          >
            <Text
              style={[
                styles.hubLabel,
                {
                  color: colors.ink,
                  fontSize: Math.max(11, Math.min(18, 11 * camera.scale)),
                  fontFamily: fontFamily.display,
                },
              ]}
              numberOfLines={1}
            >
              {hub.label}
            </Text>
            <Text
              style={[
                styles.hubCountLabel,
                { color: colors.inkMuted },
                { fontSize: Math.max(9, Math.min(13, 9 * camera.scale)) },
              ]}
            >
              {hub.count}
            </Text>
          </View>
        );
      })}

      {/* Artist Name Labels: appear at zoom >= 1.2 or on hover/inspect */}
      {artists.map((artist) => {
        if (revealedArtistIds && !revealedArtistIds.has(artist.id)) return null;

        const isInspected = artist.id === activeArtistId;
        const shouldShowLabel = camera.scale >= 1.2 || isInspected;
        if (!shouldShowLabel) return null;

        const pt = screenPoint(artist, camera, width, height);
        const rad = Math.max(
          4,
          artist.radius * camera.scale * (isInspected ? 1.7 : 1),
        );

        return (
          <View
            key={`artist-lbl-${artist.id}`}
            style={{
              position: 'absolute',
              left: pt.x - 70,
              top: pt.y + rad + 4,
              width: 140,
              alignItems: 'center',
              opacity: isInspected ? 1 : 0.85,
            }}
          >
            <View
              style={[
                styles.artistLabelPill,
                { backgroundColor: colors.surface, borderColor: colors.ink },
              ]}
            >
              <Text
                style={[styles.artistNameLabel, { color: colors.ink }]}
                numberOfLines={1}
              >
                {artist.name}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT: CloudGraph (Cloud 2.0)
// ---------------------------------------------------------------------------
export function CloudGraph({ userId: propUserId }: { userId?: string } = {}) {
  const { colors } = useTheme();
  const { openArtistCard } = useArtistCard();
  const profileQuery = useMe();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const signedInUserId = useAuthStore((state) => state.user?.id ?? '');
  const userId = propUserId ?? signedInUserId;
  const { width: windowWidth } = useWindowDimensions();

  // Primary data source: user_cloud_data RPC
  const cloudDataQuery = useUserCloudData(userId);
  const territoryStatsQuery = useUserTerritoryStats(userId);
  const concertsQuery = useUserConcerts(userId);
  const identityQuery = useMusicIdentity(userId);
  // Fallback for compatibility
  const legacySummaryQuery = useUserArtistSummary(userId);

  // Combined artist inputs
  const artistsData = useMemo(() => {
    const cloudData = normalizeUserCloudData(cloudDataQuery.data);
    if (cloudData && cloudData.artists.length > 0) return cloudData.artists;
    return normalizeCloudArtists(
      legacySummaryQuery.data,
      concertsQuery.data ?? [],
    );
  }, [cloudDataQuery.data, concertsQuery.data, legacySummaryQuery.data]);

  const coattendanceLinksData: CloudCoattendanceLink[] = useMemo(() => {
    return normalizeUserCloudData(cloudDataQuery.data)?.links ?? [];
  }, [cloudDataQuery.data]);

  // Mode state: genre (default), venue, era, year
  const [mode, setMode] = useState<CloudMode>('genre');
  const [constellationMode, setConstellationMode] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 500 });
  const [cameraSnapshot, setCameraSnapshot] = useState<Camera>({
    x: 0,
    y: 0,
    scale: 0.75,
  });

  // Filter / selection states
  const [selectedHub, setSelectedHub] = useState<CloudHubNode | null>(null);
  const [hoveredArtist, setHoveredArtist] = useState<CloudArtistNode | null>(
    null,
  );
  const [inspectedArtist, setInspectedArtist] =
    useState<CloudArtistNode | null>(null);
  const [isCardPinned, setIsCardPinned] = useState(false);
  const isCardPinnedVal = useSharedValue(false);
  const lastInspectedNode = useSharedValue<CloudArtistNode | null>(null);
  const [focusedArtistId, setFocusedArtistId] = useState<string | null>(null);
  const [pulseArtistId, setPulseArtistId] = useState<string | null>(null);
  const [pulseProgress, setPulseProgress] = useState(0);

  // Time travel scrubber state
  const [showScrubber, setShowScrubber] = useState(false);
  const [scrubberProgress, setScrubberProgress] = useState(1.0);
  const [scrubberPlaying, setScrubberPlaying] = useState(false);
  const [scrubberSpeed, setScrubberSpeed] = useState<1 | 2 | 4>(1);

  // Search & motion preferences
  const [search, setSearch] = useState('');
  const [showLegend, setShowLegend] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [introVisible, setIntroVisible] = useState(false);
  const [introProgress, setIntroProgress] = useState(0);
  const [introCompleted, setIntroCompleted] = useState(false);
  const [introWasSkipped, setIntroWasSkipped] = useState(false);
  const [selectedTerritorySlug, setSelectedTerritorySlug] = useState<
    string | null
  >(null);
  const [arrivalCount, setArrivalCount] = useState(0);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const defaultTier = useMemo(
    () =>
      chooseDefaultCloudTier({
        deviceYearClass: Device.deviceYearClass,
        isTablet: Device.deviceType === Device.DeviceType.TABLET,
      }),
    [],
  );
  const [qualitySetting, setQualitySetting] =
    useState<CloudQualitySetting>('auto');
  const [autoTier, setAutoTier] = useState<CloudVisualTier>(defaultTier);
  const activeTier = qualitySetting === 'auto' ? autoTier : qualitySetting;
  const activeTierSettings = cloudTierSettings[activeTier];
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [listViewEnabled, setListViewEnabled] = useState(false);
  const [posterVisible, setPosterVisible] = useState(false);
  const [compareVisible, setCompareVisible] = useState(false);
  const [compareAtlas, setCompareAtlas] = useState<CompareAtlas | null>(null);
  const handleCompareAtlasChange = useCallback((atlas: CompareAtlas | null) => {
    setCompareAtlas(atlas);
  }, []);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    p95Ms: 0,
    fps: 0,
    drawCalls: 0,
    pictureRebuilds: 0,
    atlasHits: 0,
    atlasMisses: 0,
  });
  const performanceMonitor = useRef(new FrameTimeMonitor());
  const loadedStickerIds = useRef(new Set<string>());
  const pictureRebuildCount = useRef(0);
  const [appActive, setAppActive] = useState(
    AppState.currentState === 'active',
  );
  const [tourStops, setTourStops] = useState<TourStop[]>([]);
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const [tourPaused, setTourPaused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [completionistVisible, setCompletionistVisible] = useState(false);
  const touchBaseline = useSharedValue<Record<string, Point>>({});
  const touchRingPoint = useSharedValue<Point>({ x: 0, y: 0 });
  const touchRingOpacity = useSharedValue(0);
  const touchRingScale = useSharedValue(0.5);
  const touchReturnTimers = useSharedValue<ReturnType<typeof setTimeout>[]>([]);
  const touchRingStyle = useAnimatedStyle(() => ({
    opacity: touchRingOpacity.get(),
    transform: [
      { translateX: touchRingPoint.get().x - 45 },
      { translateY: touchRingPoint.get().y - 45 },
      { scale: touchRingScale.get() },
    ],
  }));
  const tilt = useSharedValue({ pitch: 0, roll: 0 });
  const tiltStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tilt.get().roll * 14 },
      { translateY: tilt.get().pitch * 14 },
    ],
  }));
  const introProgressValue = useSharedValue(0);
  const introRunKey = artistsData
    .map(({ id }) => id)
    .sort()
    .join('|');
  const introTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introStageTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const introHapticInterval = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const didCheckArrivals = useRef(false);
  const territoryStats = useMemo(
    () => territoryStatsQuery.data ?? [],
    [territoryStatsQuery.data],
  );
  const exploredMacroCount = new Set(
    territoryStats
      .filter((territory) => territory.concert_count > 0)
      .map((territory) => territory.macro_slug)
      .filter((slug) =>
        MACRO_GENRE_ORDER.includes(slug as (typeof MACRO_GENRE_ORDER)[number]),
      ),
  ).size;
  const selectedTerritory =
    territoryStats.find(
      (territory) => territory.macro_slug === selectedTerritorySlug,
    ) ??
    (selectedTerritorySlug
      ? {
          macro_slug: selectedTerritorySlug,
          artist_count: 0,
          concert_count: 0,
          average_rating: null,
          first_seen: null,
          last_seen: null,
        }
      : null);
  const discoveriesQuery = useTerritoryDiscoveries(
    selectedTerritory && selectedTerritory.concert_count === 0
      ? selectedTerritory.macro_slug
      : null,
  );
  const atlasSteps = useMemo(
    () =>
      buildAtlasSteps(
        artistsData.flatMap((artist) => artist.logs.map(([date]) => date)),
      ),
    [artistsData],
  );
  const territoryArtists = useMemo(
    () =>
      selectedTerritorySlug
        ? artistsData
            .filter(
              (artist) =>
                artist.primary_macro === selectedTerritorySlug ||
                artist.macro_genres.includes(selectedTerritorySlug),
            )
            .sort((a, b) => b.log_count - a.log_count)
        : [],
    [artistsData, selectedTerritorySlug],
  );
  const territoryVenueCounts = useMemo(() => {
    const counts: Partial<Record<keyof typeof VENUE_TYPES, number>> = {};
    for (const artist of territoryArtists) {
      for (const [type, count] of Object.entries(artist.venue_type_counts)) {
        const key = type as keyof typeof VENUE_TYPES;
        counts[key] = (counts[key] ?? 0) + (count ?? 0);
      }
    }
    return counts;
  }, [territoryArtists]);
  const territoryAverageRating = useMemo(() => {
    const rated = territoryArtists.filter(
      (artist) => artist.avg_rating != null,
    );
    const total = rated.reduce((sum, artist) => sum + artist.log_count, 0);
    return total
      ? rated.reduce(
          (sum, artist) => sum + (artist.avg_rating ?? 0) * artist.log_count,
          0,
        ) / total
      : null;
  }, [territoryArtists]);

  // Identity sheet state
  const [identitySheetVisible, setIdentitySheetVisible] = useState(false);
  const [highlightedDecade, setHighlightedDecade] = useState<number | null>(
    null,
  );
  const [, setFrame] = useState(0);
  const [simulationRunning, setSimulationRunning] = useState(false);

  // Shared values
  const cameraX = useSharedValue(0);
  const cameraY = useSharedValue(0);
  const cameraScale = useSharedValue(0.75);
  const gestureStart = useSharedValue<Camera>({ x: 0, y: 0, scale: 0.75 });
  const pinchWorld = useSharedValue<Point>({ x: 0, y: 0 });
  const pulse = useSharedValue(0);
  const dragNode = useSharedValue<CloudArtistNode | null>(null);
  const dragOffset = useSharedValue<Point>({ x: 0, y: 0 });
  const isTicking = useSharedValue(false);

  const lastHapticTargetId = useSharedValue<string | null>(null);

  // Build simulation nodes & links
  const graph = useMemo(() => {
    return buildCloudNodes(artistsData, mode);
  }, [artistsData, mode]);

  const atlasTerritories = useMemo(() => {
    const genreGraph = buildCloudNodes(artistsData, 'genre');
    const hubs = genreGraph.nodes.filter(
      (node): node is CloudHubNode => node.type === 'hub',
    );
    return buildAtlasTerritories(
      hubs.map((hub) => ({
        slug: hub.slug,
        label: hub.label,
        x: hub.x ?? hub.anchorX ?? 0,
        y: hub.y ?? hub.anchorY ?? 0,
        radius: hub.radius,
        count: hub.count,
      })),
    );
  }, [artistsData]);

  const cameraCenterGenre = useMemo(() => {
    if (selectedTerritorySlug) return selectedTerritorySlug;
    if (!size.width || !size.height) return 'unclassified';

    const worldCenter = toWorld(
      { x: size.width / 2, y: size.height / 2 },
      cameraSnapshot,
      size.width,
      size.height,
    );
    return (
      atlasTerritories
        .map((territory) => ({
          slug: territory.slug,
          distance:
            Math.hypot(
              worldCenter.x - territory.x,
              worldCenter.y - territory.y,
            ) / Math.max(territory.radius, 1),
        }))
        .filter((territory) => territory.distance <= 1)
        .sort((left, right) => left.distance - right.distance)[0]?.slug ??
      'unclassified'
    );
  }, [
    atlasTerritories,
    cameraSnapshot,
    selectedTerritorySlug,
    size.height,
    size.width,
  ]);

  const coattendanceLinks = useMemo(() => {
    const artistNodes = graph.nodes.filter(
      (n): n is CloudArtistNode => n.type === 'artist',
    );
    return buildCoattendanceLinks(coattendanceLinksData, artistNodes);
  }, [coattendanceLinksData, graph.nodes]);

  // Spatial grid for O(1) hit testing
  const spatialGrid = useMemo(() => {
    const grid = new SpatialHashGrid(80);
    grid.rebuild(graph.nodes);
    return grid;
  }, [graph.nodes]);

  // Genre territories remain visible as the map beneath every lens.
  // Revealed artists by scrubber
  const revealedArtistIds = useMemo(() => {
    const artistNodes = graph.nodes.filter(
      (n): n is CloudArtistNode => n.type === 'artist',
    );
    return getScrubberRevealedArtists(artistNodes, scrubberProgress);
  }, [graph.nodes, scrubberProgress]);

  const scrubberYearLabel = useMemo(() => {
    const artistNodes = graph.nodes.filter(
      (n): n is CloudArtistNode => n.type === 'artist',
    );
    return getScrubberYearLabel(artistNodes, scrubberProgress);
  }, [graph.nodes, scrubberProgress]);

  // Dynamic hub counts for scrubber
  const dynamicHubs = useMemo(() => {
    const artistNodes = graph.nodes.filter(
      (n): n is CloudArtistNode => n.type === 'artist',
    );
    const counts = new Map<string, number>();
    for (const artist of artistNodes) {
      if (revealedArtistIds.has(artist.id)) {
        for (const target of artist.hubTargets) {
          counts.set(target, (counts.get(target) ?? 0) + 1);
        }
      }
    }
    return graph.nodes.map((node) => {
      if (node.type === 'hub') {
        return {
          ...node,
          count: counts.get(node.slug) ?? 0,
        };
      }
      return node;
    });
  }, [graph.nodes, revealedArtistIds]);

  // Accessible Reduce Motion listener
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value);
    });
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (active) setScreenReaderEnabled(value);
    });
    const listener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled,
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;
    AsyncStorage.multiGet([
      cloudExperiencePreferences.motionEffects,
      cloudExperiencePreferences.soundEnabled,
      cloudExperiencePreferences.quality,
    ])
      .then((values) => {
        if (!active) return;
        setMotionEnabled(values[0]?.[1] === 'true');
        setSoundEnabled(values[1]?.[1] === 'true');
        const savedQuality = values[2]?.[1];
        if (
          savedQuality === 'auto' ||
          savedQuality === 'spectacular' ||
          savedQuality === 'balanced' ||
          savedQuality === 'lite'
        ) {
          setQualitySetting(savedQuality);
        }
      })
      .catch((error: unknown) => {
        console.error(
          '[cloud] Unable to load local experience preferences.',
          error,
        );
      });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void AsyncStorage.getItem(cloudExperiencePreferences.quality)
        .then((savedQuality) => {
          if (!active) return;
          if (
            savedQuality === 'auto' ||
            savedQuality === 'spectacular' ||
            savedQuality === 'balanced' ||
            savedQuality === 'lite'
          ) {
            setQualitySetting(savedQuality);
            if (savedQuality === 'auto') setAutoTier(defaultTier);
          }
        })
        .catch((error: unknown) => {
          console.error(
            '[cloud] Unable to load Cloud quality preference.',
            error,
          );
        });
      return () => {
        active = false;
      };
    }, [defaultTier]),
  );

  useEffect(() => {
    if (!userId || !introRunKey || cloudDataQuery.isLoading) return;
    const currentIntroKey = `${userId}:${introRunKey}`;
    if (introRunInSession === currentIntroKey) return;
    introRunInSession = currentIntroKey;
    introTimeout.current = setTimeout(() => {
      setIntroVisible(true);
      setIntroCompleted(false);
      setIntroWasSkipped(false);
      setIntroProgress(0);
      introProgressValue.set(0);
      introProgressValue.set(
        withTiming(1, { duration: reduceMotion ? 0 : 2400 }),
      );
      const duration = reduceMotion ? 0 : 2400;
      if (!reduceMotion) {
        let ticks = 0;
        introHapticInterval.current = setInterval(() => {
          ticks += 1;
          void Haptics.selectionAsync();
          void playCloudSound('tick', soundEnabled, reduceMotion);
          if (ticks >= 8 && introHapticInterval.current) {
            clearInterval(introHapticInterval.current);
            introHapticInterval.current = null;
          }
        }, 125);
        introStageTimeouts.current = [
          setTimeout(() => setIntroProgress(1), 400),
          setTimeout(() => setIntroProgress(2), 1400),
        ];
      }
      introTimeout.current = setTimeout(() => {
        if (introHapticInterval.current)
          clearInterval(introHapticInterval.current);
        touchReturnTimers.get().forEach(clearTimeout);
        touchReturnTimers.set([]);
        introHapticInterval.current = null;
        setIntroVisible(false);
        setIntroCompleted(true);
        setIntroProgress(3);
      }, duration);
    }, 0);
  }, [
    cloudDataQuery.isLoading,
    introProgressValue,
    introRunKey,
    reduceMotion,
    soundEnabled,
    touchReturnTimers,
    userId,
  ]);

  useEffect(
    () => () => {
      if (introTimeout.current) clearTimeout(introTimeout.current);
      introStageTimeouts.current.forEach(clearTimeout);
      if (introHapticInterval.current)
        clearInterval(introHapticInterval.current);
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (
        !motionEnabled ||
        !activeTierSettings.tilt ||
        reduceMotion ||
        !appActive ||
        Platform.OS === 'web'
      ) {
        tilt.set({ pitch: 0, roll: 0 });
        return;
      }
      tilt.set({ pitch: 0, roll: 0 });
      DeviceMotion.setUpdateInterval(16);
      const subscription = DeviceMotion.addListener((event) => {
        const rotation = event.rotation;
        if (!rotation) return;
        tilt.set(
          filterTilt(tilt.get(), {
            pitch: rotation.beta ?? 0,
            roll: rotation.gamma ?? 0,
          }),
        );
      });
      return () => subscription.remove();
    }, [activeTierSettings.tilt, appActive, motionEnabled, reduceMotion, tilt]),
  );

  useEffect(() => {
    if (exploredMacroCount < 14 || !userId) return;
    let active = true;
    const key = `cloud:completionist:${userId}`;
    void AsyncStorage.getItem(key)
      .then((earned) => {
        if (!active || earned === 'true') return;
        setCompletionistVisible(true);
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        return AsyncStorage.setItem(key, 'true');
      })
      .catch((error: unknown) => {
        console.error(
          '[cloud] Unable to check the Completionist stamp.',
          error,
        );
      });
    return () => {
      active = false;
    };
  }, [exploredMacroCount, userId]);

  useEffect(() => {
    if (
      !introCompleted ||
      introWasSkipped ||
      reduceMotion ||
      didCheckArrivals.current
    )
      return;
    didCheckArrivals.current = true;
    let cancelled = false;
    void AsyncStorage.getItem(cloudExperiencePreferences.lastViewedAt)
      .then((lastViewedAt) => {
        if (cancelled) return;
        const fresh = getNewArrivals(
          artistsData,
          (concertsQuery.data ?? []).map(({ artist_id, created_at }) => ({
            artist_id,
            created_at,
          })),
          lastViewedAt,
        ).slice(0, 8);
        setArrivalCount(fresh.length);
        fresh.forEach((artist, index) => {
          setTimeout(() => {
            if (cancelled) return;
            setPulseArtistId(artist.id);
            pulse.set(0);
            pulse.set(
              withSequence(
                withTiming(1, { duration: 180 }),
                withTiming(0, { duration: 420 }),
              ),
            );
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            void playCloudSound('stamp', soundEnabled, reduceMotion);
          }, index * 320);
        });
        if (fresh.length > 0) {
          setTimeout(
            () => setArrivalCount(0),
            Math.max(2200, fresh.length * 320 + 800),
          );
        }
        return AsyncStorage.setItem(
          cloudExperiencePreferences.lastViewedAt,
          new Date().toISOString(),
        );
      })
      .catch((error: unknown) => {
        console.error('[cloud] Unable to calculate new arrivals.', error);
      });
    return () => {
      cancelled = true;
    };
  }, [
    artistsData,
    concertsQuery.data,
    introCompleted,
    introWasSkipped,
    pulse,
    reduceMotion,
    soundEnabled,
  ]);

  useEffect(() => {
    if (!introWasSkipped && !reduceMotion) return;
    void AsyncStorage.setItem(
      cloudExperiencePreferences.lastViewedAt,
      new Date().toISOString(),
    ).catch((error: unknown) => {
      console.error('[cloud] Unable to save the last Cloud visit.', error);
    });
  }, [introWasSkipped, reduceMotion]);

  useEffect(() => {
    if (!showScrubber || atlasSteps.length === 0) return;
    const stepIndex = Math.min(
      atlasSteps.length - 1,
      Math.round(scrubberProgress * (atlasSteps.length - 1)),
    );
    const step = atlasSteps[stepIndex];
    if (!step) return;
    const cacheKey = atlasPictureCacheKey(userId, step);
    let cancelled = false;
    void AsyncStorage.getItem(cacheKey)
      .then((cached) => {
        if (cached || cancelled) return;
        const visible = graph.nodes.filter(
          (node): node is CloudArtistNode =>
            node.type === 'artist' &&
            !!node.firstSeen &&
            node.firstSeen <= step.cutoff,
        );
        const xs = visible.map((node) => node.x ?? 0);
        const ys = visible.map((node) => node.y ?? 0);
        const minX = Math.min(...xs, 0);
        const maxX = Math.max(...xs, 1);
        const minY = Math.min(...ys, 0);
        const maxY = Math.max(...ys, 1);
        const density = buildDensityGrid(
          visible.map((node) => ({
            x: (node.x! - minX) / Math.max(1, maxX - minX),
            y: (node.y! - minY) / Math.max(1, maxY - minY),
          })),
        );
        return AsyncStorage.setItem(cacheKey, JSON.stringify(density));
      })
      .catch((error: unknown) => {
        console.error(
          '[cloud] Unable to cache the time-travel map frame.',
          error,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [atlasSteps, graph.nodes, scrubberProgress, showScrubber, userId]);

  const scrubMilestone = useMemo(() => {
    if (!showScrubber) return null;
    const revealed = artistsData.filter((artist) =>
      revealedArtistIds.has(artist.id),
    );
    const showCount = revealed.reduce(
      (sum, artist) => sum + artist.log_count,
      0,
    );
    return showCount >= 100
      ? cloudExperienceStrings.milestones.hundredthShow
      : showCount >= 50
        ? cloudExperienceStrings.milestones.fiftiethShow
        : showCount >= 10
          ? cloudExperienceStrings.milestones.tenthShow
          : revealed.some(
                (artist) => (artist.venue_type_counts.festival ?? 0) > 0,
              )
            ? cloudExperienceStrings.milestones.firstFestival
            : revealed.some((artist) => (artist.max_rating ?? 0) >= 5)
              ? cloudExperienceStrings.milestones.firstFiveStar
              : showCount >= 1
                ? cloudExperienceStrings.milestones.firstShow
                : null;
  }, [artistsData, revealedArtistIds, showScrubber]);

  useEffect(() => {
    if (tourIndex == null || tourPaused || tourStops.length === 0) return;
    const stop = tourStops[tourIndex];
    if (!stop) return;
    const target =
      graph.nodes.find(
        (node) => node.type === 'artist' && node.id === stop.artistId,
      ) ??
      graph.nodes.find(
        (node) => node.type === 'hub' && node.slug === stop.macroSlug,
      );
    if (target) {
      const camera = fitNodes([target], size.width * 0.65, size.height * 0.6);
      cameraX.set(withTiming(camera.x, { duration: reduceMotion ? 0 : 1200 }));
      cameraY.set(withTiming(camera.y, { duration: reduceMotion ? 0 : 1200 }));
      cameraScale.set(
        withTiming(camera.scale, { duration: reduceMotion ? 0 : 1200 }),
      );
    }
    const timeout = setTimeout(() => {
      setTourIndex((index) => {
        if (index == null || index >= tourStops.length - 1) return null;
        return index + 1;
      });
    }, 3500);
    return () => clearTimeout(timeout);
  }, [
    cameraScale,
    cameraX,
    cameraY,
    graph.nodes,
    reduceMotion,
    size.height,
    size.width,
    tourIndex,
    tourPaused,
    tourStops,
  ]);

  useEffect(() => {
    if (!focus?.startsWith('macro:')) return;
    const slug = focus.slice('macro:'.length);
    const hub = graph.nodes.find(
      (node): node is CloudHubNode => node.type === 'hub' && node.slug === slug,
    );
    if (!hub || size.width <= 0) return;
    const selectionTimeout = setTimeout(() => {
      setSelectedHub(hub);
      setSelectedTerritorySlug(slug);
    }, 0);
    const cluster = graph.nodes.filter(
      (node) => node.type === 'artist' && node.clusterTarget === slug,
    );
    const camera = fitNodes(
      [hub, ...cluster],
      size.width - 36,
      size.height - 36,
    );
    cameraX.set(withTiming(camera.x, { duration: reduceMotion ? 0 : 1200 }));
    cameraY.set(withTiming(camera.y, { duration: reduceMotion ? 0 : 1200 }));
    cameraScale.set(
      withTiming(camera.scale, { duration: reduceMotion ? 0 : 1200 }),
    );
    return () => clearTimeout(selectionTimeout);
  }, [
    cameraScale,
    cameraX,
    cameraY,
    focus,
    graph.nodes,
    reduceMotion,
    size.height,
    size.width,
  ]);

  useAnimatedReaction(
    () => ({ x: cameraX.get(), y: cameraY.get(), scale: cameraScale.get() }),
    (camera) => runOnJS(setCameraSnapshot)(camera),
  );

  useAnimatedReaction(
    () => pulse.get(),
    (value) => runOnJS(setPulseProgress)(value),
  );

  // Simulation instance shared value
  const simulation = useSharedValue<ReturnType<
    typeof warmCloudSimulation
  > | null>(null);

  // Tick helper
  const tickSimulation = useCallback(() => {
    const sim = simulation.get();
    if (!sim) return;
    sim.tick();
    setFrame((v) => v + 1);
    if (sim.alpha() <= 0.005) {
      sim.alphaTarget(0).stop();
      cacheCloudPositions(`${userId}:${mode}`, graph.nodes);
      void persistCloudPositions(userId, mode, graph.nodes).catch(
        (error: unknown) => {
          console.error('[cloud] Unable to save the local layout.', error);
        },
      );
      isTicking.set(false);
      setSimulationRunning(false);
    }
  }, [graph.nodes, isTicking, mode, simulation, userId]);

  const frameCallback = useFrameCallback(() => {
    if (!isTicking.get()) return;
    runOnJS(tickSimulation)();
  }, false);

  useEffect(() => {
    frameCallback.setActive(simulationRunning);
  }, [frameCallback, simulationRunning]);

  const recordPerformanceWindow = useCallback(
    (samples: number[]) => {
      const p95Ms = percentile95(samples);
      const imageIds = graph.nodes
        .filter((node) => node.type === 'artist' && !!node.imageUrl)
        .map((node) => node.id);
      const atlasHits = imageIds.filter((id) =>
        loadedStickerIds.current.has(id),
      ).length;
      setPerformanceMetrics((current) => ({
        ...current,
        p95Ms,
        fps: samples.length,
        pictureRebuilds: pictureRebuildCount.current,
        atlasHits,
        atlasMisses: imageIds.length - atlasHits,
      }));
      if (
        qualitySetting === 'auto' &&
        performanceMonitor.current.recordWindow(samples)
      ) {
        setAutoTier((current) => lowerCloudTier(current));
      }
    },
    [graph.nodes, qualitySetting],
  );
  const performanceSamples = useSharedValue<number[]>([]);
  const performanceElapsed = useSharedValue(0);
  const performanceFrameCallback = useFrameCallback(
    ({ timeSincePreviousFrame }) => {
      if (timeSincePreviousFrame == null) return;
      performanceSamples.value = [
        ...performanceSamples.value,
        timeSincePreviousFrame,
      ];
      performanceElapsed.value += timeSincePreviousFrame;
      if (performanceElapsed.value < 1000) return;
      const samples = performanceSamples.value;
      performanceSamples.value = [];
      performanceElapsed.value %= 1000;
      runOnJS(recordPerformanceWindow)(samples);
    },
    false,
  );

  useEffect(() => {
    performanceFrameCallback.setActive(__DEV__ || qualitySetting === 'auto');
    if (qualitySetting !== 'auto') performanceMonitor.current.reset();
  }, [performanceFrameCallback, qualitySetting]);

  const handleImageLoaded = useCallback((id: string) => {
    loadedStickerIds.current.add(id);
  }, []);
  const handleDrawCallsChange = useCallback((drawCalls: number) => {
    setPerformanceMetrics((current) =>
      current.drawCalls === drawCalls ? current : { ...current, drawCalls },
    );
  }, []);

  useEffect(() => {
    pictureRebuildCount.current += 1;
    if (__DEV__) {
      setPerformanceMetrics((current) => ({
        ...current,
        pictureRebuilds: pictureRebuildCount.current,
      }));
    }
  }, [activeTier, graph.nodes, mode, size.height, size.width]);

  useEffect(() => {
    loadedStickerIds.current.clear();
  }, [userId]);

  useEffect(() => {
    if (__DEV__)
      console.info(
        `[cloud] Active performance tier: ${qualitySetting} → ${activeTier}`,
      );
  }, [activeTier, qualitySetting]);

  const reheatSimulation = useCallback(
    (alpha = 0.3) => {
      const sim = simulation.get();
      if (!sim) return;
      sim.alpha(alpha).alphaTarget(0);
      if (!isTicking.get()) {
        isTicking.set(true);
        setSimulationRunning(true);
        frameCallback.setActive(true);
      }
    },
    [frameCallback, isTicking, simulation],
  );

  // Initialize or update simulation
  useEffect(() => {
    if (artistsData.length === 0) return;
    let cancelled = false;
    let sim: ReturnType<typeof warmCloudSimulation> | null = null;
    const initialize = async () => {
      try {
        await restoreCloudPositions(userId, mode, graph.nodes);
      } catch (error) {
        console.error(
          '[cloud] Unable to restore the local layout; generating a fresh layout.',
          error,
        );
      }
      if (cancelled) return;
      sim = warmCloudSimulation(userId, mode, graph.nodes, graph.links);
      simulation.set(sim);

      const initialCamera = fitNodes(
        graph.nodes,
        size.width || windowWidth - 32,
        size.height,
      );
      cameraX.set(initialCamera.x);
      cameraY.set(initialCamera.y);
      cameraScale.set(initialCamera.scale);
      spatialGrid.rebuild(graph.nodes);
    };
    void initialize();
    return () => {
      cancelled = true;
      sim?.stop();
    };
  }, [
    artistsData.length,
    graph,
    mode,
    size.height,
    size.width,
    userId,
    windowWidth,
    cameraScale,
    cameraX,
    cameraY,
    simulation,
    spatialGrid,
  ]);

  // Center camera on node
  const centerOn = useCallback(
    (node: CloudNode, targetScale = Math.max(1.3, cameraScale.get())) => {
      const next = {
        x: -(node.x ?? 0) * targetScale,
        y: -(node.y ?? 0) * targetScale,
        scale: targetScale,
      };
      const duration = reduceMotion ? 0 : 450;
      cameraX.set(withTiming(next.x, { duration }));
      cameraY.set(withTiming(next.y, { duration }));
      cameraScale.set(withTiming(next.scale, { duration }));
    },
    [cameraScale, cameraX, cameraY, reduceMotion],
  );

  // Locate artist search
  const locateArtist = useCallback(() => {
    const artist = graph.nodes.find(
      (node) =>
        node.type === 'artist' &&
        node.name.toLowerCase().includes(search.trim().toLowerCase()),
    );
    if (artist && artist.type === 'artist') {
      centerOn(artist, 1.4);
      setPulseArtistId(artist.id);
      pulse.set(0);
      pulse.set(
        withSequence(
          withTiming(1, { duration: 150 }),
          withTiming(0, { duration: 350 }),
        ),
      );
    }
  }, [centerOn, graph.nodes, pulse, search]);

  // Reset cloud view
  const resetView = useCallback(() => {
    setSelectedHub(null);
    setSelectedTerritorySlug(null);
    setFocusedArtistId(null);
    setInspectedArtist(null);
    setIsCardPinned(false);
    isCardPinnedVal.set(false);
    lastInspectedNode.set(null);
    const camera = fitNodes(graph.nodes, size.width, size.height);
    const duration = reduceMotion ? 0 : 450;
    cameraX.set(withTiming(camera.x, { duration }));
    cameraY.set(withTiming(camera.y, { duration }));
    cameraScale.set(withTiming(camera.scale, { duration }));
  }, [
    cameraScale,
    cameraX,
    cameraY,
    graph.nodes,
    isCardPinnedVal,
    lastInspectedNode,
    reduceMotion,
    setFocusedArtistId,
    size.height,
    size.width,
  ]);

  const skipIntro = useCallback(() => {
    if (introTimeout.current) clearTimeout(introTimeout.current);
    introStageTimeouts.current.forEach(clearTimeout);
    if (introHapticInterval.current) clearInterval(introHapticInterval.current);
    introHapticInterval.current = null;
    setIntroVisible(false);
    setIntroCompleted(true);
    setIntroWasSkipped(true);
    introProgressValue.set(1);
  }, [introProgressValue]);

  const replayIntro = useCallback(() => {
    setShowMenu(false);
    setIntroWasSkipped(false);
    setIntroCompleted(false);
    setIntroVisible(true);
    setIntroProgress(0);
    introProgressValue.set(0);
    introProgressValue.set(
      withTiming(1, { duration: reduceMotion ? 0 : 2400 }),
    );
    if (!reduceMotion) {
      introStageTimeouts.current = [
        setTimeout(() => setIntroProgress(1), 400),
        setTimeout(() => setIntroProgress(2), 1400),
      ];
    }
    introTimeout.current = setTimeout(
      () => {
        setIntroVisible(false);
        setIntroCompleted(true);
        setIntroProgress(3);
      },
      reduceMotion ? 400 : 2400,
    );
  }, [introProgressValue, reduceMotion]);

  const toggleMotion = useCallback(() => {
    const next = !motionEnabled;
    setMotionEnabled(next);
    void AsyncStorage.setItem(
      cloudExperiencePreferences.motionEffects,
      String(next),
    ).catch((error: unknown) => {
      console.error('[cloud] Unable to save the motion preference.', error);
    });
  }, [motionEnabled]);

  const toggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    void AsyncStorage.setItem(
      cloudExperiencePreferences.soundEnabled,
      String(next),
    ).catch((error: unknown) => {
      console.error('[cloud] Unable to save the sound preference.', error);
    });
  }, [soundEnabled]);

  const startTour = useCallback(() => {
    setTourStops(
      buildTourStops(
        territoryStats,
        identityQuery.computed,
        artistsData,
        identityQuery.computed?.prototype?.title ?? null,
      ),
    );
    setTourIndex(0);
    setTourPaused(false);
  }, [artistsData, identityQuery.computed, territoryStats]);

  const advanceTour = useCallback(() => {
    setTourIndex((current) => {
      if (current == null || current >= tourStops.length - 1) return null;
      return current + 1;
    });
  }, [tourStops.length]);

  // Mode switch with smooth morphing
  const handleModeChange = useCallback(
    (newMode: CloudMode) => {
      if (newMode === mode) return;
      setSelectedHub(null);
      setMode(newMode);

      // Smooth morphing: keep existing coordinates, update links and hubs
      const morphed = reassignCloudMode(graph.nodes, newMode, artistsData);
      const sim = createCloudSimulation(morphed.nodes, morphed.links);
      simulation.set(sim);
      sim.alpha(0.6).alphaTarget(0); // Reheat to 0.6 so nodes glide smoothly to new positions in ~1s
      isTicking.set(true);
      setSimulationRunning(true);
      frameCallback.setActive(true);
    },
    [artistsData, frameCallback, graph.nodes, isTicking, mode, simulation],
  );

  const handleHighlightDecade = useCallback(
    (decade: number | null) => {
      setHighlightedDecade(decade);
      if (decade != null) {
        if (mode !== 'era') {
          handleModeChange('era');
        }
        const targetSlug = `${decade}s`;
        const hub = graph.nodes.find(
          (node): node is CloudHubNode =>
            node.type === 'hub' && node.slug === targetSlug,
        );
        if (hub) {
          setSelectedHub(hub);
        }
      } else {
        setSelectedHub(null);
      }
    },
    [graph.nodes, handleModeChange, mode],
  );

  // ---------------------------------------------------------------------------
  // GESTURES & CONFLICT RESOLUTION
  // Rule:
  // - Hover (web/pointer): Gesture.Hover() triggers node hover and neighbor repulsion.
  // - Touch on empty space held for >= 250ms enters Touch Inspect mode.
  // - Touch starting on node:
  //   * Held >= 350ms and dragged: activates node dragging.
  //   * Short tap (<250ms): single tap opens artist card sheet.
  //   * Short hold (250-349ms) or moving into other nodes: enters Touch Inspect mode.
  // ---------------------------------------------------------------------------
  const handleHoverBegin = (event: { x: number; y: number }) => {
    if (isCardPinnedVal.get()) return;
    const node = hitTestAtScreenCoords(
      { x: event.x, y: event.y },
      cameraSnapshot,
      size.width,
      size.height,
      graph.nodes,
      12,
      spatialGrid,
    );
    if (node && node.type === 'artist') {
      setHoveredArtist(node);
      reheatSimulation(0.2); // Neighbors gently pushed away
    }
  };

  const handleHoverEnd = () => {
    if (isCardPinnedVal.get()) return;
    setHoveredArtist(null);
  };

  const hoverGesture = Gesture.Hover()
    .runOnJS(true)
    .onBegin(handleHoverBegin)
    .onUpdate((event) => {
      if (Platform.OS !== 'web' || !motionEnabled || reduceMotion) return;
      tilt.set(
        filterTilt(tilt.get(), {
          roll: (event.x / Math.max(size.width, 1) - 0.5) * 0.5,
          pitch: (event.y / Math.max(size.height, 1) - 0.5) * 0.5,
        }),
      );
    })
    .onFinalize(handleHoverEnd);

  // Camera Pan
  const cameraPan = Gesture.Pan()
    .minDistance(6)
    .runOnJS(true)
    .onStart((event) => {
      touchReturnTimers.get().forEach(clearTimeout);
      touchReturnTimers.set([]);
      gestureStart.set({
        x: cameraX.get(),
        y: cameraY.get(),
        scale: cameraScale.get(),
      });
      const touched = hitTestAtScreenCoords(
        { x: event.x, y: event.y },
        cameraSnapshot,
        size.width,
        size.height,
        graph.nodes,
        10,
        spatialGrid,
      );
      if (!touched) {
        touchRingPoint.set({ x: event.x, y: event.y });
        touchRingOpacity.set(1);
        touchRingScale.set(0.5);
        touchRingScale.set(withTiming(1, { duration: reduceMotion ? 0 : 220 }));
        const baseline: Record<string, Point> = {};
        graph.nodes.forEach((node) => {
          if (node.type === 'artist') {
            baseline[node.id] = { x: node.x ?? 0, y: node.y ?? 0 };
          }
        });
        touchBaseline.set(baseline);
      }
    })
    .onUpdate((event) => {
      cameraX.set(gestureStart.get().x + event.translationX);
      cameraY.set(gestureStart.get().y + event.translationY);
      const baseline = touchBaseline.get();
      if (Object.keys(baseline).length === 0) return;
      const worldTouch = toWorld(
        { x: event.x, y: event.y },
        cameraSnapshot,
        size.width,
        size.height,
      );
      const forces = touchFieldForces(
        graph.nodes,
        worldTouch,
        90 / cameraSnapshot.scale,
      );
      for (const force of forces) {
        const node = graph.nodes.find(
          (candidate): candidate is CloudArtistNode =>
            candidate.type === 'artist' && candidate.id === force.id,
        );
        const origin = baseline[force.id];
        if (!node || !origin) continue;
        node.x = origin.x + force.dx * (48 / cameraSnapshot.scale);
        node.y = origin.y + force.dy * (48 / cameraSnapshot.scale);
      }
      touchRingPoint.set({ x: event.x, y: event.y });
    })
    .onFinalize((event) => {
      const baseline = touchBaseline.get();
      const returnNodes: {
        node: CloudArtistNode;
        from: Point;
        to: Point;
      }[] = [];
      const momentumX =
        Math.max(-18, Math.min(18, event.velocityX * 0.015)) /
        cameraSnapshot.scale;
      const momentumY =
        Math.max(-18, Math.min(18, event.velocityY * 0.015)) /
        cameraSnapshot.scale;
      graph.nodes.forEach((node) => {
        if (node.type !== 'artist') return;
        const origin = baseline[node.id];
        if (!origin) return;
        const from = { x: node.x ?? origin.x, y: node.y ?? origin.y };
        if (from.x === origin.x && from.y === origin.y) return;
        returnNodes.push({
          node,
          from: { x: from.x + momentumX, y: from.y + momentumY },
          to: origin,
        });
      });
      for (let frame = 1; frame <= 8; frame += 1) {
        const progress = frame / 8;
        const timeout = setTimeout(() => {
          for (const item of returnNodes) {
            const remaining = (1 - progress) ** 2;
            item.node.x = item.to.x + (item.from.x - item.to.x) * remaining;
            item.node.y = item.to.y + (item.from.y - item.to.y) * remaining;
          }
          setFrame((value) => value + 1);
          if (frame === 8) touchReturnTimers.set([]);
        }, frame * 16);
        touchReturnTimers.set([...touchReturnTimers.get(), timeout]);
      }
      touchBaseline.set({});
      touchRingOpacity.set(withTiming(0, { duration: reduceMotion ? 0 : 300 }));
    });

  // Artist Drag (hold >= 350ms on node)
  const artistDrag = Gesture.Pan()
    .activateAfterLongPress(350)
    .runOnJS(true)
    .onStart((event) => {
      const node = hitTestAtScreenCoords(
        { x: event.x, y: event.y },
        cameraSnapshot,
        size.width,
        size.height,
        graph.nodes,
        10,
        spatialGrid,
      );
      if (!node || node.type !== 'artist') return;
      dragNode.set(node);
      const world = toWorld(
        { x: event.x, y: event.y },
        cameraSnapshot,
        size.width,
        size.height,
      );
      dragOffset.set({
        x: (node.x ?? 0) - world.x,
        y: (node.y ?? 0) - world.y,
      });
      node.fx = node.x;
      node.fy = node.y;
      reheatSimulation(0.3);
    })
    .onUpdate((event) => {
      const node = dragNode.get();
      if (!node) return;
      const world = toWorld(
        { x: event.x, y: event.y },
        cameraSnapshot,
        size.width,
        size.height,
      );
      node.fx = world.x + dragOffset.get().x;
      node.fy = world.y + dragOffset.get().y;
      node.x = node.fx;
      node.y = node.fy;
    })
    .onFinalize(() => {
      const node = dragNode.get();
      if (!node) return;
      node.fx = null;
      node.fy = null;
      dragNode.set(null);
      simulation.get()?.alphaTarget(0);
    });

  // Touch Inspect Pan (press-and-hold 250ms, then drag finger across cloud)
  const inspectPan = Gesture.Pan()
    .activateAfterLongPress(250)
    .runOnJS(true)
    .onStart((event) => {
      const node = hitTestAtScreenCoords(
        { x: event.x, y: event.y },
        cameraSnapshot,
        size.width,
        size.height,
        graph.nodes,
        14, // hit radius + 12
        spatialGrid,
      );
      if (node && node.type === 'artist') {
        lastInspectedNode.set(node);
        setInspectedArtist(node);
        setIsCardPinned(false);
        isCardPinnedVal.set(false);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        lastHapticTargetId.set(node.id);
      }
    })
    .onUpdate((event) => {
      const node = hitTestAtScreenCoords(
        { x: event.x, y: event.y },
        cameraSnapshot,
        size.width,
        size.height,
        graph.nodes,
        14, // hit radius + 12
        spatialGrid,
      );
      if (node && node.type === 'artist') {
        if (node.id !== lastHapticTargetId.get()) {
          lastInspectedNode.set(node);
          setInspectedArtist(node);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          lastHapticTargetId.set(node.id);
        }
      }
    })
    .onFinalize(() => {
      // If released on a node: keep card pinned until tapped away. Otherwise close.
      const node = lastInspectedNode.get();
      if (node) {
        setIsCardPinned(true);
        isCardPinnedVal.set(true);
      } else if (!isCardPinnedVal.get()) {
        setInspectedArtist(null);
      }
      lastHapticTargetId.set(null);
    });

  // Pinch zoom
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart((event) => {
      const camera = {
        x: cameraX.get(),
        y: cameraY.get(),
        scale: cameraScale.get(),
      };
      gestureStart.set(camera);
      pinchWorld.set(
        toWorld(
          { x: event.focalX, y: event.focalY },
          camera,
          size.width,
          size.height,
        ),
      );
    })
    .onUpdate((event) => {
      const scale = reanimatedClamp(
        gestureStart.get().scale * event.scale,
        0.3,
        4,
      );
      cameraScale.set(scale);
      cameraX.set(event.focalX - size.width / 2 - pinchWorld.get().x * scale);
      cameraY.set(event.focalY - size.height / 2 - pinchWorld.get().y * scale);
    });

  // Tap handler
  const singleTap = Gesture.Tap()
    .maxDuration(240)
    .runOnJS(true)
    .onEnd((event, success) => {
      if (!success) return;
      const node = hitTestAtScreenCoords(
        { x: event.x, y: event.y },
        cameraSnapshot,
        size.width,
        size.height,
        graph.nodes,
        10,
        spatialGrid,
      );

      if (!node) {
        // Tapped empty space: dismiss card & clear focus
        setInspectedArtist(null);
        setSelectedTerritorySlug(null);
        setSelectedHub(null);
        setIsCardPinned(false);
        isCardPinnedVal.set(false);
        setFocusedArtistId(null);
        setHoveredArtist(null);
        lastInspectedNode.set(null);
        return;
      }

      if (node.type === 'hub') {
        setInspectedArtist(null);
        setIsCardPinned(false);
        isCardPinnedVal.set(false);
        setHoveredArtist(null);
        lastInspectedNode.set(null);
        setSelectedHub(node);
        setSelectedTerritorySlug(node.slug);
        const cluster = graph.nodes.filter(
          (item) => item.type === 'artist' && item.clusterTarget === node.slug,
        );
        const bounds = [node, ...cluster];
        const camera = fitNodes(bounds, size.width - 36, size.height - 36);
        const duration = reduceMotion ? 0 : 450;
        cameraX.set(withTiming(camera.x, { duration }));
        cameraY.set(withTiming(camera.y, { duration }));
        cameraScale.set(withTiming(camera.scale, { duration }));
      } else {
        // Single tap on artist: pin info card so it holds until clicked somewhere else
        lastInspectedNode.set(node);
        setInspectedArtist(node);
        setIsCardPinned(true);
        isCardPinnedVal.set(true);
        setHoveredArtist(null);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(260)
    .runOnJS(true)
    .onEnd((event, success) => {
      if (!success) return;
      const scale = Math.min(4, cameraScale.get() * 1.6);
      const point = toWorld(
        { x: event.x, y: event.y },
        cameraSnapshot,
        size.width,
        size.height,
      );
      cameraX.set(
        withTiming(event.x - size.width / 2 - point.x * scale, {
          duration: reduceMotion ? 0 : 300,
        }),
      );
      cameraY.set(
        withTiming(event.y - size.height / 2 - point.y * scale, {
          duration: reduceMotion ? 0 : 300,
        }),
      );
      cameraScale.set(withTiming(scale, { duration: reduceMotion ? 0 : 300 }));
    });

  const combinedGestures = Gesture.Simultaneous(
    hoverGesture,
    Gesture.Race(artistDrag, inspectPan, cameraPan),
    pinch,
    Gesture.Exclusive(doubleTap, singleTap),
  );

  // Active card node (pinned inspected artist takes precedence, else hover preview)
  const activeCardNode = isCardPinned
    ? inspectedArtist
    : (hoveredArtist ?? inspectedArtist);

  const cardPlacement = useMemo(() => {
    if (!activeCardNode) return null;
    const pt = screenPoint(
      activeCardNode,
      cameraSnapshot,
      size.width,
      size.height,
    );
    const rad = activeCardNode.radius * cameraSnapshot.scale;
    return calculateCardPlacement(
      pt,
      { width: 250, height: 180 },
      size,
      rad,
      12,
    );
  }, [activeCardNode, cameraSnapshot, size]);
  const activeTourStop =
    tourIndex == null ? null : (tourStops[tourIndex] ?? null);
  const accessibleListVisible = isAccessibleListRequired(
    Platform.OS,
    screenReaderEnabled,
    listViewEnabled,
  );
  const unclassifiedArtists = artistsData.filter(
    (artist) =>
      !artist.primary_macro ||
      artist.primary_macro === 'unclassified' ||
      (artist.primary_macro === 'other' && artist.genres.length === 0),
  );
  const posterArtists = useMemo(
    () =>
      buildCloudNodes(artistsData, 'genre').nodes.filter(
        (node): node is CloudArtistNode => node.type === 'artist',
      ),
    [artistsData],
  );
  const compareArtists = useMemo(() => {
    if (!compareAtlas) return [];
    const sharedIds = new Set(compareAtlas.commonArtistIds);
    const ownArtists = new Map(
      graph.nodes
        .filter((node): node is CloudArtistNode => node.type === 'artist')
        .map((node) => [node.id, node]),
    );
    const hubs = graph.nodes.filter(
      (node): node is CloudHubNode => node.type === 'hub',
    );
    const friendArtists = buildCloudNodes(
      compareAtlas.friendArtists,
      'genre',
    ).nodes.filter((node): node is CloudArtistNode => node.type === 'artist');
    return friendArtists.map((node) => {
      const sourceNode = ownArtists.get(node.id) ?? null;
      const hub = hubs.find(
        (candidate) => candidate.slug === node.primaryMacro,
      );
      let hash = 0;
      for (const character of node.id) {
        hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
      }
      const angle = (hash / 0xffffffff) * Math.PI * 2;
      const distance = sourceNode
        ? sourceNode.radius + node.radius + 5
        : Math.max(14, (hub?.radius ?? 30) * 0.58);
      return {
        node: {
          ...node,
          x: (sourceNode?.x ?? hub?.x ?? 0) + Math.cos(angle) * distance,
          y: (sourceNode?.y ?? hub?.y ?? 0) + Math.sin(angle) * distance,
        },
        shared: sharedIds.has(node.id),
        sourceNode,
      };
    });
  }, [compareAtlas, graph.nodes]);
  const posterStats = useMemo(
    () => ({
      shows: artistsData.reduce((sum, artist) => sum + artist.log_count, 0),
      artists: artistsData.length,
      territoriesExplored: exploredMacroCount,
      musicalAge: identityQuery.computed?.musicalAge?.formattedText ?? '—',
      prototype: identityQuery.computed?.prototype?.title ?? 'Emerging Taste',
      fiveStarCount: artistsData.filter((artist) => artist.max_rating === 5)
        .length,
    }),
    [artistsData, exploredMacroCount, identityQuery.computed],
  );

  if (cloudDataQuery.isLoading && artistsData.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
        <Text variant="caption" color="secondary">
          Growing your cloud...
        </Text>
      </View>
    );
  }

  if (artistsData.length <= 2) {
    return (
      <View style={styles.sparseWorld}>
        {cloudDataQuery.isError && artistsData.length > 0 ? (
          <Text
            variant="mono"
            accessibilityLabel="Offline, showing cached atlas"
          >
            OFFLINE · CACHED ATLAS
          </Text>
        ) : null}
        <CloudEmptyWorld onStart={() => router.push('/log')} />
        {unclassifiedArtists.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${unclassifiedArtists.length} artists in the fog. Open an artist card to run enrichment.`}
            onPress={() => {
              const artist = unclassifiedArtists[0];
              if (!artist) return;
              void openArtistCard({
                artistId: artist.id,
                name: artist.name,
                imageUrl: artist.image_url_thumb ?? artist.image_url_large,
                macroGenres: artist.macro_genres,
              });
            }}
            style={[
              styles.fogBand,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <Text variant="mono" weight="bold">
              {unclassifiedArtists.length} ARTISTS IN THE FOG
            </Text>
            <Text variant="caption" color="secondary">
              Open an Artist Card to run enrichment.
            </Text>
          </Pressable>
        ) : null}
        {artistsData.length > 0 ? (
          <>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="List view"
              accessibilityState={{ checked: accessibleListVisible }}
              onPress={() => setListViewEnabled((enabled) => !enabled)}
              style={[
                styles.listToggle,
                {
                  borderColor: colors.line,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text variant="caption" weight="semibold">
                List view
              </Text>
            </Pressable>
            {accessibleListVisible ? (
              <CloudAccessibleList artists={artistsData} />
            ) : null}
          </>
        ) : null}
      </View>
    );
  }

  const visibleLegends =
    mode === 'genre'
      ? Object.values(MACRO_GENRES).filter((genre) =>
          graph.nodes.some(
            (node) => node.type === 'hub' && node.slug === genre.slug,
          ),
        )
      : [
          ...new Map(
            graph.nodes
              .filter((node) => node.type === 'hub')
              .map((node) => [node.slug, node]),
          ).values(),
        ];
  return (
    <View style={styles.root}>
      <CloudExperienceHud
        exploredCount={exploredMacroCount}
        menuVisible={showMenu}
        motionEnabled={motionEnabled}
        soundEnabled={soundEnabled}
        legendVisible={showLegend}
        onFly={startTour}
        onToggleMenu={() => setShowMenu((visible) => !visible)}
        onReplay={replayIntro}
        onToggleMotion={toggleMotion}
        onToggleSound={toggleSound}
        onPoster={() => setPosterVisible(true)}
        onToggleLegend={() => {
          setShowLegend((visible) => !visible);
          setShowMenu(false);
        }}
      />
      {territoryStatsQuery.isError ? (
        <Text variant="caption" color="danger">
          Territory progress could not be loaded:{' '}
          {territoryStatsQuery.error.message}
        </Text>
      ) : null}
      {completionistVisible ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setCompletionistVisible(false)}
          style={styles.completionist}
        >
          <Stamp
            id="cloud-completionist"
            label="COMPLETIONIST"
            variant="orange"
            tilt
          />
        </Pressable>
      ) : null}
      {arrivalCount > 0 && !introVisible ? (
        <View
          style={[
            styles.arrivalToast,
            { backgroundColor: colors.surface, borderColor: colors.ink },
          ]}
        >
          <Text variant="mono" weight="bold">
            {cloudExperienceStrings.arrivals(arrivalCount)}
          </Text>
        </View>
      ) : null}
      {cloudDataQuery.isError && artistsData.length > 0 ? (
        <Text variant="mono" accessibilityLabel="Offline, showing cached atlas">
          OFFLINE · CACHED ATLAS
        </Text>
      ) : null}
      {unclassifiedArtists.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${unclassifiedArtists.length} artists in the fog. Open an artist card to run enrichment.`}
          onPress={() => {
            const artist = unclassifiedArtists[0];
            if (!artist) return;
            void openArtistCard({
              artistId: artist.id,
              name: artist.name,
              imageUrl: artist.image_url_thumb ?? artist.image_url_large,
              macroGenres: artist.macro_genres,
            });
          }}
          style={[
            styles.fogBand,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Text variant="mono" weight="bold">
            {unclassifiedArtists.length} ARTISTS IN THE FOG
          </Text>
          <Text variant="caption" color="secondary">
            Open an Artist Card to run enrichment.
          </Text>
        </Pressable>
      ) : null}

      {/* Top Toolbar: Search, Constellation toggle, Legend, Reset */}
      <View style={styles.toolbar}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Search color={colors.inkMuted} size={16} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={locateArtist}
            placeholder="Find an artist"
            placeholderTextColor={colors.inkMuted}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.ink }]}
            accessibilityLabel="Search artists in your cloud"
          />
          {search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Locate artist"
              onPress={locateArtist}
              hitSlop={8}
            >
              <LocateFixed color={colors.accent} size={18} />
            </Pressable>
          ) : null}
        </View>

        {/* Constellation mode toggle */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            constellationMode
              ? 'Disable constellations'
              : 'Enable constellations'
          }
          onPress={() => setConstellationMode((v) => !v)}
          style={[
            styles.iconButton,
            {
              backgroundColor: constellationMode
                ? `${colors.accent}25`
                : colors.surface,
              borderColor: constellationMode ? colors.accent : colors.line,
            },
          ]}
        >
          <Sparkles
            color={constellationMode ? colors.accent : colors.inkMuted}
            size={18}
          />
        </Pressable>

        {/* Time travel scrubber toggle */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            showScrubber ? 'Hide time travel' : 'Show time travel'
          }
          onPress={() => setShowScrubber((v) => !v)}
          style={[
            styles.iconButton,
            {
              backgroundColor: showScrubber
                ? `${colors.accent}25`
                : colors.surface,
              borderColor: showScrubber ? colors.accent : colors.line,
            },
          ]}
        >
          <Calendar
            color={showScrubber ? colors.accent : colors.inkMuted}
            size={18}
          />
        </Pressable>

        {/* Legend toggle */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showLegend ? 'Hide legend' : 'Show legend'}
          onPress={() => setShowLegend((v) => !v)}
          style={[
            styles.iconButton,
            {
              backgroundColor: showLegend
                ? colors.surfaceRaised
                : colors.surface,
              borderColor: colors.line,
            },
          ]}
        >
          <ListFilter
            color={showLegend ? colors.accent : colors.inkMuted}
            size={18}
          />
        </Pressable>

        {/* Reset Camera */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset cloud view"
          onPress={resetView}
          style={[
            styles.iconButton,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <RotateCcw color={colors.inkMuted} size={18} />
        </Pressable>

        {/* Who am I? Identity Chip */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Who am I? View your music identity"
          onPress={() => setIdentitySheetVisible(true)}
          style={[
            styles.identityChip,
            {
              backgroundColor: `${colors.accent}1A`,
              borderColor: colors.accent,
            },
          ]}
        >
          <Text
            variant="caption"
            weight="bold"
            style={{ color: colors.accent }}
          >
            Who am I?
          </Text>
        </Pressable>
      </View>

      {/* 4 Clustering Modes Switch */}
      <View style={[styles.modeSwitch, { backgroundColor: colors.surface }]}>
        {(['genre', 'venue', 'era', 'year'] as const).map((item) => {
          const labels: Record<CloudMode, string> = {
            genre: 'Genre',
            venue: 'Venue Type',
            era: 'Era',
            year: 'Year Seen',
          };
          const isSelected = mode === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => handleModeChange(item)}
              style={[
                styles.modeButton,
                isSelected && { backgroundColor: colors.surfaceRaised },
              ]}
            >
              <Text
                variant="caption"
                weight={isSelected ? 'bold' : 'medium'}
                color={isSelected ? 'primary' : 'secondary'}
              >
                {labels[item]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel="List view"
        accessibilityState={{ checked: accessibleListVisible }}
        onPress={() => setListViewEnabled((enabled) => !enabled)}
        style={[
          styles.listToggle,
          {
            borderColor: colors.line,
            backgroundColor: accessibleListVisible
              ? `${colors.accent}18`
              : colors.surface,
          },
        ]}
      >
        <Text variant="caption" weight="semibold">
          {accessibleListVisible ? 'List view · On' : 'List view'}
        </Text>
      </Pressable>
      {compareFeatureAvailable() && userId === signedInUserId ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Compare atlases with a friend"
          onPress={() => setCompareVisible(true)}
          style={[
            styles.listToggle,
            { borderColor: colors.line, backgroundColor: colors.surface },
          ]}
        >
          <Text variant="caption" weight="semibold">
            Compare atlases
          </Text>
        </Pressable>
      ) : null}

      {/* Focus Mode Banner */}
      {focusedArtistId ? (
        <View
          style={[
            styles.focusBanner,
            {
              backgroundColor: `${colors.accent}18`,
              borderColor: colors.accent,
            },
          ]}
        >
          <Text
            variant="caption"
            weight="semibold"
            style={{ color: colors.accent, flex: 1 }}
          >
            Focus mode active · Highlighting genre neighbors & co-attendance
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear focus mode"
            onPress={() => setFocusedArtistId(null)}
            hitSlop={8}
          >
            <X size={16} color={colors.accent} />
          </Pressable>
        </View>
      ) : null}

      {/* Legend Drawer */}
      {showLegend ? (
        <View style={styles.legend}>
          {visibleLegends.map((item) => (
            <View key={item.slug} style={styles.legendItem}>
              {mode === 'genre' && item.slug in MACRO_GENRES ? (
                <GenreLabel
                  genre={item.slug as MacroGenre}
                  label={item.label}
                  size="xs"
                />
              ) : mode === 'venue' && item.slug in VENUE_TYPES ? (
                <VenueLabel
                  venue={item.slug as keyof typeof VENUE_TYPES}
                  label={item.label}
                  size="xs"
                />
              ) : (
                <>
                  <View
                    style={[
                      styles.legendSwatch,
                      { backgroundColor: item.color },
                    ]}
                  />
                  <Text variant="caption" color="secondary">
                    {item.label}
                  </Text>
                </>
              )}
            </View>
          ))}
        </View>
      ) : null}

      {/* Active Cluster Pill */}
      {selectedHub ? (
        <View
          style={[
            styles.clusterChip,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show all clusters"
            onPress={resetView}
            hitSlop={9}
          >
            <ArrowLeft color={colors.ink} size={18} />
          </Pressable>
          {mode === 'genre' && selectedHub.slug in MACRO_GENRES ? (
            <GenreLabel
              genre={selectedHub.slug as MacroGenre}
              label={`${selectedHub.label} · ${selectedHub.count} artists`}
              size="xs"
            />
          ) : mode === 'venue' && selectedHub.slug in VENUE_TYPES ? (
            <VenueLabel
              venue={selectedHub.slug as keyof typeof VENUE_TYPES}
              label={`${selectedHub.label} · ${selectedHub.count} artists`}
              size="xs"
            />
          ) : (
            <>
              <View
                style={[
                  styles.clusterSwatch,
                  { backgroundColor: selectedHub.color },
                ]}
              />
              <Text variant="caption" weight="semibold">
                {selectedHub.label} · {selectedHub.count} artists
              </Text>
            </>
          )}
        </View>
      ) : null}

      {accessibleListVisible ? (
        <CloudAccessibleList artists={artistsData} />
      ) : (
        /* Interactive Skia Canvas Frame */
        <View
          style={[
            styles.canvasFrame,
            { borderColor: colors.line, backgroundColor: colors.bg },
          ]}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setSize((current) =>
              current.width === width && current.height === height
                ? current
                : { width, height },
            );
          }}
        >
          <GestureDetector gesture={combinedGestures}>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                activeTierSettings.tilt && !reduceMotion ? tiltStyle : null,
              ]}
            >
              <CloudCanvas
                nodes={dynamicHubs}
                territories={atlasTerritories}
                links={graph.links}
                coattendanceLinks={coattendanceLinks}
                backboneLinks={graph.backboneLinks ?? []}
                constellationMode={constellationMode}
                camera={cameraSnapshot}
                width={size.width}
                height={size.height}
                selectedSlug={selectedHub?.slug}
                focusedArtistId={focusedArtistId}
                hoveredArtistId={hoveredArtist?.id}
                inspectedArtistId={inspectedArtist?.id}
                pulseArtistId={pulseArtistId}
                pulseProgress={pulseProgress}
                revealedArtistIds={revealedArtistIds}
                backgroundColor={colors.bg}
                inkColor={colors.ink}
                shadowColor={colors.bgSunken}
                accentColor={colors.accent}
                tier={activeTier}
                onImageLoaded={handleImageLoaded}
                onDrawCallsChange={handleDrawCallsChange}
                compareArtists={compareArtists}
              />

              <CloudLabelsOverlay
                nodes={dynamicHubs}
                camera={cameraSnapshot}
                width={size.width}
                height={size.height}
                selectedSlug={selectedHub?.slug}
                hoveredArtistId={hoveredArtist?.id}
                inspectedArtistId={inspectedArtist?.id}
                revealedArtistIds={revealedArtistIds}
              />
              {activeTier !== 'lite' ? (
                <CloudMiniMap
                  nodes={graph.nodes}
                  camera={cameraSnapshot}
                  viewport={size}
                />
              ) : null}
            </Animated.View>
          </GestureDetector>
          {activeTierSettings.grain ? <Grain /> : null}
          {!reduceMotion ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.touchRing,
                { borderColor: colors.ink },
                touchRingStyle,
              ]}
            />
          ) : null}
          <View pointerEvents="none" style={styles.youAreHere}>
            <Mascot
              accessibilityLabel={`You are here, ${cameraCenterGenre}`}
              animated={!reduceMotion && activeTier !== 'lite'}
              genre={
                isMacroGenre(cameraCenterGenre)
                  ? cameraCenterGenre
                  : 'unclassified'
              }
              id="cloud-center-marker"
              size={58}
              variant="sticker"
            />
            <Text variant="mono" style={{ color: colors.ink }}>
              YOU ARE HERE
            </Text>
          </View>
          {introVisible ? (
            <View style={styles.introOverlay}>
              <View
                style={[styles.introBackdrop, { backgroundColor: colors.bg }]}
              />
              <Card padding={20} style={styles.introCard}>
                <Text variant="mono" weight="bold" center>
                  {cloudExperienceStrings.intro.title}
                </Text>
                <View style={styles.printFrame}>
                  {introProgress >= 1 ? (
                    <View
                      style={[
                        styles.printPass,
                        { backgroundColor: colors.ink },
                      ]}
                    />
                  ) : null}
                  {introProgress >= 2 ? (
                    <>
                      <View
                        style={[
                          styles.printPass,
                          styles.printPassSecond,
                          { backgroundColor: colors.inkMuted },
                        ]}
                      />
                      <Stamp
                        id="print-run-stamp"
                        label="YOUR ATLAS"
                        variant="orange"
                        tilt
                      />
                    </>
                  ) : null}
                </View>
                <Text variant="caption" color="secondary" center>
                  {introProgress === 0
                    ? 'The frame is set.'
                    : introProgress === 1
                      ? 'Ink passes are landing.'
                      : 'Your stories find their place.'}
                </Text>
                <Button
                  label={cloudExperienceStrings.intro.skip}
                  variant="secondary"
                  onPress={skipIntro}
                />
              </Card>
            </View>
          ) : null}

          {/* Floating Info Card */}
          {activeCardNode && cardPlacement ? (
            <CloudInfoCard
              node={activeCardNode}
              position={{ left: cardPlacement.left, top: cardPlacement.top }}
              isPinned={isCardPinned}
              isFocused={focusedArtistId === activeCardNode.id}
              onFocusRelated={(node) => {
                setFocusedArtistId((curr) =>
                  curr === node.id ? null : node.id,
                );
              }}
              onOpenDetails={(node) => {
                void openArtistCard({
                  artistId: node.artistId,
                  name: node.name,
                  imageUrl: node.imageUrl,
                  macroGenres: node.primaryMacro ? [node.primaryMacro] : [],
                });
              }}
              onClose={() => {
                setInspectedArtist(null);
                setIsCardPinned(false);
                isCardPinnedVal.set(false);
                lastInspectedNode.set(null);
              }}
              reduceMotion={reduceMotion}
            />
          ) : null}
        </View>
      )}

      {selectedTerritory ? (
        <CloudTerritoryCard
          genre={
            selectedTerritory.macro_slug in MACRO_GENRES
              ? (selectedTerritory.macro_slug as MacroGenre)
              : 'other'
          }
          label={
            MACRO_GENRES[
              selectedTerritory.macro_slug as keyof typeof MACRO_GENRES
            ]?.label ?? selectedTerritory.macro_slug.replaceAll('_', ' ')
          }
          unexplored={selectedTerritory.concert_count === 0}
          sharePercent={Math.round(
            (selectedTerritory.concert_count /
              Math.max(
                1,
                artistsData.reduce((sum, artist) => sum + artist.log_count, 0),
              )) *
              100,
          )}
          averageRating={territoryAverageRating}
          firstSeen={selectedTerritory.first_seen}
          lastSeen={selectedTerritory.last_seen}
          artists={territoryArtists
            .slice(0, 3)
            .map(({ id, name }) => ({ id, name }))}
          venues={Object.entries(territoryVenueCounts)
            .filter(([, count]) => (count ?? 0) > 0)
            .map(([type, count]) => {
              const venue =
                type in VENUE_TYPES
                  ? (type as keyof typeof VENUE_TYPES)
                  : 'other';
              return {
                id: type,
                venue,
                label: `${VENUE_TYPES[venue].shortLabel} ${count}`,
              };
            })}
          discoveries={[
            ...new Set([
              ...(discoveriesQuery.data?.topRated.map(({ name }) => name) ??
                []),
              ...(discoveriesQuery.data?.onTour.map(({ name }) => name) ?? []),
            ]),
          ]}
          discoveriesLoading={discoveriesQuery.isLoading}
          discoveriesUnavailable={discoveriesQuery.isError}
          onClose={() => {
            setSelectedTerritorySlug(null);
            setSelectedHub(null);
          }}
          onLogShow={() => router.push('/log')}
        />
      ) : null}

      {activeTourStop ? (
        <Pressable
          accessibilityRole="button"
          onPress={advanceTour}
          onPressIn={() => setTourPaused(true)}
          onPressOut={() => setTourPaused(false)}
        >
          <Card padding={12} style={styles.tourCaption}>
            <Text variant="mono" weight="bold">
              {activeTourStop.kicker}
            </Text>
            <Text variant="subtitle">{activeTourStop.caption}</Text>
            <Text variant="caption" color="secondary">
              {tourPaused
                ? cloudExperienceStrings.tour.continue
                : cloudExperienceStrings.tour.pause}
              {' · '}
              {(tourIndex ?? 0) + 1}/{tourStops.length}
            </Text>
            <View style={styles.progressTicks}>
              {tourStops.map((stop, index) => (
                <View
                  key={stop.id}
                  style={[
                    styles.progressTick,
                    {
                      backgroundColor:
                        index <= (tourIndex ?? 0) ? colors.accent : colors.line,
                    },
                  ]}
                />
              ))}
            </View>
          </Card>
        </Pressable>
      ) : null}

      {/* Time Travel Scrubber */}
      {showScrubber ? (
        <CloudScrubber
          progress={scrubberProgress}
          onProgressChange={setScrubberProgress}
          isPlaying={scrubberPlaying}
          onTogglePlay={() => setScrubberPlaying((v) => !v)}
          speed={scrubberSpeed}
          onCycleSpeed={() => {
            setScrubberSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1));
          }}
          currentYearLabel={scrubberYearLabel}
          totalArtistsCount={artistsData.length}
          revealedArtistsCount={revealedArtistIds.size}
          onReset={() => setScrubberProgress(1)}
          reduceMotion={reduceMotion}
        />
      ) : null}
      {scrubMilestone ? (
        <Text variant="mono" weight="bold" center>
          {scrubMilestone} · {scrubberYearLabel}
        </Text>
      ) : null}

      {/* Footer */}
      <View style={styles.footer}>
        <Text variant="caption" color="secondary">
          {artistsData.length} artists ·{' '}
          {artistsData.reduce((t, a) => t + a.log_count, 0)} shows
        </Text>
        <Text variant="caption" color="secondary">
          {reduceMotion
            ? 'Reduce motion active'
            : 'Hold 250ms to inspect · Long press node to drag'}
        </Text>
      </View>

      <IdentitySheet
        visible={identitySheetVisible}
        onDismiss={() => setIdentitySheetVisible(false)}
        highlightedDecade={highlightedDecade}
        onHighlightDecade={handleHighlightDecade}
      />
      <CloudPosterSheet
        visible={posterVisible}
        onDismiss={() => setPosterVisible(false)}
        title={
          profileQuery.data?.display_name ||
          profileQuery.data?.username ||
          'Listener'
        }
        username={profileQuery.data?.username || 'listener'}
        date={new Date().toLocaleDateString()}
        artists={posterArtists}
        territories={atlasTerritories}
        stats={posterStats}
      />
      {compareFeatureAvailable() && userId === signedInUserId ? (
        <CloudComparePanel
          visible={compareVisible}
          atlas={compareAtlas}
          userId={userId}
          artists={artistsData}
          onAtlasChange={handleCompareAtlasChange}
          onDismiss={() => setCompareVisible(false)}
        />
      ) : null}
      {__DEV__ ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.performanceOverlay, { backgroundColor: colors.ink }]}
        >
          <Text
            variant="mono"
            style={[styles.performanceText, { color: colors.bg }]}
          >
            {activeTier.toUpperCase()} · {performanceMetrics.fps} FPS · P95{' '}
            {performanceMetrics.p95Ms.toFixed(1)} ms
          </Text>
          <Text
            variant="mono"
            style={[styles.performanceText, { color: colors.bg }]}
          >
            DRAW {performanceMetrics.drawCalls} · ATLAS{' '}
            {performanceMetrics.atlasHits}/{performanceMetrics.atlasMisses} ·
            REBUILDS {performanceMetrics.pictureRebuilds}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// PRESERVED COMPONENT: MiniCloud
// ---------------------------------------------------------------------------
export function MiniCloud({
  userId,
  height,
}: {
  userId: string;
  height: number;
}) {
  const query = useUserCloudData(userId);
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const [layoutReadyFor, setLayoutReadyFor] = useState<typeof query.data>();

  const nodes = useMemo(() => {
    return buildCloudNodes(query.data?.artists ?? [], 'genre').nodes;
  }, [query.data]);
  const camera = {
    x: 0,
    y: 0,
    scale: Math.max(0.3, Math.min(0.85, width / 520)),
  };
  const miniNodes = useMemo(
    () => [
      ...nodes.filter((node) => node.type === 'hub'),
      ...nodes
        .filter((node): node is CloudArtistNode => node.type === 'artist')
        .sort((a, b) => b.logCount - a.logCount || a.id.localeCompare(b.id))
        .slice(0, 180),
    ],
    [nodes],
  );
  const miniCloudPicture = useMemo(() => {
    const pictureNodes = query.data === layoutReadyFor ? miniNodes : [];
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording({
      x: 0,
      y: 0,
      width,
      height,
    });
    const hubs = new Map(
      pictureNodes
        .filter((node): node is CloudHubNode => node.type === 'hub')
        .map((node) => [node.slug, node]),
    );
    const linksPaint = Skia.Paint();
    linksPaint.setAntiAlias(true);
    linksPaint.setAlphaf(0.12);
    linksPaint.setStrokeWidth(1);
    linksPaint.setStyle(PaintStyle.Stroke);
    for (const node of pictureNodes) {
      if (node.type !== 'artist') continue;
      const hub = hubs.get(node.clusterTarget);
      if (!hub) continue;
      linksPaint.setColor(Skia.Color(node.color));
      canvas.drawLine(
        width / 2 + (node.x ?? 0) * camera.scale,
        height / 2 + (node.y ?? 0) * camera.scale,
        width / 2 + (hub.x ?? 0) * camera.scale,
        height / 2 + (hub.y ?? 0) * camera.scale,
        linksPaint,
      );
    }
    const markerPaint = Skia.Paint();
    markerPaint.setAntiAlias(true);
    const outlinePaint = Skia.Paint();
    outlinePaint.setAntiAlias(true);
    outlinePaint.setStyle(PaintStyle.Stroke);
    outlinePaint.setStrokeWidth(1.5);
    for (const node of pictureNodes) {
      const x = width / 2 + (node.x ?? 0) * camera.scale;
      const y = height / 2 + (node.y ?? 0) * camera.scale;
      if (node.type === 'hub') {
        markerPaint.setColor(Skia.Color(node.color));
        markerPaint.setAlphaf(0.2);
        canvas.drawCircle(x, y, node.radius * camera.scale, markerPaint);
        outlinePaint.setColor(Skia.Color(colors.ink));
        outlinePaint.setAlphaf(0.8);
        canvas.drawCircle(x, y, node.radius * camera.scale, outlinePaint);
      } else {
        const radius = Math.max(5, node.radius * camera.scale);
        markerPaint.setColor(Skia.Color(node.color));
        markerPaint.setAlphaf(1);
        canvas.drawCircle(x, y, radius, markerPaint);
        outlinePaint.setColor(Skia.Color(colors.ink));
        outlinePaint.setAlphaf(1);
        canvas.drawCircle(x, y, radius, outlinePaint);
      }
    }
    const picture = recorder.finishRecordingAsPicture();
    recorder.dispose();
    linksPaint.dispose();
    markerPaint.dispose();
    outlinePaint.dispose();
    return picture;
  }, [
    camera.scale,
    colors.ink,
    height,
    layoutReadyFor,
    miniNodes,
    query.data,
    width,
  ]);
  useEffect(() => () => miniCloudPicture.dispose(), [miniCloudPicture]);

  useEffect(() => {
    if (!query.data) return;
    let active = true;
    void restoreCloudPositions(userId, 'genre', nodes)
      .catch((error: unknown) => {
        console.error('[cloud] Unable to restore the MiniCloud layout.', error);
      })
      .finally(() => {
        if (active) setLayoutReadyFor(query.data);
      });
    return () => {
      active = false;
    };
  }, [nodes, query.data, userId]);

  if (
    (!query.data && query.isLoading) ||
    (query.data && layoutReadyFor !== query.data)
  ) {
    return (
      <View style={[styles.miniCloud, { height, gap: 8, padding: 8 }]}>
        <Skeleton height={height} style={{ width: '100%' }} />
      </View>
    );
  }
  if (!query.data && query.isError) {
    return (
      <View
        accessibilityRole="text"
        style={[styles.miniCloud, { height, justifyContent: 'center' }]}
      >
        <Text variant="caption" color="secondary">
          Atlas unavailable
        </Text>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel="Miniature static atlas"
      style={[styles.miniCloud, { height, backgroundColor: colors.bg }]}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={miniCloudPicture} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  sparseWorld: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  completionist: { alignSelf: 'center', paddingVertical: 2 },
  arrivalToast: {
    alignSelf: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  loading: {
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  toolbar: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchBox: {
    flex: 1,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 11,
  },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },
  iconButton: {
    width: 44,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityChip: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitch: { flexDirection: 'row', padding: 4, borderRadius: 12, gap: 4 },
  modeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  listToggle: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  fogBand: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  focusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 8, height: 8, borderRadius: 4 },
  clusterChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  clusterSwatch: { width: 8, height: 8, borderRadius: 4 },
  canvasFrame: {
    width: '100%',
    height: 520,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  youAreHere: {
    alignItems: 'center',
    left: '50%',
    marginLeft: -40,
    marginTop: -40,
    position: 'absolute',
    top: '50%',
    zIndex: 4,
  },
  touchRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderWidth: 1.5,
    borderRadius: 45,
  },
  introOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  introBackdrop: {
    ...StyleSheet.absoluteFill,
    opacity: 0.82,
  },
  introCard: { alignItems: 'center', gap: 14, maxWidth: 340, width: '100%' },
  printFrame: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: 130,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  printPass: {
    height: 82,
    left: -18,
    opacity: 0.9,
    position: 'absolute',
    transform: [{ rotate: '-6deg' }],
    width: '78%',
  },
  printPassSecond: {
    height: 64,
    right: -14,
    transform: [{ rotate: '4deg' }],
    width: '64%',
  },
  tourCaption: { gap: 6 },
  progressTicks: { flexDirection: 'row', gap: 4 },
  progressTick: { flex: 1, height: 3 },
  hubLabel: {
    fontWeight: '700',
    textAlign: 'center',
  },
  hubCountLabel: {
    fontWeight: '600',
    marginTop: 2,
  },
  artistLabelPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  artistNameLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    minHeight: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceOverlay: {
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    position: 'absolute',
    zIndex: 50,
  },
  performanceText: { fontSize: 10 },
  miniCloud: { width: '100%', overflow: 'hidden', position: 'relative' },
});

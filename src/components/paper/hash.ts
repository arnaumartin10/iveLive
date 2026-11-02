/**
 * Deterministic imperfection helpers
 * Derive consistent rotation, offsets, and tears from a string ID so
 * items render stably without jittering between re-renders.
 */

/** FNV-1a 32-bit hash */
export function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Get a deterministic float between [min, max] from an ID string */
export function seededRandom(id: string, seed = 0): number {
  const h = hashString(`${id}:${seed}`);
  return (h % 10000) / 10000;
}

/**
 * Deterministic tilt in degrees for stickers, stubs, and stamps.
 * Defaults to range [-3, 3] degrees.
 */
export function getSeededRotation(id: string, maxDeg = 3): number {
  const r = seededRandom(id, 42);
  // Range: -maxDeg to +maxDeg
  return (r * 2 - 1) * maxDeg;
}

/** Deterministic offset in pixels, e.g. for hard shadows or paper misregistration */
export function getSeededOffset(id: string, maxPx = 2): { x: number; y: number } {
  const rx = seededRandom(id, 101);
  const ry = seededRandom(id, 202);
  return {
    x: Math.round((rx * 2 - 1) * maxPx),
    y: Math.round((ry * 2 - 1) * maxPx),
  };
}

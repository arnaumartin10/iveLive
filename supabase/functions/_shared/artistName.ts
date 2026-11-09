export function normalizeArtistName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function normalizeSpotifyArtistName(value: string): string {
  return normalizeArtistName(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^the\s+/, '');
}

function similarity(left: string, right: string): number {
  if (!left || !right) return 0;
  const previous: number[] = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0] ?? 0;
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const old = previous[rightIndex] ?? Number.MAX_SAFE_INTEGER;
      previous[rightIndex] = Math.min(
        (previous[rightIndex] ?? Number.MAX_SAFE_INTEGER) + 1,
        (previous[rightIndex - 1] ?? Number.MAX_SAFE_INTEGER) + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = old;
    }
  }
  return (
    1 -
    (previous[right.length] ?? Math.max(left.length, right.length)) /
      Math.max(left.length, right.length)
  );
}

export function findExactSpotifyArtist<
  T extends {
    name: string;
    imageLarge?: string | null;
    images?: unknown[];
  },
>(target: string, candidates: T[], aliases: string[] = []): T | null {
  const acceptedNames = new Set(
    [target, ...aliases].map(normalizeSpotifyArtistName).filter(Boolean),
  );
  const exact = candidates.filter((candidate) =>
    acceptedNames.has(normalizeSpotifyArtistName(candidate.name)),
  );
  const withImage = (candidate: T) =>
    Boolean(candidate.imageLarge) ||
    (Array.isArray(candidate.images) && candidate.images.length > 0);
  if (exact.length) return exact.find(withImage) ?? exact[0] ?? null;

  if (!aliases.length) return null;
  const knownAliases = aliases.map(normalizeSpotifyArtistName);
  return (
    candidates
      .map((candidate) => ({
        candidate,
        score: Math.max(
          ...knownAliases.map((alias) =>
            similarity(alias, normalizeSpotifyArtistName(candidate.name)),
          ),
        ),
      }))
      .filter(({ score }) => score >= 0.92)
      .sort((left, right) => right.score - left.score)
      .map(({ candidate }) => candidate)
      .find(withImage) ??
    candidates
      .map((candidate) => ({
        candidate,
        score: Math.max(
          ...knownAliases.map((alias) =>
            similarity(alias, normalizeSpotifyArtistName(candidate.name)),
          ),
        ),
      }))
      .filter(({ score }) => score >= 0.92)
      .sort((left, right) => right.score - left.score)[0]?.candidate ??
    null
  );
}

export type QueueCandidate = {
  id: string;
  search_key: string;
  priority: number;
  position: number;
};

export function orderUniqueCatalogCandidates<T extends QueueCandidate>(
  candidates: T[],
  limit: number,
): T[] {
  const ordered = [...candidates].sort(
    (left, right) =>
      left.priority - right.priority ||
      left.position - right.position ||
      left.id.localeCompare(right.id),
  );
  const seen = new Set<string>();
  const result: T[] = [];
  for (const candidate of ordered) {
    if (seen.has(candidate.search_key)) continue;
    seen.add(candidate.search_key);
    result.push(candidate);
    if (result.length >= limit) break;
  }
  return result;
}

export function catalogStatusAfterAttempt(
  attempts: number,
): 'pending' | 'not_found' {
  return attempts >= 2 ? 'not_found' : 'pending';
}

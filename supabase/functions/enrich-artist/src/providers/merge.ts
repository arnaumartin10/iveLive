import type {
  EnrichmentProvider,
  ProviderContext,
  ProviderResult,
  WeightedTag,
} from './types.ts';

export function mergeWeightedTags(...sources: WeightedTag[][]): WeightedTag[] {
  const totals = new Map<string, WeightedTag>();
  for (const tag of sources.flat()) {
    const name = tag.name.trim().replace(/\s+/g, ' ');
    if (!name) continue;
    const key = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const previous = totals.get(key);
    totals.set(key, {
      name: previous?.name ?? name,
      weight: (previous?.weight ?? 0) + Math.max(Number(tag.weight) || 1, 1),
    });
  }
  return [...totals.values()].sort(
    (left, right) =>
      right.weight - left.weight || left.name.localeCompare(right.name),
  );
}

export function resolveEnrichmentStatus(
  hasTags: boolean,
  _errors: string[],
  hasBio = false,
  hasAnyData = hasTags || hasBio,
): 'partial' | 'done' | 'failed' {
  if (hasTags && hasBio) return 'done';
  return hasAnyData ? 'partial' : 'failed';
}

export async function runIsolatedProvider(
  provider: EnrichmentProvider,
  context: ProviderContext,
): Promise<ProviderResult> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      provider.run(context, controller.signal),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error(`${provider.name} timed out`));
        }, provider.timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function collectProviderResults(
  providers: EnrichmentProvider[],
  context: ProviderContext,
) {
  const results: { provider: string; result: ProviderResult }[] = [];
  const errors: string[] = [];
  const successfulProviders: string[] = [];
  const tagSources: WeightedTag[][] = [];
  for (const provider of providers) {
    try {
      const result = await runIsolatedProvider(provider, context);
      results.push({ provider: provider.name, result });
      successfulProviders.push(provider.name);
      if (result.tags?.length) {
        tagSources.push(result.tags);
        context.tags = mergeWeightedTags(...tagSources);
      }
      if (result.releaseGroups) context.releaseGroups = result.releaseGroups;
      if (result.patch?.musicbrainz_id)
        context.musicbrainzId = String(result.patch.musicbrainz_id);
      if (result.patch?.wikidata_id)
        context.wikidataId = String(result.patch.wikidata_id);
      if (result.patch?.wikipedia_title)
        context.wikipediaTitle = String(result.patch.wikipedia_title);
    } catch (error) {
      errors.push(
        `${provider.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.warn(`[enrich-artist] ${provider.name} failed`, error);
    }
  }
  return {
    results,
    errors,
    successfulProviders,
    tags: mergeWeightedTags(...tagSources),
  };
}

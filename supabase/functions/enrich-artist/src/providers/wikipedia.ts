import { cachedJson, getIveLiveUserAgent, logProviderResult } from './http.ts';
import type {
  EnrichmentProvider,
  ProviderContext,
  ProviderResult,
} from './types.ts';

type WikidataEntity = {
  entities?: Record<string, { sitelinks?: Record<string, { title?: string }> }>;
};

export function parseWikipediaSummary(summary: {
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  originalimage?: { source?: string };
  lang?: string;
  title?: string;
}) {
  return {
    bio: summary.extract?.trim() || null,
    bio_url: summary.content_urls?.desktop?.page ?? null,
    bio_lang: summary.lang ?? null,
    bio_attribution: 'CC BY-SA',
    wikipedia_title: summary.title ?? null,
    group_image_url: summary.originalimage?.source ?? null,
    bio_source: 'wikipedia',
  };
}

async function resolveTitle(
  wikidataId: string,
  languages: string[],
): Promise<{ title: string; language: string } | null> {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: wikidataId,
    props: 'sitelinks',
    format: 'json',
  });
  const data = await cachedJson<WikidataEntity>(
    `https://www.wikidata.org/w/api.php?${params}`,
    { headers: { 'User-Agent': getIveLiveUserAgent() } },
    7 * 24 * 60 * 60 * 1000,
    'wikidata',
  );
  const entity = data.entities?.[wikidataId];
  for (const language of languages) {
    const title = entity?.sitelinks?.[`${language}wiki`]?.title;
    if (title) return { title, language };
  }
  return null;
}

export const wikipediaProvider: EnrichmentProvider = {
  name: 'wikipedia',
  timeoutMs: 5000,
  async run(context) {
    const requested = context.language?.split('-').at(0)?.toLowerCase();
    const languages = [
      ...new Set(
        [requested, 'ca', 'es', 'en'].filter(
          (value): value is string => !!value,
        ),
      ),
    ];
    let title = context.wikipediaTitle;
    let language = languages[0] ?? 'en';
    if (context.wikidataId) {
      try {
        const resolved = await resolveTitle(context.wikidataId, languages);
        if (resolved) ({ title, language } = resolved);
      } catch {
        // Keep the MusicBrainz Wikipedia title as a fallback if Wikidata is unavailable.
      }
    }
    if (!title) {
      logProviderResult('wikipedia', { matchFound: false });
      return {};
    }
    const encodedTitle = encodeURIComponent(title.replaceAll(' ', '_'));
    const attempts = context.wikidataId ? [language] : languages;
    for (const attemptLanguage of attempts) {
      try {
        const summary = await cachedJson<Record<string, unknown>>(
          `https://${attemptLanguage}.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`,
          {
            headers: {
              Accept: 'application/json',
              'User-Agent': getIveLiveUserAgent(),
            },
          },
          7 * 24 * 60 * 60 * 1000,
          'wikipedia',
        );
        const parsed = parseWikipediaSummary(
          summary as Parameters<typeof parseWikipediaSummary>[0],
        );
        logProviderResult('wikipedia', {
          matchFound: !!parsed.bio,
        });
        return {
          patch: {
            ...parsed,
            bio_url:
              parsed.bio_url ??
              `https://${attemptLanguage}.wikipedia.org/wiki/${encodedTitle}`,
            bio_lang: parsed.bio_lang ?? attemptLanguage,
          },
        };
      } catch {
        // Try the next configured language before treating the source as unavailable.
      }
    }
    logProviderResult('wikipedia', { matchFound: false });
    return {};
  },
};

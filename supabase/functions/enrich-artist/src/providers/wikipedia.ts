import { cachedJson, getIveLiveUserAgent, logProviderResult } from './http.ts';
import type { EnrichmentProvider, ProviderContext } from './types.ts';
import { isEnglishBio, stripBioMarkup } from './language.ts';

type WikidataEntity = {
  entities?: Record<string, { sitelinks?: Record<string, { title?: string }> }>;
};

export function parseWikipediaSummary(summary: {
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  originalimage?: { source?: string };
  lang?: string;
  title?: string;
  type?: string;
}) {
  const bio = stripBioMarkup(summary.extract ?? '');
  const pageUrl = summary.content_urls?.desktop?.page;
  if (
    summary.type !== 'standard' ||
    summary.lang?.toLowerCase() !== 'en' ||
    !isEnglishBio(bio) ||
    (pageUrl &&
      (() => {
        try {
          const parsed = new URL(pageUrl);
          return (
            parsed.protocol !== 'https:' ||
            parsed.hostname.toLowerCase() !== 'en.wikipedia.org'
          );
        } catch {
          return true;
        }
      })())
  ) {
    return null;
  }
  return {
    bio,
    bio_url: pageUrl ?? null,
    bio_lang: 'en',
    bio_attribution: 'CC BY-SA',
    wikipedia_title: summary.title ?? null,
    group_image_url: summary.originalimage?.source ?? null,
    bio_source: 'wikipedia',
  };
}

export async function resolveTitle(
  wikidataId: string,
  userAgent = getIveLiveUserAgent(),
): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: wikidataId,
    props: 'sitelinks',
    format: 'json',
  });
  const data = await cachedJson<WikidataEntity>(
    `https://www.wikidata.org/w/api.php?${params}`,
    { headers: { 'User-Agent': userAgent } },
    7 * 24 * 60 * 60 * 1000,
    'wikidata',
  );
  const entity = data.entities?.[wikidataId];
  return entity?.sitelinks?.enwiki?.title ?? null;
}

export const wikipediaProvider: EnrichmentProvider = {
  name: 'wikipedia',
  timeoutMs: 5000,
  async run(context) {
    let title = context.wikipediaTitle;
    if (context.wikidataId) {
      try {
        title = (await resolveTitle(context.wikidataId)) ?? title;
      } catch {
        // Keep the English MusicBrainz Wikipedia title as a fallback.
      }
    }
    if (!title) {
      logProviderResult('wikipedia', { matchFound: false });
      return {};
    }
    const encodedTitle = encodeURIComponent(title.replaceAll(' ', '_'));
    try {
      const summary = await cachedJson<Record<string, unknown>>(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`,
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
      if (!parsed) {
        logProviderResult('wikipedia', { matchFound: false });
        return { patch: { wikipedia_title: title } };
      }
      logProviderResult('wikipedia', { matchFound: true });
      return {
        patch: {
          ...parsed,
          bio_url:
            parsed.bio_url ?? `https://en.wikipedia.org/wiki/${encodedTitle}`,
        },
      };
    } catch {
      logProviderResult('wikipedia', { matchFound: false });
      return { patch: { wikipedia_title: title } };
    }
  },
};

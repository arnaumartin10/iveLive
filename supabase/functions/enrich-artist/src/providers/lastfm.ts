import { cachedJson, logProviderResult } from './http.ts';
import type {
  EnrichmentProvider,
  ProviderContext,
  ProviderResult,
  WeightedTag,
} from './types.ts';

type LastFmInfoPayload = {
  artist?: {
    bio?: {
      summary?: string;
      content?: string;
      links?: { link?: { href?: string } };
    };
  };
};

export function parseLastFmTags(payload: {
  toptags?: { tag?: { name: string; count?: number | string }[] };
}): WeightedTag[] {
  return (payload.toptags?.tag ?? []).slice(0, 10).map((tag) => ({
    name: tag.name,
    weight: Math.max(Number(tag.count) || 1, 1),
  }));
}

export function parseLastFmBio(payload: {
  artist?: {
    bio?: {
      summary?: string;
      content?: string;
      links?: { link?: { href?: string } };
    };
  };
}) {
  const bio = payload.artist?.bio;
  const summary = (bio?.summary ?? bio?.content ?? '')
    .replace(/\s*<a\s+href=[^>]*>.*?<\/a>\s*$/i, '')
    .trim();
  return summary
    ? { bio: summary, bio_url: bio?.links?.link?.href ?? null }
    : null;
}

async function lastFmRequest<T>(
  method: string,
  context: ProviderContext,
): Promise<T> {
  if (!context.lastfmApiKey)
    throw new Error('LASTFM_API_KEY is not configured');
  const params = new URLSearchParams({
    method,
    artist: context.artist.name,
    api_key: context.lastfmApiKey,
    format: 'json',
  });
  if (context.musicbrainzId) params.set('mbid', context.musicbrainzId);
  return cachedJson<T>(
    `https://ws.audioscrobbler.com/2.0/?${params}`,
    {},
    12 * 60 * 60 * 1000,
    'lastfm',
  );
}

export const lastFmProvider: EnrichmentProvider = {
  name: 'lastfm',
  timeoutMs: 5000,
  async run(context) {
    if (!context.lastfmApiKey)
      throw new Error('LASTFM_API_KEY is not configured');
    const [tagResult, infoResult] = await Promise.allSettled([
      lastFmRequest<{
        toptags?: { tag?: { name: string; count?: number | string }[] };
      }>('artist.getTopTags', context),
      lastFmRequest<LastFmInfoPayload>('artist.getInfo', context),
    ]);
    if (tagResult.status === 'rejected' && infoResult.status === 'rejected') {
      throw new Error('Last.fm tag and bio requests failed');
    }
    const tagPayload = tagResult.status === 'fulfilled' ? tagResult.value : {};
    const infoPayload =
      infoResult.status === 'fulfilled' ? infoResult.value : {};
    const bio = parseLastFmBio(infoPayload);
    const tags = parseLastFmTags(tagPayload);
    logProviderResult('lastfm', {
      matchFound: tags.length > 0 || !!bio,
      tagsReturned: tags.length,
      requestStatus:
        tagResult.status === 'rejected' || infoResult.status === 'rejected'
          ? 'partial'
          : 'success',
    });
    return {
      tags,
      patch: bio
        ? { bio: bio.bio, bio_source: 'lastfm', bio_url: bio.bio_url }
        : undefined,
    };
  },
};

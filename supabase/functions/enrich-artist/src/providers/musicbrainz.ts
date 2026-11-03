import { musicBrainzJson } from './http.ts';
import { logProviderResult } from './http.ts';
import type {
  EnrichmentProvider,
  ProviderContext,
  ProviderResult,
  ReleaseGroup,
  WeightedTag,
} from './types.ts';

type MusicBrainzArtist = {
  id: string;
  name: string;
  score?: number;
  tags?: { name: string; count?: number }[];
  genres?: { name: string; count?: number }[];
  relations?: { type: string; url?: { resource?: string } }[];
  'life-span'?: { begin?: string | null; ended?: boolean };
  'release-groups'?: {
    id: string;
    title: string;
    'first-release-date'?: string;
    'primary-type'?: string;
    'secondary-types'?: string[];
  }[];
};

export function parseMusicBrainzArtistSearch(
  payload: { artists?: MusicBrainzArtist[] },
  name: string,
) {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  return (
    (payload.artists ?? []).slice().sort((left, right) => {
      const leftExact = normalize(left.name) === normalize(name) ? 1 : 0;
      const rightExact = normalize(right.name) === normalize(name) ? 1 : 0;
      return rightExact - leftExact || (right.score ?? 0) - (left.score ?? 0);
    })[0] ?? null
  );
}

/** Extract begin year from MusicBrainz life-span ("YYYY" or "YYYY-MM-DD"). */
function parseLifeSpanYear(artist: MusicBrainzArtist): number | null {
  const raw = artist['life-span']?.begin;
  if (!raw) return null;
  const year = parseInt(raw.slice(0, 4), 10);
  return Number.isFinite(year) && year > 1000 ? year : null;
}

export function parseMusicBrainzArtist(
  artist: MusicBrainzArtist,
): ProviderResult {
  const tags: WeightedTag[] = [
    ...(artist.tags ?? []),
    ...(artist.genres ?? []),
  ].map((tag) => ({ name: tag.name, weight: Math.max(tag.count ?? 1, 1) }));
  const wikidata = artist.relations?.find(
    (relation) => relation.type === 'wikidata',
  )?.url?.resource;
  const wikipedia = artist.relations?.find((relation) => {
    if (relation.type !== 'wikipedia' || !relation.url?.resource) return false;
    try {
      const url = new URL(relation.url.resource);
      return (
        url.protocol === 'https:' &&
        url.hostname.toLowerCase() === 'en.wikipedia.org' &&
        url.pathname.startsWith('/wiki/')
      );
    } catch {
      return false;
    }
  })?.url?.resource;
  let wikipediaTitle: string | undefined;
  if (wikipedia) {
    try {
      wikipediaTitle = decodeURIComponent(
        new URL(wikipedia).pathname.split('/').at(-1) ?? '',
      ).replaceAll('_', ' ');
    } catch {
      wikipediaTitle = undefined;
    }
  }
  const releaseGroups: ReleaseGroup[] = (artist['release-groups'] ?? []).map(
    (group) => ({
      id: group.id,
      title: group.title,
      firstReleaseDate: group['first-release-date'],
      primaryType: group['primary-type'],
      secondaryTypes: group['secondary-types'] ?? [],
    }),
  );
  const beginYear = parseLifeSpanYear(artist);
  return {
    patch: {
      musicbrainz_id: artist.id,
      wikidata_id: wikidata?.match(/Q\d+/)?.[0] ?? null,
      wikipedia_title: wikipediaTitle ?? null,
      ...(beginYear !== null
        ? { begin_year: beginYear, begin_year_source: 'musicbrainz' }
        : {}),
    },
    tags,
    releaseGroups,
  };
}

export const musicBrainzProvider: EnrichmentProvider = {
  name: 'musicbrainz',
  timeoutMs: 5000,
  async run(context, signal) {
    if (context.musicbrainzId) {
      const existing = await musicBrainzJson<MusicBrainzArtist>(
        `https://musicbrainz.org/ws/2/artist/${encodeURIComponent(context.musicbrainzId)}?inc=tags+genres+url-rels+release-groups&fmt=json`,
        signal,
      );
      const result = parseMusicBrainzArtist(existing);
      logProviderResult('musicbrainz', {
        matchFound: true,
        tagsReturned: result.tags?.length,
        albumsReturned: result.releaseGroups?.length,
      });
      return result;
    }
    const artistQuery = `artist:"${context.artist.name}"`;
    const queries = context.artist.spotify_id
      ? [
          `${artistQuery} AND url:"https://open.spotify.com/artist/${context.artist.spotify_id}"`,
          artistQuery,
        ]
      : [artistQuery];
    const candidates: MusicBrainzArtist[] = [];
    for (const query of queries) {
      const search = await musicBrainzJson<{ artists?: MusicBrainzArtist[] }>(
        `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=10`,
        signal,
      );
      candidates.push(...(search.artists ?? []));
    }
    if (signal.aborted) throw new DOMException('Timed out', 'AbortError');
    const match = parseMusicBrainzArtistSearch(
      { artists: candidates },
      context.artist.name,
    );
    if (!match) {
      logProviderResult('musicbrainz', { matchFound: false });
      return {};
    }
    const detail = await musicBrainzJson<MusicBrainzArtist>(
      `https://musicbrainz.org/ws/2/artist/${encodeURIComponent(match.id)}?inc=tags+genres+url-rels+release-groups&fmt=json`,
      signal,
    );
    const result = parseMusicBrainzArtist(detail);
    logProviderResult('musicbrainz', {
      matchFound: true,
      tagsReturned: result.tags?.length,
      albumsReturned: result.releaseGroups?.length,
    });
    return result;
  },
};

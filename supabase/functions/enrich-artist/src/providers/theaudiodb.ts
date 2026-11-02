import { cachedJson, logProviderResult } from './http.ts';
import type {
  ArtistImageCandidate,
  EnrichmentProvider,
  ProviderContext,
} from './types.ts';

export function parseTheAudioDbArtist(payload: {
  artists?: {
    strBiographyEN?: string;
    strArtistFanart?: string;
    strArtistFanart2?: string;
    strArtistFanart3?: string;
    strArtistFanart4?: string;
    strArtistBanner?: string;
    strArtistWideThumb?: string;
    strArtistThumb?: string;
  }[];
}) {
  const artist = payload.artists?.[0];
  if (!artist) return { patch: {}, images: [] as ArtistImageCandidate[] };
  const imageFields: {
    key:
      | 'strArtistFanart'
      | 'strArtistFanart2'
      | 'strArtistFanart3'
      | 'strArtistFanart4'
      | 'strArtistBanner'
      | 'strArtistWideThumb'
      | 'strArtistThumb';
    label: string;
    role: ArtistImageCandidate['image_role'];
    sortOrder: number;
  }[] = [
    {
      key: 'strArtistFanart',
      label: 'Fan art 1',
      role: 'banner',
      sortOrder: 1,
    },
    {
      key: 'strArtistFanart2',
      label: 'Fan art 2',
      role: 'banner',
      sortOrder: 2,
    },
    {
      key: 'strArtistFanart3',
      label: 'Fan art 3',
      role: 'banner',
      sortOrder: 3,
    },
    {
      key: 'strArtistFanart4',
      label: 'Fan art 4',
      role: 'banner',
      sortOrder: 4,
    },
    {
      key: 'strArtistBanner',
      label: 'Artist banner',
      role: 'banner',
      sortOrder: 5,
    },
    {
      key: 'strArtistWideThumb',
      label: 'Wide artist photo',
      role: 'banner',
      sortOrder: 6,
    },
    {
      key: 'strArtistThumb',
      label: 'Artist portrait',
      role: 'profile',
      sortOrder: 7,
    },
  ];
  const seen = new Set<string>();
  const images = imageFields.flatMap(
    ({ key, label, role, sortOrder }): ArtistImageCandidate[] => {
      const imageUrl = artist[key]?.trim();
      if (!imageUrl || seen.has(imageUrl)) return [];
      seen.add(imageUrl);
      return [
        {
          image_url: imageUrl,
          image_role: role,
          label,
          sort_order: sortOrder,
          source: 'theaudiodb',
        },
      ];
    },
  );
  return {
    patch: {
      banner_image_url: artist.strArtistFanart || null,
      group_image_url: artist.strArtistThumb || null,
      bio: artist.strBiographyEN || null,
      bio_source: artist.strBiographyEN ? 'theaudiodb' : null,
    },
    images,
  };
}

export const theAudioDbProvider: EnrichmentProvider = {
  name: 'theaudiodb',
  timeoutMs: 5000,
  async run(context) {
    const runtime = globalThis as typeof globalThis & {
      Deno?: { env: { get(name: string): string | undefined } };
    };
    if (runtime.Deno?.env.get('ENABLE_THEAUDIODB') !== 'true') {
      logProviderResult('theaudiodb', {
        matchFound: false,
        requestStatus: 'not_requested',
      });
      return {};
    }
    const key = runtime.Deno?.env.get('THEAUDIODB_API_KEY');
    if (!key) throw new Error('THEAUDIODB_API_KEY is not configured');
    const query = encodeURIComponent(context.artist.name);
    const data = await cachedJson<{
      artists?: {
        strBiographyEN?: string;
        strArtistFanart?: string;
        strArtistFanart2?: string;
        strArtistFanart3?: string;
        strArtistFanart4?: string;
        strArtistBanner?: string;
        strArtistWideThumb?: string;
        strArtistThumb?: string;
      }[];
    }>(
      `https://www.theaudiodb.com/api/v1/json/${encodeURIComponent(key)}/search.php?s=${query}`,
      {},
      6 * 60 * 60 * 1000,
      'theaudiodb',
    );
    const result = parseTheAudioDbArtist(data);
    logProviderResult('theaudiodb', {
      matchFound:
        Object.values(result.patch).some((value) => !!value) ||
        result.images.length > 0,
    });
    return result;
  },
};

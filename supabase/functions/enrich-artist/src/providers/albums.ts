import { logProviderResult } from './http.ts';
import type {
  AlbumCandidate,
  EnrichmentProvider,
  ProviderContext,
  ProviderResult,
  ReleaseGroup,
} from './types.ts';

export function selectAlbumReleaseGroups(
  groups: ReleaseGroup[],
): ReleaseGroup[] {
  return groups
    .filter((group) =>
      ['album', 'ep'].includes((group.primaryType ?? '').toLowerCase()),
    )
    .filter(
      (group) =>
        !(group.secondaryTypes ?? []).some((type) =>
          /live|compilation|remix/i.test(type),
        ),
    )
    .sort((left, right) =>
      (right.firstReleaseDate ?? '').localeCompare(left.firstReleaseDate ?? ''),
    )
    .slice(0, 12);
}

export function parseCoverArt(payload: {
  images?: {
    image?: string;
    thumbnails?: { small?: string; large?: string; 500?: string };
  }[];
}) {
  const front = payload.images?.find(
    (image) => image.image || image.thumbnails?.['500'],
  );
  return {
    cover_url: front?.thumbnails?.['500'] ?? front?.image ?? null,
    cover_thumb_url:
      front?.thumbnails?.small ??
      front?.thumbnails?.large ??
      front?.image ??
      null,
  };
}

const coverCache = new Map<string, { expiresAt: number; exists: boolean }>();

async function coverExists(url: string, signal: AbortSignal): Promise<boolean> {
  const cached = coverCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(
      JSON.stringify({
        event: 'enrichment_provider_request',
        provider: 'cover-art-archive',
        endpoint: 'coverartarchive.org/release-group/front-500',
        status: null,
        ok: cached.exists,
        cached: true,
      }),
    );
    return cached.exists;
  }
  const requestController = new AbortController();
  const timeout = setTimeout(() => requestController.abort(), 3000);
  const abortFromProvider = () => requestController.abort();
  signal.addEventListener('abort', abortFromProvider, { once: true });
  try {
    const response = await fetch(url, {
      signal: requestController.signal,
      headers: { Accept: 'image/*' },
    });
    await response.body?.cancel();
    console.log(
      JSON.stringify({
        event: 'enrichment_provider_request',
        provider: 'cover-art-archive',
        endpoint: 'coverartarchive.org/release-group/front-500',
        status: response.status,
        ok: response.ok,
        cached: false,
      }),
    );
    const exists = response.ok;
    coverCache.set(url, {
      exists,
      expiresAt: Date.now() + (exists ? 30 : 1) * 24 * 60 * 60 * 1000,
    });
    return exists;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abortFromProvider);
  }
}

export const albumsProvider: EnrichmentProvider = {
  name: 'albums',
  timeoutMs: 5000,
  async run(context, signal): Promise<ProviderResult> {
    const groups = selectAlbumReleaseGroups(context.releaseGroups);
    const albums: AlbumCandidate[] = await Promise.all(
      groups.map(async (group, index) => {
        let cover = {
          cover_url: null as string | null,
          cover_thumb_url: null as string | null,
        };
        try {
          const coverUrl = `https://coverartarchive.org/release-group/${encodeURIComponent(group.id)}/front-500`;
          if (await coverExists(coverUrl, signal)) {
            cover = {
              cover_url: coverUrl,
              cover_thumb_url: `https://coverartarchive.org/release-group/${encodeURIComponent(group.id)}/front-250`,
            };
          }
        } catch {
          // Cover art is optional; an album without artwork is still useful.
        }
        const year = Number(group.firstReleaseDate?.slice(0, 4));
        return {
          title: group.title,
          year: Number.isFinite(year) ? year : null,
          ...cover,
          musicbrainz_release_group_id: group.id,
          type: group.primaryType?.toLowerCase() === 'ep' ? 'ep' : 'album',
          sort_order: index,
        };
      }),
    );
    logProviderResult('cover-art-archive', {
      matchFound: albums.some((album) => album.cover_url !== null),
      albumsReturned: albums.length,
    });
    return { albums };
  },
};

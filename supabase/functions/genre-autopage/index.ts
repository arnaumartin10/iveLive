import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import { authenticateRequest } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';

type ArtistCard = {
  id: string;
  name: string;
  image_url_thumb: string | null;
  image_url_large: string | null;
  primary_macro: string | null;
  position: number;
};

type AutoPayload = {
  page: Record<string, unknown>;
  pillars: ArtistCard[];
  examples: ArtistCard[];
};

const cacheAgeMs = 30 * 24 * 60 * 60 * 1000;
const incompleteCacheAgeMs = 6 * 60 * 60 * 1000;

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^the\s+/, '');
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function cleanHtml(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .replace(/read more on last\.fm\.?[\s\S]*$/i, '')
    .trim();
}

async function fetchWikipediaSummary(title: string) {
  const headers = { 'user-agent': 'IveLive/1.0 (genre pages)' };
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    { headers },
  );
  if (!response.ok) return null;
  const summary = await response.json();
  if (
    summary.type !== 'standard' ||
    /disambiguation/i.test(text(summary.description)) ||
    /may refer to/i.test(text(summary.extract))
  ) {
    return null;
  }
  const extract = text(summary.extract).trim();
  if (!extract) return null;
  return {
    title: text(summary.title) || title,
    summary: extract,
    url:
      text(summary.content_urls?.desktop?.page) ||
      `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`,
  };
}

async function fetchWikipedia(title: string, label: string) {
  const knownPage = title
    ? await fetchWikipediaSummary(title).catch(() => null)
    : null;
  if (knownPage) return knownPage;

  const searchUrl = new URL(
    'https://en.wikipedia.org/w/rest.php/v1/search/page',
  );
  searchUrl.searchParams.set('q', `${label} music`);
  searchUrl.searchParams.set('limit', '1');
  const searchResponse = await fetch(searchUrl, {
    headers: { 'user-agent': 'IveLive/1.0 (genre pages)' },
  });
  if (!searchResponse.ok) throw new Error('Wikipedia search failed.');
  const search = await searchResponse.json();
  const pageTitle = text(search.pages?.[0]?.title);
  return pageTitle ? fetchWikipediaSummary(pageTitle) : null;
}

async function fetchLastFm(tag: string, apiKey: string) {
  const fetchMethod = async (method: string) => {
    const url = new URL('https://ws.audioscrobbler.com/2.0/');
    url.searchParams.set('method', method);
    url.searchParams.set('tag', tag);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('format', 'json');
    url.searchParams.set('lang', 'en');
    if (method === 'tag.getTopArtists') url.searchParams.set('limit', '100');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Last.fm ${method} failed.`);
    const body = await response.json();
    if (body.error) throw new Error(`Last.fm ${method} returned an error.`);
    return body;
  };
  const [infoResult, topResult] = await Promise.allSettled([
    fetchMethod('tag.getInfo'),
    fetchMethod('tag.getTopArtists'),
  ]);
  const info = infoResult.status === 'fulfilled' ? infoResult.value : null;
  const top = topResult.status === 'fulfilled' ? topResult.value : null;
  return {
    summary: info ? cleanHtml(text(info.tag?.wiki?.summary)) : '',
    url: (info && text(info.tag?.url)) || null,
    artists: Array.isArray(top.topartists?.artist)
      ? top.topartists.artist
          .map((artist: Record<string, unknown>) => text(artist.name))
          .filter(Boolean)
      : [],
  };
}

async function resolveSpotifyArtist(
  database: ReturnType<typeof createClient>,
  internalSecret: string | null,
  name: string,
): Promise<ArtistCard | null> {
  const { data: existingRows, error: existingError } = await database
    .from('artists')
    .select('id,name,spotify_id,image_url_thumb,image_url_large,primary_macro')
    .ilike('name_normalized', `%${name.replace(/[%_]/g, '')}%`)
    .limit(10);
  if (existingError) throw new Error('Could not resolve a genre artist.');
  let match = (existingRows ?? []).find(
    (artist) => normalizeName(artist.name) === normalizeName(name),
  );
  if (
    match &&
    !match.image_url_large &&
    !match.image_url_thumb &&
    match.spotify_id &&
    internalSecret
  ) {
    const refreshed = await database.functions.invoke<{
      image_url_thumb: string | null;
      image_url_large: string | null;
      primary_macro: string | null;
    }>('spotify-upsert-artist', {
      body: { spotifyId: match.spotify_id },
      headers: { 'x-internal-secret': internalSecret },
    });
    if (!refreshed.error && refreshed.data) {
      match = { ...match, ...refreshed.data };
    }
  }
  if (
    match &&
    (match.image_url_large ||
      match.image_url_thumb ||
      !internalSecret ||
      match.spotify_id)
  ) {
    return {
      id: match.id,
      name: match.name,
      image_url_thumb: match.image_url_thumb,
      image_url_large: match.image_url_large,
      primary_macro: match.primary_macro,
      position: 0,
    };
  }
  if (!internalSecret) return null;

  const search = await database.functions.invoke<{
    results?: Array<{ name: string; spotifyId: string }>;
  }>('spotify-search', {
    body: { q: name, limit: 10 },
    headers: { 'x-internal-secret': internalSecret },
  });
  if (search.error) return null;
  const results = Array.isArray(search.data?.results)
    ? search.data.results
    : [];
  const exact = results.find(
    (artist) => normalizeName(artist.name) === normalizeName(name),
  );
  const candidate =
    exact ??
    (results[0] && normalizeName(results[0].name) === normalizeName(name)
      ? results[0]
      : null);
  if (!candidate?.spotifyId) return null;

  const saved = await database.functions.invoke<{
    id: string;
    name: string;
    image_url_thumb: string | null;
    image_url_large: string | null;
    primary_macro: string | null;
  }>('spotify-upsert-artist', {
    body: {
      spotifyId: candidate.spotifyId,
      ...(match?.id ? { artistId: match.id } : {}),
    },
    headers: { 'x-internal-secret': internalSecret },
  });
  if (saved.error || !saved.data?.id) return null;
  return {
    id: saved.data.id,
    name: saved.data.name,
    image_url_thumb: saved.data.image_url_thumb,
    image_url_large: saved.data.image_url_large,
    primary_macro: saved.data.primary_macro,
    position: 0,
  };
}

async function makePayload(
  database: ReturnType<typeof createClient>,
  genre: {
    slug: string;
    label: string;
    parent_slug: string | null;
    aliases: string[];
    wikipedia_title: string | null;
    lastfm_tag: string | null;
    origin_years: string | null;
  },
  internalSecret: string | null,
  lastfmApiKey: string | null,
): Promise<AutoPayload> {
  const [wikiResult, lastFmResult] = await Promise.allSettled([
    fetchWikipedia(genre.wikipedia_title ?? '', genre.label),
    lastfmApiKey
      ? fetchLastFm(genre.lastfm_tag ?? genre.label, lastfmApiKey)
      : Promise.resolve(null),
  ]);
  const wiki = wikiResult.status === 'fulfilled' ? wikiResult.value : null;
  const lastFm =
    lastFmResult.status === 'fulfilled' ? lastFmResult.value : null;

  const { data: appArtists, error: appArtistsError } = await database
    .from('artists')
    .select('id,name,spotify_id,image_url_thumb,image_url_large,primary_macro')
    .contains('sub_genres', [genre.slug])
    .order('name')
    .limit(20);
  if (appArtistsError) throw new Error('Could not load IveLive genre artists.');

  const byId = new Map<string, ArtistCard>();
  for (const artist of appArtists ?? []) {
    let profile = artist;
    if (
      !profile.image_url_large &&
      !profile.image_url_thumb &&
      profile.spotify_id &&
      internalSecret
    ) {
      const refreshed = await database.functions.invoke<{
        image_url_thumb: string | null;
        image_url_large: string | null;
      }>('spotify-upsert-artist', {
        body: { spotifyId: profile.spotify_id },
        headers: { 'x-internal-secret': internalSecret },
      });
      if (!refreshed.error && refreshed.data) {
        profile = { ...profile, ...refreshed.data };
      }
    }
    byId.set(profile.id, {
      id: profile.id,
      name: profile.name,
      image_url_thumb: profile.image_url_thumb,
      image_url_large: profile.image_url_large,
      primary_macro: profile.primary_macro,
      position: byId.size + 1,
    });
  }
  const names = [...new Set(lastFm?.artists ?? [])].slice(0, 40);
  for (const name of names) {
    if (byId.size >= 20) break;
    const artist = internalSecret
      ? await resolveSpotifyArtist(database, internalSecret, name)
      : null;
    if (artist && !byId.has(artist.id)) {
      byId.set(artist.id, { ...artist, position: byId.size + 1 });
    }
  }
  const examples = [...byId.values()].slice(0, 20).map((artist, index) => ({
    ...artist,
    position: index + 1,
  }));
  const summary =
    wiki?.summary ||
    lastFm?.summary ||
    `There is not yet a reliable published overview of ${genre.label}. It is listed under ${genre.parent_slug?.replaceAll('-', ' ') ?? 'the wider music catalog'}; its page will grow as more artists and sources are added.`;
  const page = {
    slug: genre.slug,
    title: genre.label,
    tagline: 'An auto-generated guide to the sound.',
    summary,
    origin_place: genre.parent_slug
      ? `Within ${genre.parent_slug.replaceAll('-', ' ')}`
      : 'Not specified',
    origin_years: genre.origin_years ?? 'A living tradition',
    history: [],
    related_slugs: [],
    wikipedia_title: wiki?.title ?? null,
    content_version: 1,
    reviewed: false,
    auto_generated: true,
    summary_source: wiki ? 'wikipedia' : lastFm?.summary ? 'lastfm' : null,
    summary_url: wiki?.url ?? lastFm?.url ?? null,
    wikipedia_attribution: wiki ? 'Wikipedia · CC BY-SA' : null,
    lastfm_url: lastFm?.url ?? null,
  };
  return { page, pillars: [], examples };
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  const auth = await authenticateRequest(request);
  if ('response' in auth) return auth.response;

  try {
    const input = await request.json().catch(() => null);
    if (typeof input?.slug !== 'string' || !input.slug.trim()) {
      return jsonResponse({ error: 'slug is required' }, 400);
    }
    const database = createClient(
      auth.context.supabaseUrl,
      auth.context.serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: genre, error: genreError } = await database
      .from('genres')
      .select(
        'slug,label,parent_slug,aliases,wikipedia_title,lastfm_tag,origin_years,level',
      )
      .eq('slug', input.slug)
      .maybeSingle();
    if (genreError) throw new Error('Could not load the requested genre.');
    if (!genre || genre.level === 1) {
      return jsonResponse({ found: false, error: 'not_found' }, 404);
    }

    const { data: cached, error: cacheError } = await database
      .from('genre_autopages')
      .select('payload,fetched_at')
      .eq('slug', genre.slug)
      .maybeSingle();
    if (cacheError) throw new Error('Could not read the genre page cache.');
    let payload: AutoPayload;
    const cachedPayload = cached?.payload as AutoPayload | null;
    const cachedExamples = cachedPayload?.examples ?? [];
    const cachedSummary = text(cachedPayload?.page?.summary);
    const cachedPhotoCount = cachedExamples.filter(
      (artist) => artist.image_url_large || artist.image_url_thumb,
    ).length;
    const hasCompleteArtistPhotos =
      cachedExamples.length >= 12 &&
      cachedPhotoCount >= Math.ceil(cachedExamples.length * 0.8);
    const cacheTtl =
      hasCompleteArtistPhotos && cachedSummary.length >= 80
        ? cacheAgeMs
        : incompleteCacheAgeMs;
    if (
      cachedPayload &&
      Date.now() - Date.parse(cached!.fetched_at) < cacheTtl
    ) {
      payload = cachedPayload;
    } else {
      const internalSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET');
      const lastfmApiKey = Deno.env.get('LASTFM_API_KEY');
      payload = await makePayload(
        database,
        genre,
        internalSecret || null,
        lastfmApiKey,
      );
      const { error: writeError } = await database
        .from('genre_autopages')
        .upsert(
          {
            slug: genre.slug,
            payload,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: 'slug' },
        );
      if (writeError) throw new Error('Could not cache the genre page.');
    }

    const examples = payload.examples ?? [];
    const artistIds = examples.map((artist) => artist.id);
    const [logsResult, wishlistResult, scopedLogsResult] = await Promise.all([
      artistIds.length
        ? database
            .from('concert_logs')
            .select('artist_id,rating')
            .eq('user_id', auth.context.userId)
            .in('artist_id', artistIds)
        : Promise.resolve({ data: [], error: null }),
      artistIds.length
        ? database
            .from('wishlist_items')
            .select('artist_id')
            .eq('user_id', auth.context.userId)
            .in('artist_id', artistIds)
            .in('status', ['wanted', 'going'])
        : Promise.resolve({ data: [], error: null }),
      database
        .from('concert_logs')
        .select('artist_id,rating,artists!inner(name,macro_genres,sub_genres)')
        .eq('user_id', auth.context.userId),
    ]);
    if (logsResult.error || wishlistResult.error || scopedLogsResult.error) {
      throw new Error('Could not load your genre listening stats.');
    }
    const seenCounts = new Map<string, number>();
    for (const log of logsResult.data ?? []) {
      seenCounts.set(log.artist_id, (seenCounts.get(log.artist_id) ?? 0) + 1);
    }
    const savedIds = new Set(
      (wishlistResult.data ?? []).map((item) => item.artist_id),
    );
    const viewerLogs = (scopedLogsResult.data ?? []).filter((log) => {
      const artist = log.artists as unknown as {
        macro_genres: string[] | null;
        sub_genres: string[] | null;
      };
      return genre.level === 1
        ? (artist.macro_genres ?? []).includes(genre.slug)
        : (artist.sub_genres ?? []).includes(genre.slug);
    });
    const seenByArtist = new Map<string, { name: string; count: number }>();
    for (const log of viewerLogs) {
      const artistData = log.artists as unknown as { name: string };
      const entry = seenByArtist.get(log.artist_id) ?? {
        name: artistData.name,
        count: 0,
      };
      entry.count += 1;
      seenByArtist.set(log.artist_id, entry);
    }
    const ratings = viewerLogs.flatMap((log) =>
      typeof log.rating === 'number' ? [log.rating] : [],
    );
    const mostSeen = [...seenByArtist.entries()].sort(
      (left, right) =>
        right[1].count - left[1].count ||
        left[1].name.localeCompare(right[1].name),
    )[0];
    return jsonResponse({
      found: true,
      page: payload.page,
      pillars: (payload.pillars ?? []).map((artist) => ({
        ...artist,
        seen_count: seenCounts.get(artist.id) ?? 0,
        in_wishlist: savedIds.has(artist.id),
      })),
      examples: examples.map((artist) => ({
        ...artist,
        seen_count: seenCounts.get(artist.id) ?? 0,
        in_wishlist: savedIds.has(artist.id),
      })),
      viewer: {
        shows: viewerLogs.length,
        unique_artists: seenByArtist.size,
        average_rating: ratings.length
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          : null,
        most_seen_artist: mostSeen
          ? {
              id: mostSeen[0],
              name: mostSeen[1].name,
              seen_count: mostSeen[1].count,
            }
          : null,
        seen_feature_count: examples.filter(
          (artist) => (seenCounts.get(artist.id) ?? 0) > 0,
        ).length,
      },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'genre_autopage_failed',
        type: error instanceof Error ? error.name : 'UnknownError',
      }),
    );
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Genre page failed.' },
      502,
    );
  }
});

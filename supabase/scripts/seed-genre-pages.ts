import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import classical from '../../src/content/genres/classical.json';
import electronic from '../../src/content/genres/electronic.json';
import folkAcoustic from '../../src/content/genres/folk_acoustic.json';
import hipHop from '../../src/content/genres/hip_hop.json';
import indie from '../../src/content/genres/indie.json';
import jazzBlues from '../../src/content/genres/jazz_blues.json';
import latin from '../../src/content/genres/latin.json';
import metal from '../../src/content/genres/metal.json';
import pop from '../../src/content/genres/pop.json';
import punk from '../../src/content/genres/punk.json';
import rock from '../../src/content/genres/rock.json';
import rnbSoul from '../../src/content/genres/rnb_soul.json';
import world from '../../src/content/genres/world.json';

config({ path: '.env.local' });

type ArtistRecord = {
  id: string;
  name: string;
  spotify_id: string | null;
  image_url_large: string | null;
  image_url_thumb: string | null;
};
type ArtistContent = { name: string; why?: string; note?: string };
type GenreContent = {
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  origin_place: string;
  origin_years: string;
  history: unknown[];
  related_slugs: string[];
  wikipedia_title: string | null;
  content_version: number;
  reviewed: boolean;
  pillars: ArtistContent[];
  examples: ArtistContent[];
};

function isArtistContent(value: unknown): value is ArtistContent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    (!('why' in value) || typeof value.why === 'string') &&
    (!('note' in value) || typeof value.note === 'string')
  );
}

function isGenreContent(value: unknown): value is GenreContent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'slug' in value &&
    typeof value.slug === 'string' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'tagline' in value &&
    typeof value.tagline === 'string' &&
    'summary' in value &&
    typeof value.summary === 'string' &&
    'origin_place' in value &&
    typeof value.origin_place === 'string' &&
    'origin_years' in value &&
    typeof value.origin_years === 'string' &&
    'history' in value &&
    Array.isArray(value.history) &&
    'related_slugs' in value &&
    Array.isArray(value.related_slugs) &&
    value.related_slugs.every((slug) => typeof slug === 'string') &&
    'wikipedia_title' in value &&
    (typeof value.wikipedia_title === 'string' ||
      value.wikipedia_title === null) &&
    'content_version' in value &&
    typeof value.content_version === 'number' &&
    'reviewed' in value &&
    typeof value.reviewed === 'boolean' &&
    'pillars' in value &&
    Array.isArray(value.pillars) &&
    value.pillars.every(isArtistContent) &&
    'examples' in value &&
    Array.isArray(value.examples) &&
    value.examples.every(isArtistContent)
  );
}

type SpotifyArtist = { name: string; spotifyId: string };
type SeedOptions = {
  dryRun: boolean;
  only: string | null;
  level: 1 | 2 | null;
};

const macroGenres: GenreContent[] = [
  rock,
  indie,
  pop,
  electronic,
  hipHop,
  rnbSoul,
  metal,
  punk,
  folkAcoustic,
  jazzBlues,
  latin,
  classical,
  world,
];
function loadSubGenres(): GenreContent[] {
  const contentDirectory = join(process.cwd(), 'src/content/genres/sub');
  return readdirSync(contentDirectory)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort()
    .map((fileName) => {
      const filePath = join(contentDirectory, fileName);
      const content: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
      if (!isGenreContent(content)) {
        throw new Error(`Invalid genre content in ${filePath}.`);
      }
      if (content.slug !== fileName.slice(0, -'.json'.length)) {
        throw new Error(`Genre slug does not match ${filePath}.`);
      }
      return content;
    });
}

const subGenres = loadSubGenres();
const genresByLevel = new Map<number, GenreContent[]>([
  [1, macroGenres],
  [2, subGenres],
]);
const genres = [...macroGenres, ...subGenres];

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing from .env.local.`);
  return value;
}

function normalizeArtistName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeWithoutThe(value: string): string {
  return normalizeArtistName(value).replace(/^the\s+/, '');
}

function parseOptions(args: string[]): SeedOptions {
  const onlyIndex = args.indexOf('--only');
  const only = onlyIndex >= 0 ? (args[onlyIndex + 1] ?? null) : null;
  const allowedSlugs = new Set(genres.map((genre) => genre.slug));
  const levelIndex = args.indexOf('--level');
  const levelValue = levelIndex >= 0 ? args[levelIndex + 1] : null;
  const level = levelValue === '1' ? 1 : levelValue === '2' ? 2 : null;
  if (levelIndex >= 0 && level === null) {
    throw new Error('Provide either 1 or 2 after --level.');
  }
  if (onlyIndex >= 0 && (!only || only.startsWith('--'))) {
    throw new Error('Provide a genre slug after --only.');
  }
  if (only && !allowedSlugs.has(only)) {
    throw new Error(`Unknown genre slug for --only: ${only}`);
  }
  return { dryRun: args.includes('--dry-run'), only, level };
}

function responseStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('context' in error)) {
    return undefined;
  }
  const context = error.context;
  if (context instanceof Response) return context.status;
  if (
    typeof context === 'object' &&
    context !== null &&
    'status' in context &&
    typeof context.status === 'number'
  ) {
    return context.status;
  }
  return undefined;
}

async function retryAfterSeconds(error: unknown): Promise<number | null> {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('context' in error) ||
    !(error.context instanceof Response)
  ) {
    return null;
  }
  try {
    const body: unknown = await error.context.clone().json();
    if (
      typeof body === 'object' &&
      body !== null &&
      'retryAfter' in body &&
      typeof body.retryAfter === 'number' &&
      Number.isFinite(body.retryAfter)
    ) {
      return Math.max(0, body.retryAfter);
    }
  } catch (parseError) {
    console.warn(
      `Could not read retryAfter metadata (${parseError instanceof Error ? parseError.name : 'unknown error'}); using backoff.`,
    );
    return null;
  }
  return null;
}

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const requestTimeoutMs = 25_000;
let spotifyRateLimited = false;
let spotifyRetryAfterSecondsValue: number | null = null;

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const upstreamSignal = init?.signal;
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
  if (upstreamSignal?.aborted) {
    abortFromUpstream();
  } else {
    upstreamSignal?.addEventListener('abort', abortFromUpstream, {
      once: true,
    });
  }
  const timeout = setTimeout(
    () => controller.abort(new Error('Request timed out after 25 seconds.')),
    requestTimeoutMs,
  );

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    upstreamSignal?.removeEventListener('abort', abortFromUpstream);
  }
};

async function retryableInvoke<T>(
  invoke: () => Promise<{ data: T | null; error: unknown }>,
  description: string,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await invoke();
    if (!result.error && result.data !== null) return result.data;
    lastError = result.error ?? new Error(`${description} returned no data.`);
    const status = responseStatus(lastError);
    const retryable =
      (status !== undefined && status >= 500) ||
      (status === undefined && attempt === 0);
    if (!retryable || attempt === 2) {
      throw lastError;
    }
    await wait(500 * 2 ** attempt);
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`${description} failed after retries.`);
}

async function loadArtists(
  database: ReturnType<typeof createClient>,
): Promise<Map<string, ArtistRecord>> {
  const byName = new Map<string, ArtistRecord>();
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await database
      .from('artists')
      .select('id, name, spotify_id, image_url_large, image_url_thumb')
      .order('id')
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error('Could not load existing artists.');
    for (const artist of data ?? []) {
      const exact = normalizeArtistName(artist.name);
      if (exact && !byName.has(exact)) byName.set(exact, artist);
      const withoutThe = normalizeWithoutThe(artist.name);
      if (withoutThe && !byName.has(withoutThe)) byName.set(withoutThe, artist);
    }
    if (!data || data.length < pageSize) break;
  }
  return byName;
}

async function resolveArtist(
  genre: GenreContent,
  name: string,
  byName: Map<string, ArtistRecord>,
  database: ReturnType<typeof createClient>,
  internalSecret: string,
  dryRun: boolean,
): Promise<{
  artist: ArtistRecord | null;
  result:
    | 'found'
    | 'refreshed'
    | 'would-refresh'
    | 'found-no-photo'
    | 'created'
    | 'created-no-photo'
    | 'would-create'
    | 'unresolved'
    | 'rate-limited';
}> {
  const normalized = normalizeArtistName(name);
  const existing =
    byName.get(normalized) ?? byName.get(normalizeWithoutThe(name));
  if (existing) {
    if (existing.image_url_large || existing.image_url_thumb) {
      return { artist: existing, result: 'found' };
    }
    if (existing.spotify_id) {
      if (dryRun) return { artist: existing, result: 'would-refresh' };
      if (spotifyRateLimited) {
        return { artist: existing, result: 'rate-limited' };
      }
      try {
        const refreshed = await retryableInvoke(
          () =>
            database.functions.invoke<ArtistRecord>('spotify-upsert-artist', {
              body: { spotifyId: existing.spotify_id },
              headers: { 'x-internal-secret': internalSecret },
            }),
          `Spotify image refresh for ${name}`,
        );
        const artist = {
          ...existing,
          ...refreshed,
        };
        byName.set(normalized, artist);
        byName.set(normalizeWithoutThe(name), artist);
        return {
          artist,
          result:
            artist.image_url_large || artist.image_url_thumb
              ? 'refreshed'
              : 'found-no-photo',
        };
      } catch (error) {
        const status = responseStatus(error);
        if (status === 429) {
          spotifyRateLimited = true;
          spotifyRetryAfterSecondsValue = await retryAfterSeconds(error);
          console.warn(
            `${genre.slug} · ${name} · Spotify rate limited image refresh; pausing Spotify lookups for this run.`,
          );
        }
        console.warn(
          `${genre.slug} · ${name} · image refresh failed (${status ?? 'network/timeout'})`,
        );
        return {
          artist: existing,
          result: status === 429 ? 'rate-limited' : 'found-no-photo',
        };
      }
    }
  }

  if (spotifyRateLimited) {
    return { artist: null, result: 'rate-limited' };
  }

  try {
    let search: { results?: SpotifyArtist[] };
    try {
      search = await retryableInvoke(
        () =>
          database.functions.invoke<{ results?: SpotifyArtist[] }>(
            'spotify-search',
            {
              body: { q: name, limit: 10 },
              headers: { 'x-internal-secret': internalSecret },
            },
          ),
        `Spotify search for ${name}`,
      );
    } catch (error) {
      const errorType =
        error instanceof Error ? error.name : 'UnknownError';
      const status = responseStatus(error);
      if (status === 429) {
        spotifyRateLimited = true;
        spotifyRetryAfterSecondsValue = await retryAfterSeconds(error);
        console.warn(
          `${genre.slug} · ${name} · Spotify rate limit reached${spotifyRetryAfterSecondsValue === null ? '' : `; Retry-After ${spotifyRetryAfterSecondsValue}s`}. Pausing further Spotify lookups for this run.`,
        );
        return { artist: null, result: 'rate-limited' };
      }
      console.warn(
        `${genre.slug} · ${name} · spotify search unavailable (${status ?? errorType}); continuing to next artist.`,
      );
      throw error;
    }
    const results = Array.isArray(search.results) ? search.results : [];
    const exact = results.find(
      (artist) => normalizeArtistName(artist.name) === normalized,
    );
    const top = results[0];
    const candidate =
      exact ??
      (top && normalizeWithoutThe(top.name) === normalizeWithoutThe(name)
        ? top
        : undefined);
    if (!candidate?.spotifyId) {
      return { artist: null, result: 'unresolved' };
    }
    if (dryRun) {
      return {
        artist: existing ?? null,
        result: existing ? 'would-refresh' : 'would-create',
      };
    }

    const saved = await retryableInvoke(
      () =>
        database.functions.invoke<ArtistRecord>('spotify-upsert-artist', {
          body: {
            spotifyId: candidate.spotifyId,
            ...(existing?.id ? { artistId: existing.id } : {}),
          },
          headers: { 'x-internal-secret': internalSecret },
        }),
      `Spotify upsert for ${name}`,
    );
    if (
      normalizeArtistName(saved.name) !== normalized &&
      normalizeWithoutThe(saved.name) !== normalizeWithoutThe(name)
    ) {
      return { artist: null, result: 'unresolved' };
    }
    const artist = {
      id: saved.id,
      name: saved.name,
      spotify_id: saved.spotify_id,
      image_url_large: saved.image_url_large,
      image_url_thumb: saved.image_url_thumb,
    };
    byName.set(normalized, artist);
    byName.set(normalizeWithoutThe(name), artist);
    return {
      artist,
      result: existing
        ? artist.image_url_large || artist.image_url_thumb
          ? 'refreshed'
          : 'found-no-photo'
        : artist.image_url_large || artist.image_url_thumb
          ? 'created'
          : 'created-no-photo',
    };
  } catch (error) {
    const status = responseStatus(error);
    if (status === 429) {
      spotifyRateLimited = true;
      spotifyRetryAfterSecondsValue = await retryAfterSeconds(error);
      console.warn(
        `${genre.slug} · ${name} · Spotify rate limit reached${spotifyRetryAfterSecondsValue === null ? '' : `; Retry-After ${spotifyRetryAfterSecondsValue}s`}. Pausing further Spotify lookups for this run.`,
      );
    }
    console.warn(
      `${genre.slug} · ${name} · lookup failed (${status ?? 'network/timeout'})`,
    );
    return {
      artist: existing ?? null,
      result: status === 429 ? 'rate-limited' : 'unresolved',
    };
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const availableGenres =
    options.level == null
      ? options.only
        ? genres
        : macroGenres
      : (genresByLevel.get(options.level) ?? []);
  const selectedGenres = availableGenres.filter(
    (genre) => !options.only || genre.slug === options.only,
  );
  const database = createClient(
    requiredEnv('SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetchWithTimeout },
    },
  );
  const internalSecret = requiredEnv('INTERNAL_FUNCTION_SECRET');
  const byName = await loadArtists(database);
  const unresolved: string[] = [];
  const rateLimited: string[] = [];
  let foundCount = 0;
  let refreshedCount = 0;
  let wouldRefreshCount = 0;
  let noPhotoCount = 0;
  let createdCount = 0;
  let wouldCreateCount = 0;

  for (const genre of selectedGenres) {
    if (!options.dryRun) {
      const { error } = await database.from('genre_pages').upsert({
        slug: genre.slug,
        title: genre.title,
        tagline: genre.tagline,
        summary: genre.summary,
        origin_place: genre.origin_place,
        origin_years: genre.origin_years,
        history: genre.history,
        related_slugs: genre.related_slugs,
        wikipedia_title: genre.wikipedia_title,
        content_version: genre.content_version,
        reviewed: false,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(`Could not seed ${genre.slug} page.`);
      const { error: catalogError } = await database
        .from('genres')
        .update({ has_editorial: true })
        .eq('slug', genre.slug);
      if (catalogError)
        throw new Error(`Could not mark ${genre.slug} editorial.`);
    }

    const resolvedPillars: Array<{
      genre_slug: string;
      position: number;
      artist_id: string;
      why: string;
    }> = [];
    const resolvedExamples: Array<{
      genre_slug: string;
      position: number;
      artist_id: string;
      note: string | null;
    }> = [];
    let resolvedExampleCount = 0;

    for (const [kind, items] of [
      ['pillar', genre.pillars],
      ['example', genre.examples],
    ] as const) {
      for (const [index, item] of items.entries()) {
        console.log(`${genre.slug} · ${item.name} · resolving`);
        const resolution = await resolveArtist(
          genre,
          item.name,
          byName,
          database,
          internalSecret,
          options.dryRun,
        );
        if (resolution.result === 'found') foundCount += 1;
        if (resolution.result === 'refreshed') refreshedCount += 1;
        if (resolution.result === 'would-refresh') wouldRefreshCount += 1;
        if (
          resolution.result === 'found-no-photo' ||
          resolution.result === 'created-no-photo'
        ) {
          noPhotoCount += 1;
        }
        if (
          resolution.result === 'created' ||
          resolution.result === 'created-no-photo'
        ) {
          createdCount += 1;
        }
        if (resolution.result === 'would-create') wouldCreateCount += 1;
        if (resolution.result === 'rate-limited') {
          rateLimited.push(`${genre.slug}: ${item.name}`);
        }
        if (
          kind === 'example' &&
          resolution.result !== 'unresolved' &&
          resolution.result !== 'rate-limited'
        ) {
          resolvedExampleCount += 1;
        }
        if (resolution.result === 'unresolved') {
          unresolved.push(`${genre.slug}: ${item.name}`);
        }
        console.log(`${genre.slug} · ${item.name} · ${resolution.result}`);
        if (!resolution.artist || options.dryRun) continue;
        if (kind === 'pillar') {
          resolvedPillars.push({
            genre_slug: genre.slug,
            position: index + 1,
            artist_id: resolution.artist.id,
            why: item.why ?? '',
          });
        } else {
          resolvedExamples.push({
            genre_slug: genre.slug,
            position: index + 1,
            artist_id: resolution.artist.id,
            note: item.note ?? null,
          });
        }
      }
    }

    if (!options.dryRun) {
      if (resolvedPillars.length) {
        const { error } = await database
          .from('genre_pillars')
          .upsert(resolvedPillars, { onConflict: 'genre_slug,position' });
        if (error) throw new Error(`Could not seed ${genre.slug} pillars.`);
      }
      if (resolvedExamples.length) {
        const { error } = await database
          .from('genre_examples')
          .upsert(resolvedExamples, { onConflict: 'genre_slug,position' });
        if (error) throw new Error(`Could not seed ${genre.slug} examples.`);
      }
    }
    if (resolvedExampleCount < 12) {
      console.warn(
        `${genre.slug}: only ${resolvedExampleCount} example artists resolved.`,
      );
    }
  }

  console.log(
    `Genre seed ${options.dryRun ? 'dry run' : 'complete'}: ${foundCount} found, ${refreshedCount} images refreshed, ${createdCount} created, ${noPhotoCount} without a Spotify photo, ${wouldCreateCount} would create, ${wouldRefreshCount} would refresh, ${unresolved.length} unresolved, ${rateLimited.length} deferred after Spotify rate limiting.`,
  );
  if (unresolved.length) {
    console.log(`Unresolved names:\n${unresolved.join('\n')}`);
  }
  if (rateLimited.length) {
    console.log(
      `Deferred because Spotify rate-limited this run (${rateLimited.length})${spotifyRetryAfterSecondsValue === null ? '' : `; wait at least ${spotifyRetryAfterSecondsValue}s before retrying`}. Run the seed again later to resume:\n${rateLimited.join('\n')}`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Genre page seeding failed.',
  );
  process.exitCode = 1;
});

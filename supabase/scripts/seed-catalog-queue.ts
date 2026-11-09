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

type ArtistContent = {
  name: string;
  why?: string;
  note?: string;
  aliases?: string[];
};
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
type QueueEntry = {
  name: string;
  name_normalized: string;
  genre_slug: string;
  role: 'pillar' | 'example';
  position: number;
  priority: number;
  why: string | null;
  note: string | null;
  aliases: string[];
};
type QueueRow = QueueEntry & {
  status: 'pending' | 'resolved' | 'not_found' | 'error' | 'skipped';
  attempts: number;
  last_error: string | null;
  resolved_artist_id: string | null;
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
    'wikipedia_title' in value &&
    (typeof value.wikipedia_title === 'string' ||
      value.wikipedia_title === null) &&
    'content_version' in value &&
    typeof value.content_version === 'number' &&
    'reviewed' in value &&
    typeof value.reviewed === 'boolean' &&
    'pillars' in value &&
    Array.isArray(value.pillars) &&
    'examples' in value &&
    Array.isArray(value.examples) &&
    [...value.pillars, ...value.examples].every(
      (artist) =>
        typeof artist === 'object' &&
        artist !== null &&
        'name' in artist &&
        typeof artist.name === 'string' &&
        (!('aliases' in artist) ||
          (Array.isArray(artist.aliases) &&
            artist.aliases.every((alias) => typeof alias === 'string'))),
    )
  );
}

function loadSubGenres(): GenreContent[] {
  const directory = join(process.cwd(), 'src/content/genres/sub');
  return readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((file) => {
      const path = join(directory, file);
      const content: unknown = JSON.parse(readFileSync(path, 'utf8'));
      if (!isGenreContent(content)) {
        throw new Error(`Invalid genre content in ${path}.`);
      }
      if (content.slug !== file.slice(0, -5)) {
        throw new Error(`Genre slug does not match ${path}.`);
      }
      return content;
    });
}

function normalizeArtistName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeSearchName(value: string): string {
  return normalizeArtistName(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^the\s+/, '');
}

function loadGenres(): Array<{ genre: GenreContent; level: 1 | 2 }> {
  return [
    ...macroGenres.map((genre) => ({ genre, level: 1 as const })),
    ...loadSubGenres().map((genre) => ({ genre, level: 2 as const })),
  ];
}

function buildQueueEntries(
  genres: Array<{ genre: GenreContent; level: 1 | 2 }>,
): QueueEntry[] {
  const entries = new Map<string, QueueEntry>();
  for (const { genre, level } of genres) {
    for (const [role, artists] of [
      ['pillar', genre.pillars],
      ['example', genre.examples],
    ] as const) {
      for (const [index, artist] of artists.entries()) {
        const key = [normalizeArtistName(artist.name), genre.slug, role].join(
          '|',
        );
        if (entries.has(key)) continue;
        entries.set(key, {
          name: artist.name,
          name_normalized: normalizeArtistName(artist.name),
          genre_slug: genre.slug,
          role,
          position: index + 1,
          priority:
            level === 1
              ? role === 'pillar'
                ? 1
                : 2
              : role === 'pillar'
                ? 3
                : 4,
          why: artist.why ?? null,
          note: artist.note ?? null,
          aliases: artist.aliases ?? [],
        });
      }
    }
  }
  return [...entries.values()];
}

function printCounts(
  entries: QueueEntry[],
  missingNames: Set<string>,
  offline = false,
) {
  const bucketNames = [
    'macro pillars',
    'macro examples',
    'sub-genre pillars',
    'sub-genre examples',
  ];
  for (let priority = 1; priority <= 4; priority += 1) {
    const bucket = entries.filter((entry) => entry.priority === priority);
    const uniqueNames = new Set(bucket.map((entry) => entry.name_normalized))
      .size;
    console.log(
      `Priority ${priority} (${bucketNames[priority - 1]}): ${bucket.length} placements, ${uniqueNames} unique names`,
    );
  }
  const uniqueNames = new Set(entries.map((entry) => entry.name_normalized));
  const genreEntries = new Map<string, QueueEntry[]>();
  for (const entry of entries) {
    const group = genreEntries.get(entry.genre_slug) ?? [];
    group.push(entry);
    genreEntries.set(entry.genre_slug, group);
  }
  for (const [slug, group] of [...genreEntries.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const names = new Set(group.map((entry) => entry.name_normalized));
    const missing = [...names].filter((name) => missingNames.has(name)).length;
    const level =
      Math.min(...group.map((entry) => entry.priority)) <= 2 ? 1 : 2;
    console.log(
      `${slug} (level ${level}): ${names.size} unique names, ${names.size - missing} already present, ${missing} missing${offline ? ' (upper bound)' : ''}`,
    );
  }
  const dailyBudget = Number(process.env.CATALOG_DAILY_REQUEST_BUDGET ?? '120');
  const estimatedDays =
    dailyBudget > 0 ? Math.ceil(missingNames.size / dailyBudget) : null;
  console.log(`Unique artist names in content: ${uniqueNames.size}`);
  console.log(
    `Artists needing lookup: ${missingNames.size}${offline ? ' (offline upper bound)' : ''}`,
  );
  console.log(
    `Estimated completion: ${estimatedDays === null ? 'configure CATALOG_DAILY_REQUEST_BUDGET' : `${estimatedDays} day(s) at ${dailyBudget} searches/day`}`,
  );
}

async function loadArtists(database: ReturnType<typeof createClient>) {
  const byNormalizedName = new Map<string, string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await database
      .from('artists')
      .select('id,name')
      .order('id')
      .range(offset, offset + 999);
    if (error) throw new Error('Could not read existing artists.');
    for (const artist of data ?? []) {
      if (typeof artist.name === 'string' && typeof artist.id === 'string') {
        byNormalizedName.set(normalizeSearchName(artist.name), artist.id);
      }
    }
    if (!data || data.length < 1000) break;
  }
  return byNormalizedName;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const genres = loadGenres();
  const entries = buildQueueEntries(genres);
  if (dryRun) {
    printCounts(
      entries,
      new Set(entries.map((entry) => entry.name_normalized)),
      true,
    );
    console.log(
      'Dry run is offline; existing artists were not queried or changed.',
    );
    return;
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
  const database = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  for (const { genre } of genres) {
    const { error: pageError } = await database.from('genre_pages').upsert(
      {
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
      },
      { onConflict: 'slug' },
    );
    if (pageError) throw new Error(`Could not seed genre page ${genre.slug}.`);
    const { data: updatedGenre, error: genreError } = await database
      .from('genres')
      .update({ has_editorial: true })
      .eq('slug', genre.slug)
      .select('slug')
      .maybeSingle();
    if (genreError || !updatedGenre) {
      throw new Error(`Could not mark genre ${genre.slug} as editorial.`);
    }
  }
  const artistsByName = await loadArtists(database);
  const { data: existingRows, error: existingError } = await database
    .from('catalog_queue')
    .select(
      'name_normalized,genre_slug,role,status,attempts,last_error,resolved_artist_id',
    )
    .limit(10000);
  if (existingError) throw new Error('Could not read the catalog queue.');
  const existingByKey = new Map(
    (existingRows ?? []).map((row) => [
      `${row.name_normalized}|${row.genre_slug}|${row.role}`,
      row,
    ]),
  );
  const rows: QueueRow[] = entries.map((entry) => {
    const key = `${entry.name_normalized}|${entry.genre_slug}|${entry.role}`;
    const old = existingByKey.get(key);
    const artistId = artistsByName.get(normalizeSearchName(entry.name));
    return {
      ...entry,
      status: artistId
        ? 'resolved'
        : ((old?.status as QueueRow['status'] | undefined) ?? 'pending'),
      attempts: artistId ? 0 : (old?.attempts ?? 0),
      last_error: artistId ? null : (old?.last_error ?? null),
      resolved_artist_id: artistId ?? old?.resolved_artist_id ?? null,
    };
  });

  for (let offset = 0; offset < rows.length; offset += 500) {
    const { error } = await database
      .from('catalog_queue')
      .upsert(rows.slice(offset, offset + 500), {
        onConflict: 'name_normalized,genre_slug,role',
      });
    if (error) throw new Error(`Could not seed catalog rows at ${offset}.`);
  }

  const missingNames = new Set(
    entries
      .filter((entry) => !artistsByName.has(normalizeSearchName(entry.name)))
      .map((entry) => entry.name_normalized),
  );
  printCounts(entries, missingNames);
  console.log(`Queue rows seeded: ${rows.length}`);
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Catalog queue seeding failed.',
  );
  process.exitCode = 1;
});

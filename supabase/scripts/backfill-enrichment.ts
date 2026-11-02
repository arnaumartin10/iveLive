import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const envFile = dotenv.config({ path: '.env.local' });
if (envFile.error && envFile.error.code !== 'ENOENT') {
  console.error('Could not read .env.local');
  process.exit(1);
}

const requiredEnvironment = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'INTERNAL_FUNCTION_SECRET',
  'LASTFM_API_KEY',
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
] as const;
const missingEnvironment = requiredEnvironment.filter(
  (name) => !process.env[name]?.trim(),
);
if (missingEnvironment.length) {
  console.error(
    `.env.local is missing required variables: ${missingEnvironment.join(', ')}`,
  );
  process.exit(1);
}

const argumentsList = process.argv.slice(2);
const onlyIndex = argumentsList.indexOf('--only');
const onlyName = onlyIndex >= 0 ? argumentsList[onlyIndex + 1] : undefined;
if (onlyIndex >= 0 && (!onlyName || onlyName.startsWith('--'))) {
  console.error(
    'Usage: npx tsx supabase/scripts/backfill-enrichment.ts [--only "Artist"] [--force]',
  );
  process.exit(1);
}
const force = argumentsList.includes('--force');
const unknownArguments = argumentsList.filter(
  (argument, index) =>
    argument !== '--force' &&
    argument !== '--only' &&
    !(index === onlyIndex + 1 && onlyName),
);
if (unknownArguments.length) {
  console.error(`Unknown arguments: ${unknownArguments.join(', ')}`);
  process.exit(1);
}

type Artist = {
  id: string;
  name: string;
};

async function summarizeInvocationError(error: Error) {
  const context = (error as Error & { context?: unknown }).context;
  if (context instanceof Response) {
    const payload = await context
      .clone()
      .json()
      .catch(() => null);
    const code =
      payload && typeof payload.code === 'string' ? payload.code : null;
    const safeMessages = new Set([
      'Unauthorized',
      'Server auth is not configured',
      'Invalid JWT',
      'Missing authorization header',
      'Missing authorization token',
    ]);
    const responseMessage =
      payload && typeof payload.error === 'string'
        ? payload.error
        : payload && typeof payload.message === 'string'
          ? payload.message
          : null;
    const safeMessage =
      responseMessage && safeMessages.has(responseMessage)
        ? responseMessage
        : null;
    return `${code ?? safeMessage ?? error.name} (HTTP ${context.status})`;
  }
  return error.name || 'Function invocation failed';
}

async function main() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const database = createClient(process.env.SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const pageSize = 500;
  const artists: Artist[] = [];
  let offset = 0;
  while (true) {
    let query = database
      .from('artists')
      .select('id, name')
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (!force) query = query.neq('enrichment_status', 'done');
    if (onlyName) query = query.ilike('name', `%${onlyName}%`);

    const { data, error } = await query;
    if (error) {
      console.error(`Could not load artists: ${error.message}`);
      process.exit(1);
    }
    if (!data?.length) break;
    artists.push(...data);
    offset += data.length;
  }

  if (!artists.length) {
    console.error(
      onlyName
        ? `No eligible artist matched "${onlyName}".`
        : 'No artists need enrichment.',
    );
    process.exit(1);
  }

  const counts = { done: 0, partial: 0, failed: 0, pending: 0 };
  let invocationFailures = 0;
  for (const artist of artists) {
    try {
      const { error: invocationError } = await database.functions.invoke(
        'enrich-artist',
        {
          body: { artistId: artist.id, force },
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            'x-internal-secret': process.env.INTERNAL_FUNCTION_SECRET!,
          },
        },
      );
      const invocationFailure = invocationError
        ? await summarizeInvocationError(invocationError)
        : null;
      if (invocationFailure) invocationFailures += 1;

      const { data: updated, error: artistError } = await database
        .from('artists')
        .select('enrichment_status, primary_macro, lastfm_tags, genres, bio, begin_year, begin_year_source')
        .eq('id', artist.id)
        .single();
      if (artistError || !updated) {
        invocationFailures += 1;
        console.log(`${artist.name} | failed | unclassified | 0 | 0 | no | -`);
        counts.failed += 1;
        continue;
      }

      const { count: albumCount, error: albumError } = await database
        .from('artist_albums')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', artist.id);
      if (albumError) invocationFailures += 1;

      const status = updated.enrichment_status as keyof typeof counts;
      if (status in counts) counts[status] += 1;
      if (status === 'pending' && !invocationFailure) {
        invocationFailures += 1;
      }
      const tagsCount = Array.isArray(updated.lastfm_tags)
        ? updated.lastfm_tags.length
        : Array.isArray(updated.genres)
          ? updated.genres.length
          : 0;
      console.log(
        `${artist.name} | ${updated.enrichment_status} | ${updated.primary_macro ?? 'unclassified'} | ${tagsCount} | ${albumCount ?? 0} | ${updated.bio?.trim() ? 'yes' : 'no'} | ${updated.begin_year ?? '-'}${updated.begin_year ? `(${updated.begin_year_source ?? '?'})` : ''}${invocationFailure ? ` | ${invocationFailure}` : ''}`,
      );
    } catch {
      invocationFailures += 1;
      counts.failed += 1;
      console.log(`${artist.name} | failed | unclassified | 0 | 0 | no`);
    }
  }

  console.log(
    `Summary: done ${counts.done}, partial ${counts.partial}, failed ${counts.failed}, pending ${counts.pending}`,
  );
  if (invocationFailures) process.exitCode = 1;
}

void main().catch(() => {
  console.error('Backfill failed before processing completed.');
  process.exitCode = 1;
});

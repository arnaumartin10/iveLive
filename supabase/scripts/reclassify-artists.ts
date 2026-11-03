import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing from .env.local.`);
  return value;
}

async function main() {
  const afterIndex = process.argv.indexOf('--after');
  const afterValue =
    afterIndex >= 0 ? (process.argv[afterIndex + 1] ?? null) : null;
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (
    afterIndex >= 0 &&
    (!afterValue ||
      !uuidPattern.test(afterValue) ||
      afterValue.startsWith('--'))
  ) {
    throw new Error('Provide a UUID after --after to resume at that artist.');
  }
  const unknownArguments = process.argv
    .slice(2)
    .filter(
      (argument, index) =>
        argument !== '--promote' &&
        argument !== '--after' &&
        !(afterIndex >= 0 && index === afterIndex - 1),
    );
  if (unknownArguments.length) {
    throw new Error(`Unknown arguments: ${unknownArguments.join(', ')}`);
  }
  const database = createClient(
    requiredEnv('SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const promote = process.argv.includes('--promote');
  if (promote) {
    const { data, error } = await database.rpc('promote_frequent_tags', {
      p_min: 3,
    });
    if (error) throw new Error(`Tag promotion failed: ${error.message}`);
    console.log(`Promoted ${data ?? 0} frequent tags.`);
  }

  const batchSize = 25;
  let afterId: string | null = afterValue;
  let updatedCount = 0;
  let batchNumber = 0;
  while (true) {
    const { data, error } = await database.rpc('reclassify_artists_batch', {
      p_after_id: afterId,
      p_batch_size: batchSize,
    });
    if (error) {
      throw new Error(`Artist reclassification failed: ${error.message}`);
    }
    const batch = data?.[0];
    if (!batch) {
      throw new Error('Artist reclassification returned no batch result.');
    }
    updatedCount += Number(batch.updated_count);
    batchNumber += 1;
    if (batch.updated_count) {
      console.log(
        `Batch ${batchNumber}: ${batch.updated_count} artists through ${batch.last_id}.`,
      );
    }
    if (!batch.last_id) break;
    afterId = batch.last_id;
  }

  const macroCounts = new Map<string, number>();
  const subgenreCounts = new Map<string, number>();
  let unclassified = 0;
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await database
      .from('artists')
      .select('macro_genres,sub_genres')
      .order('id')
      .range(offset, offset + pageSize - 1);
    if (error)
      throw new Error(
        `Could not read classification results: ${error.message}`,
      );
    for (const artist of data ?? []) {
      const macros = artist.macro_genres ?? [];
      if (macros.includes('unclassified')) unclassified += 1;
      for (const macro of macros) {
        macroCounts.set(macro, (macroCounts.get(macro) ?? 0) + 1);
      }
      for (const subgenre of artist.sub_genres ?? []) {
        subgenreCounts.set(subgenre, (subgenreCounts.get(subgenre) ?? 0) + 1);
      }
    }
    if (!data || data.length < pageSize) break;
  }

  console.log(
    `Reclassified ${updatedCount} artists in batches of ${batchSize}.`,
  );
  console.log('Macro distribution:');
  for (const [slug, count] of [...macroCounts].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    console.log(`${slug}: ${count}`);
  }
  console.log('Top 20 sub-genres:');
  for (const [slug, count] of [...subgenreCounts]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, 20)) {
    console.log(`${slug}: ${count}`);
  }
  console.log(`Still unclassified: ${unclassified}`);
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Artist reclassification failed.',
  );
  process.exitCode = 1;
});

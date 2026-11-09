import { config } from 'dotenv';

config({ path: '.env.local' });

type Options = {
  max: number;
  sleepMs: number;
  priority: number | null;
  dryRun: boolean;
};

function optionValue(args: string[], name: string, fallback: number): number {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} requires a positive integer.`);
  }
  return value;
}

function parseOptions(args: string[]): Options {
  const max = Math.min(60, optionValue(args, '--max', 40));
  const sleepMs = Math.max(2500, optionValue(args, '--sleep-ms', 2500));
  const priorityIndex = args.indexOf('--priority');
  const priority =
    priorityIndex < 0 ? null : optionValue(args, '--priority', 1);
  if (priority !== null && priority > 4) {
    throw new Error('--priority must be between 1 and 4.');
  }
  return { max, sleepMs, priority, dryRun: args.includes('--dry-run') };
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required in .env.local.`);
  return value;
}

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.dryRun) {
    console.log(
      JSON.stringify({
        dryRun: true,
        max: options.max,
        batchSize: 10,
        sleepMs: options.sleepMs,
        priority: options.priority,
      }),
    );
    return;
  }

  const url = requiredEnv('SUPABASE_URL').replace(/\/+$/, '');
  const internalSecret = requiredEnv('INTERNAL_FUNCTION_SECRET');
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const totals = {
    processed: 0,
    resolved: 0,
    not_found: 0,
    errors: 0,
    stopped_by_cooldown: false,
  };
  let remaining = options.max;

  while (remaining > 0) {
    const batchSize = Math.min(10, remaining);
    const response = await fetch(`${url}/functions/v1/catalog-drip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
        ...(anonKey ? { apikey: anonKey } : {}),
      },
      body: JSON.stringify({
        max: batchSize,
        ...(options.priority === null ? {} : { priority: options.priority }),
      }),
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok || !result || typeof result !== 'object') {
      throw new Error(
        `Catalog drip request failed with status ${response.status}.`,
      );
    }
    const record = result as Record<string, unknown>;
    if (
      record.code === 'SPOTIFY_COOLDOWN' ||
      record.stopped_by_cooldown === true
    ) {
      totals.stopped_by_cooldown = true;
      break;
    }
    for (const key of [
      'processed',
      'resolved',
      'not_found',
      'errors',
    ] as const) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        totals[key] += value;
      }
    }
    const processed =
      typeof record.processed === 'number' ? record.processed : 0;
    if (processed < batchSize) break;
    remaining -= batchSize;
    if (remaining > 0) await wait(options.sleepMs);
  }

  console.log(JSON.stringify(totals));
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Catalog drip invocation failed.',
  );
  process.exitCode = 1;
});

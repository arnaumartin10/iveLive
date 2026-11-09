import { createHash, randomBytes } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const envFile = config({ path: '.env.local' });
if (envFile.error && envFile.error.code !== 'ENOENT') {
  throw new Error('Could not read .env.local.');
}

async function main() {
  const count = Number(process.argv[2] ?? 10);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error('Choose a number of invites between 1 and 100.');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the intended alpha project.',
    );
  }

  const invites = Array.from({ length: count }, () =>
    randomBytes(24).toString('base64url'),
  );
  const inviteFile = resolve(process.cwd(), '.alpha-invites.txt');
  await writeFile(inviteFile, `${invites.join('\n')}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.from('alpha_invite_codes').insert(
    invites.map((code) => ({
      code_hash: createHash('sha256').update(code).digest('hex'),
    })),
  );

  if (error) {
    await unlink(inviteFile);
    throw new Error(`Could not create alpha invites: ${error.message}`);
  }

  console.log(
    `Created ${count} invites. Codes are in .alpha-invites.txt; share them privately and delete the file when done.`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

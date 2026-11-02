import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const STORAGE_PAGE_SIZE = 1000;

type StorageEntry = { id: string | null; name: string };

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const authorization = request.headers.get('Authorization');
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Missing bearer token' }, 401);

    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceRoleKey) {
      return json({ error: 'Server auth is not configured' }, 500);
    }

    const caller = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userResult, error: userError } =
      await caller.auth.getUser(token);
    if (userError || !userResult.user)
      return json({ error: 'Unauthorized' }, 401);

    const { confirmation } = await request.json();
    if (confirmation !== 'DELETE') {
      return json({ error: 'Confirmation is required' }, 400);
    }

    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const avatarFiles = await listFiles(admin, 'avatars', userResult.user.id);
    const artistFiles = await listFiles(
      admin,
      'artist-images',
      `manual/${userResult.user.id}`,
    );
    const logMediaFiles = await listFiles(
      admin,
      'log-media',
      userResult.user.id,
    );
    await removeFiles(admin, 'avatars', avatarFiles);
    await removeFiles(admin, 'artist-images', artistFiles);
    await removeFiles(admin, 'log-media', logMediaFiles);

    const { error: deleteError } = await admin.auth.admin.deleteUser(
      userResult.user.id,
    );
    if (deleteError) throw deleteError;

    return json({ deleted: true });
  } catch (error) {
    console.error('[delete-account]', error);
    return json(
      {
        error:
          error instanceof Error ? error.message : 'Account deletion failed',
      },
      500,
    );
  }
});

async function listFiles(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const entries: StorageEntry[] = [];
  for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: STORAGE_PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    const page = (data ?? []) as StorageEntry[];
    entries.push(...page);
    if (page.length < STORAGE_PAGE_SIZE) break;
  }

  const paths: string[] = [];
  for (const entry of entries) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id === null) {
      paths.push(...(await listFiles(admin, bucket, path)));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

async function removeFiles(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  paths: string[],
): Promise<void> {
  for (let offset = 0; offset < paths.length; offset += STORAGE_PAGE_SIZE) {
    const { error } = await admin.storage
      .from(bucket)
      .remove(paths.slice(offset, offset + STORAGE_PAGE_SIZE));
    if (error) throw error;
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

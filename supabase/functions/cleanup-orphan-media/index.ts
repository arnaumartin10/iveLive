import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { authenticateRequest } from '../_shared/auth.ts';

const BUCKET = 'log-media';
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;
const LOOKUP_BATCH_SIZE = 100;

type StorageEntry = {
  id: string | null;
  name: string;
  created_at: string | null;
};

type AdminClient = SupabaseClient<any, 'public', 'public', any, any>;

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const auth = await authenticateRequest(request, true);
  if ('response' in auth) return auth.response;
  if (!auth.context.isTrustedServer) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createClient(
    auth.context.supabaseUrl,
    auth.context.serviceRoleKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  try {
    const cutoff = Date.now() - ORPHAN_AGE_MS;
    const prefixes = await listFolderNames(admin, '');
    let removed = 0;
    for (const prefix of prefixes) {
      const candidates = await listOldFiles(admin, prefix, cutoff);
      for (
        let offset = 0;
        offset < candidates.length;
        offset += LOOKUP_BATCH_SIZE
      ) {
        const batch = candidates.slice(offset, offset + LOOKUP_BATCH_SIZE);
        const columns = ['storage_path', 'thumb_path', 'poster_path'] as const;
        const references = await Promise.all(
          columns.map(async (column) => {
            const { data, error } = await admin
              .from('log_media')
              .select('storage_path,thumb_path,poster_path')
              .in(column, batch);
            if (error) throw error;
            return (data ?? []).flatMap((row) =>
              [row.storage_path, row.thumb_path, row.poster_path].filter(
                (path): path is string => typeof path === 'string',
              ),
            );
          }),
        );
        const referenced = new Set(references.flat());
        const orphanPaths = batch.filter((path) => !referenced.has(path));
        if (!orphanPaths.length) continue;
        const { error: removeError } = await admin.storage
          .from(BUCKET)
          .remove(orphanPaths);
        if (removeError) throw removeError;
        removed += orphanPaths.length;
      }
    }

    return Response.json({ removed });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'orphan_media_cleanup_failed',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      }),
    );
    return Response.json(
      { error: 'Orphan media cleanup failed.' },
      { status: 500 },
    );
  }
});

async function listFolderNames(
  admin: AdminClient,
  prefix: string,
): Promise<string[]> {
  const entries = await listDirectory(admin, prefix);
  const folders = entries.filter((entry) => entry.id === null);
  if (!folders.length) return prefix ? [prefix] : [];
  const nestedFolders: string[] = [];
  for (const folder of folders) {
    const path = prefix ? `${prefix}/${folder.name}` : folder.name;
    nestedFolders.push(...(await listFolderNames(admin, path)));
  }
  return nestedFolders;
}

async function listOldFiles(
  admin: AdminClient,
  prefix: string,
  cutoff: number,
): Promise<string[]> {
  const data = await listDirectory(admin, prefix);
  return data
    .filter((entry) => {
      if (entry.id === null || !entry.created_at) return false;
      const createdAt = Date.parse(entry.created_at);
      return Number.isFinite(createdAt) && createdAt < cutoff;
    })
    .map((entry) => `${prefix}/${entry.name}`);
}

async function listDirectory(
  admin: AdminClient,
  prefix: string,
): Promise<StorageEntry[]> {
  const entries: StorageEntry[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await admin.storage.from(BUCKET).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    const page = (data ?? []) as StorageEntry[];
    entries.push(...page);
    if (page.length < PAGE_SIZE) return entries;
  }
}

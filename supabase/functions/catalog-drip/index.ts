import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';
import {
  SpotifyCircuitOpenError,
  SpotifyCooldownError,
  resolveCatalogArtist,
  type CatalogQueueRow,
} from '../_shared/artistCatalog.ts';
import { orderUniqueCatalogCandidates } from '../_shared/catalogQueueLogic.ts';

const minimumGapMs = 2_500;

function isAuthorized(request: Request): boolean {
  const expected = Deno.env.get('INTERNAL_FUNCTION_SECRET');
  const provided = request.headers.get('x-internal-secret');
  return Boolean(expected && provided && expected === provided);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  if (!isAuthorized(request)) {
    return jsonResponse({ code: 'INTERNAL_AUTH_REQUIRED' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ code: 'SERVER_NOT_CONFIGURED' }, 500);
  }

  try {
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return jsonResponse({ code: 'INVALID_INPUT' }, 400);
    }
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      return jsonResponse({ code: 'INVALID_INPUT' }, 400);
    }
    const body = input as Record<string, unknown>;
    if (
      body.max !== undefined &&
      (typeof body.max !== 'number' || !Number.isFinite(body.max))
    ) {
      return jsonResponse({ code: 'INVALID_INPUT' }, 400);
    }
    const requested = body.max === undefined ? 30 : Math.floor(body.max);
    if (requested < 1) return jsonResponse({ code: 'INVALID_INPUT' }, 400);
    const max = Math.min(60, Math.max(1, requested));
    if (
      body.priority !== undefined &&
      (typeof body.priority !== 'number' ||
        !Number.isInteger(body.priority) ||
        body.priority < 1 ||
        body.priority > 4)
    ) {
      return jsonResponse({ code: 'INVALID_INPUT' }, 400);
    }
    const priority = body.priority === undefined ? null : body.priority;
    const database = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let query = database
      .from('catalog_queue')
      .select(
        'id,name,name_normalized,search_key,status,attempts,priority,position,aliases',
      )
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .order('position', { ascending: true })
      .limit(Math.min(1000, max * 20));
    if (priority !== null) query = query.eq('priority', priority);
    const { data: pending, error } = await query;
    if (error) throw new Error('Could not load catalog queue items.');

    const items = orderUniqueCatalogCandidates(
      (pending ?? []) as Array<
        CatalogQueueRow & { priority: number; position: number }
      >,
      max,
    );

    const summary = {
      processed: 0,
      resolved: 0,
      not_found: 0,
      errors: 0,
      stopped_by_cooldown: false,
      retry_after_seconds: null as number | null,
    };

    for (const [index, item] of items.entries()) {
      if (index > 0) await wait(minimumGapMs);
      summary.processed += 1;
      try {
        const result = await resolveCatalogArtist(database, item.name, {
          queue: item,
          serviceRoleKey,
        });
        if (result.status === 'resolved') summary.resolved += 1;
        if (result.status === 'not_found') summary.not_found += 1;
      } catch (error) {
        if (
          error instanceof SpotifyCooldownError ||
          error instanceof SpotifyCircuitOpenError
        ) {
          summary.stopped_by_cooldown = true;
          summary.retry_after_seconds = error.retryAfterSeconds;
          break;
        }
        summary.errors += 1;
        const { error: updateError } = await database
          .from('catalog_queue')
          .update({
            status: 'error',
            attempts: item.attempts + 1,
            last_error: 'Catalog lookup failed.',
            updated_at: new Date().toISOString(),
          })
          .eq('search_key', item.search_key)
          .eq('status', 'pending');
        if (updateError) {
          console.error(
            JSON.stringify({ event: 'catalog_drip_queue_update_failed' }),
          );
        }
      }
    }

    console.info(JSON.stringify({ event: 'catalog_drip_summary', ...summary }));
    return jsonResponse(summary);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'catalog_drip_failed',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      }),
    );
    return jsonResponse({ code: 'CATALOG_DRIP_FAILED' }, 500);
  }
});

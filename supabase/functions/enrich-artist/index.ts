import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import { authenticateRequest } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';
import { enrichArtist } from './src/enrich.ts';

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST')
    return jsonResponse({ error: 'Method not allowed' }, 405);

  const auth = await authenticateRequest(request, true);
  if ('response' in auth) return auth.response;
  const input = await request.json().catch(() => null);
  if (typeof input?.artistId !== 'string' || !input.artistId.trim()) {
    return jsonResponse({ error: 'artistId is required' }, 400);
  }

  const database = createClient(
    auth.context.supabaseUrl,
    auth.context.serviceRoleKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const artistId = input.artistId.trim();
  const markFailed = async (reason: string) => {
    const safeReason = reason
      .replace(/https?:\/\/\S+/g, 'provider request failed')
      .slice(0, 240);
    try {
      const { error } = await database
        .from('artists')
        .update({
          enrichment_status: 'failed',
          enriched_at: new Date().toISOString(),
          enrichment_error: safeReason,
        })
        .eq('id', artistId);
      if (!error) return;
    } catch {
      console.error(
        JSON.stringify({ event: 'enrichment_failure_persist_failed' }),
      );
      return;
    }
    console.error(
      JSON.stringify({ event: 'enrichment_failure_persist_failed' }),
    );
  };

  const missingSecrets = [
    !Deno.env.get('LASTFM_API_KEY') && 'LASTFM_API_KEY',
    !Deno.env.get('MUSICBRAINZ_CONTACT_EMAIL') && 'MUSICBRAINZ_CONTACT_EMAIL',
    Deno.env.get('ENABLE_THEAUDIODB') === 'true' &&
      !Deno.env.get('THEAUDIODB_API_KEY') &&
      'THEAUDIODB_API_KEY',
  ].filter((value): value is string => !!value);
  if (missingSecrets.length) {
    await markFailed(`Missing required secret: ${missingSecrets.join(', ')}`);
    return jsonResponse(
      {
        code: 'MISSING_REQUIRED_SECRET',
        error: 'One or more required function secrets are missing',
        missing: missingSecrets,
      },
      500,
    );
  }

  const force = input.force === true;
  const { data: claim, error: claimError } = await database.rpc(
    'claim_artist_enrichment',
    {
      p_artist_id: artistId,
      p_force: force && auth.context.isTrustedServer === true,
    },
  );
  if (claimError) {
    await markFailed('Could not claim artist enrichment');
    return jsonResponse(
      { code: 'ENRICHMENT_CLAIM_FAILED', error: claimError.message },
      500,
    );
  }
  if (!claim)
    return jsonResponse(
      { code: 'RATE_LIMITED', error: 'Artist enrichment is rate limited' },
      429,
    );

  try {
    const result = await enrichArtist(
      database,
      artistId,
      typeof input.language === 'string' ? input.language : null,
      force,
    );
    return jsonResponse(result);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Enrichment failed';
    await markFailed(reason);
    console.error(
      JSON.stringify({
        event: 'enrichment_run_failed',
        reason: reason.slice(0, 240),
      }),
    );
    return jsonResponse(
      { code: 'ENRICHMENT_FAILED', error: reason.slice(0, 240) },
      500,
    );
  }
});

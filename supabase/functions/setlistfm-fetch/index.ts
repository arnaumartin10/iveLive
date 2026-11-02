import { authenticateRequest } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';

const SETLIST_ID = /^[\da-f]{8}$/i;

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const auth = await authenticateRequest(request);
    if ('response' in auth) return auth.response;

    const input = await request.json().catch(() => null);
    const setlistId =
      typeof input?.setlistId === 'string'
        ? input.setlistId.trim()
        : typeof input?.url === 'string'
          ? setlistIdFromUrl(input.url)
          : null;
    if (!setlistId || !SETLIST_ID.test(setlistId)) {
      return jsonResponse(
        { error: 'A valid setlist.fm setlist ID is required' },
        400,
      );
    }
    const normalizedId = setlistId.toLowerCase();

    const apiKey = Deno.env.get('SETLISTFM_API_KEY');
    if (!apiKey) {
      return jsonResponse(
        {
          code: 'LOOKUP_UNAVAILABLE',
          error: 'Setlist lookup is not configured yet.',
        },
        503,
      );
    }

    const response = await fetch(
      `https://api.setlist.fm/rest/1.0/setlist/${encodeURIComponent(normalizedId)}`,
      {
        headers: {
          Accept: 'application/json',
          'x-api-key': apiKey,
        },
      },
    );
    if (!response.ok) {
      const error =
        response.status === 404
          ? 'That setlist is not available on setlist.fm.'
          : response.status === 401 || response.status === 403
            ? 'Setlist.fm rejected the server API key. Check the SETLISTFM_API_KEY Edge Function secret.'
            : response.status === 429
              ? 'Setlist.fm is rate limiting lookups. Wait a moment and try again.'
              : 'Setlist.fm lookup could not be completed. Try again later.';
      return jsonResponse(
        {
          code:
            response.status === 404
              ? 'SETLIST_NOT_FOUND'
              : response.status === 401 || response.status === 403
                ? 'SETLISTFM_AUTH_ERROR'
                : response.status === 429
                  ? 'SETLISTFM_RATE_LIMITED'
                  : 'SETLISTFM_ERROR',
          error,
        },
        response.status === 404 ? 404 : 502,
      );
    }

    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return jsonResponse(
        {
          code: 'INVALID_RESPONSE',
          error: 'Setlist.fm returned an unreadable response.',
        },
        502,
      );
    }
    return jsonResponse({ setlist: payload });
  } catch {
    return jsonResponse(
      {
        code: 'SETLISTFM_FETCH_FAILED',
        error:
          'Could not reach setlist.fm. Check your connection and try again.',
      },
      502,
    );
  }
});

function setlistIdFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      (url.hostname !== 'www.setlist.fm' && url.hostname !== 'setlist.fm')
    ) {
      return null;
    }
    const pageId = /-([\da-f]{8})\.html$/i.exec(url.pathname)?.[1];
    if (pageId) return pageId;
    if (url.pathname === '/widgets/setlist-image-v1') {
      return url.searchParams.get('id');
    }
    if (url.pathname === '/edit') return url.searchParams.get('setlist');
    return null;
  } catch {
    return null;
  }
}

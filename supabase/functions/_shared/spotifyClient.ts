interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

interface SpotifyTokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
}

let cachedToken: CachedToken | null = null;
const spotifyRequestTimeoutMs = 8_000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const upstreamSignal = init?.signal;
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
  if (upstreamSignal?.aborted) {
    abortFromUpstream();
  } else {
    upstreamSignal?.addEventListener('abort', abortFromUpstream, {
      once: true,
    });
  }
  const timeout = setTimeout(
    () => controller.abort(new Error('Spotify request timed out')),
    spotifyRequestTimeoutMs,
  );

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    upstreamSignal?.removeEventListener('abort', abortFromUpstream);
  }
}

export class SpotifyRateLimitedError extends Error {
  constructor(readonly retryAfter: number) {
    super('Spotify rate limit exceeded');
  }
}

export class SpotifyApiError extends Error {
  constructor(readonly status: number) {
    super(`Spotify API request failed with status ${status}`);
  }
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (
    !forceRefresh &&
    cachedToken &&
    cachedToken.expiresAt > Date.now() + 60_000
  ) {
    return cachedToken.accessToken;
  }

  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('Spotify client credentials are not configured');
  }

  const response = await fetchWithTimeout(
    'https://accounts.spotify.com/api/token',
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    },
  );

  console.log(
    JSON.stringify({
      event: 'spotify_token_request',
      status: response.status,
      ok: response.ok,
    }),
  );

  if (!response.ok) {
    await response.text();
    console.error(
      JSON.stringify({
        event: 'spotify_token_error',
        status: response.status,
      }),
    );
    throw new SpotifyApiError(response.status);
  }

  const payload = (await response.json()) as SpotifyTokenResponse;
  if (
    typeof payload.access_token !== 'string' ||
    typeof payload.expires_in !== 'number'
  ) {
    throw new Error('Spotify returned an invalid access token');
  }

  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

function retryDelay(header: string | null): number {
  if (!header) return 1;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(header);
  return Number.isNaN(date) ? 1 : Math.max(0, (date - Date.now()) / 1000);
}

export async function spotifyGet(path: string): Promise<unknown> {
  let refreshedAfterUnauthorized = false;
  let forceRefresh = false;

  while (true) {
    const accessToken = await getAccessToken(forceRefresh);
    forceRefresh = false;
    const response = await fetchWithTimeout(
      `https://api.spotify.com${path}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    console.log(
      JSON.stringify({
        event: 'spotify_request',
        path: new URL(path, 'https://api.spotify.com').pathname,
        status: response.status,
        ok: response.ok,
      }),
    );

    if (response.status === 401 && !refreshedAfterUnauthorized) {
      cachedToken = null;
      forceRefresh = true;
      refreshedAfterUnauthorized = true;
      continue;
    }

    if (response.status === 429) {
      const retryAfter = retryDelay(response.headers.get('Retry-After'));
      throw new SpotifyRateLimitedError(retryAfter);
    }

    if (!response.ok) {
      await response.text();
      console.error(
        JSON.stringify({
          event: 'spotify_request_error',
          path: new URL(path, 'https://api.spotify.com').pathname,
          status: response.status,
        }),
      );
      throw new SpotifyApiError(response.status);
    }
    return response.json();
  }
}

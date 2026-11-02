const cache = new Map<string, { expiresAt: number; value: unknown }>();

export function createIveLiveUserAgent(contactEmail: string | undefined) {
  const trimmedEmail = contactEmail?.trim();
  if (!trimmedEmail || /[\r\n()]/.test(trimmedEmail)) {
    throw new Error('MUSICBRAINZ_CONTACT_EMAIL is not configured correctly');
  }
  return `IveLive/1.0 (${trimmedEmail})`;
}

export function getIveLiveUserAgent() {
  const runtime = globalThis as typeof globalThis & {
    Deno?: { env: { get(name: string): string | undefined } };
  };
  return createIveLiveUserAgent(
    runtime.Deno?.env.get('MUSICBRAINZ_CONTACT_EMAIL'),
  );
}

export function logProviderResult(
  provider: string,
  result: {
    matchFound: boolean;
    tagsReturned?: number;
    albumsReturned?: number;
    requestStatus?: number | 'not_requested' | 'success' | 'partial' | 'failed';
  },
) {
  console.log(
    JSON.stringify({
      event: 'enrichment_provider_result',
      provider,
      request_status: result.requestStatus ?? 'see_request_events',
      match_found: result.matchFound,
      tags_returned: result.tagsReturned ?? 0,
      albums_returned: result.albumsReturned ?? 0,
    }),
  );
}

export function safeRequestEndpoint(url: string) {
  try {
    const parsed = new URL(url);
    const safePath = parsed.pathname.replace(
      /(\/api\/v1\/json\/)[^/]+/,
      '$1[redacted]',
    );
    return `${parsed.host}${safePath}`;
  } catch {
    return 'invalid-url';
  }
}

function logRequest(
  provider: string,
  url: string,
  status: number | null,
  ok: boolean,
  cached = false,
) {
  console.log(
    JSON.stringify({
      event: 'enrichment_provider_request',
      provider,
      endpoint: safeRequestEndpoint(url),
      status,
      ok,
      cached,
    }),
  );
}

async function waitForMusicBrainzSlot() {
  const slot = musicBrainzQueue.then(async () => {
    const delay = Math.max(0, musicBrainzNextRequestAt - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    musicBrainzNextRequestAt = Date.now() + 1000;
  });
  musicBrainzQueue = slot.then(
    () => undefined,
    () => undefined,
  );
  await slot;
}

export async function cachedJson<T>(
  url: string,
  options: RequestInit = {},
  ttlMs = 6 * 60 * 60 * 1000,
  provider = 'unknown',
  beforeRequest?: () => Promise<void>,
): Promise<T> {
  const cacheKey = `${url}:${options.headers ? JSON.stringify(options.headers) : ''}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    logRequest(provider, url, null, true, true);
    return cached.value as T;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await beforeRequest?.();
      const response = await fetch(url, options);
      logRequest(provider, url, response.status, response.ok);
      if ((response.status === 429 || response.status === 503) && attempt < 2) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        const delay =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter * 1000, 1500)
            : 200 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const value = (await response.json()) as T;
      cache.set(cacheKey, { expiresAt: Date.now() + ttlMs, value });
      return value;
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error && /^HTTP \d+$/.test(error.message))) {
        logRequest(provider, url, null, false);
      }
      if (attempt < 2)
        await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Provider request failed');
}

let musicBrainzQueue = Promise.resolve();
let musicBrainzNextRequestAt = 0;

export async function musicBrainzJson<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T> {
  return cachedJson<T>(
    url,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': getIveLiveUserAgent(),
      },
      signal,
    },
    24 * 60 * 60 * 1000,
    'musicbrainz',
    waitForMusicBrainzSlot,
  );
}

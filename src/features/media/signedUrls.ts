import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

const SIGNED_URL_TTL_MS = 50 * 60 * 1000;
const SIGNED_URL_LIFETIME_SECONDS = 60 * 60;

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function resolveSignedMediaUrls(
  paths: string[],
  forceRefresh = false,
): Promise<Record<string, string>> {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (forceRefresh) {
    for (const path of uniquePaths) signedUrlCache.delete(path);
  }
  const now = Date.now();
  const result: Record<string, string> = {};
  const missing: string[] = [];
  for (const path of uniquePaths) {
    const cached = signedUrlCache.get(path);
    if (cached && cached.expiresAt > now) result[path] = cached.url;
    else missing.push(path);
  }
  if (!missing.length) return result;

  const { data, error } = await supabase.storage
    .from('log-media')
    .createSignedUrls(missing, SIGNED_URL_LIFETIME_SECONDS);
  if (error) throw new Error(error.message);
  for (const entry of data ?? []) {
    if (entry.error || !entry.path || !entry.signedUrl) {
      throw new Error(entry.error || `Could not sign media path ${entry.path ?? ''}`);
    }
    signedUrlCache.set(entry.path, {
      url: entry.signedUrl,
      expiresAt: now + SIGNED_URL_TTL_MS,
    });
    result[entry.path] = entry.signedUrl;
  }
  if (missing.some((path) => !result[path])) {
    throw new Error('Some keepsake URLs could not be created.');
  }
  return result;
}

export function useSignedMediaUrls(paths: string[], enabled = true) {
  const queryClient = useQueryClient();
  const keyPaths = [...new Set(paths.filter(Boolean))].sort();
  const pathsIdentity = keyPaths.join('\0');
  const queryKey = ['signed-log-media', keyPaths] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => resolveSignedMediaUrls(keyPaths),
    enabled: enabled && keyPaths.length > 0,
    staleTime: SIGNED_URL_TTL_MS,
    gcTime: SIGNED_URL_TTL_MS,
  });
  const refresh = useCallback(async () => {
    const refreshedPaths = pathsIdentity ? pathsIdentity.split('\0') : [];
    const urls = await resolveSignedMediaUrls(refreshedPaths, true);
    queryClient.setQueryData(
      ['signed-log-media', refreshedPaths],
      urls,
    );
    return urls;
  }, [pathsIdentity, queryClient]);
  return {
    ...query,
    refresh,
  };
}

export function invalidateSignedMediaUrls(paths: string[]): void {
  for (const path of paths) signedUrlCache.delete(path);
}

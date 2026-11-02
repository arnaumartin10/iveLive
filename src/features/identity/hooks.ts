import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store';
import { useStatsScopeStore } from '../stats/store';
import { fetchMusicIdentity } from './api';
import { computeIdentity } from './logic';
import type { ComputedIdentity, MusicIdentityData } from './types';

const STALE_TIME = 5 * 60 * 1000; // 5 min

export const identityQueryKeys = {
  identity: (userId: string, year: number | null) =>
    ['identity', userId, year] as const,
};

/**
 * Primary hook: fetches raw identity data and derives computed values.
 * Pass userId explicitly for viewing other profiles.
 */
export function useMusicIdentity(userId?: string, yearOverride?: number | null) {
  const signedInId = useAuthStore((state) => state.user?.id ?? '');
  const scopeYear = useStatsScopeStore((state) => state.scope);
  const uid = userId ?? signedInId;
  const year = yearOverride !== undefined ? yearOverride : scopeYear;

  const raw = useQuery({
    queryKey: identityQueryKeys.identity(uid, year),
    queryFn: () => fetchMusicIdentity(uid, year),
    enabled: !!uid,
    staleTime: STALE_TIME,
  });

  const computed: ComputedIdentity | null = raw.data
    ? computeIdentity(raw.data)
    : null;

  return {
    ...raw,
    rawData: raw.data as MusicIdentityData | undefined,
    computed,
    isReady: raw.isSuccess && !!computed,
  };
}

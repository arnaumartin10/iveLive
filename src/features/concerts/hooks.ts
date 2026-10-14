import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { deleteConcert, fetchConcertById, fetchUserConcerts, logConcert } from './api';
import type { ConcertWithRelations, LogConcertFormData } from './types';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const concertKeys = {
  all: ['concerts'] as const,
  list: (userId: string) => ['concerts', 'list', userId] as const,
  detail: (id: string) => ['concerts', 'detail', id] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useUserConcerts(userId: string) {
  return useQuery<ConcertWithRelations[], Error>({
    queryKey: concertKeys.list(userId),
    queryFn: () => fetchUserConcerts(userId),
    enabled: !!userId,
  });
}

export function useConcert(id: string) {
  return useQuery<ConcertWithRelations, Error>({
    queryKey: concertKeys.detail(id),
    queryFn: () => fetchConcertById(id),
    enabled: !!id,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useLogConcert(userId: string) {
  const qc = useQueryClient();

  return useMutation<ConcertWithRelations, Error, LogConcertFormData>({
    mutationFn: (data) => logConcert(userId, data),
    onSuccess: (newConcert) => {
      // Optimistically prepend to list cache
      qc.setQueryData<ConcertWithRelations[]>(concertKeys.list(userId), (prev) => [
        newConcert,
        ...(prev ?? []),
      ]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });
}

export function useDeleteConcert(userId: string) {
  const qc = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteConcert(id),
    onSuccess: (_data, deletedId) => {
      qc.setQueryData<ConcertWithRelations[]>(concertKeys.list(userId), (prev) =>
        (prev ?? []).filter((c) => c.id !== deletedId),
      );
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onError: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });
}

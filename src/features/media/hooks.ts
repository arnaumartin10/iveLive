import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLogMedia } from './api';
import { ensureMediaQueueNetworkListener, useMediaQueueStore } from './queue';
import type { ProcessedKeepsake } from './types';

export const mediaKeys = {
  log: (logId: string) => ['log-media', logId] as const,
};

export function useLogMedia(logId: string) {
  return useQuery({
    queryKey: mediaKeys.log(logId),
    queryFn: () => fetchLogMedia(logId),
    enabled: Boolean(logId),
    staleTime: 60_000,
  });
}

export function useMediaQueue(logId?: string) {
  const allItems = useMediaQueueStore((state) => state.items);
  const enqueue = useMediaQueueStore((state) => state.enqueue);
  const cancel = useMediaQueueStore((state) => state.cancel);
  const retry = useMediaQueueStore((state) => state.retry);
  const update = useMediaQueueStore((state) => state.update);
  const isOffline = useMediaQueueStore((state) => state.isOffline);
  useEffect(() => {
    ensureMediaQueueNetworkListener();
  }, []);
  return {
    items: logId
      ? allItems.filter((item) => item.logId === logId)
      : allItems,
    isOffline,
    enqueue: (userId: string, targetLogId: string, item: ProcessedKeepsake) =>
      enqueue(userId, targetLogId, item),
    cancel,
    retry,
    update,
  };
}

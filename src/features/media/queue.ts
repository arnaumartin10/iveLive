import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Network from 'expo-network';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deleteLocalFiles, uploadMediaItem } from './api';
import type { MediaQueueItem, ProcessedKeepsake } from './types';

type QueueState = {
  items: MediaQueueItem[];
  isOffline: boolean;
  enqueue: (
    userId: string,
    logId: string,
    keepsake: ProcessedKeepsake,
  ) => void;
  update: (id: string, patch: Partial<MediaQueueItem>) => void;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  recoverInterrupted: () => void;
  setOffline: (offline: boolean) => void;
};

export const useMediaQueueStore = create<QueueState>()(
  persist(
    (set, get) => ({
      items: [],
      isOffline: false,
      enqueue: (userId, logId, keepsake) => {
        const replaced = get().items.filter(
          (item) => item.logId === logId && item.slot === keepsake.slot,
        );
        set((state) => ({
          items: [
            ...state.items.filter(
              (item) => !(item.logId === logId && item.slot === keepsake.slot),
            ),
            {
              ...keepsake,
              id: Crypto.randomUUID(),
              userId,
              logId,
              createdAt: Date.now(),
              status: 'queued',
              progress: 0,
              attempts: 0,
            },
          ],
        }));
        for (const item of replaced) {
          controllers.get(item.id)?.abort();
          controllers.delete(item.id);
          void deleteLocalFiles([
            item.localPath,
            item.thumbLocalPath,
            item.posterLocalPath,
          ]);
        }
        void runQueue();
      },
      update: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        })),
      cancel: (id) => {
        const item = get().items.find((entry) => entry.id === id);
        controllers.get(id)?.abort();
        controllers.delete(id);
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
        if (item) {
          void deleteLocalFiles([
            item.localPath,
            item.thumbLocalPath,
            item.posterLocalPath,
          ]);
        }
      },
      retry: (id) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, status: 'queued', attempts: 0, progress: 0, error: undefined }
              : item,
          ),
        }));
        void runQueue();
      },
      recoverInterrupted: () => {
        set((state) => ({
          items: state.items.map((item) =>
            item.status === 'uploading'
              ? { ...item, status: 'queued', progress: 0 }
              : item,
          ),
        }));
        void runQueue();
      },
      setOffline: (isOffline) => set({ isOffline }),
    }),
    {
      name: 'ivelive-keepsake-upload-queue',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => state?.recoverInterrupted(),
    },
  ),
);

const controllers = new Map<string, AbortController>();
const activeUploads = new Map<string, Promise<void>>();
let workerRunning = false;
let networkSubscription: ReturnType<typeof Network.addNetworkStateListener> | null =
  null;

export function ensureMediaQueueNetworkListener(): void {
  if (networkSubscription) return;
  networkSubscription = Network.addNetworkStateListener((state) => {
    const isOffline =
      state.isConnected === false || state.isInternetReachable === false;
    useMediaQueueStore.getState().setOffline(isOffline);
    if (!isOffline) {
      void runQueue();
    }
  });
  void Network.getNetworkStateAsync()
    .then((state) => {
      useMediaQueueStore
        .getState()
        .setOffline(
          state.isConnected === false || state.isInternetReachable === false,
        );
    })
    .catch((error: unknown) => {
      console.warn('[keepsake-queue] Could not read network state.', error);
      useMediaQueueStore.getState().setOffline(true);
    });
}

export async function runQueue(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;
  try {
    while (true) {
      const network = await Network.getNetworkStateAsync();
      const isOffline =
        network.isConnected === false || network.isInternetReachable === false;
      useMediaQueueStore.getState().setOffline(isOffline);
      if (isOffline) {
        return;
      }
      const item = useMediaQueueStore
        .getState()
        .items.find((candidate) => candidate.status === 'queued');
      if (!item) return;

      const controller = new AbortController();
      controllers.set(item.id, controller);
      useMediaQueueStore.getState().update(item.id, {
        status: 'uploading',
        attempts: item.attempts + 1,
        error: undefined,
      });
      try {
        const upload = uploadMediaItem(item, controller.signal, (progress) => {
          useMediaQueueStore.getState().update(item.id, { progress });
        });
        activeUploads.set(item.id, upload);
        await upload;
        useMediaQueueStore.setState((state) => ({
          items: state.items.filter((candidate) => candidate.id !== item.id),
        }));
      } catch (error) {
        const stillQueued = useMediaQueueStore
          .getState()
          .items.some((candidate) => candidate.id === item.id);
        if (stillQueued && !controller.signal.aborted) {
          const attempts = item.attempts + 1;
          if (attempts < 5) {
            useMediaQueueStore.getState().update(item.id, {
              status: 'queued',
              progress: 0,
              attempts,
              error:
                error instanceof Error ? error.message : 'Upload failed. Try again.',
            });
            await delay(Math.min(60_000, 1000 * 2 ** (attempts - 1)));
          } else {
            useMediaQueueStore.getState().update(item.id, {
              status: 'failed',
              progress: 0,
              attempts,
              error:
                error instanceof Error ? error.message : 'Upload failed. Try again.',
            });
          }
        }
      } finally {
        activeUploads.delete(item.id);
        controllers.delete(item.id);
      }
    }
  } finally {
    workerRunning = false;
    if (useMediaQueueStore.getState().items.some((item) => item.status === 'queued')) {
      const network = await Network.getNetworkStateAsync();
      if (network.isConnected !== false && network.isInternetReachable !== false) {
        void runQueue();
      }
    }
  }
}

export async function cancelQueuedMediaForLog(logId: string): Promise<void> {
  const items = useMediaQueueStore
    .getState()
    .items.filter((item) => item.logId === logId);
  for (const item of items) controllers.get(item.id)?.abort();
  useMediaQueueStore.setState((state) => ({
    items: state.items.filter((item) => item.logId !== logId),
  }));
  await Promise.all(
    items.map((item) =>
      activeUploads.get(item.id)?.catch((error: unknown) => {
        if (!(error instanceof Error) || error.message !== 'Upload canceled.') {
          console.warn('[keepsake-queue] Upload cleanup after log deletion failed.', error);
        }
      }),
    ),
  );
  await Promise.all(
    items.map((item) =>
      deleteLocalFiles([
        item.localPath,
        item.thumbLocalPath,
        item.posterLocalPath,
      ]),
    ),
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

ensureMediaQueueNetworkListener();

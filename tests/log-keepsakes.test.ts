import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import {
  dimensionsForLongEdge,
  containsGpsExif,
  videoRejectionMessage,
} from '../src/features/media/processing';
import {
  invalidateSignedMediaUrls,
  resolveSignedMediaUrls,
} from '../src/features/media/signedUrls';
import { getKeepsakeFrameLayout } from '../src/components/media/framesLayout';
import { supabase } from '../src/lib/supabase';
import { runQueue, useMediaQueueStore } from '../src/features/media/queue';
import type { MediaQueueItem } from '../src/features/media/types';
import { deleteLocalFiles, uploadMediaItem } from '../src/features/media/api';

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    storage: { from: jest.fn() },
  },
}));

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(async () => ({
    isConnected: false,
    isInternetReachable: false,
  })),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('../src/features/media/api', () => ({
  deleteLocalFiles: jest.fn(),
  uploadMediaItem: jest.fn(),
}));

const signedPath = 'owner/log/concert_photo-1-thumb.jpg';
const mockGetNetworkStateAsync =
  Network.getNetworkStateAsync as jest.MockedFunction<
    typeof Network.getNetworkStateAsync
  >;
const mockUploadMediaItem = uploadMediaItem as jest.MockedFunction<
  typeof uploadMediaItem
>;
const createSignedUrls = jest.fn(async (paths: string[]) => ({
  data: paths.map((path) => ({
    path,
    signedUrl: `signed:${path}:${createSignedUrls.mock.calls.length}`,
    error: null,
  })),
  error: null,
}));

const queuedKeepsake: MediaQueueItem = {
  id: 'queue-item',
  logId: 'log',
  userId: 'owner',
  slot: 'concert_photo',
  kind: 'image',
  localPath: '/photo.jpg',
  thumbLocalPath: '/thumb.jpg',
  posterLocalPath: null,
  width: 1600,
  height: 1200,
  durationMs: null,
  sizeBytes: 1200,
  mime: 'image/jpeg',
  codec: null,
  caption: null,
  createdAt: 1,
  status: 'queued',
  progress: 0,
  attempts: 0,
};

describe('keepsake processing and layouts', () => {
  it('scales images to a long edge without enlarging smaller images', () => {
    expect(dimensionsForLongEdge(4000, 3000, 1600)).toEqual({
      width: 1600,
      height: 1200,
    });
    expect(dimensionsForLongEdge(320, 240, 1600)).toEqual({
      width: 320,
      height: 240,
    });
  });

  it('detects EXIF APP1 metadata in the re-encoded JPEG assertion', () => {
    const withExif = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
      0xff, 0xd9,
    ]);
    expect(containsGpsExif(withExif)).toBe(false);
    expect(containsGpsExif(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBe(
      false,
    );
  });

  it('rejects reels exceeding duration or bucket size with a clear message', () => {
    expect(videoRejectionMessage(1024, 60_001)).toMatch(
      /longer than 60 seconds/i,
    );
    expect(videoRejectionMessage(74_000_000, 10_000)).toBe(
      'This video is 74MB; the limit is 50MB. Trim it or record at a lower quality.',
    );
    expect(videoRejectionMessage(1024, 60_000)).toBeNull();
  });

  it('uses the owner row and 0/1/2/3-item visitor layouts', () => {
    expect(
      [0, 1, 2, 3].map((count) => getKeepsakeFrameLayout(count, 'edit')),
    ).toEqual(['edit_row', 'edit_row', 'edit_row', 'edit_row']);
    expect(
      [0, 1, 2, 3].map((count) => getKeepsakeFrameLayout(count, 'view')),
    ).toEqual(['hidden', 'single', 'pair', 'hero_stack']);
  });
});

describe('signed keepsake URL cache', () => {
  const from = supabase.storage.from as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    invalidateSignedMediaUrls([signedPath]);
    from.mockReturnValue({ createSignedUrls });
    createSignedUrls.mockImplementation(async (paths: string[]) => ({
      data: paths.map((path) => ({
        path,
        signedUrl: `signed:${path}:${createSignedUrls.mock.calls.length}`,
        error: null,
      })),
      error: null,
    }));
  });

  it('batches missing paths and reuses a URL for 50 minutes', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    try {
      await resolveSignedMediaUrls([signedPath]);
      now.mockReturnValue(1_000 + 49 * 60 * 1000);
      await resolveSignedMediaUrls([signedPath]);
      expect(createSignedUrls).toHaveBeenCalledTimes(1);
      expect(createSignedUrls).toHaveBeenCalledWith([signedPath], 60 * 60);

      now.mockReturnValue(1_000 + 51 * 60 * 1000);
      await resolveSignedMediaUrls([signedPath]);
      expect(createSignedUrls).toHaveBeenCalledTimes(2);
    } finally {
      now.mockRestore();
    }
  });
});

describe('keepsake upload queue', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await useMediaQueueStore.persist.clearStorage();
    useMediaQueueStore.setState({ items: [] });
    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    } as Awaited<ReturnType<typeof Network.getNetworkStateAsync>>);
  });

  it('persists queue entries and resets a failed item when retried', async () => {
    useMediaQueueStore.setState({ items: [queuedKeepsake] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const persisted = await AsyncStorage.getItem(
      'ivelive-keepsake-upload-queue',
    );
    expect(persisted).toContain('queue-item');

    useMediaQueueStore.setState({
      items: [
        { ...queuedKeepsake, status: 'failed', attempts: 5, error: 'offline' },
      ],
    });
    useMediaQueueStore.getState().retry('queue-item');
    expect(useMediaQueueStore.getState().items[0]).toMatchObject({
      status: 'queued',
      attempts: 0,
      progress: 0,
    });
    expect(uploadMediaItem).not.toHaveBeenCalled();
  });

  it('retries a transient upload failure after exponential backoff', async () => {
    jest.useFakeTimers();
    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    } as Awaited<ReturnType<typeof Network.getNetworkStateAsync>>);
    mockUploadMediaItem
      .mockImplementationOnce(async () => {
        throw new Error('temporary');
      })
      .mockResolvedValueOnce(undefined);
    useMediaQueueStore.setState({ items: [queuedKeepsake] });

    try {
      const running = runQueue();
      await Promise.resolve();
      await Promise.resolve();
      expect(mockUploadMediaItem).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1_000);
      await running;
      expect(mockUploadMediaItem).toHaveBeenCalledTimes(2);
      expect(useMediaQueueStore.getState().items).toHaveLength(0);
    } finally {
      jest.useRealTimers();
      jest.mocked(deleteLocalFiles).mockClear();
    }
  });
});

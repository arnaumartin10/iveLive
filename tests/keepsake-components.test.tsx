import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { KeepsakeFrames } from '../src/components/media/KeepsakeFrames';
import type { FeedMedia, MediaQueueItem } from '../src/features/media/types';
import { pickKeepsakePhoto, pickKeepsakeVideo } from '../src/features/media/picker';

const mockQueue: {
  items: MediaQueueItem[];
  isOffline: boolean;
  enqueue: jest.Mock;
  update: jest.Mock;
  cancel: jest.Mock;
  retry: jest.Mock;
} = {
  items: [],
  isOffline: false,
  enqueue: jest.fn(),
  update: jest.fn(),
  cancel: jest.fn(),
  retry: jest.fn(),
};

jest.mock('../src/features/media/hooks', () => ({
  useLogMedia: () => ({ data: [], refetch: jest.fn() }),
  useMediaQueue: () => mockQueue,
  mediaKeys: { log: (id: string) => ['log-media', id] },
}));

jest.mock('../src/features/media/picker', () => ({
  pickKeepsakePhoto: jest.fn(async () => null),
  pickKeepsakeVideo: jest.fn(async () => null),
}));

jest.mock('../src/components/media/MediaViewer', () => ({
  MediaViewer: () => null,
}));

const sampleMedia: FeedMedia[] = [
  {
    slot: 'concert_photo',
    kind: 'image',
    thumb_path: 'owner/log/show-thumb.jpg',
    poster_path: null,
    storage_path: 'owner/log/show.jpg',
    width: 1600,
    height: 1200,
    duration_ms: null,
    caption: null,
    thumb_url: 'https://example.com/show.jpg',
    poster_url: null,
  },
  {
    slot: 'companions_photo',
    kind: 'image',
    thumb_path: 'owner/log/crew-thumb.jpg',
    poster_path: null,
    storage_path: 'owner/log/crew.jpg',
    width: 1600,
    height: 1200,
    duration_ms: null,
    caption: 'Friends from the front row',
    thumb_url: 'https://example.com/crew.jpg',
    poster_url: null,
  },
  {
    slot: 'concert_video',
    kind: 'video',
    thumb_path: 'owner/log/reel-thumb.jpg',
    poster_path: 'owner/log/reel-poster.jpg',
    storage_path: 'owner/log/reel.mp4',
    width: 480,
    height: 270,
    duration_ms: 17_000,
    caption: null,
    thumb_url: 'https://example.com/reel.jpg',
    poster_url: 'https://example.com/reel-poster.jpg',
  },
];

function renderFrames(mode: 'edit' | 'view', media: FeedMedia[] = []) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <KeepsakeFrames logId="log" mode={mode} media={media} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('KeepsakeFrames', () => {
  beforeEach(() => {
    mockQueue.items = [];
    mockQueue.isOffline = false;
  });


  it('shows all three labelled empty frames in edit mode', () => {
    renderFrames('edit');
    expect(screen.getByLabelText('Add the show keepsake')).toBeTruthy();
    expect(screen.getByLabelText('Add the crew keepsake')).toBeTruthy();
    expect(screen.getByLabelText('Add the reel keepsake')).toBeTruthy();
  });

  it('starts photo library, camera, and video pickers from the saved-log screen', async () => {
    renderFrames('edit');

    fireEvent.press(
      screen.getByRole('button', { name: 'Add the show from library' }),
    );
    fireEvent.press(
      screen.getByRole('button', { name: 'Take the crew with camera' }),
    );
    fireEvent.press(
      screen.getByRole('button', { name: 'Choose a concert video' }),
    );

    await waitFor(() => {
      expect(pickKeepsakePhoto).toHaveBeenNthCalledWith(
        1,
        'concert_photo',
        'library',
      );
      expect(pickKeepsakePhoto).toHaveBeenNthCalledWith(
        2,
        'companions_photo',
        'camera',
      );
      expect(pickKeepsakeVideo).toHaveBeenCalledTimes(1);
    });
  });

  it.each([0, 1, 2, 3])('renders the view layout for %i uploaded keepsakes', (count) => {
    renderFrames('view', sampleMedia.slice(0, count));
    expect(screen.queryByText('THE SHOW') !== null).toBe(count >= 1);
    expect(screen.queryByText('THE CREW') !== null).toBe(count >= 2);
    expect(screen.queryByText(/THE REEL/)! !== null).toBe(count >= 3);
    if (count === 2) {
      expect(screen.getByText('Friends from the front row')).toBeTruthy();
    }
    if (count === 3) expect(screen.getByText(/17s/)).toBeTruthy();
  });

  it('shows an offline pause stamp while uploads wait', () => {
    mockQueue.items = [
      {
        id: 'queued',
        logId: 'log',
        userId: 'owner',
        ...{
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
          caption: null,
          createdAt: 1,
          progress: 0,
          attempts: 0,
        },
        status: 'queued',
      },
    ];
    mockQueue.isOffline = true;
    renderFrames('edit');
    expect(screen.getByText('PAUSED · OFFLINE')).toBeTruthy();
    expect(screen.getByText('Uploads paused · offline')).toBeTruthy();
  });
});

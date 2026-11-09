import { describe, expect, it, jest } from '@jest/globals';
import { supabase } from '@lib/supabase';
import { fetchPublicConcertById } from '../src/features/concerts/api';
import {
  createShareQrMatrix,
  getConcertShareMessage,
  getPublicLogUrl,
  SHARE_CARD_DIMENSIONS,
} from '../src/features/log/shareCard';

jest.mock('@lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));
jest.mock('@shopify/react-native-skia', () => ({}));
jest.mock('../src/features/media/api', () => ({
  signMediaRows: jest.fn(async (rows: unknown[]) => rows),
}));
jest.mock('../src/features/media/queue', () => ({
  cancelQueuedMediaForLog: jest.fn(),
}));

const rpc = jest.mocked(supabase.rpc);

describe('concert log sharing', () => {
  it('fetches a shareable log through the privacy-aware public RPC', async () => {
    const payload = {
      id: 'log-id',
      artist: { name: 'The National' },
      media: [],
    };
    rpc.mockResolvedValueOnce({ data: payload, error: null } as never);

    await expect(fetchPublicConcertById('log-id')).resolves.toEqual(payload);
    expect(rpc).toHaveBeenCalledWith('get_public_concert_log_share', {
      p_log_id: 'log-id',
    });
  });

  it('does not turn a private or unavailable log into a successful result', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null } as never);
    await expect(fetchPublicConcertById('private-id')).rejects.toThrow(
      'This log is private or no longer exists.',
    );
  });

  it('creates both story and square card dimensions', () => {
    expect(SHARE_CARD_DIMENSIONS).toEqual({
      story: { width: 1080, height: 1920 },
      square: { width: 1080, height: 1080 },
    });
  });

  it('builds a stable public log URL and matching share message', () => {
    const publicUrl = getPublicLogUrl('log-id');
    expect(publicUrl).toBe('https://ivelive.app/log/log-id');
    expect(
      getConcertShareMessage({
        artistName: 'The National',
        eventDate: '2024-07-04',
        venueName: 'Sala Razzmatazz',
        rating: 4.5,
        publicUrl,
      }),
    ).toBe(
      'I saw The National live at Sala Razzmatazz on July 4, 2024! 🌟 4.5/5\n\nCheck out my show log on IveLive: https://ivelive.app/log/log-id',
    );
  });

  it('encodes the same public URL into a valid QR module matrix', () => {
    const qr = createShareQrMatrix(getPublicLogUrl('log-id'));
    expect(qr.size).toBeGreaterThanOrEqual(21);
    expect(qr.data).toHaveLength(qr.size * qr.size);
    expect(qr.data.every((module) => module === 0 || module === 1)).toBe(true);
  });
});

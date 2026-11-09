import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { supabase } from '@lib/supabase';
import { logConcert } from '../src/features/concerts/api';
import type {
  Artist,
  LogConcertFormData,
} from '../src/features/concerts/types';

jest.mock('@lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock('../src/features/media/queue', () => ({
  cancelQueuedMediaForLog: jest.fn(),
}));

jest.mock('../src/features/media/api', () => ({
  signMediaRows: jest.fn(),
}));

const getUser = jest.mocked(supabase.auth.getUser);
const from = jest.mocked(supabase.from);

describe('canonical venue log persistence', () => {
  beforeEach(() => {
    getUser.mockReset();
    getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    } as never);
    from.mockReset();
  });

  it('saves the selected venue ID and display name with the concert log', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null } as never);
    from.mockReturnValue({ insert } as never);
    const formData: LogConcertFormData = {
      artist_id: 'artist-1',
      artist_name: 'Example Artist',
      spotify_artist_id: null,
      venue_id: 'venue-1',
      venue_type: 'concert_hall_club',
      venue_name: 'Razzmatazz',
      concert_date: '2026-05-01',
      notes: '',
      rating: 4.5,
    };

    await logConcert(formData, { id: 'artist-1' } as Artist);

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        venue_id: 'venue-1',
        venue_name: 'Razzmatazz',
      }),
    );
  });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { supabase } from '@lib/supabase';
import { fetchStatsOverview } from '../src/features/stats/api';

jest.mock('@lib/supabase', () => ({
  supabase: { rpc: jest.fn() },
}));

const rpc = jest.mocked(supabase.rpc);

const fixedSeedRpcResult = {
  total_shows: 2,
  unique_artists: 1,
  unique_venues: 1,
  active_years: 1,
  avg_rating: 4.75,
  five_star_count: 1,
  shows_by_month: [{ month: 6, count: 2 }],
  top_artists_by_count: [
    { artist_id: 'seed-artist', artist: 'Seed Artist', count: 2 },
  ],
};

describe('stats RPC client contract', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('returns the seeded overview payload unchanged and sends the selected scope', async () => {
    rpc.mockResolvedValueOnce({
      data: fixedSeedRpcResult,
      error: null,
    } as never);

    const clientResult = await fetchStatsOverview('seed-user', 2024);

    expect(clientResult).toEqual(fixedSeedRpcResult);
    expect(rpc).toHaveBeenCalledWith('user_stats_overview', {
      p_user: 'seed-user',
      p_year: 2024,
    });
  });
});

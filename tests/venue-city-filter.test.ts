import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { supabase } from '@lib/supabase';
import { fetchMyLogs } from '../src/features/concerts/api';

jest.mock('@lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));
jest.mock('../src/features/media/api', () => ({
  signMediaRows: jest.fn(async (rows: unknown[]) => rows),
}));
jest.mock('../src/features/media/queue', () => ({
  cancelQueuedMediaForLog: jest.fn(),
}));

const rpc = jest.mocked(supabase.rpc);
const from = jest.mocked(supabase.from);

function logQuery() {
  const result = { data: [], error: null };
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    in: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(async () => result),
  };
  return query;
}

describe('Timeline city filters', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it('passes the country to the city lookup and filters the log IDs', async () => {
    const query = logQuery();
    rpc.mockResolvedValueOnce({
      data: ['log-1'],
      error: null,
    } as never);
    from.mockReturnValue(query as never);

    await fetchMyLogs({
      userId: 'user-1',
      filters: { city: 'London', country: 'GB' },
    });

    expect(rpc).toHaveBeenCalledWith('user_venue_city_log_ids', {
      p_user: 'user-1',
      p_city: 'London',
      p_country: 'GB',
    });
    expect(query.in).toHaveBeenCalledWith('id', ['log-1']);
  });
});

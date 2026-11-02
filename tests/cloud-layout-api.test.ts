import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { supabase } from '../src/lib/supabase';
import { fetchCloudLayout, saveCloudLayout } from '../src/features/cloud/api';

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Cloud layout API fallback', () => {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(),
    upsert: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    jest.mocked(supabase.from).mockReturnValue(query as never);
  });

  it('uses the local layout when cloud_layouts is missing from the schema cache', async () => {
    query.maybeSingle.mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST205',
        message: "Could not find the table 'public.cloud_layouts' in the schema cache",
      },
    } as never);

    await expect(fetchCloudLayout('user-a', 'genre')).resolves.toBeNull();
  });

  it('does not fail local layout saves when cloud_layouts is unavailable', async () => {
    query.upsert.mockResolvedValue({
      error: {
        code: 'PGRST205',
        message: "Could not find the table 'public.cloud_layouts' in the schema cache",
      },
    } as never);

    await expect(
      saveCloudLayout('user-a', 'genre', { artist: { x: 1, y: 2 } }),
    ).resolves.toBeUndefined();
  });

  it('still surfaces unrelated Supabase errors', async () => {
    query.maybeSingle.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    } as never);

    await expect(fetchCloudLayout('user-a', 'genre')).rejects.toThrow(
      'permission denied',
    );
  });
});

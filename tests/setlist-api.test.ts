import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fetchSetlistFmById } from '../src/features/setlist/api';

type InvokeResponse = {
  data: unknown;
  error: (Error & { context?: unknown }) | null;
};

const mockInvoke = jest.fn<(...args: unknown[]) => Promise<InvokeResponse>>();

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

describe('setlist API errors', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('shows the safe error returned by the Edge Function', async () => {
    const error = Object.assign(new Error('Edge Function returned an error'), {
      context: new Response(
        JSON.stringify({
          code: 'LOOKUP_UNAVAILABLE',
          error: 'Setlist lookup is not configured yet.',
        }),
        { status: 503 },
      ),
    });
    mockInvoke.mockResolvedValue({ data: null, error });

    await expect(fetchSetlistFmById('534e2bb9')).rejects.toThrow(
      'Setlist lookup is not configured yet.',
    );
  });

  it('includes the HTTP status when the function response is not JSON', async () => {
    const error = Object.assign(new Error('Edge Function returned an error'), {
      context: new Response('unavailable', { status: 503 }),
    });
    mockInvoke.mockResolvedValue({ data: null, error });

    await expect(fetchSetlistFmById('534e2bb9')).rejects.toThrow(
      'Setlist lookup failed (HTTP 503).',
    );
  });
});

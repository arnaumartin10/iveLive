import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { deleteConcert } from '../src/features/concerts/api';

const mockFrom = jest.fn();
const mockCancelQueuedMediaForLog = jest.fn();
let deleteCount: number | null;
const mockDelete = jest.fn(() => ({
  eq: async () => ({ count: deleteCount, error: null }),
}));

jest.mock('@lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: { from: jest.fn() },
  },
}));

jest.mock('../src/features/media/queue', () => ({
  cancelQueuedMediaForLog: (...args: unknown[]) =>
    mockCancelQueuedMediaForLog(...args),
}));

jest.mock('../src/features/media/api', () => ({
  signMediaRows: jest.fn(),
}));

describe('concert log deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deleteCount = 1;
    mockFrom.mockImplementation((table: unknown) => {
      if (table === 'log_media') {
        return {
          select: jest.fn(() => ({
            eq: async () => ({ data: [], error: null }),
          })),
        };
      }
      return {
        delete: mockDelete,
      };
    });
  });

  it('deletes without selecting the concert row back', async () => {
    await deleteConcert('log-id');

    expect(mockFrom).toHaveBeenCalledWith('concert_logs');
    expect(mockDelete).toHaveBeenCalledWith({ count: 'exact' });
  });

  it('reports when RLS did not delete an owned row', async () => {
    deleteCount = 0;
    await expect(deleteConcert('log-id')).rejects.toThrow(
      'Could not delete this log',
    );
  });
});

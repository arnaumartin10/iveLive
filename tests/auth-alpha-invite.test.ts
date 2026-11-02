import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as Crypto from 'expo-crypto';
import { supabase } from '@lib/supabase';
import { hasAlphaInvite, redeemAlphaInvite } from '../src/features/auth/api';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(),
}));
jest.mock('@lib/supabase', () => ({
  supabase: { rpc: jest.fn() },
}));

const digestStringAsync = jest.mocked(Crypto.digestStringAsync);
const rpc = jest.mocked(supabase.rpc);

describe('alpha invite client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hashes the code locally before calling the redemption RPC', async () => {
    digestStringAsync.mockResolvedValueOnce('a'.repeat(64));
    rpc.mockResolvedValueOnce({ data: true, error: null } as never);

    await redeemAlphaInvite('  invite-code  ');

    expect(digestStringAsync).toHaveBeenCalledWith('SHA-256', 'invite-code');
    expect(rpc).toHaveBeenCalledWith('redeem_alpha_invite', {
      p_code_hash: 'a'.repeat(64),
    });
  });

  it('does not send an empty code', async () => {
    await expect(redeemAlphaInvite('  ')).rejects.toThrow(
      'Enter your invite code to continue.',
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it('returns the signed-in user invite status', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null } as never);

    await expect(hasAlphaInvite()).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('has_alpha_invite');
  });
});

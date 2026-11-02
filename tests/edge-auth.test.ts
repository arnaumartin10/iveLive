import { describe, expect, it, jest } from '@jest/globals';
import {
  constantTimeEquals,
  resolveAuthBranch,
} from '../supabase/functions/_shared/authStrategy';

describe('Edge Function caller authentication', () => {
  const trustedCredentials = {
    serviceRoleKey: 'service-role-key',
    internalFunctionSecret: 'internal-secret',
  };

  it('accepts a matching service-role bearer without user lookup', async () => {
    const validateUser = jest.fn(async () => false);
    await expect(
      resolveAuthBranch({
        ...trustedCredentials,
        bearerToken: 'service-role-key',
        internalSecretHeader: null,
        validateUser,
      }),
    ).resolves.toEqual({ branch: 'service' });
    expect(validateUser).not.toHaveBeenCalled();
  });

  it('accepts a matching internal secret when the service-role key differs', async () => {
    const validateUser = jest.fn(async () => false);
    await expect(
      resolveAuthBranch({
        ...trustedCredentials,
        bearerToken: 'different-service-key',
        internalSecretHeader: 'internal-secret',
        validateUser,
      }),
    ).resolves.toEqual({ branch: 'internal-secret' });
    expect(validateUser).not.toHaveBeenCalled();
  });

  it('accepts a valid user JWT after trusted server checks do not match', async () => {
    const validateUser = jest.fn(async (token: string) => token === 'user-jwt');
    await expect(
      resolveAuthBranch({
        ...trustedCredentials,
        bearerToken: 'user-jwt',
        internalSecretHeader: null,
        validateUser,
      }),
    ).resolves.toEqual({ branch: 'user' });
    expect(validateUser).toHaveBeenCalledWith('user-jwt');
  });

  it('returns distinct missing-auth and invalid-token results', async () => {
    const validateUser = jest.fn(async () => false);
    const common = {
      ...trustedCredentials,
      internalSecretHeader: null,
      validateUser,
    };
    await expect(
      resolveAuthBranch({ ...common, bearerToken: null }),
    ).resolves.toEqual({ branch: 'failed', code: 'MISSING_AUTH' });
    await expect(
      resolveAuthBranch({ ...common, bearerToken: 'invalid-jwt' }),
    ).resolves.toEqual({ branch: 'failed', code: 'INVALID_TOKEN' });
  });

  it('compares complete credentials without returning early on mismatch', () => {
    expect(constantTimeEquals('same-secret', 'same-secret')).toBe(true);
    expect(constantTimeEquals('same-secret', 'other-secret')).toBe(false);
    expect(constantTimeEquals('short', 'longer-secret')).toBe(false);
  });
});

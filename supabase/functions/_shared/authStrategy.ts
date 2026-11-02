export type AuthBranch =
  | { branch: 'service' }
  | { branch: 'internal-secret' }
  | { branch: 'user' }
  | { branch: 'failed'; code: 'MISSING_AUTH' | 'INVALID_TOKEN' };

export function constantTimeEquals(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

export async function resolveAuthBranch(input: {
  bearerToken: string | null;
  serviceRoleKey: string;
  internalSecretHeader: string | null;
  internalFunctionSecret: string | undefined;
  validateUser: (token: string) => Promise<boolean>;
}): Promise<AuthBranch> {
  if (
    input.bearerToken &&
    constantTimeEquals(input.bearerToken, input.serviceRoleKey)
  ) {
    return { branch: 'service' };
  }

  if (
    input.internalSecretHeader &&
    input.internalFunctionSecret &&
    constantTimeEquals(input.internalSecretHeader, input.internalFunctionSecret)
  ) {
    return { branch: 'internal-secret' };
  }

  if (!input.bearerToken) return { branch: 'failed', code: 'MISSING_AUTH' };
  if (await input.validateUser(input.bearerToken)) return { branch: 'user' };
  return { branch: 'failed', code: 'INVALID_TOKEN' };
}

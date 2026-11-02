import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import { jsonResponse } from './http.ts';
import { resolveAuthBranch } from './authStrategy.ts';

export interface AuthenticatedContext {
  userId: string;
  supabaseUrl: string;
  serviceRoleKey: string;
  isServiceRole?: boolean;
  isTrustedServer?: boolean;
}

export type AuthResult =
  { context: AuthenticatedContext } | { response: Response };

export async function authenticateRequest(
  request: Request,
  allowServiceRole = false,
): Promise<AuthResult> {
  const token = request.headers
    .get('Authorization')
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const internalFunctionSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET');
  const missing = [
    !supabaseUrl && 'SUPABASE_URL',
    !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter((value): value is string => !!value);
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      response: jsonResponse(
        { error: 'Server auth is not configured', missing },
        500,
      ),
    };
  }

  let userId: string | null = null;
  const result = await resolveAuthBranch({
    bearerToken: token ?? null,
    serviceRoleKey: allowServiceRole ? serviceRoleKey : '',
    internalSecretHeader: allowServiceRole
      ? request.headers.get('x-internal-secret')
      : null,
    internalFunctionSecret: allowServiceRole
      ? internalFunctionSecret
      : undefined,
    validateUser: async (userToken) => {
      if (!anonKey) return false;
      const client = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await client.auth.getUser(userToken);
      if (error || !data.user) return false;
      userId = data.user.id;
      return true;
    },
  });

  if (result.branch === 'failed') {
    console.warn(
      JSON.stringify({
        event: 'edge_auth',
        branch: 'failed',
        code: result.code,
      }),
    );
    return {
      response: jsonResponse(
        {
          code: result.code,
          error:
            result.code === 'MISSING_AUTH'
              ? 'A user JWT or trusted server credential is required'
              : 'Bearer token was rejected',
        },
        401,
      ),
    };
  }

  console.info(JSON.stringify({ event: 'edge_auth', branch: result.branch }));
  const isTrustedServer =
    result.branch === 'service' || result.branch === 'internal-secret';

  return {
    context: {
      userId:
        result.branch === 'service' ? 'service_role' : (userId ?? 'internal'),
      supabaseUrl,
      serviceRoleKey,
      isServiceRole: result.branch === 'service',
      isTrustedServer,
    },
  };
}

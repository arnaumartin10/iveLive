function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} must be set in the runner environment.`);
  return value;
}

const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/+$/, '');
const anonKey = requiredEnv('SUPABASE_ANON_KEY');
const internalFunctionSecret = requiredEnv('INTERNAL_FUNCTION_SECRET');

async function invokeRefresh(
  functionName: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'x-internal-secret': internalFunctionSecret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      typeof payload === 'object' &&
      payload !== null &&
      'code' in payload &&
      typeof payload.code === 'string'
        ? payload.code
        : `HTTP_${response.status}`;
    const diagnostic =
      typeof payload === 'object' &&
      payload !== null &&
      'diagnostic' in payload &&
      typeof payload.diagnostic === 'string'
        ? ` (${payload.diagnostic})`
        : '';
    throw new Error(`${functionName} failed: ${code}${diagnostic}`);
  }

  console.log(`${functionName}: ${JSON.stringify(payload)}`);
}

const tourCountryCodes = (Deno.env.get('TOUR_COUNTRY_CODES') ?? '')
  .split(',')
  .map((countryCode) => countryCode.trim())
  .filter(Boolean);

const results = await Promise.allSettled([
  invokeRefresh('refresh-trending', {}),
  invokeRefresh(
    'refresh-tour-dates',
    tourCountryCodes.length ? { country_codes: tourCountryCodes } : {},
  ),
]);
const failures = results.flatMap((result, index) =>
  result.status === 'rejected'
    ? [
        `${index === 0 ? 'refresh-trending' : 'refresh-tour-dates'}: ${
          result.reason instanceof Error ? result.reason.message : 'failed'
        }`,
      ]
    : [],
);

if (failures.length) {
  throw new Error(
    `Home data refresh finished with errors: ${failures.join('; ')}`,
  );
}

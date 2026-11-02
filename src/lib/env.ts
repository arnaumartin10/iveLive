import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url('must be a valid URL'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'must not be empty'),
});

const result = envSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(
    `[IveLive] Invalid environment configuration:\n${details}\n` +
      'Set both Supabase values in .env or .env.example, then restart Expo.',
  );
}

export const env = result.data;
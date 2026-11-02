# Web environment

Vercel builds the Expo Router app with `npm run build:web` and serves `dist`.
Set these variables separately in Vercel's Preview and Production scopes:

- `APP_ENV=preview` for Preview; `APP_ENV=production` for Production.
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the
  corresponding isolated Supabase project.

The app config now fails when either Supabase value is missing instead of
silently bundling a fallback project. The browser OAuth redirect is the
deployed site's root (`https://<domain>/`); add each site's root to the
corresponding Supabase Auth URL allowlist. Google Cloud must continue to use
the Supabase `/auth/v1/callback`, not the Vercel URL.

Verify the production and preview domains after setting these values. No
Vercel build or deployment was run from this checkout.

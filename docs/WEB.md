# Web environment

Vercel builds the Expo Router app with `npm run build:web` and serves `dist`.
Set these variables separately in Vercel's Preview and Production scopes:

- `APP_ENV=preview` for Preview; `APP_ENV=production` for Production.
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the
  corresponding isolated Supabase project.

The app config now fails when either Supabase value is missing instead of
silently bundling a fallback project. Browser sign-in redirects to the current
site root: localhost while developing, or the deployed site's root
(`https://<domain>/`) after deployment. Add the exact local origins used by
Expo (for example `http://localhost:8081/**` and
`http://127.0.0.1:8081/**`) to **Authentication → URL Configuration → Redirect
URLs** for the Supabase project configured in `.env.local`; also allow any
alternate ports Expo uses, as listed in `supabase/config.toml`. That TOML file
configures a local Supabase stack only and does not update a hosted development
project. If localhost is missing from the hosted project's allowlist, Supabase
can send the browser to that project's configured Site URL (often the deployed
Vercel domain) instead. Google Cloud must continue to use the Supabase
`/auth/v1/callback`, not the Vercel or localhost URL.

Verify the production and preview domains after setting these values. No
Vercel build or deployment was run from this checkout.

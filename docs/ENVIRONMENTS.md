# Alpha environments

IveLive uses three separate app identities and EAS environments. Configure each
EAS environment with the public Supabase URL and anon key for its own Supabase
project; do not reuse production credentials for development or preview.

| EAS profile   | `APP_ENV`     | App label       | iOS / Android identifier      | Native auth scheme               |
| ------------- | ------------- | --------------- | ----------------------------- | -------------------------------- |
| `development` | `development` | IveLive Dev     | `com.ivelive.app.development` | `ivelive-development://callback` |
| `preview`     | `preview`     | IveLive Preview | `com.ivelive.app.preview`     | `ivelive-preview://callback`     |
| `production`  | `production`  | IveLive         | `com.ivelive.app`             | `ivelive://callback`             |

The config uses `appVersion` as the runtime version and EAS channels are
profile-specific. `app.config.ts` requires both public Supabase values and does
not load `.env.example` as a fallback. For local work, create `.env.local` with
the development project's `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY`. Keep service-role and provider keys out of
Expo variables.

## EAS setup

In EAS, configure the `development`, `preview`, and `production` environments
with their matching Supabase public URL and anon key. These variables are
intentionally not committed here. The profile names and `APP_ENV` values are
declared in [eas.json](../eas.json); `app.config.ts` applies the matching
identity before native generation.

The database invite gate defaults to **on** in every project. For a dedicated
development database only, set `alpha_gate_config.invite_only` to `false` if
developers should be able to write without codes. Leave it on for preview and
production; the client also presents the invite step in those two builds.

The repository does not contain an EAS project ID. Before building, an operator
must initialize/link the intended EAS project and run `eas update:configure`
so the project-specific Updates URL is added. Do not copy a project ID from a
different app.

For Vercel, set `APP_ENV=production` for production deployments and `APP_ENV=preview`
for preview deployments, then add that environment's public Supabase values in
Vercel Project Settings. Vercel preview and production should point to separate
Supabase projects.

The web OAuth callback returns to the current site root. Native Supabase Auth
redirect allowlists need each scheme above; Google continues to use only the
Supabase callback URL as its authorized redirect URI.

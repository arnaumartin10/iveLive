# IveLive

Expo and React Native app for keeping a personal history of live music.

## Requirements

- Node.js 22.13 or newer
- npm
- iOS Simulator with Xcode or an Android emulator for native development

## Setup

```sh
npm install
cp .env.example .env
```

## Profile navigation and Timeline

The tab bar is Home, Cloud, Log, Stats, and Profile. Profile contains the
Profile, Timeline, Wishlist, and Friends sections. The Timeline section reuses
the app's existing paginated timeline and supports viewing another profile's
logs under the same row-level security rules. Existing `/archive`, `/timeline`,
and `/friends` links remain supported and redirect to the corresponding Profile
section.

The repository's `.env.example` already contains the current Supabase URL and anon key. Expo loads those values as a local fallback; standard `.env` and EAS environment values take precedence. Update the example only when switching projects. The app validates both variables at startup and reports missing or malformed values directly.

### Configure authentication providers

- Enable Email and Google in **Supabase Dashboard → Authentication → Providers**. Configure Google client credentials there and set its authorized callback to `https://<project-ref>.supabase.co/auth/v1/callback`.
- Enable Apple in Supabase and configure the Apple Services ID/key. The native app uses the `expo-apple-authentication` capability on iOS.
- Add `ivelive://callback`, the production web callback (`https://<your-domain>/callback`), and the local web URLs from `supabase/config.toml` to the Supabase Auth redirect allowlist. Keep Google's authorized redirect URI set to `https://<project-ref>.supabase.co/auth/v1/callback`. OAuth client secrets belong in Supabase, never in `EXPO_PUBLIC_` variables.
- Supabase Edge Functions require a valid Supabase session JWT. The configured functions include `delete-account`, `spotify-search`, `spotify-upsert-artist`, and `enrich-artist`.

### Supabase Edge Functions

`delete-account` is implemented and ready to deploy. Deployment to a remote project still needs to be run and verified by an operator with Supabase project access.

Authenticate the Supabase CLI and link this checkout to the target project:

```sh
supabase login
supabase projects list
export SUPABASE_PROJECT_REF=your-project-ref
supabase link --project-ref "$SUPABASE_PROJECT_REF"
```

The Edge Functions read these provider secrets:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `LASTFM_API_KEY`
- `TICKETMASTER_API_KEY`

Artist enrichment also reads `LASTFM_API_KEY`. TheAudioDB is disabled unless `ENABLE_THEAUDIODB=true` and `THEAUDIODB_API_KEY` are configured. MusicBrainz, Wikipedia, and Cover Art Archive do not require API keys.

For local development, create `supabase/functions/.env` (do not commit it) with those two variables, then serve a function with:

```sh
supabase functions serve spotify-search --env-file supabase/functions/.env
```

For the hosted project, set the same secrets and deploy all three functions:

```sh
supabase secrets set --env-file supabase/functions/.env --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy delete-account --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy spotify-search --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy spotify-upsert-artist --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy enrich-artist --project-ref "$SUPABASE_PROJECT_REF"
supabase functions list --project-ref "$SUPABASE_PROJECT_REF"
```

After applying the artist-enrichment migration and deploying the function, run the resumable backfill once from an environment with Deno and network access. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `LASTFM_API_KEY` in that environment first:

```sh
deno run --allow-env --allow-net supabase/scripts/backfill-enrichment.ts
```

Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to the Edge Function runtime. Do not put Spotify credentials, the service-role key, or any server secret in app code, `.env.example`, or an `EXPO_PUBLIC_` variable. The app only invokes these functions through the authenticated Supabase client.

### Concert keepsakes

The `20261102090000_log_keepsakes.sql` migration adds three private media slots
per concert log. The `log-media` bucket is capped at **50 MiB per object**
(`52428800` bytes); check your Supabase plan's per-file limit before applying
the migration. Only JPEG photos, MP4 video, and QuickTime video are accepted.
Image files are re-encoded as JPEGs, resized to a 1600-pixel long edge, and
given 480-pixel previews; preview processing fails before upload if a preview
exceeds 60 KiB.

This app build has Expo Video for playback and poster generation, but no video
compression library. Clips are therefore limited to 60 seconds and 50 MiB; an
oversized clip must be trimmed or reduced before it can be added. The persisted
upload queue uses standard Storage uploads with progress, cancellation, retry,
and offline pause/resume; it is not a TUS/resumable transfer.

Apply and regenerate local TypeScript database declarations only after review:

```sh
npx supabase db push --linked
npx supabase gen types typescript --linked --schema public > src/lib/database.types.ts
npx supabase functions deploy cleanup-orphan-media --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy delete-account --project-ref "$SUPABASE_PROJECT_REF"
```

These commands have **not** been run from this checkout. Deploy
`cleanup-orphan-media` with `delete-account` so account deletion removes the
whole `log-media/{uid}/` folder and scheduled cleanup can remove unreferenced
files older than 24 hours.

### Setlist import

Concert details include a setlist importer for pasted setlist.fm links/embeds,
plain text, JSON, and CSV files. Imported songs are editable before they are
saved to the concert. The `20261102120000_setlist_import.sql` migration adds
the owner-editable, visibility-protected `concert_setlists` table.

Pasting a setlist.fm page link, embed, or BBCode edit link automatically looks
up the songs by setlist ID through the official API when the user selects
**Read setlist**. The API key must remain server-side: configure
`SETLISTFM_API_KEY` as an Edge Function secret, apply the migrations, and
deploy `setlistfm-fetch`:

```sh
npx supabase db push --linked
npx supabase gen types typescript --linked --schema public > src/lib/database.types.ts
npx supabase functions deploy setlistfm-fetch --project-ref "$SUPABASE_PROJECT_REF"
```

Configure the secret in the Supabase Dashboard's Edge Function secrets; do not
put it in app configuration, source code, or a committed environment file. If
the function or API is unavailable, the importer explains the configuration
needed and offers text, file, and manual-entry alternatives. HTML and BBCode
are parsed as untrusted text; they are never rendered or loaded in a WebView.
The API response parser reads songs from the official `sets.set` collection
(including encore sets); the embed itself contains only links and display
metadata, not song titles. The concert timeline detail displays the full saved
setlist; owners can assign or remove gold, silver, and bronze medals per song.
Medals are stored with each song in the existing setlist JSON field.

To schedule orphan cleanup, create a daily Supabase Cron job that sends an
authenticated `POST` to
`https://<project-ref>.supabase.co/functions/v1/cleanup-orphan-media`. Keep the
service-role bearer value in Supabase Vault or the scheduler's secret store;
never put it in app configuration or committed SQL. The function itself has
not been scheduled or invoked here.

### Home charts and tour dates

The Home tab uses public ratings, Last.fm charts, and Ticketmaster event data.
The `refresh-trending` and `refresh-tour-dates` functions require trusted server
credentials and provider secrets. These two functions use an internal shared
secret checked by the function itself; gateway JWT verification is disabled
for them, while the internal-secret check remains mandatory.

Tour refreshes search Ticketmaster by country market so the Home location filter
can return local events instead of relying on Ticketmaster's default market.
The default markets are `ES,FR,GB,DE,US`; override them with a comma-separated
`TOUR_COUNTRY_CODES` value in the trusted refresh runner (maximum five supported
country codes per run). Each run checks up to 60 artists and stores
Ticketmaster venue coordinates for distance filtering across the next year. The
scheduled refresh is still a shared catalog, not a live location lookup. The
Home tab shows up to five upcoming artists within 14 days when available,
ordered by event date and then distance. If that window has no matches, it
shows the next available dates and labels them accordingly. By default, the
Home query filters by the saved country and ranks by distance when device
coordinates are available; the explicit “Near” filters restrict the results by
radius. Results depend on the refresh markets and on Ticketmaster availability.

The provider keys are in the repository-root `.env` file. No
`supabase/functions/.env` file is needed. Upload just the provider keys (rather
than the entire app `.env`, which also contains client configuration):

```sh
umask 077
provider_secrets_file="$(mktemp)"
trap 'rm -f "$provider_secrets_file"' EXIT
grep -E '^(LASTFM_API_KEY|TICKETMASTER_API_KEY)=' .env > "$provider_secrets_file"
npx supabase secrets set --env-file "$provider_secrets_file" --project-ref "pybvkiywczpozrgyhlve"
```

Confirm that the command succeeds before running the refresh script. A
Last.fm `403` is returned by Last.fm itself; if it persists after uploading the
root `.env` key, verify that the key is active in the Last.fm API account.

```sh
export SUPABASE_PROJECT_REF=your-project-ref
export INTERNAL_FUNCTION_SECRET="$(openssl rand -hex 32)"
export SUPABASE_URL="https://$SUPABASE_PROJECT_REF.supabase.co"
export SUPABASE_ANON_KEY="your-project-anon-or-publishable-key"
npx supabase secrets set INTERNAL_FUNCTION_SECRET="$INTERNAL_FUNCTION_SECRET" --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy refresh-trending --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy refresh-tour-dates --project-ref "$SUPABASE_PROJECT_REF"
```

Redeploy both functions after setting the secret and config; this applies the
`verify_jwt = false` gateway setting from `supabase/config.toml`. The functions
still reject requests unless the internal secret matches. The project URL and
anon/publishable key are available in the Supabase project's API settings. The
database migration is separate; do not rerun it if Supabase reports it is
already up to date.

The runner also needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and the same
`INTERNAL_FUNCTION_SECRET` in its environment. The anon key is used only for
the gateway `apikey` header; each function validates the internal secret
before accepting the request. Never include the internal secret in the app,
commit it, or print it.

Optionally set `TOUR_COUNTRY_CODES=ES,FR,GB,DE,US` in the protected runner
environment to choose the markets refreshed. Use country codes supported by
the Ticketmaster Discovery API; the function rejects unsupported values and
more than five markets.

### Cloud Atlas

The Cloud map stores layouts locally and synchronizes them to `cloud_layouts`
when the Cloud Atlas migration is applied; row-level security limits saved
layouts to their owner. `user_territory_stats` provides per-genre log totals.
Apply `supabase/migrations/20261027120000_cloud_atlas.sql` through the usual
reviewed migration workflow before relying on cross-device layout sync. The
development route `/cloud-bench` measures a 300-glyph Skia baseline; it
does not measure the full Cloud simulation or replace device-level QA.

The Cloud experience adds a session print-run intro, first-genre discovery
comparison, locally timestamped arrivals, territory cards, guided flight,
low-resolution cached time-travel frames, and optional device tilt. Motion and
sound preferences are stored locally. Sound remains a no-op until licensed
assets are added as described in [`docs/SOUND.md`](./docs/SOUND.md). The
Completionist badge is awarded after all 14 recognized macro-genres are logged.

Run both refreshes manually from a trusted operator environment with Deno and
the runner variables available:

```sh
deno run --allow-env --allow-net supabase/scripts/refresh-home-data.ts
```

The runner prints the provider chart counts and tour-candidate source counts.
Tour discovery includes public IveLive activity, publicly rated artists, and
the current Last.fm chart, in addition to saved artists.
The runner attempts both refreshes even if one provider fails. A
`LASTFM_HTTP_ERROR_<status>` result identifies the HTTP status Last.fm returned;
check that the `LASTFM_API_KEY` Edge Function secret is present and valid for
the deployed `refresh-trending` function.
The global Last.fm endpoint and the country endpoint return different chart
field names; `refresh-trending` accepts both response shapes.
`TOUR_DATES_REFRESH_FAILED` includes a diagnostic in the runner output to help
identify database/schema or provider failures.

The repository includes a daily GitHub Actions workflow at
`.github/workflows/refresh-home-data.yml`. It runs at 04:17 UTC and can also be
started from the Actions tab with **Run workflow**. Scheduled Actions only run
after the workflow is present on the repository's default branch. Configure
these repository Actions secrets before enabling it:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `INTERNAL_FUNCTION_SECRET`

Optionally set the Actions repository variable `TOUR_COUNTRY_CODES` to change
the default markets (`ES,FR,GB,DE,US`). The job invokes the trusted runner, which
updates Last.fm charts and Ticketmaster events. Provider keys remain only in
Supabase Edge Function secrets; they are not needed in GitHub Actions.

Provider secrets stay in Supabase Edge Function secrets and are never passed
to the client or stored in the repository. Do not run refresh jobs until the
migration and both functions have been deployed.

## Run

```sh
npx expo start
```

Use `i` to open the iOS Simulator or `a` to open the Android emulator. Native modules such as Skia and Bottom Sheet require a development build rather than Expo Go:

```sh
npx expo run:ios
npx expo run:android
```

For the Vercel web deployment, use `npm run build:web`. It copies Skia's
CanvasKit WebAssembly runtime to the path expected by the web bundle before
exporting the site to `dist`.

## Checks

```sh
npm run typecheck
npm run lint
npm test
```

The pre-commit hook runs lint and TypeScript checks.

## Supabase local

Start the local Supabase stack with Docker available, then apply migrations and seed data:

```sh
supabase start
supabase db reset
supabase test db
supabase gen types typescript --local --schema public > src/lib/database.types.ts
```

The SQL tests cover private-log visibility, half-star rating constraints, and weighted genre classification with noisy tags.

The current schema migration includes `venue_type` and `artist_source`, artist metadata and genre classification, concert date/rating constraints, follows/likes/comments, the artist/genre/venue summary RPCs and `get_feed`, RLS on all seven public tables, and the `avatars` and `artist-images` storage buckets.

## EAS builds

Configure the Supabase variables in the matching EAS environment, then run:

```sh
npx eas-cli build --profile development
npx eas-cli build --profile preview
npx eas-cli build --profile production
```

Maestro end-to-end flows belong in `maestro/`.

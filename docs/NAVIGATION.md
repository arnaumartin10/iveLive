# Navigation Audit and Implementation

This report records the initial audit findings and the implemented NAV-2
behavior. Route destinations and fallbacks are centralized in
[`src/navigation/routes.ts`](../src/navigation/routes.ts).

## Route map

Route groups in parentheses are omitted from public URLs. This is the complete
screen-route inventory under `src/app`; layout files are listed separately.

| Public path                                                                                                                                | Expo Router file(s)                                            | Notes                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------- |
| `/`                                                                                                                                        | `(tabs)/index.tsx`                                             | Home; there is no longer a competing `src/app/index.tsx`. |
| `/cloud`, `/stats`, `/profile`, `/settings`                                                                                                | `(tabs)/cloud.tsx`, `stats.tsx`, `profile.tsx`, `settings.tsx` | Settings is a hidden tab.                                 |
| `/welcome`, `/callback`, `/onboarding`                                                                                                     | `(auth)/welcome.tsx`, `callback.tsx`, `onboarding.tsx`         | Auth and profile setup.                                   |
| `/artist/:id`, `/artist/new`                                                                                                               | `artist/[id].tsx`, `artist/new.tsx`                            | Artist page and artist creation.                          |
| `/genre/:slug`, `/genres`                                                                                                                  | `genre/[slug].tsx`, `genres/index.tsx`                         | Genre details and browse.                                 |
| `/log`, `/log/:id`                                                                                                                         | `log/index.tsx`, `log/[id].tsx`                                | Wizard and log detail.                                    |
| `/log/done`, `/log/step-artist`, `/log/step-date`, `/log/step-venue`, `/log/step-venue-details`, `/log/step-review`, `/log/step-keepsakes` | `log/done.tsx`, `log/step-*.tsx`                               | Wizard steps; the layout owns the discard guard.          |
| `/user/:username`, `/user/:username/diary`, `/user/:username/friends`, `/user/:username/wishlist`                                          | `user/[username].tsx`, `user/[username]/*.tsx`                 | User profile and legacy tab aliases.                      |
| `/user/friends`                                                                                                                            | `user/friends.tsx`                                             | Legacy alias to the signed-in profile's friends tab.      |
| `/notifications`                                                                                                                           | `notifications.tsx`                                            | Notifications.                                            |
| `/timeline`, `/archive`, `/friends`                                                                                                        | `timeline.tsx`, `archive.tsx`, `friends.tsx`                   | Legacy aliases to profile tabs.                           |
| `/wrapped`, `/wrapped/:year`                                                                                                               | `wrapped/index.tsx`, `wrapped/[year].tsx`                      | Wrapped story routes.                                     |
| `/stats/wall-of-fame`, `/stats/wrapped`                                                                                                    | `stats/wall-of-fame.tsx`, `stats/wrapped.tsx`                  | Stats sub-pages.                                          |
| `/legal/privacy`, `/legal/terms`                                                                                                           | `legal/privacy.tsx`, `legal/terms.tsx`                         | Public legal pages.                                       |
| `/cloud-bench`, `/components`                                                                                                              | `(dev)/cloud-bench.tsx`, `(dev)/components.tsx`                | Development routes.                                       |
| Unknown path                                                                                                                               | `+not-found.tsx`                                               | “Show cancelled” empty state and Home action.             |

Navigators live in `src/app/_layout.tsx`, `(tabs)/_layout.tsx`,
`(auth)/_layout.tsx`, `log/_layout.tsx`, and `wrapped/_layout.tsx`. Expo Router
is configured to use `src/app`; the stale root `app/_layout.tsx` and duplicate
root index were removed so only one route tree and one `/` screen are active.
Typed routes remain enabled in `app.json`.

## Initial audit: problems found before implementation

1. Many screens used `router.back()` for X, arrows, and empty-state actions.
   Cold deep links and browser refreshes do not guarantee an in-app history
   entry, so these controls could leave the app or land somewhere unrelated.
2. The log wizard's exit paths depended on navigator removal behavior. The
   discard confirmation needed to remain active for X, Android Back, and
   navigator removal, while a cold wizard URL needed a deterministic fallback.
3. Signed-out redirects did not persist the requested screen. OTP, magic-link,
   OAuth, and onboarding completion could send a user to Home instead of the
   URL they initially opened.
4. Route strings were duplicated and interpolated across components despite
   typed routes being enabled. Some call sites used type escapes such as
   `as any`/`as never`; repeated pushes could also stack the same screen.
5. Unknown routes and invalid artist, genre, user, and log identifiers had
   inconsistent empty states and back behavior.
6. Active tab presses did not scroll the current tab to its root. Scroll
   position behavior across tab switches was not consistently wired.
7. Vercel's catch-all rewrite did not exclude static resources. Page titles did
   not change by screen, and there was no Expo Router not-found screen.
8. Account cleanup was split across auth state, query cache, log/timeline/stats
   state, and queued media. Back navigation after sign-out was not explicitly
   checked against protected screens.
9. `/timeline`, `/archive`, `/friends`, `/user/friends`, and nested user tabs
   were compatibility redirects without focused regression tests.
10. A root-level `app/` tree coexisted with `src/app/`, and root indexes could
    both map to `/`, making the effective route manifest ambiguous.

During implementation, browser smoke tests also exposed a precedence error in
the signed-in redirect-pending expression: it treated the signed-out Welcome
route as pending forever. The condition is now grouped under `Boolean(user)`;
the Playwright login fixture covers the regression.

## Navigation and redirect inventory

All in-app navigation actions use `routes` helpers, `Link` destinations use
helpers, and route aliases use typed `Redirect` destinations. No direct
`router.push` calls remain. `router.navigate` is used for idempotent opens;
`router.replace` is reserved for guard/alias/flow redirects and history reset.

### `router.navigate` call sites

| Source file(s)                                                                                        | Destinations                                                                                                                           |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/stats/StatsScreen.tsx`, `src/app/stats/wall-of-fame.tsx`                              | Artist, user diary, Wrapped, log wizard, wall of fame, genre.                                                                          |
| `src/components/profile/FriendsPreview.tsx`, `ProfileFriendsSection.tsx`                              | User profiles and artists.                                                                                                             |
| `src/components/profile/ProfileScreen.tsx`                                                            | Full-screen picks and wishlist editors, log wizard, settings, Wrapped, notifications, user wishlist, log detail, artist, wall of fame. |
| `src/components/navigation/CustomTabBar.tsx`                                                          | Log wizard; tab-root navigation uses `navigation.navigate`; active-tab press scrolls to top and pops a nested stack to root.           |
| `src/components/navigation/CollapsibleHeaderLayout.tsx`, `src/components/timeline/TimelineScreen.tsx` | Full-screen concert log detail, current user profile, and log wizard.                                                                  |
| `src/components/paper/GenreLabel.tsx`, `src/features/genres/GenreBrowseScreen.tsx`                    | Genre detail.                                                                                                                          |
| `src/app/log/[id].tsx`                                                                                | Full-screen concert log details, artist page, comments, and edit flow.                                                                 |
| `src/features/artists/ArtistCardProvider.tsx`, `ArtistCardContent.tsx`                                | Artist, log wizard, and log detail.                                                                                                    |
| `src/features/cloud/CloudTerritoryCard.tsx`, `src/features/cloud/CloudGraph.tsx`                      | Genre detail and log wizard.                                                                                                           |
| `src/features/home/HomeHub.tsx`                                                                       | User profile/diary, genre browse, log wizard/detail, and legacy friends alias.                                                         |
| `src/features/genres/GenrePageScreen.tsx`                                                             | Log wizard.                                                                                                                            |
| `src/app/notifications.tsx`, `src/app/log/done.tsx`                                                   | User profile, keepsakes, and cloud routes.                                                                                             |
| `src/app/log/step-artist.tsx`                                                                         | Artist creation and genre browse.                                                                                                      |

### Safe back, replacements, links, and redirects

| Source file(s)                                                                                                                                                                                                                                                                                  | Behavior                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/navigation/useSafeBack.ts`                                                                                                                                                                                                                                                                 | The single `router.back()`/`router.replace()` policy and Android hardware-back listener.                     |
| `src/features/artists/ArtistCardContent.tsx`, `src/features/genres/GenrePageScreen.tsx`, `src/features/genres/GenreBrowseScreen.tsx`                                                                                                                                                            | Back/close to history or route fallback.                                                                     |
| `src/app/log/[id].tsx`                                                                                                                                                                                                                                                                          | Back to validated `returnTo`, otherwise the log owner's diary when known, then the signed-in diary fallback. |
| `src/app/log/_layout.tsx`, `src/app/log/step-review.tsx`, `src/app/artist/new.tsx`, `src/app/notifications.tsx`, `src/app/stats/wrapped.tsx`, `src/components/profile/ProfileScreen.tsx`, `src/components/wrapped/WrappedStoryScreen.tsx`, `src/app/legal/*.tsx`, `src/app/(tabs)/settings.tsx` | X/back actions use `useSafeBack`; wizard draft exits retain a cross-platform discard confirmation.           |
| `src/app/_layout.tsx`                                                                                                                                                                                                                                                                           | Hydration-aware auth guard; replaces to Welcome/Onboarding/Home and restores a validated return target.      |
| `src/app/(auth)/onboarding.tsx`, `src/app/(tabs)/settings.tsx`, `src/app/artist/new.tsx`, `src/app/log/done.tsx`, `src/app/log/step-keepsakes.tsx`, `src/app/log/step-review.tsx`, `src/app/+not-found.tsx`                                                                                     | Flow, entity, and session redirects use centralized helpers and `replace`.                                   |
| `src/app/(auth)/welcome.tsx`                                                                                                                                                                                                                                                                    | Terms and Privacy `Link` destinations use typed route helpers.                                               |
| `src/app/archive.tsx`, `timeline.tsx`, `friends.tsx`, `user/friends.tsx`, `user/[username].tsx`, `user/[username]/diary.tsx`, `user/[username]/friends.tsx`, `user/[username]/wishlist.tsx`                                                                                                     | Legacy aliases and own-profile redirects use typed `Redirect` helpers.                                       |
| `src/features/auth/oauth.ts`, `src/features/auth/useAuthListener.ts`                                                                                                                                                                                                                            | Native callback URI, web callback query/fragment parsing, OTP, magic-link, and OAuth return-to handling.     |
| `src/navigation/returnTo.ts`                                                                                                                                                                                                                                                                    | Internal path validation, persistence, one-time consumption, and typed Href conversion.                      |
| `src/navigation/pageTitles.ts`                                                                                                                                                                                                                                                                  | Route-specific browser titles.                                                                               |

### Deep links and URL validation

- Expo Router URLs are `/artist/:id`, `/genre/:slug`, `/genres`,
  `/user/:username`, and `/log/:id`, plus the route map above.
- The log share URL is constructed by `routes.logDeepLink()` using the active
  Expo scheme. The application scheme is configured by `app.json` and
  `app.config.ts`; native auth callbacks use the same configured scheme.
- A return target is accepted only when it is a bounded relative internal path.
  Protocol URLs, protocol-relative paths, backslashes, controls, encoded
  backslashes, empty values, and over-length values are rejected. Web OAuth and
  native callback parameters are revalidated before use.
- Browser back uses Expo Router history when available. It considers browser
  history only when there is a prior same-origin referrer; otherwise X/back
  replaces to the screen fallback.
- Wizard discard confirmation is rendered in-app rather than with
  `Alert.alert`, which is a no-op on React Native Web. The saved-log photo step
  exits to its previous screen, or the log completion screen on a cold link;
  it does not decrement the draft step because the log has already been saved.
- A new log remains local through the keepsakes stage. Back returns to rating
  and review; X confirms discarding the entire draft. “Save to my archive” or
  “Skip for now” creates the log, transfers staged photos to the upload queue,
  clears the wizard draft, and then replaces the route with the completion
  screen.
- `vercel.json` sends extensionless app paths to `/index.html` while excluding
  `/assets`, `/_expo/static`, and paths ending in a file extension. This
  preserves assets, CanvasKit `.wasm`, favicon, and web manifest requests.
  The rewrite uses Vercel's documented named-parameter regex form.

## Back and close destinations

| Screen        | Fallback when history/validated return target is unavailable        |
| ------------- | ------------------------------------------------------------------- |
| Artist        | Home                                                                |
| Genre detail  | Genre browse                                                        |
| Genre browse  | Home                                                                |
| Log detail    | Log owner's diary; signed-in diary if owner metadata is unavailable |
| User profile  | Home                                                                |
| Log wizard    | Home, after discard confirmation when draft content exists          |
| Settings      | Profile                                                             |
| Notifications | Profile                                                             |
| Legal/privacy | Welcome                                                             |
| Wrapped       | Home or its parent stats route                                      |
| Not found     | Home                                                                |

The four tabs have independent navigation state; inactive tabs are not remounted
by tab selection. Active-tab presses emit the tab event so registered scroll
surfaces return to the top, and pop any nested stack to its first route.

## Auth guard matrix

| State                                 | Result                                                                                                                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session hydration pending             | Keep the splash/loading view; do not redirect yet.                                                                                                                                                  |
| Signed out                            | Save only the validated current internal destination, then replace to Welcome.                                                                                                                      |
| Signed in, profile loading            | Keep the loading view until the profile query resolves.                                                                                                                                             |
| Signed in without username            | Replace to Onboarding; after profile setup consume the saved return target.                                                                                                                         |
| Signed in without the required invite | Replace to the invite/onboarding gate; continue the saved route after invite and profile setup.                                                                                                     |
| Fully onboarded                       | Keep protected destinations; replace auth pages with the saved destination or Home.                                                                                                                 |
| Deleted account                       | Successful deletion signs out locally, clears session data, and replaces to Welcome. If the profile is unavailable before deletion, show retry/sign-out controls rather than redirecting in a loop. |
| Expired session                       | Supabase clears the session; the signed-out guard saves the current internal route and replaces to Welcome.                                                                                         |

Return-to restoration is covered with fixtures for OTP code, native magic link,
native OAuth callback, and web OAuth callback. External providers are not
contacted by these tests.

## Tests and manual QA

Automated coverage:

- `tests/navigation.test.ts`: route destinations, screen/entry-point back matrix,
  internal return-to validation, log-owner fallback, and web page titles.
- `tests/legacy-navigation.test.tsx`: timeline/archive/friends and nested user
  tab redirects.
- `tests/auth-oauth.test.ts`: OTP, magic link, web/native OAuth redirect URI and
  callback restoration.
- `tests/e2e/navigation.spec.ts`: mocked-auth Playwright flows on desktop and a
  mobile viewport, including login return-to, direct route refresh, deep-link
  back, not-found, sign-out followed by Back, and deferred log creation through
  the keepsakes stage.
- `.maestro/navigation/*.yaml`: signed-in Cloud-to-artist, genre-label-to-page,
  and cold-start native deep-link flows.

### Manual QA checklist

- [ ] Open `/artist/:id`, `/genre/:slug`, `/genres`, `/user/:username`, and `/log/:id` directly in a fresh browser tab and refresh each page.
- [ ] Open an artist, genre, user, and log from an in-app screen; use X/back and confirm the originating screen is restored.
- [ ] Open the same artist/genre/log twice; confirm the destination does not stack duplicate screens.
- [ ] Open an unknown route and invalid artist/genre/user/log identifiers; verify a specific empty state and a usable back/home action.
- [ ] Start the log wizard from Home and a deep link; test X, the step back arrow, Android Back, and browser Back with and without draft content.
- [ ] Continue a new log to Keepsakes; verify it is not saved before finishing, Back returns to review, X discards without inserting, and Save/Skip inserts exactly once.
- [ ] Tap the active tab and verify scroll-to-top; switch tabs and verify each retains its scroll position.
- [ ] Sign out and delete an account, then use browser/native Back; confirm no protected screen is revealed.
- [ ] Complete OTP, magic link, and OAuth from a protected deep link; confirm return to the original screen after onboarding/invite redemption.
- [ ] Request `/assets/*`, `/_expo/static/*`, a `.wasm`, favicon, and manifest path on the Vercel deployment; confirm none returns `index.html`.
- [ ] Verify screen titles in browser history and refresh.

Playwright uses local auth/REST fixtures and a fake Supabase URL; it does not
need real credentials or contact a remote database. Maestro flows require a
development build, a signed-in test account, and seed data matching
`ARTIST_NAME`, `ARTIST_ID`, and `GENRE_LABEL`; set `APP_SCHEME` to the configured
scheme (`ivelive`, `ivelive-preview`, or `ivelive-development`). Testing live
Google/Apple OAuth, actual magic-link delivery, invite redemption, and account
deletion still requires appropriately configured test credentials/backend.

## Files changed

- Route foundation: `src/navigation/routes.ts`,
  `src/navigation/useSafeBack.ts`, `src/navigation/returnTo.ts`,
  `src/navigation/clearSessionData.ts`, and
  `src/navigation/pageTitles.ts`.
- Routing/auth surfaces: `app.json`, `vercel.json`, `src/app/_layout.tsx`,
  `src/app/+not-found.tsx`, auth callback/onboarding/welcome screens, log
  wizard/detail screens, legacy redirect screens, account settings, and route
  screens/components that open or dismiss artists, genres, users, logs, stats,
  and notifications.
- Verification: `tests/navigation.test.ts`,
  `tests/legacy-navigation.test.tsx`, `tests/e2e/navigation.spec.ts`,
  `playwright.config.ts`, auth/navigation component tests, and
  `.maestro/navigation/*.yaml`.
- Root route configuration was consolidated on `src/app`; the stale
  `app/_layout.tsx` and duplicate `src/app/index.tsx` were removed.

## Validation status

- TypeScript: `npm run typecheck` passed.
- Lint: `EXPO_NO_DOTENV=1 npm run lint` passed with 0 errors and 33 warnings
  from existing test code and `CustomArtistForm`.
- Focused Jest: `tests/log-store.test.ts` and `tests/log-keepsakes.test.ts`
  passed (11 tests). The earlier navigation/auth focused tests passed 58 tests;
  the full suite previously had two existing failures in
  `tests/home-api.test.ts` (nearby country expectations), outside this task.
- Playwright: `npm run test:e2e -- --workers=1 --trace=off` passed all 24
  desktop/mobile cases using fixtures and the local Expo web server.
- Maestro native flows are authored but require a configured simulator/device
  and signed-in fixture data; they were not run in this environment.
- No remote database or real auth provider was used.

## UX-1: Friends' logs, mobile layouts, and genre browse

### Implemented

- The Artist Card's friends row uses `friends_who_saw_artist`, whose
  `SECURITY INVOKER` migration limits results to accepted follows and visible
  logs, excludes private profiles and blocks, orders by recent logs, and caps
  the result limit at 50. The sheet groups friends and their logs, shows
  venue/rating/review/media/setlist/top-song details and a same-date stamp, and
  opens a log detail route with an artist return target.
- The log detail route displays owner information and the read-only content for
  another user's log, while preserving own-log editing/deletion and an explicit
  unavailable/private state.
- Home sections put friends' activity and "Pick up where you left off" before
  the compact Explore genres strip. Macro genre tiles offer separate About and
  expand actions; the expanded view has an Open macro row above sub-genres.
  Expanding still works if the catalog response omits a macro row.
- The compact TimelineCard uses a narrower date axis, moves its rating below
  the title row, wraps artist/venue names, and places media below the header.
  Home, log detail, Artist Card, Stats, Profile and friend-feed titles/metadata
  no longer clamp the key names and venue information to one or two lines.
  Cloud controls collapse to icon buttons and a controls sheet, and artists in
  the Cloud territory card now open the shared Artist Card.
- Friends' feed cards expose an explicit Open Log action; the Home friend
  highlight adds a tappable "YOU WENT TOO" stamp when the viewer has a log for
  the same artist and date. Author avatars continue to open the friend's diary.
- `useBreakpoint()` defines compact, regular, and wide widths. The layout
  harness includes long bilingual text and three keepsakes. Playwright now
  checks horizontal page overflow and scrolls each interactive control into
  view before asserting its full bounds are inside the viewport.

### Migration and database commands

Migration: [`supabase/migrations/20261109110000_friends_who_saw_artist.sql`](../supabase/migrations/20261109110000_friends_who_saw_artist.sql).
SQL tests: [`supabase/tests/friends_who_saw_artist.test.sql`](../supabase/tests/friends_who_saw_artist.test.sql).

No Supabase command was run and no remote database was accessed. The
`npx supabase db push --linked` command is intentionally **not run** because it
targets the linked remote project. After explicit deployment approval, that
command can apply the migration. Type generation should be performed against a
local database, for example:

```sh
npx supabase gen types typescript --local > /tmp/ivelive-database.types.ts
```

The generated RPC type was updated in the working tree; compare it with the
local output before replacing `src/lib/database.types.ts`. No real credentials
or secret values are needed for the fixture-based Playwright suite.

### Layout audit status

| Screen / surface                         | Change in this continuation                                                     | Remaining QA                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Diary / TimelineCard                     | Compact labels wrap to two lines; venue and media wrap below.                   | Test 320/360/390/430 px with platform font scaling and real browser rendering.       |
| Log detail                               | Read-only owner/content state and responsive shared components are implemented. | Verify long review, keepsakes and setlist on small phones and large text.            |
| Artist Card / friends sheet              | Scrollable grouped friend logs with wrapping venue/review content.              | Verify many friends, private/inaccessible log and 320 px viewport in browser/native. |
| Cloud HUD / territory info               | Compact icon controls, bottom sheet, and tappable artist chips.                 | Check safe-area overlap with minimap/tab bar on iOS Safari and Android Chrome.       |
| Home                                     | Reordered sections and compact genre strip.                                     | Verify long friends feed and stubs at 320–430 px.                                    |
| Genres                                   | Wrapping tile grid, 44 px About control and animated expanded list.             | Verify text scaling, keyboard search and reduced-motion behavior on devices.         |
| Stats / Profile / tab bar / other sheets | No new UX-1-specific layout changes in this continuation.                       | Still require the requested mobile clipping audit.                                   |

### UX-1 tests and manual QA

- Added component coverage for the friends sheet and macro browse actions,
  including a missing macro catalog entry, plus friend-feed log and same-show
  stamp actions.
- The layout test uses the public Expo Router path `/layout-check` and is
  configured for widths 320, 360, 390, 430 plus iPhone SE, iPhone 13, and
  Pixel 7 contexts; CI runs the layout test for these projects.
- `npm run typecheck` passed.
- `EXPO_NO_DOTENV=1 npm run lint` passed with 0 errors; remaining warnings are
  pre-existing and outside the touched layout code.
- Focused Jest passed: 5 suites, 50 tests, 1 snapshot.
- The layout harness passed on 320, 360, 390, 430 px and iPhone SE, iPhone 13,
  and Pixel 7 Playwright contexts (7/7). Screenshots were saved under
  `test-results/` as test attachments.
- For non-fixture backend validation, run the pgTAP test only against a local
  Supabase instance. Do not use `--linked` for tests or migration validation.

Manual QA checklist:

- [ ] Open the Artist Card, inspect "Friends who've seen them", and open an
      individual friend's log; X/back should return to the Artist Card.
- [ ] Check the explicit private/unavailable state and verify own logs still
      expose edit/delete actions.
- [ ] Open About directly from each macro tile, expand a tile, and verify its
      Open row appears before sub-genres, including when a macro row is absent from
      the catalog.
- [ ] Tap a Cloud territory artist and confirm the same Artist Card opens.
- [ ] Check 320, 360, 390, and 430 px portrait layouts with large text on iOS
      Safari and Chrome Android, especially Diary, log detail, Artist Card, Stats,
      Profile, Home, sheets, Cloud controls, and tab bar.
- [ ] Review the Playwright screenshots for all configured mobile widths and
      attach them as test artifacts after a successful run.

# Alpha testers

## Invitation flow

Preview and production builds require a one-use invite before onboarding.
Existing profiles are marked invited by the migration; newly created profiles
must redeem a code before creating or changing app content. The database gate is
the enforcement layer, so hiding the form in the client is not treated as
authorization.

1. Apply `20261103100000_alpha_invites.sql` to the intended **non-production**
   Supabase project and run `supabase/tests/alpha_invites.test.sql` locally.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in a trusted operator
   shell for that alpha project.
3. Generate one-use invites with `npx tsx supabase/scripts/create-alpha-invites.ts 10`.
   The command writes the codes to `.alpha-invites.txt` with owner-only file
   permissions and does not print the codes. This file is git-ignored; share
   codes through a private channel and remove the file afterward.
4. Build the `preview` profile and distribute its internal link to invited
   testers. Do not send a production build until the release blockers in
   [RELEASE.md](./RELEASE.md) are closed.

Development builds have the invite screen disabled. Configure the private
`alpha_gate_config.invite_only` row to `false` only in the isolated local or
development Supabase project; do not make that change in preview or production.

## Tester checklist

- Sign up with an invite, complete profile onboarding, and restart the app.
- Confirm an unused code is rejected after its first redemption and an invalid
  code never unlocks writing.
- Test profile privacy, follow requests, blocks, reports, media upload/deletion,
  account deletion, and sign-in return links on both native and web builds.
- Send a reproducible issue report without attaching credentials, private
  messages, or another person's personal information.

Use the platform's internal distribution channel only. Do not post invite codes
or internal build links publicly.

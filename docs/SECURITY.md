# Alpha security review notes

This is a static source review, not a penetration test or a certification of a
deployed Supabase project. No secret values were read into output, and no
remote database or function was queried or changed.

## Changes in this pass

- Invite-only access is enforced by database triggers and storage policies as
  well as the onboarding UI. Existing profiles are grandfathered once; invite
  codes are random, hashed before persistence, and one-use.
- Spotify search no longer logs a user-entered query or provider response body.
  Provider failure responses are generic.
- Orphan cleanup now queries referenced paths as values rather than composing
  a PostgREST filter expression from storage paths.
- Orphan cleanup uses the shared trusted-server authenticator, including its
  constant-time credential comparisons, and rejects ordinary user sessions.
- Account deletion validates its confirmation body and no longer returns
  internal storage/Auth error text to the caller.

## Not verified

- SQL tests could not run because Docker and the Supabase CLI are unavailable
  in this environment. Review and test the migration against a local Supabase
  stack before applying it anywhere.
- Remote RLS policies, storage bucket settings, Edge Function secrets, Auth
  allowlists, provider limits, and cron configuration were not inspected.
- Legal copy, data export/retention, support response, and UGC moderation
  procedures remain release blockers; see [RELEASE.md](./RELEASE.md).

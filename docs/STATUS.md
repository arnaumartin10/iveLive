# Alpha status snapshot

Status is based on the checked-out source and local checks; it is not a
production security certification.

## Implemented surfaces

- Supabase RLS migrations and tests cover profiles, logs, keepsakes, social
  actions, artist reports, account deletion, and orphan-media cleanup.
- The app has block/report flows, profile privacy controls, and a placeholder
  privacy screen.
- The alpha invite migration adds a one-time hashed-code flow and server-side
  write gate for core content tables.
- Edge Functions use authenticated requests for user-scoped operations and
  internal server credentials for scheduled refresh operations.
- EAS profiles now use separate app identities and channels.

## Remaining release risks

- The invite migration and its SQL tests have not been executed against local
  Supabase; the migration has not been applied to any remote project.
- No EAS project ID, per-environment Supabase values, Vercel environment
  validation, OAuth smoke test, error-reporting destination, or support
  workflow is available in this checkout.
- The privacy policy remains placeholder text. Terms, data export, retention,
  user-generated-content moderation and escalation need owner/legal review.
- Bundle/startup and device-performance budgets have not been measured.
- The status of provider quotas and scheduled refresh configuration must be
  confirmed in each isolated environment.

## Checks

The original baseline had one design-token guard failure in
`SetlistImportPanel.tsx`; that raw color has been replaced with a theme-derived
value. The final local checks pass: TypeScript, all 57 Jest suites (1,079 tests,
5 snapshots), and Expo lint with zero errors. Lint still reports one existing
`react-hooks/incompatible-library` warning in
`src/features/artists/CustomArtistForm.tsx`. SQL tests were not run.

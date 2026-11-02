# Alpha release gate

## Current decision: NO-GO

This checkout has local readiness changes only. No Supabase migration, Edge
Function, cron job, EAS build, Vercel deployment, or remote database operation
has been performed.

### Completed in this pass

- Separate `development`, `preview`, and `production` app identifiers,
  schemes, EAS channels, and `appVersion` runtime policy.
- Build-time validation for the selected environment's public Supabase URL and
  anon key; `.env.example` is no longer silently loaded as a fallback.
- One-use invite migration, server-side write gate, redemption UI, admin code
  generator, and SQL tests.
- Sanitized Spotify search logging and safer error responses for account
  deletion and orphan cleanup.

### Required before inviting testers

- Apply the new migration to a dedicated alpha Supabase project and run all SQL
  tests against a local Supabase stack. SQL tests were not run in this session.
- Configure and verify separate Supabase projects and EAS/Vercel environment
  variables. The EAS project ID and Updates URL are not present in this repo.
- Publish legal privacy/terms copy reviewed by the owner; the current privacy
  screen explicitly remains a placeholder.
- Decide and configure error reporting and a support/feedback destination. No
  telemetry DSN or support address was supplied, and no third-party service was
  configured.
- Exercise OAuth, invite redemption, report/block flows, data export and
  account deletion on real preview builds.
- Review UGC moderation and escalation ownership before public distribution.

### Release commands (operator-run only)

After confirming the project and environment variables, use the appropriate
EAS profile:

```sh
npx eas-cli@latest build --profile preview --platform all
npx eas-cli@latest build --profile production --platform all
```

These are instructions, not commands run by this task. Review migration SQL
before applying it; do not link a local test command to production.

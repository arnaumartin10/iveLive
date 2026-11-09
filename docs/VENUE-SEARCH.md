# Venue and festival autocomplete

The logging wizard's venue-name step searches the canonical `public.venues`
table first and supplements those results with MusicBrainz place searches (or
event searches for festivals). Search results are cached for 24 hours. A
database-backed request gate keeps MusicBrainz calls at least 1.1 seconds apart
across function instances and honors provider cooldown responses. Custom venue
names remain available and are saved in `concert_logs.venue_name` without a
`venue_id`.

## Deployment

1. Apply `supabase/migrations/20261109150000_venues_database.sql`.
2. Set `MUSICBRAINZ_CONTACT_EMAIL` as a Supabase Edge Function secret. It is
   included in the MusicBrainz `User-Agent`; do not put its value in source,
   app configuration, or migrations.
3. Deploy `venue-search` with JWT verification enabled:
   `npx supabase functions deploy venue-search`
4. Regenerate `src/lib/database.types.ts` from the linked project if the remote
   schema has been updated and reviewed.

If the wizard says venue search is not set up or temporarily unavailable, confirm
that the migration and function were deployed to the same Supabase project and
that the Edge Function has `MUSICBRAINZ_CONTACT_EMAIL` configured. A missing
`search_venues` RPC means the migration is not present in the function's project.
If the function responds successfully but reports online search unavailable,
check its safe `venue_search_issue` logs; local/custom venue entry remains
available while MusicBrainz or the external-search cache is unavailable.

The migration is idempotent. Authenticated users can read venues but only the
service role can write them or access search-cache/rate-limit state. Tests use
fixtures and mocks; they do not call MusicBrainz or a remote database.

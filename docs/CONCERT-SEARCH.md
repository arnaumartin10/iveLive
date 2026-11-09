# Official concert search

The Home screen's pinned search first uses the app's artist catalog search.
After the user selects an artist, the `concert-search` function resolves the
exact matching Ticketmaster attraction and fetches events by that attraction's
ID. Fuzzy event-title matches are not used, which excludes tribute acts that
only contain the artist's name in their listing. Results can be filtered by a searchable country picker (worldwide or one of
Ticketmaster's supported markets) and an optional upcoming date range selected
from an in-app calendar. Results are returned chronologically.

The `concert-search` Edge Function requires an authenticated user and the
`TICKETMASTER_API_KEY` secret. Configure that secret in the Supabase project
secret manager before deploying the function. Do not put the key in app config
or commit it to the repository. The function uses a short in-memory cache and
does not write search results or run database migrations.

Selecting a Spotify artist ensures it exists in the local `artists` table.
Each event is then saved to the signed-in user's existing Wishlist with that
artist ID; selecting an already-saved event removes the Wishlist item.

## Verification

- `npm test -- --runInBand tests/official-concert-search.test.ts tests/home-api.test.ts`
- Search an artist, select the catalog result, search and select a country,
  choose optional start/end dates from the calendars, then save an event and
  confirm it appears in Wishlist.
- Search for a band with tribute events (for example Oasis) and confirm events
  are fetched by the exact Ticketmaster artist attraction, not keyword matches.

The integration test needs a deployed `concert-search` function and a valid
Ticketmaster API key. It does not need or run against a remote database as part
of the local unit-test command.

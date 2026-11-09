# On-demand artist catalog

The editorial JSON under `src/content/genres/` contains 1,583 distinct artist
names after the same case-insensitive, accent-insensitive normalization used by
`artists.name_normalized`, across 1,949 placements. The 13 macro pages contain
285 distinct names (39 pillar and 260 example placements); the 110 sub-genre
pages contain 1,431 distinct names (330 pillar and 1,320 example placements).
There are overlaps between levels.

The current database was not queried for this implementation. Therefore the
number already in `artists` and the per-genre missing counts are deliberately
not guessed. After applying the migration and seeding the queue, use this
read-only query to get those counts:

```sql
with editorial_artists as (
  select
    g.level,
    g.slug,
    g.label,
    q.name_normalized,
    bool_or(q.status = 'resolved' or q.resolved_artist_id is not null)
      or exists (
        select 1
        from public.artists a
        where a.name_normalized = q.name_normalized
      ) as already_present
  from public.genres g
  join public.catalog_queue q on q.genre_slug = g.slug
  group by g.level, g.slug, g.label, q.name_normalized
)
select
  case
    when grouping(level) = 1 then 'ALL LEVELS'
    when grouping(slug) = 1 then 'LEVEL TOTAL'
    else label
  end as scope,
  level,
  slug,
  count(distinct name_normalized) as total_unique_names,
  count(distinct name_normalized) filter (where already_present)
    as already_in_artists,
  count(distinct name_normalized) filter (where not already_present) as missing
from editorial_artists
group by grouping sets ((level, slug, label), (level), ())
order by level nulls first, grouping(slug) desc, slug;
```

Queue monitoring is:

```sql
select * from public.catalog_progress order by priority, status;
```

`catalog_queue`, Spotify state/cache, and the request-limit table are private to
the service role. The app reads unresolved artist names only through
`get_genre_page`; it cannot query queue rows directly. Search cache keys ignore
case, accents, punctuation, and a leading “The” so duplicate editorial entries
share a single Spotify search. Search results are cached for 30 days when
non-empty and one day when empty. Spotify `Retry-After` is persisted in
`spotify_state`; the circuit breaker opens after five consecutive failures.

## Safe operating sequence

Do not run the seed script or drip loader while Spotify is rate-limited. Never
test against Spotify; tests use local fixtures. `seed-catalog-queue.ts
--dry-run` is offline and does not query Supabase.

The migration filename is
`supabase/migrations/20261109120000_artist_catalog_queue.sql`. Its original
11:00 version collided with another migration created at the same time. Before
applying migrations, verify that every local migration version is unique and
that any already-recorded remote version corresponds to the same migration
contents; do not rename or reapply an unrelated migration to silence a history
conflict.

1. Apply the migration when approved:
   `npx supabase db push --linked`
2. Regenerate database types:
   `npx supabase gen types typescript --linked --schema public > src/lib/database.types.ts`
3. Deploy both functions:
   `npx supabase functions deploy resolve-artist`
   `npx supabase functions deploy catalog-drip`
4. Inspect the offline seed plan:
   `npx tsx supabase/scripts/seed-catalog-queue.ts --dry-run`
5. Seed the catalog after reviewing the plan:
   `npx tsx supabase/scripts/seed-catalog-queue.ts`
6. Only after Spotify is responding with HTTP 200 again, start with a small
   drip:
   `npx tsx supabase/scripts/catalog-drip.ts --max 20 --sleep-ms 2500`

The interactive resolver makes one `/v1/search` request at most per canonical
artist name, with `limit=5`, and never calls `/v1/artists/{id}`. It first looks
up an existing artist and then a cached search. Concurrent requests share a
database-backed search lease. A user can start at most 10 uncached resolutions
per hour. The drip processes a maximum of 60 entries per invocation, defaults
to 30, pauses at least 2.5 seconds between entries, and stops on the first
cooldown/429. A no-match is retried once from cache on a later pass, then marked
`not_found`. Enrichment is invoked asynchronously through the existing
`enrich-artist` path; resolution does not wait for provider enrichment.

Recommended operations are about 40 items per run, two or three runs per day,
and increasing that only after runs show no 429 response. The wrapper divides
the requested total into batches of ten; `--sleep-ms` has a 2.5 second
minimum.

## Optional scheduling (not applied)

Do not put the internal secret in a migration. If scheduling with Supabase
Cron, store the function URL and internal secret in Vault first, then schedule
a request that reads them at execution time. For example, adapt this in the
Supabase SQL editor only after creating the Vault secrets and verifying the
function URL:

```sql
select cron.schedule(
  'artist-catalog-drip',
  '0 9,15,21 * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets
              where name = 'catalog_drip_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret',
        (select decrypted_secret from vault.decrypted_secrets
         where name = 'catalog_drip_internal_secret')
      ),
      body := '{"max":40}'::jsonb
    );
  $job$
);
```

Alternatively, a GitHub Actions schedule can run the local wrapper with
`SUPABASE_URL` and `INTERNAL_FUNCTION_SECRET` stored as Actions secrets. Set a
workflow-level `concurrency` group with `cancel-in-progress: false`, and run
one job at a time; do not print environment variables or include secret values
in workflow files.

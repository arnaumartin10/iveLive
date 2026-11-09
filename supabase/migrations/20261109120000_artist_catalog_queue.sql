create or replace function public.normalize_catalog_search_name(value text)
returns text
language sql
immutable
parallel safe
set search_path = extensions, public, pg_temp
as $$
  select regexp_replace(
    regexp_replace(
      btrim(regexp_replace(
        lower(public.immutable_unaccent(value)),
        '[^a-z0-9]+',
        ' ',
        'g'
      )),
      '\s+',
      ' ',
      'g'
    ),
    '^the\s+',
    ''
  );
$$;

create or replace function public.find_catalog_artist(p_name text)
returns table (
  id uuid,
  name text,
  spotify_id text,
  image_url_large text,
  image_url_thumb text,
  popularity integer,
  enrichment_status text,
  enriched_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    artists.id,
    artists.name,
    artists.spotify_id,
    artists.image_url_large,
    artists.image_url_thumb,
    artists.popularity,
    artists.enrichment_status,
    artists.enriched_at
  from public.artists
  where public.normalize_catalog_search_name(artists.name)
    = public.normalize_catalog_search_name(p_name)
  order by (artists.source = 'spotify') desc, artists.created_at
  limit 1;
$$;

revoke all on function public.find_catalog_artist(text)
  from public, anon, authenticated;
grant execute on function public.find_catalog_artist(text) to service_role;

create table if not exists public.catalog_queue (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_normalized text not null,
  search_key text generated always as (
    public.normalize_catalog_search_name(name)
  ) stored,
  genre_slug text not null references public.genres(slug) on delete cascade,
  role text not null check (role in ('pillar', 'example')),
  position smallint not null,
  priority integer not null check (priority between 1 and 4),
  status text not null default 'pending'
    check (status in ('pending', 'resolved', 'not_found', 'error', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  resolved_artist_id uuid references public.artists(id) on delete set null,
  why text,
  note text,
  aliases text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint catalog_queue_name_genre_role_unique
    unique (name_normalized, genre_slug, role)
);

alter table public.catalog_queue
  add column if not exists aliases text[] not null default '{}',
  add column if not exists search_key text generated always as (
    public.normalize_catalog_search_name(name)
  ) stored;

create index if not exists catalog_queue_status_priority_idx
  on public.catalog_queue (status, priority, position);
create index if not exists catalog_queue_name_normalized_idx
  on public.catalog_queue (name_normalized);
create index if not exists catalog_queue_search_key_idx
  on public.catalog_queue (search_key);

alter table public.catalog_queue enable row level security;
revoke all on public.catalog_queue from public, anon, authenticated;
grant all on public.catalog_queue to service_role;

create or replace view public.catalog_progress as
select
  priority,
  case priority
    when 1 then 'macro_pillars'
    when 2 then 'macro_examples'
    when 3 then 'subgenre_pillars'
    when 4 then 'subgenre_examples'
  end as priority_bucket,
  status,
  count(*)::bigint as item_count
from public.catalog_queue
group by priority, status;

revoke all on public.catalog_progress from public, anon, authenticated;
grant select on public.catalog_progress to service_role;

create table if not exists public.spotify_state (
  id smallint primary key default 1 check (id = 1),
  cooldown_until timestamptz,
  consecutive_failures integer not null default 0,
  circuit_open_until timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.spotify_state (id)
values (1)
on conflict (id) do nothing;

alter table public.spotify_state enable row level security;
revoke all on public.spotify_state from public, anon, authenticated;
grant all on public.spotify_state to service_role;

create or replace function public.record_spotify_success()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.spotify_state
  set consecutive_failures = 0,
      circuit_open_until = null,
      updated_at = now()
  where id = 1
    and (cooldown_until is null or cooldown_until <= now());
$$;

create or replace function public.record_spotify_failure()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_failure integer;
begin
  select consecutive_failures + 1
  into next_failure
  from public.spotify_state
  where id = 1
  for update;

  update public.spotify_state
  set consecutive_failures = next_failure,
      circuit_open_until = case
        when next_failure >= 5 then
          now() + make_interval(
            mins => least(15, power(2, next_failure - 5)::integer)
          )
        else circuit_open_until
      end,
      updated_at = now()
  where id = 1;
end;
$$;

create or replace function public.record_spotify_cooldown(
  p_retry_after_seconds integer
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.spotify_state
  set cooldown_until = greatest(
        coalesce(cooldown_until, '-infinity'::timestamptz),
        now() + make_interval(secs => greatest(1, p_retry_after_seconds))
      ),
      updated_at = now()
  where id = 1;
$$;

revoke all on function public.record_spotify_success()
  from public, anon, authenticated;
revoke all on function public.record_spotify_failure()
  from public, anon, authenticated;
revoke all on function public.record_spotify_cooldown(integer)
  from public, anon, authenticated;
grant execute on function public.record_spotify_success() to service_role;
grant execute on function public.record_spotify_failure() to service_role;
grant execute on function public.record_spotify_cooldown(integer) to service_role;

create table if not exists public.spotify_search_cache (
  name_normalized text primary key,
  results jsonb,
  expires_at timestamptz,
  lock_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.spotify_search_cache enable row level security;
revoke all on public.spotify_search_cache from public, anon, authenticated;
grant all on public.spotify_search_cache to service_role;

create table if not exists public.catalog_resolution_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists catalog_resolution_requests_user_time_idx
  on public.catalog_resolution_requests (user_id, created_at desc);
alter table public.catalog_resolution_requests enable row level security;
revoke all on public.catalog_resolution_requests from public, anon, authenticated;
grant all on public.catalog_resolution_requests to service_role;

create or replace function public.consume_catalog_resolution_limit(
  p_user_id uuid,
  p_limit integer default 10
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  select count(*)::integer into request_count
  from public.catalog_resolution_requests
  where user_id = p_user_id
    and created_at > now() - interval '1 hour';
  if request_count >= greatest(1, p_limit) then
    return false;
  end if;
  insert into public.catalog_resolution_requests (user_id) values (p_user_id);
  return true;
end;
$$;

revoke all on function public.consume_catalog_resolution_limit(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.consume_catalog_resolution_limit(uuid, integer)
  to service_role;

create or replace function public.claim_spotify_search(
  p_name_normalized text,
  p_lease_seconds integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.spotify_search_cache (
    name_normalized,
    results,
    expires_at,
    lock_expires_at
  )
  values (
    p_name_normalized,
    null,
    null,
    now() + make_interval(secs => greatest(15, least(p_lease_seconds, 300)))
  )
  on conflict (name_normalized) do update
  set results = null,
      expires_at = null,
      lock_expires_at = excluded.lock_expires_at,
      updated_at = now()
  where public.spotify_search_cache.lock_expires_at is null
     or public.spotify_search_cache.lock_expires_at <= now();
  return found;
end;
$$;

revoke all on function public.claim_spotify_search(text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_spotify_search(text, integer)
  to service_role;

drop function if exists public.get_genre_page(text);

create function public.get_genre_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with viewer as (
    select auth.uid() as user_id
  ), page as (
    select genre_pages.*
    from public.genre_pages
    where genre_pages.slug = p_slug
  ), catalog_pillars as (
    select
      queue.id as catalog_queue_id,
      queue.position,
      queue.name,
      queue.why,
      queue.resolved_artist_id as artist_id,
      queue.status as catalog_status
    from public.catalog_queue queue
    where queue.genre_slug = p_slug and queue.role = 'pillar'
    union all
    select
      null::uuid,
      pillars.position,
      artists.name,
      pillars.why,
      artists.id,
      null::text
    from public.genre_pillars pillars
    join public.artists artists on artists.id = pillars.artist_id
    where pillars.genre_slug = p_slug
      and not exists (
        select 1 from public.catalog_queue queue
        where queue.genre_slug = p_slug and queue.role = 'pillar'
      )
  ), catalog_examples as (
    select
      queue.id as catalog_queue_id,
      queue.position,
      queue.name,
      queue.note,
      queue.resolved_artist_id as artist_id,
      queue.status as catalog_status
    from public.catalog_queue queue
    where queue.genre_slug = p_slug and queue.role = 'example'
    union all
    select
      null::uuid,
      examples.position,
      artists.name,
      examples.note,
      artists.id,
      null::text
    from public.genre_examples examples
    join public.artists artists on artists.id = examples.artist_id
    where examples.genre_slug = p_slug
      and not exists (
        select 1 from public.catalog_queue queue
        where queue.genre_slug = p_slug and queue.role = 'example'
      )
  ), features as (
    select
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'position', feature.position,
            'why', feature.why,
            'id', artists.id,
            'name', feature.name,
            'image_url_thumb', artists.image_url_thumb,
            'image_url_large', artists.image_url_large,
            'primary_macro', artists.primary_macro,
            'seen_count', case
              when viewer.user_id is null or artists.id is null then 0
              else (
                select count(*)::integer
                from public.concert_logs logs
                where logs.artist_id = artists.id and logs.user_id = viewer.user_id
              )
            end,
            'in_wishlist', case
              when viewer.user_id is null or artists.id is null then false
              else exists (
                select 1 from public.wishlist_items wishlist
                where wishlist.artist_id = artists.id
                  and wishlist.user_id = viewer.user_id
                  and wishlist.status in ('wanted', 'going')
              )
            end,
            'catalog_queue_id', feature.catalog_queue_id,
            'catalog_status', feature.catalog_status
          ) order by feature.position
        )
        from catalog_pillars feature
        left join public.artists artists on artists.id = feature.artist_id
      ), '[]'::jsonb) as pillars,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'position', feature.position,
            'note', feature.note,
            'id', artists.id,
            'name', feature.name,
            'image_url_thumb', artists.image_url_thumb,
            'image_url_large', artists.image_url_large,
            'primary_macro', artists.primary_macro,
            'seen_count', case
              when viewer.user_id is null or artists.id is null then 0
              else (
                select count(*)::integer
                from public.concert_logs logs
                where logs.artist_id = artists.id and logs.user_id = viewer.user_id
              )
            end,
            'in_wishlist', case
              when viewer.user_id is null or artists.id is null then false
              else exists (
                select 1 from public.wishlist_items wishlist
                where wishlist.artist_id = artists.id
                  and wishlist.user_id = viewer.user_id
                  and wishlist.status in ('wanted', 'going')
              )
            end,
            'catalog_queue_id', feature.catalog_queue_id,
            'catalog_status', feature.catalog_status
          ) order by feature.position
        )
        from catalog_examples feature
        left join public.artists artists on artists.id = feature.artist_id
      ), '[]'::jsonb) as examples
    from viewer
  ), stats as (
    select
      coalesce(user_genre_stats.log_count::integer, 0) as shows,
      coalesce(user_genre_stats.artist_count::integer, 0) as unique_artists,
      user_genre_stats.avg_rating as average_rating,
      case when user_genre_stats.top_artist is null then null else
        jsonb_build_object(
          'id', user_genre_stats.top_artist->'id',
          'name', user_genre_stats.top_artist->'name',
          'seen_count', user_genre_stats.top_artist->'count'
        )
      end as most_seen_artist
    from viewer
    left join lateral public.user_genre_stats(viewer.user_id, null) user_genre_stats
      on user_genre_stats.macro_genre = p_slug
  ), feature_artist_ids as (
    select artist_id from catalog_pillars where artist_id is not null
    union
    select artist_id from catalog_examples where artist_id is not null
    union
    select artist_id
    from public.genre_pillars
    where genre_slug = p_slug
      and not exists (select 1 from catalog_pillars)
    union
    select artist_id
    from public.genre_examples
    where genre_slug = p_slug
      and not exists (select 1 from catalog_examples)
  ), progress as (
    select count(distinct ids.artist_id)::integer as seen_count
    from feature_artist_ids ids
    join viewer on viewer.user_id is not null
    join public.concert_logs logs
      on logs.artist_id = ids.artist_id and logs.user_id = viewer.user_id
  )
  select case
    when not exists (select 1 from page) then
      jsonb_build_object('found', false, 'error', 'not_found', 'slug', p_slug)
    else jsonb_build_object(
      'found', true,
      'page', (select to_jsonb(page) from page),
      'pillars', features.pillars,
      'examples', features.examples,
      'viewer', jsonb_build_object(
        'shows', stats.shows,
        'unique_artists', stats.unique_artists,
        'average_rating', stats.average_rating,
        'most_seen_artist', stats.most_seen_artist,
        'seen_feature_count', progress.seen_count
      )
    )
  end
  from features cross join stats cross join progress;
$$;

revoke all on function public.get_genre_page(text) from public, anon;
grant execute on function public.get_genre_page(text) to authenticated, service_role;

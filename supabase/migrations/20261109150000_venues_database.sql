create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  name_normalized text generated always as (
    lower(public.immutable_unaccent(name))
  ) stored,
  venue_type public.venue_type not null,
  city text,
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  lat numeric(9, 6),
  lng numeric(9, 6),
  source text not null check (
    source in ('musicbrainz', 'ticketmaster', 'manual')
  ),
  created_at timestamptz not null default now(),
  constraint venues_name_nonempty check (btrim(name) <> '')
);

create index if not exists venues_name_normalized_trgm_idx
  on public.venues using gin (name_normalized extensions.gin_trgm_ops);
create index if not exists venues_type_city_idx
  on public.venues (venue_type, city);

alter table public.venues enable row level security;
drop policy if exists venues_authenticated_read on public.venues;
create policy venues_authenticated_read
  on public.venues for select to authenticated using (true);
revoke all on public.venues from public, anon, authenticated;
grant select on public.venues to authenticated;
grant all on public.venues to service_role;

alter table public.concert_logs
  add column if not exists venue_id uuid
  references public.venues(id) on delete set null;

create table if not exists public.venue_search_cache (
  query_key text primary key,
  results jsonb not null default '[]'::jsonb,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.venue_search_cache enable row level security;
revoke all on public.venue_search_cache from public, anon, authenticated;
grant all on public.venue_search_cache to service_role;

create table if not exists public.musicbrainz_search_state (
  id smallint primary key default 1 check (id = 1),
  last_request_at timestamptz,
  cooldown_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.musicbrainz_search_state
  add column if not exists cooldown_until timestamptz;

insert into public.musicbrainz_search_state (id)
values (1)
on conflict (id) do nothing;

alter table public.musicbrainz_search_state enable row level security;
revoke all on public.musicbrainz_search_state from public, anon, authenticated;
grant all on public.musicbrainz_search_state to service_role;

create or replace function public.claim_musicbrainz_search(
  p_minimum_gap_ms integer default 1100
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected_rows integer := 0;
begin
  update public.musicbrainz_search_state
  set last_request_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = 1
    and (
      last_request_at is null
      or last_request_at <= clock_timestamp()
        - make_interval(
          secs => greatest(1000, p_minimum_gap_ms)::double precision / 1000
        )
    )
    and (cooldown_until is null or cooldown_until <= clock_timestamp());
  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke all on function public.claim_musicbrainz_search(integer)
  from public, anon, authenticated;
grant execute on function public.claim_musicbrainz_search(integer)
  to service_role;

create or replace function public.defer_musicbrainz_search(
  p_cooldown_seconds integer
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.musicbrainz_search_state
  set cooldown_until = greatest(
        coalesce(cooldown_until, clock_timestamp()),
        clock_timestamp()
          + make_interval(secs => greatest(1, least(p_cooldown_seconds, 3600)))
      ),
      updated_at = clock_timestamp()
  where id = 1;
$$;

revoke all on function public.defer_musicbrainz_search(integer)
  from public, anon, authenticated;
grant execute on function public.defer_musicbrainz_search(integer)
  to service_role;

create or replace function public.search_venues(
  p_query text,
  p_type public.venue_type default null,
  p_limit integer default 10
)
returns table (
  id uuid,
  name text,
  venue_type public.venue_type,
  city text,
  country text,
  external_id text
)
language sql
stable
security definer
set search_path = extensions, public, pg_temp
as $$
  with query_value as (
    select lower(public.immutable_unaccent(btrim(p_query))) as normalized
  )
  select
    venue.id,
    venue.name,
    venue.venue_type,
    venue.city,
    venue.country,
    venue.external_id
  from public.venues venue
  cross join query_value
  where (auth.uid() is not null or auth.role() = 'service_role')
    and char_length(btrim(p_query)) >= 2
    and (p_type is null or venue.venue_type = p_type)
    and (
      venue.name_normalized % query_value.normalized
      or venue.name_normalized like '%' || query_value.normalized || '%'
    )
  order by
    (venue.name_normalized = query_value.normalized) desc,
    extensions.similarity(venue.name_normalized, query_value.normalized) desc,
    venue.name
  limit greatest(1, least(coalesce(p_limit, 10), 20));
$$;

revoke all on function public.search_venues(text, public.venue_type, integer)
  from public, anon;
grant execute on function public.search_venues(text, public.venue_type, integer)
  to authenticated, service_role;

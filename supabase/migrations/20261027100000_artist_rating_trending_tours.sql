-- Public artist rating aggregates, trending data, and tour metadata.

alter table public.artists
  add column if not exists public_rating_count integer not null default 0,
  add column if not exists public_avg_rating numeric(4, 2),
  add column if not exists public_weighted_rating numeric(4, 2),
  add column if not exists is_on_tour boolean not null default false,
  add column if not exists tour_start_date date,
  add column if not exists tour_end_date date,
  add column if not exists tour_last_checked_at timestamptz;

do $$ begin
  alter table public.artists
    add constraint artists_public_rating_count_nonnegative_check
    check (public_rating_count >= 0);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.artists
    add constraint artists_public_avg_rating_range_check
    check (public_avg_rating is null or public_avg_rating between 0.5 and 5);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.artists
    add constraint artists_public_weighted_rating_range_check
    check (public_weighted_rating is null or public_weighted_rating between 0.5 and 5);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.artists
    add constraint artists_tour_date_range_check
    check (tour_start_date is null or tour_end_date is null or tour_end_date >= tour_start_date);
exception when duplicate_object or invalid_table_definition then null;
end $$;

alter table public.profiles
  add column if not exists home_city text,
  add column if not exists home_region text,
  add column if not exists home_country text,
  add column if not exists home_country_code text,
  add column if not exists home_latitude numeric(9, 6),
  add column if not exists home_longitude numeric(9, 6);

do $$ begin
  alter table public.profiles
    add constraint profiles_home_city_length_check
    check (home_city is null or char_length(home_city) <= 120);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.profiles
    add constraint profiles_home_region_length_check
    check (home_region is null or char_length(home_region) <= 120);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.profiles
    add constraint profiles_home_country_length_check
    check (home_country is null or char_length(home_country) <= 120);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.profiles
    add constraint profiles_home_country_code_format_check
    check (home_country_code is null or home_country_code ~ '^[A-Za-z]{2}$');
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.profiles
    add constraint profiles_home_latitude_range_check
    check (home_latitude is null or home_latitude between -90 and 90);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.profiles
    add constraint profiles_home_longitude_range_check
    check (home_longitude is null or home_longitude between -180 and 180);
exception when duplicate_object or invalid_table_definition then null;
end $$;

create table if not exists public.trending_global (
  id uuid not null default gen_random_uuid(),
  source text not null default 'global',
  region text not null default 'global',
  period_kind text not null default 'weekly',
  period_start date not null default current_date,
  artist_id uuid,
  artist_name text not null default '',
  rank integer not null,
  score numeric(12, 4) not null default 0,
  public_show_count integer not null default 0,
  public_listener_count integer not null default 0,
  public_avg_rating numeric(4, 2),
  fetched_at timestamptz not null default now(),
  calculated_at timestamptz not null default now()
);

alter table public.trending_global
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists source text not null default 'global',
  add column if not exists region text not null default 'global',
  add column if not exists period_kind text not null default 'weekly',
  add column if not exists period_start date not null default current_date,
  add column if not exists artist_id uuid,
  add column if not exists artist_name text not null default '',
  add column if not exists rank integer,
  add column if not exists score numeric(12, 4) not null default 0,
  add column if not exists public_show_count integer not null default 0,
  add column if not exists public_listener_count integer not null default 0,
  add column if not exists public_avg_rating numeric(4, 2),
  add column if not exists fetched_at timestamptz not null default now(),
  add column if not exists calculated_at timestamptz not null default now();

do $$ begin
  alter table public.trending_global
    add constraint trending_global_pkey primary key (id);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.trending_global
    add constraint trending_global_artist_id_fkey
    foreign key (artist_id) references public.artists (id) on delete cascade;
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.trending_global
    add constraint trending_global_period_kind_check
    check (period_kind in ('daily', 'weekly', 'monthly'));
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.trending_global
    add constraint trending_global_required_values_check
    check (
      source is not null and region is not null and artist_name is not null
      and period_kind is not null and period_start is not null
      and rank is not null and rank > 0
      and score >= 0 and public_show_count >= 0 and public_listener_count >= 0
    );
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.trending_global
    add constraint trending_global_rating_range_check
    check (public_avg_rating is null or public_avg_rating between 0.5 and 5);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.trending_global
    add constraint trending_global_period_artist_key
    unique (source, region, period_kind, period_start, artist_id);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.trending_global
    add constraint trending_global_snapshot_rank_key
    unique (source, region, fetched_at, rank);
exception when duplicate_object or invalid_table_definition then null;
end $$;

create table if not exists public.artist_tour_dates (
  id uuid not null default gen_random_uuid(),
  artist_id uuid not null,
  event_name text,
  venue_name text,
  city text,
  region text,
  country text,
  country_code text,
  event_date date not null,
  event_end_date date,
  ticket_url text,
  source text,
  status text not null default 'unknown',
  external_id text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.artist_tour_dates
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists artist_id uuid,
  add column if not exists event_name text,
  add column if not exists venue_name text,
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists country text,
  add column if not exists country_code text,
  add column if not exists event_date date,
  add column if not exists event_end_date date,
  add column if not exists ticket_url text,
  add column if not exists source text,
  add column if not exists status text not null default 'unknown',
  add column if not exists external_id text,
  add column if not exists latitude numeric(9, 6),
  add column if not exists longitude numeric(9, 6),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.artist_tour_dates
    add constraint artist_tour_dates_pkey primary key (id);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.artist_tour_dates
    add constraint artist_tour_dates_artist_id_fkey
    foreign key (artist_id) references public.artists (id) on delete cascade;
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.artist_tour_dates
    add constraint artist_tour_dates_required_values_check
    check (artist_id is not null and event_date is not null);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.artist_tour_dates
    add constraint artist_tour_dates_date_range_check
    check (event_end_date is null or event_end_date >= event_date);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.artist_tour_dates
    add constraint artist_tour_dates_status_check
    check (status in ('on_sale', 'off_sale', 'cancelled', 'postponed', 'rescheduled', 'unknown'));
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.artist_tour_dates
    add constraint artist_tour_dates_country_code_format_check
    check (country_code is null or country_code ~ '^[A-Za-z]{2}$');
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.artist_tour_dates
    add constraint artist_tour_dates_latitude_range_check
    check (latitude is null or latitude between -90 and 90);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.artist_tour_dates
    add constraint artist_tour_dates_longitude_range_check
    check (longitude is null or longitude between -180 and 180);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.artist_tour_dates
    add constraint artist_tour_dates_ticket_url_check
    check (ticket_url is null or ticket_url ~* '^https://');
exception when duplicate_object or invalid_table_definition then null;
end $$;

create unique index if not exists artist_tour_dates_source_external_key
  on public.artist_tour_dates (source, external_id)
  where source is not null and external_id is not null;
create index if not exists artist_tour_dates_artist_event_idx
  on public.artist_tour_dates (artist_id, event_date);
create index if not exists artist_tour_dates_event_city_idx
  on public.artist_tour_dates (event_date, country_code, city);
create index if not exists trending_global_period_rank_idx
  on public.trending_global (period_kind, period_start desc, rank);
create index if not exists trending_global_region_rank_idx
  on public.trending_global (region, rank);
create index if not exists artists_public_rating_rank_idx
  on public.artists (public_weighted_rating desc, public_rating_count desc)
  where public_rating_count > 0;
create index if not exists concert_logs_artist_rating_rater_idx
  on public.concert_logs (artist_id, user_id)
  where rating is not null;
create index if not exists concert_logs_user_rating_artist_idx
  on public.concert_logs (user_id, artist_id)
  where rating is not null;

alter table public.trending_global enable row level security;
drop policy if exists trending_global_public_read on public.trending_global;
create policy trending_global_public_read
  on public.trending_global for select to anon, authenticated using (true);

alter table public.artist_tour_dates enable row level security;
drop policy if exists artist_tour_dates_public_read on public.artist_tour_dates;
create policy artist_tour_dates_public_read
  on public.artist_tour_dates for select to anon, authenticated using (true);

revoke all on public.trending_global, public.artist_tour_dates from public, anon, authenticated;
grant select on public.trending_global, public.artist_tour_dates to anon, authenticated;
grant all on public.trending_global, public.artist_tour_dates to service_role;

create or replace function public.recompute_artist_rating_aggregates(p_artist_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_artist_id is not null and not exists (
    select 1 from public.artists where id = p_artist_id
  ) then
    return;
  end if;

  -- The global prior changes with any public rating, so refresh every weighted score.
  with per_rater as (
    select logs.user_id, avg(logs.rating)::numeric as rater_average
         , logs.artist_id
    from public.concert_logs logs
    join public.profiles profiles on profiles.id = logs.user_id
    where logs.rating is not null
      and not profiles.is_private
    group by logs.artist_id, logs.user_id
  ), artist_stats as (
    select artists.id as artist_id,
           count(per_rater.user_id)::integer as rater_count,
           avg(per_rater.rater_average) as artist_average
    from public.artists
    left join per_rater on per_rater.artist_id = artists.id
    group by artists.id
  ), global_average as (
    select avg(rater_average) as average from per_rater
  )
  update public.artists artists
  set public_rating_count = artist_stats.rater_count,
      public_avg_rating = round(artist_stats.artist_average, 2),
      public_weighted_rating = case
        when artist_stats.rater_count = 0 or artist_stats.artist_average is null
          then null
        else round(
          (artist_stats.rater_count::numeric / (artist_stats.rater_count + 3)) * artist_stats.artist_average
          + (3::numeric / (artist_stats.rater_count + 3)) * global_average.average,
          2
        )
      end
  from artist_stats
  cross join global_average
  where artists.id = artist_stats.artist_id;
end;
$$;

revoke all on function public.recompute_artist_rating_aggregates(uuid) from public, anon, authenticated;
grant execute on function public.recompute_artist_rating_aggregates(uuid) to service_role;

create or replace function public.recompute_artist_rating_aggregates_from_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_artist_rating_aggregates(old.artist_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.artist_id is distinct from new.artist_id then
    perform public.recompute_artist_rating_aggregates(old.artist_id);
  end if;
  perform public.recompute_artist_rating_aggregates(new.artist_id);
  return new;
end;
$$;

revoke all on function public.recompute_artist_rating_aggregates_from_log() from public, anon, authenticated;
drop trigger if exists concert_logs_recompute_artist_rating_aggregates on public.concert_logs;
create trigger concert_logs_recompute_artist_rating_aggregates
  after insert or update or delete on public.concert_logs
  for each row execute function public.recompute_artist_rating_aggregates_from_log();

create or replace function public.recompute_artist_rating_aggregates_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_artist_rating_aggregates(null);
    return old;
  end if;

  perform public.recompute_artist_rating_aggregates(null);
  return new;
end;
$$;

revoke all on function public.recompute_artist_rating_aggregates_from_profile() from public, anon, authenticated;
drop trigger if exists profiles_recompute_artist_rating_aggregates on public.profiles;
create trigger profiles_recompute_artist_rating_aggregates
  after update of is_private on public.profiles
  for each row
  when (old.is_private is distinct from new.is_private)
  execute function public.recompute_artist_rating_aggregates_from_profile();

drop trigger if exists profiles_delete_recompute_artist_rating_aggregates on public.profiles;
create trigger profiles_delete_recompute_artist_rating_aggregates
  after delete on public.profiles
  for each row execute function public.recompute_artist_rating_aggregates_from_profile();

do $$
begin
  perform public.recompute_artist_rating_aggregates(null);
end $$;

create or replace function public.refresh_artist_tour_status(p_artist_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.artists artists
  set is_on_tour = exists (
        select 1
        from public.artist_tour_dates tour_dates
        where tour_dates.artist_id = artists.id
          and coalesce(tour_dates.event_end_date, tour_dates.event_date) >= current_date
      ),
      tour_start_date = (
        select min(tour_dates.event_date)
        from public.artist_tour_dates tour_dates
        where tour_dates.artist_id = artists.id
          and coalesce(tour_dates.event_end_date, tour_dates.event_date) >= current_date
      ),
      tour_end_date = (
        select max(coalesce(tour_dates.event_end_date, tour_dates.event_date))
        from public.artist_tour_dates tour_dates
        where tour_dates.artist_id = artists.id
          and coalesce(tour_dates.event_end_date, tour_dates.event_date) >= current_date
      ),
      tour_last_checked_at = now()
  where artists.id = p_artist_id;
$$;

revoke all on function public.refresh_artist_tour_status(uuid) from public, anon, authenticated;
grant execute on function public.refresh_artist_tour_status(uuid) to service_role;

create or replace function public.refresh_artist_tour_status_from_date()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_artist_tour_status(old.artist_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.artist_id is distinct from new.artist_id then
    perform public.refresh_artist_tour_status(old.artist_id);
  end if;
  perform public.refresh_artist_tour_status(new.artist_id);
  return new;
end;
$$;

revoke all on function public.refresh_artist_tour_status_from_date() from public, anon, authenticated;
drop trigger if exists artist_tour_dates_refresh_artist_status on public.artist_tour_dates;
create trigger artist_tour_dates_refresh_artist_status
  after insert or update or delete on public.artist_tour_dates
  for each row execute function public.refresh_artist_tour_status_from_date();

drop trigger if exists artist_tour_dates_set_updated_at on public.artist_tour_dates;
create trigger artist_tour_dates_set_updated_at
  before update on public.artist_tour_dates
  for each row execute function public.set_updated_at();

create or replace function public.top_rated_artists(
  p_venue_type public.venue_type default null,
  p_macro text default null,
  p_year integer default null,
  p_min_raters integer default 3,
  p_limit integer default 20,
  p_query text default null
)
returns table (
  id uuid,
  name text,
  image_url_large text,
  image_url_thumb text,
  primary_macro text,
  macro_genres text[],
  show_count bigint,
  rating_count bigint,
  rater_count bigint,
  avg_show_rating numeric,
  weighted_rating numeric,
  last_logged_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with public_logs as (
    select logs.artist_id, logs.user_id, logs.rating, logs.venue_type, logs.event_date, logs.created_at
    from public.concert_logs logs
    join public.profiles profiles on profiles.id = logs.user_id
    where not profiles.is_private
      and (p_venue_type is null or logs.venue_type = p_venue_type)
      and (p_year is null or extract(year from logs.event_date)::integer = p_year)
  ), per_rater as (
    select artist_id, user_id, avg(rating)::numeric as rater_average
    from public_logs
    where rating is not null
    group by artist_id, user_id
  ), log_stats as (
    select public_logs.artist_id,
           count(*)::bigint as show_count,
           count(public_logs.rating)::bigint as rating_count,
           count(distinct public_logs.user_id) filter (where public_logs.rating is not null)::bigint as rater_count,
           round(avg(public_logs.rating), 2) as avg_show_rating,
           max(public_logs.created_at) as last_logged_at
    from public_logs
    group by public_logs.artist_id
  ), rater_stats as (
    select artist_id, count(*)::bigint as rater_count, avg(rater_average) as artist_average
    from per_rater
    group by artist_id
  ), artist_stats as (
    select log_stats.*, coalesce(rater_stats.rater_count, 0) as rated_rater_count,
           rater_stats.artist_average
    from log_stats
    left join rater_stats on rater_stats.artist_id = log_stats.artist_id
  ), global_prior as (
    select avg(rater_average) as average from per_rater
  )
  select artists.id,
         artists.name,
         artists.image_url_large,
         artists.image_url_thumb,
         artists.primary_macro,
         artists.macro_genres,
         artist_stats.show_count,
         artist_stats.rating_count,
         artist_stats.rated_rater_count,
         artist_stats.avg_show_rating,
         case when artist_stats.rated_rater_count = 0 then null
           else round(
             (artist_stats.rated_rater_count::numeric / (artist_stats.rated_rater_count + 3)) * artist_stats.artist_average
             + (3::numeric / (artist_stats.rated_rater_count + 3)) * global_prior.average,
             2
           )
         end,
         artist_stats.last_logged_at
  from artist_stats
  join public.artists artists on artists.id = artist_stats.artist_id
  cross join global_prior
  where artist_stats.rated_rater_count >= greatest(coalesce(p_min_raters, 3), 1)
    and (p_macro is null or lower(artists.primary_macro) = lower(p_macro)
      or exists (
        select 1 from unnest(artists.macro_genres) genre(value)
        where lower(genre.value) = lower(p_macro)
      ))
    and (p_query is null or artists.name ilike '%' || p_query || '%')
  order by 11 desc nulls last, artist_stats.rated_rater_count desc, artists.name, artists.id
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

revoke all on function public.top_rated_artists(public.venue_type, text, integer, integer, integer, text) from public;
grant execute on function public.top_rated_artists(public.venue_type, text, integer, integer, integer, text) to anon, authenticated, service_role;

create or replace function public.artist_rating_summary(p_artist uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with public_logs as (
    select logs.rating, logs.venue_type, logs.user_id
    from public.concert_logs logs
    join public.profiles profiles on profiles.id = logs.user_id
    where logs.artist_id = p_artist
      and logs.rating is not null
      and not profiles.is_private
  ), histogram as (
    select buckets.rating, count(public_logs.rating)::integer as count
    from generate_series(0.5, 5.0, 0.5) buckets(rating)
    left join public_logs on public_logs.rating = buckets.rating
    group by buckets.rating
    order by buckets.rating
  ), venue_averages as (
    select venue_type::text as venue_type,
           round(avg(rating), 2) as average,
           count(*)::integer as count
    from public_logs
    group by venue_type
  ), viewer_stats as (
    select count(*)::integer as viewer_count,
           round(avg(rating), 2) as viewer_average
    from public.concert_logs
    where artist_id = p_artist
      and user_id = auth.uid()
      and rating is not null
  ), public_stats as (
    select count(*)::integer as rating_count,
           count(distinct user_id)::integer as rater_count,
           round(avg(rating), 2) as avg_rating
    from public_logs
  )
  select case when exists (select 1 from public.artists where id = p_artist)
    then jsonb_build_object(
      'artist_id', p_artist,
      'rating_count', public_stats.rating_count,
      'rater_count', public_stats.rater_count,
      'avg_rating', public_stats.avg_rating,
      'weighted_rating', artists.public_weighted_rating,
      'histogram', coalesce((
        select jsonb_agg(jsonb_build_object('rating', histogram.rating, 'count', histogram.count)
                         order by histogram.rating)
        from histogram
      ), '[]'::jsonb),
      'venue_averages', coalesce((
        select jsonb_agg(jsonb_build_object(
          'venue_type', venue_averages.venue_type,
          'average', venue_averages.average,
          'count', venue_averages.count
        ) order by venue_averages.venue_type)
        from venue_averages
      ), '[]'::jsonb),
      'viewer_average', viewer_stats.viewer_average,
      'viewer_count', viewer_stats.viewer_count
    )
    else null
  end
  from public.artists artists
  cross join viewer_stats
  cross join public_stats
  where artists.id = p_artist;
$$;

revoke all on function public.artist_rating_summary(uuid) from public;
grant execute on function public.artist_rating_summary(uuid) to anon, authenticated, service_role;

create or replace function public.trending_in_app(
  p_days integer default 30,
  p_limit integer default 20
)
returns table (
  id uuid,
  name text,
  image_url_large text,
  image_url_thumb text,
  primary_macro text,
  macro_genres text[],
  show_count bigint,
  rating_count bigint,
  rater_count bigint,
  avg_show_rating numeric,
  weighted_rating numeric,
  last_logged_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select artists.id,
         artists.name,
         artists.image_url_large,
         artists.image_url_thumb,
         artists.primary_macro,
         artists.macro_genres,
         count(*)::bigint,
         count(logs.rating)::bigint,
         count(distinct logs.user_id) filter (where logs.rating is not null)::bigint,
         round(avg(logs.rating), 2),
         artists.public_weighted_rating,
         max(logs.created_at)
  from public.concert_logs logs
  join public.profiles profiles on profiles.id = logs.user_id
  join public.artists artists on artists.id = logs.artist_id
  where not profiles.is_private
    and logs.event_date >= current_date - greatest(1, least(coalesce(p_days, 30), 365))
    and logs.event_date <= current_date
  group by artists.id, artists.name, artists.image_url_thumb, artists.image_url_large,
           artists.primary_macro, artists.macro_genres, artists.public_weighted_rating
  order by count(*) desc,
           count(distinct logs.user_id) filter (where logs.rating is not null) desc,
           max(logs.event_date) desc, artists.name
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

revoke all on function public.trending_in_app(integer, integer) from public;
grant execute on function public.trending_in_app(integer, integer) to anon, authenticated, service_role;

create or replace function public.haversine_km(
  p_lat1 double precision,
  p_lng1 double precision,
  p_lat2 double precision,
  p_lng2 double precision
)
returns numeric
language sql
immutable
strict
parallel safe
set search_path = pg_catalog
as $$
  select round((
    6371 * acos(greatest(-1.0, least(1.0,
      cos(radians(p_lat1))
        * cos(radians(p_lat2))
        * cos(radians(p_lng2 - p_lng1))
        + sin(radians(p_lat1))
        * sin(radians(p_lat2))
    )))
  )::numeric, 1);
$$;

revoke all on function public.haversine_km(double precision, double precision, double precision, double precision) from public;
grant execute on function public.haversine_km(double precision, double precision, double precision, double precision) to anon, authenticated, service_role;

create or replace function public.artists_on_tour(
  p_scope text default 'all',
  p_country text default null,
  p_lat numeric default null,
  p_lng numeric default null,
  p_radius_km numeric default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  name text,
  image_url_large text,
  image_url_thumb text,
  primary_macro text,
  macro_genres text[],
  next_date date,
  dates_count bigint,
  nearest_venue text,
  nearest_city text,
  nearest_country text,
  ticket_url text,
  distance_km numeric
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with candidates as (
    select tour_dates.*,
           tour_dates.event_date as next_date,
           artists.name as artist_name,
           artists.image_url_large,
           artists.image_url_thumb,
           artists.primary_macro,
           artists.macro_genres,
           case
             when p_lat is null or p_lng is null
               or tour_dates.latitude is null or tour_dates.longitude is null
               then null
             else public.haversine_km(
               p_lat::double precision,
               p_lng::double precision,
               tour_dates.latitude::double precision,
               tour_dates.longitude::double precision
             )
           end as distance_km
    from public.artist_tour_dates tour_dates
    join public.artists artists on artists.id = tour_dates.artist_id
    where coalesce(tour_dates.event_end_date, tour_dates.event_date) >= current_date
        and tour_dates.status <> 'cancelled'
      and (
        p_country is null
        or upper(tour_dates.country_code) = upper(p_country)
        or lower(tour_dates.country) = lower(p_country)
      )
      and (
        p_scope is null or p_scope = 'all'
        or (p_scope = 'top_rated' and artists.public_rating_count >= 3)
        or (p_scope = 'popular' and exists (
          select 1
          from public.concert_logs logs
          join public.profiles profiles on profiles.id = logs.user_id
          where logs.artist_id = artists.id
            and not profiles.is_private
            and logs.event_date >= current_date - 90
        ))
        or (p_scope = 'mine' and auth.uid() is not null and (
          exists (
            select 1 from public.concert_logs logs
            where logs.artist_id = artists.id and logs.user_id = auth.uid()
          )
          or exists (
            select 1 from public.wishlist_items wishlist
            where wishlist.artist_id = artists.id
              and wishlist.user_id = auth.uid()
              and wishlist.status in ('wanted', 'going')
          )
        ))
      )
  ), scoped_dates as (
    select candidates.*,
           count(*) over (partition by candidates.artist_id)::bigint as dates_count,
           row_number() over (
             partition by candidates.artist_id
             order by candidates.distance_km nulls last, candidates.next_date, candidates.id
           ) as event_rank
    from candidates
    where p_radius_km is null
       or (
         candidates.distance_km is not null
         and candidates.distance_km <= greatest(p_radius_km, 0)
       )
  )
  select scoped_dates.artist_id,
         scoped_dates.artist_name,
         scoped_dates.image_url_large,
         scoped_dates.image_url_thumb,
         scoped_dates.primary_macro,
         scoped_dates.macro_genres,
         scoped_dates.next_date,
         scoped_dates.dates_count,
         scoped_dates.venue_name,
         scoped_dates.city,
         scoped_dates.country,
         scoped_dates.ticket_url,
         scoped_dates.distance_km
  from scoped_dates
  where scoped_dates.event_rank = 1
  order by scoped_dates.distance_km nulls last, scoped_dates.next_date, scoped_dates.artist_name
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.artists_on_tour(text, text, numeric, numeric, numeric, integer) from public;
grant execute on function public.artists_on_tour(text, text, numeric, numeric, numeric, integer) to anon, authenticated, service_role;

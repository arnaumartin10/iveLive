create table if not exists public.user_artist_overrides (
  user_id uuid not null,
  artist_id uuid not null,
  macro_genres text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_artist_overrides add column if not exists user_id uuid not null;
alter table public.user_artist_overrides add column if not exists artist_id uuid not null;
alter table public.user_artist_overrides add column if not exists macro_genres text[] not null;
alter table public.user_artist_overrides add column if not exists created_at timestamptz not null default now();
alter table public.user_artist_overrides add column if not exists updated_at timestamptz not null default now();

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_artist_overrides'::regclass
      and contype = 'p'
  ) then
    alter table public.user_artist_overrides
      add constraint user_artist_overrides_pkey primary key (user_id, artist_id);
  end if;
end $$;

do $$ begin
  alter table public.user_artist_overrides
    add constraint user_artist_overrides_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade;
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.user_artist_overrides
    add constraint user_artist_overrides_artist_id_fkey
    foreign key (artist_id) references public.artists (id) on delete cascade;
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.user_artist_overrides
    add constraint user_artist_overrides_genre_count_check
    check (cardinality(macro_genres) between 1 and 3);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.user_artist_overrides
    add constraint user_artist_overrides_genres_check
    check (macro_genres <@ array[
      'rock', 'indie', 'pop', 'electronic', 'hip_hop', 'rnb_soul', 'metal',
      'punk', 'folk_acoustic', 'jazz_blues', 'latin', 'classical', 'world', 'other'
    ]::text[]);
exception when duplicate_object or invalid_table_definition then null;
end $$;

drop trigger if exists user_artist_overrides_set_updated_at on public.user_artist_overrides;
create trigger user_artist_overrides_set_updated_at
before update on public.user_artist_overrides
for each row execute function public.set_updated_at();

create table if not exists public.artist_reports (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  artist_id uuid not null,
  details text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.artist_reports add column if not exists id uuid not null default gen_random_uuid();
alter table public.artist_reports add column if not exists user_id uuid not null;
alter table public.artist_reports add column if not exists artist_id uuid not null;
alter table public.artist_reports add column if not exists details text not null;
alter table public.artist_reports add column if not exists status text not null default 'open';
alter table public.artist_reports add column if not exists created_at timestamptz not null default now();

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.artist_reports'::regclass
      and contype = 'p'
  ) then
    alter table public.artist_reports
      add constraint artist_reports_pkey primary key (id);
  end if;
end $$;

do $$ begin
  alter table public.artist_reports
    add constraint artist_reports_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade;
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.artist_reports
    add constraint artist_reports_artist_id_fkey
    foreign key (artist_id) references public.artists (id) on delete cascade;
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.artist_reports
    add constraint artist_reports_status_check
    check (status in ('open', 'reviewing', 'resolved'));
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.artist_reports
    add constraint artist_reports_details_length_check
    check (char_length(details) between 3 and 1000);
exception when duplicate_object or invalid_table_definition then null;
end $$;

create index if not exists artist_reports_artist_created_idx
  on public.artist_reports (artist_id, created_at desc);

alter table public.user_artist_overrides enable row level security;
drop policy if exists "user_artist_overrides_owner_access" on public.user_artist_overrides;
create policy "user_artist_overrides_owner_access"
  on public.user_artist_overrides for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
grant select, insert, update, delete on public.user_artist_overrides to authenticated;
grant all on public.user_artist_overrides to service_role;

alter table public.artist_reports enable row level security;
drop policy if exists "artist_reports_insert_own" on public.artist_reports;
create policy "artist_reports_insert_own"
  on public.artist_reports for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "artist_reports_select_own" on public.artist_reports;
create policy "artist_reports_select_own"
  on public.artist_reports for select to authenticated
  using (user_id = auth.uid());
grant select, insert on public.artist_reports to authenticated;
grant all on public.artist_reports to service_role;

create or replace function public.user_artist_summary(p_user uuid)
returns table (
  id uuid,
  spotify_id text,
  name text,
  name_normalized text,
  image_url_large text,
  image_url_thumb text,
  genres text[],
  macro_genres text[],
  primary_macro text,
  popularity integer,
  source public.artist_source,
  created_by uuid,
  last_synced_at timestamptz,
  created_at timestamptz,
  log_count bigint,
  avg_rating numeric,
  max_rating numeric,
  first_seen date,
  last_seen date
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.can_view_profile(p_user) then
    raise exception 'Not allowed to view this profile' using errcode = '42501';
  end if;

  return query
  select
    artists.id,
    artists.spotify_id,
    artists.name,
    artists.name_normalized,
    artists.image_url_large,
    artists.image_url_thumb,
    artists.genres,
    coalesce(overrides.macro_genres, artists.macro_genres),
    coalesce(overrides.macro_genres[1], artists.primary_macro),
    artists.popularity,
    artists.source,
    artists.created_by,
    artists.last_synced_at,
    artists.created_at,
    count(logs.id)::bigint,
    avg(logs.rating),
    max(logs.rating),
    min(logs.event_date),
    max(logs.event_date)
  from public.concert_logs logs
  join public.artists artists on artists.id = logs.artist_id
  left join public.user_artist_overrides overrides
    on overrides.artist_id = artists.id and overrides.user_id = p_user
  where logs.user_id = p_user
  group by artists.id, overrides.macro_genres;
end;
$$;

create or replace function public.user_genre_stats(p_user uuid, p_year integer default null)
returns table (
  macro_genre text,
  log_count bigint,
  artist_count bigint,
  avg_rating numeric,
  top_artist jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with per_log as (
    select distinct l.id, l.artist_id, l.rating,
      unnest(coalesce(overrides.macro_genres,
        case when cardinality(a.macro_genres) = 0 then array['unclassified']::text[] else a.macro_genres end
      )) as macro_genre
    from public.concert_logs l
    join public.artists a on a.id = l.artist_id
    left join public.user_artist_overrides overrides
      on overrides.artist_id = a.id and overrides.user_id = l.user_id
    where l.user_id = p_user
      and (p_year is null or extract(year from l.event_date)::integer = p_year)
  ), totals as (
    select macro_genre, count(*)::bigint as log_count,
      count(distinct artist_id)::bigint as artist_count, avg(rating) as avg_rating
    from per_log group by macro_genre
  ), artist_totals as (
    select per_log.macro_genre, per_log.artist_id, a.name, a.image_url_thumb,
      count(*)::integer as seen_count
    from per_log join public.artists a on a.id = per_log.artist_id
    group by per_log.macro_genre, per_log.artist_id, a.name, a.image_url_thumb
  )
  select totals.macro_genre, totals.log_count, totals.artist_count,
    round(totals.avg_rating, 2),
    (select jsonb_build_object('id', artist_id, 'name', name, 'image_url', image_url_thumb, 'count', seen_count)
     from artist_totals where macro_genre = totals.macro_genre order by seen_count desc, name limit 1)
  from totals order by totals.log_count desc, totals.macro_genre;
$$;

create or replace function public.user_artists_by_genre(
  p_user uuid, p_genre text, p_year integer default null
)
returns table (artist_id uuid, name text, image_url text, times_seen bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select a.id, a.name, a.image_url_thumb, count(*)::bigint
  from public.concert_logs l
  join public.artists a on a.id = l.artist_id
  left join public.user_artist_overrides overrides
    on overrides.artist_id = a.id and overrides.user_id = l.user_id
  where l.user_id = p_user
    and (p_year is null or extract(year from l.event_date)::integer = p_year)
    and p_genre = any(coalesce(overrides.macro_genres,
      case when cardinality(a.macro_genres) = 0 then array['unclassified']::text[] else a.macro_genres end
    ))
  group by a.id, a.name, a.image_url_thumb
  order by count(*) desc, a.name;
$$;

create or replace function public.user_taste_diversity(p_user uuid, p_year integer default null)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with distribution as (
    select genre, count(*)::numeric as genre_count
    from (
      select distinct l.id,
        unnest(coalesce(overrides.macro_genres,
          case when cardinality(a.macro_genres) = 0 then array['unclassified']::text[] else a.macro_genres end
        )) as genre
      from public.concert_logs l
      join public.artists a on a.id = l.artist_id
      left join public.user_artist_overrides overrides
        on overrides.artist_id = a.id and overrides.user_id = l.user_id
      where l.user_id = p_user
        and (p_year is null or extract(year from l.event_date)::integer = p_year)
    ) expanded
    where genre <> 'unclassified'
    group by genre
  ), proportions as (
    select genre, genre_count,
      genre_count / nullif(sum(genre_count) over (), 0) as share
    from distribution
  ), stats as (
    select sum(genre_count) as total,
      count(*)::integer as genre_count,
      max(genre_count) as dominant_count,
      -sum(share * ln(share)) as entropy
    from proportions
  )
  select jsonb_build_object(
    'score', coalesce(round(100 * entropy / nullif(ln(genre_count), 0))::integer, 0),
    'dominant_genre_share', coalesce(round(100 * dominant_count / nullif(total, 0), 1), 0),
    'dominant_genre', (select genre from proportions order by genre_count desc, genre limit 1)
  ) from stats;
$$;
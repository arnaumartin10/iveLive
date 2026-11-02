create table if not exists public.cloud_layouts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null,
  layout_version integer not null default 1,
  positions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, mode),
  constraint cloud_layouts_mode_check check (mode in ('genre', 'venue', 'era', 'year')),
  constraint cloud_layouts_version_positive check (layout_version > 0),
  constraint cloud_layouts_positions_object check (jsonb_typeof(positions) = 'object')
);

alter table public.cloud_layouts enable row level security;

drop policy if exists "cloud_layouts_select_own" on public.cloud_layouts;
create policy "cloud_layouts_select_own"
  on public.cloud_layouts for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "cloud_layouts_insert_own" on public.cloud_layouts;
create policy "cloud_layouts_insert_own"
  on public.cloud_layouts for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "cloud_layouts_update_own" on public.cloud_layouts;
create policy "cloud_layouts_update_own"
  on public.cloud_layouts for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.cloud_layouts from public, anon;
grant select, insert, update on public.cloud_layouts to authenticated;

create or replace function public.user_territory_stats(p_user uuid)
returns table (
  macro_slug text,
  artist_count integer,
  concert_count integer,
  average_rating numeric,
  first_seen date,
  last_seen date
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    genres.macro_slug,
    count(distinct logs.artist_id)::integer as artist_count,
    count(logs.id)::integer as concert_count,
    avg(logs.rating)::numeric as average_rating,
    min(logs.event_date) as first_seen,
    max(logs.event_date) as last_seen
  from public.concert_logs logs
  join public.artists artists on artists.id = logs.artist_id
  cross join lateral (
    select distinct unnest(
      case
        when cardinality(artists.macro_genres) > 0 then artists.macro_genres
        when artists.primary_macro is not null then array[artists.primary_macro]
        else array['other']::text[]
      end
    ) as macro_slug
  ) genres
  where logs.user_id = p_user
    and (p_user = auth.uid() or public.can_view_profile_content(p_user))
  group by genres.macro_slug
  order by concert_count desc, genres.macro_slug;
$$;

revoke all on function public.user_territory_stats(uuid) from public, anon;
grant execute on function public.user_territory_stats(uuid) to authenticated, service_role;

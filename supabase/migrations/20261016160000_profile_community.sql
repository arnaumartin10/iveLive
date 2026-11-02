create table if not exists public.profile_picks (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  artist_id uuid not null,
  list_type text not null,
  position smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_picks add column if not exists id uuid default gen_random_uuid();
alter table public.profile_picks add column if not exists user_id uuid;
alter table public.profile_picks add column if not exists artist_id uuid;
alter table public.profile_picks add column if not exists list_type text;
alter table public.profile_picks add column if not exists position smallint;
alter table public.profile_picks add column if not exists created_at timestamptz not null default now();
alter table public.profile_picks add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.profile_picks add constraint profile_picks_pkey primary key (id);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.profile_picks add constraint profile_picks_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade;
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.profile_picks add constraint profile_picks_required_columns_check
    check (user_id is not null and artist_id is not null and list_type is not null and position is not null);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.profile_picks add constraint profile_picks_artist_id_fkey
    foreign key (artist_id) references public.artists (id) on delete cascade;
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.profile_picks add constraint profile_picks_list_type_check
    check (list_type in ('recent', 'favourite'));
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.profile_picks add constraint profile_picks_position_check
    check (position between 1 and 5);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.profile_picks add constraint profile_picks_user_list_position_key
    unique (user_id, list_type, position);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.profile_picks add constraint profile_picks_user_list_artist_key
    unique (user_id, list_type, artist_id);
exception when duplicate_object or invalid_table_definition then null;
end $$;

create table if not exists public.wishlist_items (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  artist_id uuid not null,
  event_name text,
  venue_name text,
  city text,
  target_date date,
  date_flexible boolean not null default true,
  venue_type public.venue_type,
  priority smallint not null default 2,
  note text,
  status text not null default 'wanted',
  ticket_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wishlist_items add column if not exists id uuid default gen_random_uuid();
alter table public.wishlist_items add column if not exists user_id uuid;
alter table public.wishlist_items add column if not exists artist_id uuid;
alter table public.wishlist_items add column if not exists event_name text;
alter table public.wishlist_items add column if not exists venue_name text;
alter table public.wishlist_items add column if not exists city text;
alter table public.wishlist_items add column if not exists target_date date;
alter table public.wishlist_items add column if not exists date_flexible boolean not null default true;
alter table public.wishlist_items add column if not exists venue_type public.venue_type;
alter table public.wishlist_items add column if not exists priority smallint not null default 2;
alter table public.wishlist_items add column if not exists note text;
alter table public.wishlist_items add column if not exists status text not null default 'wanted';
alter table public.wishlist_items add column if not exists ticket_url text;
alter table public.wishlist_items add column if not exists created_at timestamptz not null default now();
alter table public.wishlist_items add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.wishlist_items add constraint wishlist_items_pkey primary key (id);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.wishlist_items add constraint wishlist_items_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade;
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.wishlist_items add constraint wishlist_items_artist_id_fkey
    foreign key (artist_id) references public.artists (id) on delete cascade;
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.wishlist_items add constraint wishlist_items_required_columns_check
    check (user_id is not null and artist_id is not null);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.wishlist_items add constraint wishlist_items_priority_check
    check (priority between 1 and 3);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.wishlist_items add constraint wishlist_items_note_length_check
    check (note is null or char_length(note) <= 300);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.wishlist_items add constraint wishlist_items_status_check
    check (status in ('wanted', 'going', 'seen'));
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.wishlist_items add constraint wishlist_items_ticket_url_check
    check (ticket_url is null or ticket_url ~* '^https://');
exception when duplicate_object or invalid_table_definition then null;
end $$;

create index if not exists wishlist_items_user_status_date_idx
  on public.wishlist_items (user_id, status, target_date);

create or replace function public.can_view_profile_content(p_owner uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  blocked boolean := false;
begin
  if auth.uid() is null then return false; end if;
  if p_owner = auth.uid() then return true; end if;

  if to_regclass('public.blocks') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'blocks'
        and column_name in ('blocker_id', 'blocked_id')
      group by table_name having count(*) = 2
    ) then
      execute 'select exists (
        select 1 from public.blocks
        where (blocker_id = $1 and blocked_id = $2)
           or (blocker_id = $2 and blocked_id = $1)
      )' into blocked using auth.uid(), p_owner;
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'blocks'
        and column_name in ('user_id', 'blocked_user_id')
      group by table_name having count(*) = 2
    ) then
      execute 'select exists (
        select 1 from public.blocks
        where (user_id = $1 and blocked_user_id = $2)
           or (user_id = $2 and blocked_user_id = $1)
      )' into blocked using auth.uid(), p_owner;
    end if;
  end if;
  if blocked then return false; end if;

  return exists (
      select 1 from public.profiles p
      where p.id = p_owner and not p.is_private
    )
    or exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.followee_id = p_owner
    );
end;
$$;

create or replace view public.profile_overview_basics
with (security_barrier = true)
as
select p.id, p.username, p.display_name, p.avatar_url, p.bio, p.is_private
from public.profiles p
where auth.uid() is not null;

alter table public.profile_picks enable row level security;
drop policy if exists profile_picks_owner_all on public.profile_picks;
create policy profile_picks_owner_all
  on public.profile_picks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists profile_picks_select_visible on public.profile_picks;
create policy profile_picks_select_visible
  on public.profile_picks for select to authenticated
  using (public.can_view_profile_content(user_id));

alter table public.wishlist_items enable row level security;
drop policy if exists wishlist_items_owner_all on public.wishlist_items;
create policy wishlist_items_owner_all
  on public.wishlist_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists wishlist_items_select_visible on public.wishlist_items;
create policy wishlist_items_select_visible
  on public.wishlist_items for select to authenticated
  using (public.can_view_profile_content(user_id));

drop trigger if exists profile_picks_set_updated_at on public.profile_picks;
create trigger profile_picks_set_updated_at
before update on public.profile_picks
for each row execute function public.set_updated_at();

drop trigger if exists wishlist_items_set_updated_at on public.wishlist_items;
create trigger wishlist_items_set_updated_at
before update on public.wishlist_items
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.profile_picks to authenticated;
grant select, insert, update, delete on public.wishlist_items to authenticated;
grant all on public.profile_picks, public.wishlist_items to service_role;
grant select on public.profile_overview_basics to authenticated, service_role;
revoke all on function public.can_view_profile_content(uuid) from public, anon;
grant execute on function public.can_view_profile_content(uuid) to authenticated, service_role;

create or replace function public.get_profile_overview(p_user uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with basics as (
    select * from public.profile_overview_basics where id = p_user
  ), visibility as (
    select public.can_view_profile_content(p_user) as can_view
  ), genre_counts as (
    select genres.macro_genre, count(distinct logs.id)::integer as show_count
    from public.concert_logs logs
    join public.artists artists on artists.id = logs.artist_id
    cross join lateral unnest(artists.macro_genres) as genres(macro_genre)
    where logs.user_id = p_user
    group by genres.macro_genre
  ), genre_total as (
    select coalesce(sum(show_count), 0) as total from genre_counts
  ), wishlist_total as (
    select count(*)::integer as total
    from public.wishlist_items
    where user_id = p_user and status in ('wanted', 'going')
  )
  select case
    when not visibility.can_view then
      jsonb_build_object(
        'restricted', true,
        'profile', to_jsonb(basics)
      )
    else jsonb_build_object(
      'restricted', false,
      'profile', to_jsonb(basics),
      'counts', jsonb_build_object(
        'shows', (select count(*)::integer from public.concert_logs where user_id = p_user),
        'artists', (select count(distinct artist_id)::integer from public.concert_logs where user_id = p_user),
        'followers', (select count(*)::integer from public.follows where followee_id = p_user),
        'following', (select count(*)::integer from public.follows where follower_id = p_user)
      ),
      'top_genres', coalesce((
        select jsonb_agg(jsonb_build_object(
          'macro_genre', genre_counts.macro_genre,
          'show_count', genre_counts.show_count,
          'percentage', round(100.0 * genre_counts.show_count / nullif(genre_total.total, 0), 1)
        ) order by genre_counts.show_count desc, genre_counts.macro_genre)
        from genre_counts cross join genre_total
      ), '[]'::jsonb),
      'last_logs', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', logs.id,
          'artist_id', artists.id,
          'artist_name', artists.name,
          'image_url', coalesce(artists.image_url_thumb, artists.image_url_large),
          'event_date', logs.event_date,
          'venue_name', logs.venue_name,
          'rating', logs.rating
        ) order by logs.event_date desc, logs.created_at desc)
        from (
          select * from public.concert_logs
          where user_id = p_user
          order by event_date desc, created_at desc
          limit 4
        ) logs
        join public.artists artists on artists.id = logs.artist_id
      ), '[]'::jsonb),
      'five_star_count', (select count(*)::integer from public.concert_logs where user_id = p_user and rating = 5),
      'recent_picks', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', artists.id, 'name', artists.name,
          'image_url', coalesce(artists.image_url_large, artists.image_url_thumb),
          'macro_genres', artists.macro_genres,
          'primary_macro', artists.primary_macro,
          'position', picks.position,
          'updated_at', picks.updated_at
        ) order by picks.position)
        from public.profile_picks picks
        join public.artists artists on artists.id = picks.artist_id
        where picks.user_id = p_user and picks.list_type = 'recent'
      ), '[]'::jsonb),
      'favourite_picks', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', artists.id, 'name', artists.name,
          'image_url', coalesce(artists.image_url_large, artists.image_url_thumb),
          'macro_genres', artists.macro_genres,
          'primary_macro', artists.primary_macro,
          'position', picks.position,
          'updated_at', picks.updated_at
        ) order by picks.position)
        from public.profile_picks picks
        join public.artists artists on artists.id = picks.artist_id
        where picks.user_id = p_user and picks.list_type = 'favourite'
      ), '[]'::jsonb),
      'wishlist', jsonb_build_object(
        'total', wishlist_total.total,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', items.id,
            'artist_id', artists.id,
            'artist_name', artists.name,
            'image_url', coalesce(artists.image_url_thumb, artists.image_url_large),
            'primary_macro', artists.primary_macro,
            'event_name', items.event_name,
            'venue_name', items.venue_name,
            'city', items.city,
            'target_date', items.target_date,
            'date_flexible', items.date_flexible,
            'venue_type', items.venue_type,
            'priority', items.priority,
            'note', items.note,
            'status', items.status,
            'ticket_url', items.ticket_url,
            'created_at', items.created_at,
            'updated_at', items.updated_at
          ) order by items.priority, items.target_date nulls last, items.created_at desc)
          from (
            select * from public.wishlist_items
            where user_id = p_user and status in ('wanted', 'going')
            order by priority, target_date nulls last, created_at desc
            limit 10
          ) items
          join public.artists artists on artists.id = items.artist_id
        ), '[]'::jsonb)
      ),
      'wall_of_fame', coalesce((
        select jsonb_agg(jsonb_build_object(
          'artist_id', artists.id, 'name', artists.name,
          'image_url', coalesce(artists.image_url_thumb, artists.image_url_large),
          'event_date', logs.event_date
        ) order by logs.event_date desc)
        from (
          select * from public.concert_logs
          where user_id = p_user and rating = 5
          order by event_date desc, created_at desc
          limit 6
        ) logs
        join public.artists artists on artists.id = logs.artist_id
      ), '[]'::jsonb),
      'friends', jsonb_build_object(
        'followers', (select count(*)::integer from public.follows where followee_id = p_user),
        'following', (select count(*)::integer from public.follows where follower_id = p_user),
        'preview', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', friends.id,
            'username', friends.username,
            'display_name', friends.display_name,
            'avatar_url', friends.avatar_url
          ) order by friends.username)
          from (
            select basics.id, basics.username, basics.display_name, basics.avatar_url
            from public.follows follows
            join public.profile_overview_basics basics on basics.id = follows.followee_id
            where follows.follower_id = p_user
              and public.can_view_profile_content(follows.followee_id)
            order by basics.username
            limit 8
          ) friends
        ), '[]'::jsonb)
      )
    )
  end
  from basics cross join visibility cross join wishlist_total;
$$;

create or replace function public.set_profile_picks(
  p_list text,
  p_artist_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  picks uuid[] := coalesce(p_artist_ids, '{}'::uuid[]);
  found_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_list not in ('recent', 'favourite') then
    raise exception 'Invalid picks list' using errcode = '22023';
  end if;
  if cardinality(picks) > 5 then
    raise exception 'A picks list can contain at most five artists' using errcode = '22023';
  end if;
  if array_position(picks, null) is not null then
    raise exception 'Artist ids cannot be null' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(picks) as input(artist_id)
    group by input.artist_id having count(*) > 1
  ) then
    raise exception 'Artist ids must be distinct' using errcode = '22023';
  end if;

  select count(*)::integer into found_count
  from public.artists where id = any(picks);
  if found_count <> cardinality(picks) then
    raise exception 'One or more artists do not exist' using errcode = '22023';
  end if;

  delete from public.profile_picks
  where user_id = auth.uid() and list_type = p_list;

  insert into public.profile_picks (user_id, artist_id, list_type, position)
  select auth.uid(), input.artist_id, p_list, input.ordinality::smallint
  from unnest(picks) with ordinality as input(artist_id, ordinality);
end;
$$;

create or replace function public.get_profile_overview_by_username(p_username text)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select public.get_profile_overview(basics.id)
  from public.profile_overview_basics basics
  where basics.username = p_username::extensions.citext
  limit 1;
$$;

revoke all on function public.get_profile_overview(uuid) from public, anon;
revoke all on function public.set_profile_picks(text, uuid[]) from public, anon;
revoke all on function public.get_profile_overview_by_username(text) from public, anon;
grant execute on function public.get_profile_overview(uuid) to authenticated, service_role;
grant execute on function public.set_profile_picks(text, uuid[]) to authenticated, service_role;
grant execute on function public.get_profile_overview_by_username(text) to authenticated, service_role;
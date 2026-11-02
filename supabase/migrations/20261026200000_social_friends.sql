-- ============================================================
-- Social / Friends – 20261026200000
-- ============================================================
-- 1. Add status column to follows (accepted | pending)
-- 2. Add blocks table
-- 3. Add notifications table + triggers
-- 4. Add reports table
-- 5. Trigram index for profile search
-- 6. Adapt can_view_profile / get_feed / get_profile_overview
--    so only *accepted* follows grant visibility
-- ============================================================

-- 1. follows.status ─────────────────────────────────────────
alter table public.follows add column if not exists status text not null default 'accepted';

do $$ begin
  alter table public.follows
    add constraint follows_status_check check (status in ('accepted', 'pending'));
exception when duplicate_object then null;
end $$;

create index if not exists follows_followee_pending_idx
  on public.follows (followee_id) where status = 'pending';

-- 2. blocks ─────────────────────────────────────────────────
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self_check check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocked_idx on public.blocks (blocked_id, blocker_id);

alter table public.blocks enable row level security;

drop policy if exists blocks_owner_all on public.blocks;
create policy blocks_owner_all
  on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

drop policy if exists blocks_select_self on public.blocks;
create policy blocks_select_self
  on public.blocks for select to authenticated
  using (blocker_id = auth.uid() or blocked_id = auth.uid());

grant select, insert, delete on public.blocks to authenticated;
grant all on public.blocks to service_role;

-- 3. notifications ──────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,           -- 'new_follower' | 'like' | 'comment' | 'follow_request' | 'follow_accepted'
  log_id uuid references public.concert_logs (id) on delete cascade,
  comment_id uuid references public.log_comments (id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (
    type in ('new_follower', 'like', 'comment', 'follow_request', 'follow_accepted')
  )
);

create index if not exists notifications_user_read_idx
  on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_owner_select on public.notifications;
create policy notifications_owner_select
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update
  on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_owner_delete on public.notifications;
create policy notifications_owner_delete
  on public.notifications for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_system_insert on public.notifications;
create policy notifications_system_insert
  on public.notifications for insert to authenticated, service_role
  with check (true);

grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;

-- 4. reports ────────────────────────────────────────────────
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  reported_log_id uuid references public.concert_logs (id) on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz not null default now(),
  constraint reports_target_check check (
    reported_user_id is not null or reported_log_id is not null
  ),
  constraint reports_reason_check check (
    reason in ('spam', 'harassment', 'inappropriate', 'fake', 'other')
  )
);

alter table public.reports enable row level security;

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own
  on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists reports_select_own on public.reports;
create policy reports_select_own
  on public.reports for select to authenticated
  using (reporter_id = auth.uid());

grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;

-- 5. profile search trigram index ───────────────────────────
create index if not exists profiles_username_trgm_idx
  on public.profiles using gin ((username::text) extensions.gin_trgm_ops);

create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin (display_name extensions.gin_trgm_ops);

-- 6. Profile search RPC ─────────────────────────────────────
create or replace function public.search_profiles(
  p_query text,
  p_limit integer default 20
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  follower_count bigint,
  is_following boolean,
  follow_status text
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with blocked as (
    select blocked_id as other_id from public.blocks where blocker_id = auth.uid()
    union
    select blocker_id as other_id from public.blocks where blocked_id = auth.uid()
  )
  select
    p.id,
    p.username::text,
    p.display_name,
    p.avatar_url,
    (select count(*) from public.follows f2 where f2.followee_id = p.id and f2.status = 'accepted')::bigint,
    exists(select 1 from public.follows f3 where f3.follower_id = auth.uid() and f3.followee_id = p.id),
    (select f4.status from public.follows f4 where f4.follower_id = auth.uid() and f4.followee_id = p.id limit 1)
  from public.profiles p
  where p.id <> auth.uid()
    and p.id not in (select other_id from blocked)
    and (
      p.username::text ilike p_query || '%'
      or p.display_name ilike '%' || p_query || '%'
      or p.username::text % p_query
    )
  order by
    case when p.username::text ilike p_query || '%' then 0 else 1 end,
    (select count(*) from public.follows f2 where f2.followee_id = p.id and f2.status = 'accepted') desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

revoke all on function public.search_profiles(text, integer) from public, anon;
grant execute on function public.search_profiles(text, integer) to authenticated, service_role;

-- 7. Follow request management RPCs ─────────────────────────
create or replace function public.send_follow_request(p_followee uuid)
returns text  -- returns 'accepted' or 'pending'
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  target_is_private boolean;
  result_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_followee = auth.uid() then raise exception 'Cannot follow yourself' using errcode = '22023'; end if;

  -- Check if blocked
  if exists (
    select 1 from public.blocks
    where (blocker_id = p_followee and blocked_id = auth.uid())
       or (blocker_id = auth.uid() and blocked_id = p_followee)
  ) then
    raise exception 'Cannot follow this user' using errcode = '42501';
  end if;

  select is_private into target_is_private from public.profiles where id = p_followee;
  if not found then raise exception 'User not found' using errcode = 'P0002'; end if;

  result_status := case when target_is_private then 'pending' else 'accepted' end;

  insert into public.follows (follower_id, followee_id, status)
  values (auth.uid(), p_followee, result_status)
  on conflict (follower_id, followee_id) do update set status = result_status;

  -- Insert notification
  if result_status = 'pending' then
    insert into public.notifications (user_id, actor_id, type)
    values (p_followee, auth.uid(), 'follow_request')
    on conflict do nothing;
  else
    insert into public.notifications (user_id, actor_id, type)
    values (p_followee, auth.uid(), 'new_follower')
    on conflict do nothing;
  end if;

  return result_status;
end;
$$;

create or replace function public.unfollow_user(p_followee uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  delete from public.follows
  where follower_id = auth.uid() and followee_id = p_followee;
end;
$$;

create or replace function public.accept_follow_request(p_follower uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update public.follows
  set status = 'accepted'
  where follower_id = p_follower and followee_id = auth.uid() and status = 'pending';

  -- Notify the follower that their request was accepted
  insert into public.notifications (user_id, actor_id, type)
  values (p_follower, auth.uid(), 'follow_accepted')
  on conflict do nothing;
end;
$$;

create or replace function public.decline_follow_request(p_follower uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  delete from public.follows
  where follower_id = p_follower and followee_id = auth.uid() and status = 'pending';
end;
$$;

create or replace function public.get_follow_requests()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  requested_at timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select p.id, p.username::text, p.display_name, p.avatar_url, f.created_at
  from public.follows f
  join public.profiles p on p.id = f.follower_id
  where f.followee_id = auth.uid() and f.status = 'pending'
  order by f.created_at desc;
$$;

revoke all on function public.send_follow_request(uuid) from public, anon;
revoke all on function public.unfollow_user(uuid) from public, anon;
revoke all on function public.accept_follow_request(uuid) from public, anon;
revoke all on function public.decline_follow_request(uuid) from public, anon;
revoke all on function public.get_follow_requests() from public, anon;
grant execute on function public.send_follow_request(uuid) to authenticated;
grant execute on function public.unfollow_user(uuid) to authenticated;
grant execute on function public.accept_follow_request(uuid) to authenticated;
grant execute on function public.decline_follow_request(uuid) to authenticated;
grant execute on function public.get_follow_requests() to authenticated, service_role;

-- 8. Notifications RPCs ─────────────────────────────────────
create or replace function public.get_notifications(p_limit integer default 40)
returns table (
  id uuid,
  type text,
  read boolean,
  created_at timestamptz,
  actor_id uuid,
  actor_username text,
  actor_display_name text,
  actor_avatar_url text,
  log_id uuid,
  comment_id uuid
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    n.id, n.type, n.read, n.created_at,
    p.id, p.username::text, p.display_name, p.avatar_url,
    n.log_id, n.comment_id
  from public.notifications n
  join public.profiles p on p.id = n.actor_id
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 40), 100));
$$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if p_ids is null then
    update public.notifications set read = true where user_id = auth.uid() and not read;
  else
    update public.notifications set read = true where user_id = auth.uid() and id = any(p_ids);
  end if;
end;
$$;

create or replace function public.get_unread_notification_count()
returns bigint
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select count(*) from public.notifications
  where user_id = auth.uid() and not read;
$$;

revoke all on function public.get_notifications(integer) from public, anon;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
revoke all on function public.get_unread_notification_count() from public, anon;
grant execute on function public.get_notifications(integer) to authenticated, service_role;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.get_unread_notification_count() to authenticated;

-- 9. Notification triggers (like / comment / new_follower) ──
create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  log_owner uuid;
begin
  select user_id into log_owner from public.concert_logs where id = new.log_id;
  if log_owner is not null and log_owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, log_id)
    values (log_owner, new.user_id, 'like', new.log_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_like_trigger on public.log_likes;
create trigger notify_like_trigger
after insert on public.log_likes
for each row execute function public.notify_on_like();

create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  log_owner uuid;
begin
  select user_id into log_owner from public.concert_logs where id = new.log_id;
  if log_owner is not null and log_owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, log_id, comment_id)
    values (log_owner, new.user_id, 'comment', new.log_id, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_comment_trigger on public.log_comments;
create trigger notify_comment_trigger
after insert on public.log_comments
for each row execute function public.notify_on_comment();

-- 10. Adapt can_view_profile to only use accepted follows ────
create or replace function public.can_view_profile(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = profile_id and not p.is_private
    )
    or exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.followee_id = profile_id
        and f.status = 'accepted'
    );
$$;

-- 11. Adapt get_feed to only use accepted follows ────────────
create or replace function public.get_feed(p_cursor timestamptz, p_limit integer)
returns table (
  id uuid,
  user_id uuid,
  artist_id uuid,
  event_date date,
  venue_type public.venue_type,
  venue_name text,
  rating numeric,
  review text,
  created_at timestamptz,
  updated_at timestamptz,
  artist jsonb,
  author jsonb,
  like_count bigint,
  comment_count bigint,
  liked_by_me boolean
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    logs.id,
    logs.user_id,
    logs.artist_id,
    logs.event_date,
    logs.venue_type,
    logs.venue_name,
    logs.rating,
    logs.review,
    logs.created_at,
    logs.updated_at,
    to_jsonb(artists),
    jsonb_build_object(
      'id', profiles.id,
      'username', profiles.username,
      'display_name', profiles.display_name,
      'avatar_url', profiles.avatar_url
    ),
    (select count(*) from public.log_likes likes where likes.log_id = logs.id),
    (select count(*) from public.log_comments comments where comments.log_id = logs.id),
    exists (
      select 1 from public.log_likes likes
      where likes.log_id = logs.id and likes.user_id = auth.uid()
    )
  from public.follows follows
  join public.concert_logs logs on logs.user_id = follows.followee_id
  join public.artists artists on artists.id = logs.artist_id
  join public.profiles profiles on profiles.id = logs.user_id
  where follows.follower_id = auth.uid()
    and follows.status = 'accepted'
    and (p_cursor is null or logs.created_at < p_cursor)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = logs.user_id)
         or (b.blocker_id = logs.user_id and b.blocked_id = auth.uid())
    )
  order by logs.created_at desc, logs.id desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

-- 12. Block user RPC ─────────────────────────────────────────
create or replace function public.block_user(p_blocked uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_blocked = auth.uid() then raise exception 'Cannot block yourself' using errcode = '22023'; end if;
  insert into public.blocks (blocker_id, blocked_id)
  values (auth.uid(), p_blocked)
  on conflict do nothing;
  -- Remove any existing follows in both directions
  delete from public.follows
  where (follower_id = auth.uid() and followee_id = p_blocked)
     or (follower_id = p_blocked and followee_id = auth.uid());
end;
$$;

create or replace function public.unblock_user(p_blocked uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  delete from public.blocks where blocker_id = auth.uid() and blocked_id = p_blocked;
end;
$$;

revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;

-- 13. Report RPC ─────────────────────────────────────────────
create or replace function public.submit_report(
  p_reported_user uuid default null,
  p_reported_log uuid default null,
  p_reason text default 'other',
  p_details text default null
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_reported_user is null and p_reported_log is null then
    raise exception 'Must specify a reported user or log' using errcode = '22023';
  end if;
  insert into public.reports (reporter_id, reported_user_id, reported_log_id, reason, details)
  values (auth.uid(), p_reported_user, p_reported_log, p_reason, p_details);
end;
$$;

revoke all on function public.submit_report(uuid, uuid, text, text) from public, anon;
grant execute on function public.submit_report(uuid, uuid, text, text) to authenticated;

-- 14. Add notifications to realtime publication ──────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end;
$$;

-- 15. Adapt can_view_profile_content for accepted follows only
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

  if exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_id = p_owner)
       or (blocker_id = p_owner and blocked_id = auth.uid())
  ) then return false; end if;

  return exists (
      select 1 from public.profiles p
      where p.id = p_owner and not p.is_private
    )
    or exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.followee_id = p_owner
        and f.status = 'accepted'
    );
end;
$$;

-- 16. Adapt get_profile_overview followers/following counts to accepted only
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
        'followers', (select count(*)::integer from public.follows where followee_id = p_user and status = 'accepted'),
        'following', (select count(*)::integer from public.follows where follower_id = p_user and status = 'accepted')
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
        'followers', (select count(*)::integer from public.follows where followee_id = p_user and status = 'accepted'),
        'following', (select count(*)::integer from public.follows where follower_id = p_user and status = 'accepted'),
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
              and follows.status = 'accepted'
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

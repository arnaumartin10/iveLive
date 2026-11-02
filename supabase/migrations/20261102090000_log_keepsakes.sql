do $$
begin
  create type public.media_slot as enum (
    'concert_photo',
    'companions_photo',
    'concert_video'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.log_media (
  id uuid not null default gen_random_uuid(),
  log_id uuid not null,
  user_id uuid not null,
  slot public.media_slot not null,
  kind text not null,
  storage_path text not null,
  thumb_path text not null,
  poster_path text,
  width integer not null,
  height integer not null,
  duration_ms integer,
  size_bytes bigint not null,
  mime text not null,
  caption text,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.log_media
    add constraint log_media_pkey primary key (id);
exception
  when duplicate_object or invalid_table_definition then null;
end
$$;

do $$
begin
  alter table public.log_media
    add constraint log_media_log_id_fkey
    foreign key (log_id) references public.concert_logs(id) on delete cascade;
exception
  when duplicate_object or invalid_table_definition then null;
end
$$;

do $$
begin
  alter table public.log_media
    add constraint log_media_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;
exception
  when duplicate_object or invalid_table_definition then null;
end
$$;

do $$
begin
  alter table public.log_media
    add constraint log_media_log_slot_key unique (log_id, slot);
exception
  when duplicate_object or invalid_table_definition then null;
end
$$;

do $$
begin
  alter table public.log_media
    add constraint log_media_kind_check check (kind in ('image', 'video'));
exception
  when duplicate_object or invalid_table_definition then null;
end
$$;

do $$
begin
  alter table public.log_media
    add constraint log_media_kind_slot_check check (
      (slot = 'concert_video' and kind = 'video')
      or (slot <> 'concert_video' and kind = 'image')
    );
exception
  when duplicate_object or invalid_table_definition then null;
end
$$;

do $$
begin
  alter table public.log_media
    add constraint log_media_dimensions_check check (width > 0 and height > 0);
exception
  when duplicate_object or invalid_table_definition then null;
end
$$;

do $$
begin
  alter table public.log_media
    add constraint log_media_duration_check check (
      (kind = 'video' and duration_ms is not null and duration_ms > 0)
      or (kind = 'image' and duration_ms is null)
    );
exception
  when duplicate_object or invalid_table_definition then null;
end
$$;

do $$
begin
  alter table public.log_media
    add constraint log_media_size_check check (size_bytes > 0);
exception
  when duplicate_object or invalid_table_definition then null;
end
$$;

do $$
begin
  alter table public.log_media
    add constraint log_media_caption_length_check check (
      caption is null or char_length(caption) <= 120
    );
exception
  when duplicate_object or invalid_table_definition then null;
end
$$;

create index if not exists log_media_log_id_idx
  on public.log_media (log_id);
create index if not exists log_media_user_created_idx
  on public.log_media (user_id, created_at desc);

create or replace function public.can_view_user(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and p_owner is not null
    and (
      p_owner = auth.uid()
      or (
        not exists (
          select 1
          from public.blocks b
          where (b.blocker_id = auth.uid() and b.blocked_id = p_owner)
             or (b.blocker_id = p_owner and b.blocked_id = auth.uid())
        )
        and (
          exists (
            select 1
            from public.profiles p
            where p.id = p_owner and not p.is_private
          )
          or exists (
            select 1
            from public.follows f
            where f.follower_id = auth.uid()
              and f.followee_id = p_owner
              and f.status = 'accepted'
          )
        )
      )
    );
$$;

create or replace function public.can_view_log(log_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.concert_logs l
    where l.id = $1 and public.can_view_user(l.user_id)
  );
$$;

create or replace function public.can_view_profile(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_view_user(profile_id);
$$;

create or replace function public.can_view_profile_content(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_view_user(p_owner);
$$;

drop policy if exists concert_logs_select_visible on public.concert_logs;
create policy concert_logs_select_visible
  on public.concert_logs for select to authenticated
  using (public.can_view_log(id));

alter table public.log_media enable row level security;
drop policy if exists log_media_select_visible on public.log_media;
create policy log_media_select_visible
  on public.log_media for select to authenticated
  using (public.can_view_log(log_id));

drop policy if exists log_media_insert_owner on public.log_media;
create policy log_media_insert_owner
  on public.log_media for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.concert_logs l
      where l.id = log_id and l.user_id = auth.uid()
    )
  );

drop policy if exists log_media_update_owner on public.log_media;
create policy log_media_update_owner
  on public.log_media for update to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.concert_logs l
      where l.id = log_id and l.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.concert_logs l
      where l.id = log_id and l.user_id = auth.uid()
    )
  );

drop policy if exists log_media_delete_owner on public.log_media;
create policy log_media_delete_owner
  on public.log_media for delete to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.concert_logs l
      where l.id = log_id and l.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.log_media to authenticated;
grant all on public.log_media to service_role;
revoke all on function public.can_view_user(uuid) from public, anon;
revoke all on function public.can_view_log(uuid) from public, anon;
grant execute on function public.can_view_user(uuid) to authenticated, service_role;
grant execute on function public.can_view_log(uuid) to authenticated, service_role;

-- 50 MiB per object. Verify the project's plan permits this per-file limit.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'log-media',
  'log-media',
  false,
  52428800,
  array['image/jpeg', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists log_media_storage_insert_owner on storage.objects;
create policy log_media_storage_insert_owner
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'log-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists log_media_storage_select_visible on storage.objects;
create policy log_media_storage_select_visible
  on storage.objects for select to authenticated
  using (
    case
      when bucket_id = 'log-media'
       and (storage.foldername(name))[2] ~*
         '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.can_view_log((storage.foldername(name))[2]::uuid)
      else false
    end
  );

drop policy if exists log_media_storage_delete_owner on storage.objects;
create policy log_media_storage_delete_owner
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'log-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop function if exists public.get_feed(timestamptz, integer);
create function public.get_feed(p_cursor timestamptz, p_limit integer)
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
  liked_by_me boolean,
  media jsonb,
  media_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.user_id,
    l.artist_id,
    l.event_date,
    l.venue_type,
    l.venue_name,
    l.rating,
    l.review,
    l.created_at,
    l.updated_at,
    to_jsonb(a),
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url
    ),
    (select count(*) from public.log_likes x where x.log_id = l.id),
    (select count(*) from public.log_comments x where x.log_id = l.id),
    exists (
      select 1 from public.log_likes x
      where x.log_id = l.id and x.user_id = auth.uid()
    ),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'slot', m.slot,
        'kind', m.kind,
        'thumb_path', m.thumb_path,
        'poster_path', m.poster_path,
        'storage_path', m.storage_path,
        'width', m.width,
        'height', m.height,
        'duration_ms', m.duration_ms,
        'caption', m.caption
      ) order by m.slot)
      from public.log_media m
      where m.log_id = l.id
    ), '[]'::jsonb),
    (select count(*)::integer from public.log_media m where m.log_id = l.id)
  from public.follows f
  join public.concert_logs l on l.user_id = f.followee_id
  join public.artists a on a.id = l.artist_id
  join public.profiles p on p.id = l.user_id
  where f.follower_id = auth.uid()
    and f.status = 'accepted'
    and public.can_view_log(l.id)
    and (p_cursor is null or l.created_at < p_cursor)
  order by l.created_at desc, l.id desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

drop function if exists public.get_user_diary(uuid, timestamptz, integer, boolean);
create function public.get_user_diary(
  p_user uuid,
  p_cursor timestamptz default null,
  p_limit integer default 30,
  p_only_media boolean default false
)
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
  media jsonb,
  media_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.user_id,
    l.artist_id,
    l.event_date,
    l.venue_type,
    l.venue_name,
    l.rating,
    l.review,
    l.created_at,
    l.updated_at,
    to_jsonb(a),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'slot', m.slot,
        'kind', m.kind,
        'thumb_path', m.thumb_path,
        'poster_path', m.poster_path,
        'storage_path', m.storage_path,
        'width', m.width,
        'height', m.height,
        'duration_ms', m.duration_ms,
        'caption', m.caption
      ) order by m.slot)
      from public.log_media m
      where m.log_id = l.id
    ), '[]'::jsonb),
    (select count(*)::integer from public.log_media m where m.log_id = l.id)
  from public.concert_logs l
  join public.artists a on a.id = l.artist_id
  where l.user_id = p_user
    and public.can_view_log(l.id)
    and (p_cursor is null or l.created_at < p_cursor)
    and (
      not coalesce(p_only_media, false)
      or exists (select 1 from public.log_media m where m.log_id = l.id)
    )
  order by l.created_at desc, l.id desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

revoke all on function public.get_feed(timestamptz, integer) from public, anon;
grant execute on function public.get_feed(timestamptz, integer) to authenticated;
revoke all on function public.get_user_diary(uuid, timestamptz, integer, boolean) from public, anon;
grant execute on function public.get_user_diary(uuid, timestamptz, integer, boolean) to authenticated;

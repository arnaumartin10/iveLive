create table if not exists public.alpha_gate_config (
  singleton boolean primary key default true,
  invite_only boolean not null default true,
  legacy_members_backfilled boolean not null default false
);

alter table public.alpha_gate_config
  add column if not exists legacy_members_backfilled boolean not null default false;

insert into public.alpha_gate_config (singleton, invite_only)
values (true, true)
on conflict (singleton) do nothing;

create table if not exists public.alpha_invite_members (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  granted_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from public.alpha_gate_config
    where singleton and not legacy_members_backfilled
  ) then
    insert into public.alpha_invite_members (user_id)
    select profile.id from public.profiles profile
    on conflict (user_id) do nothing;

    update public.alpha_gate_config
    set legacy_members_backfilled = true
    where singleton;
  end if;
end;
$$;

create table if not exists public.alpha_invite_codes (
  code_hash text primary key,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_by uuid references public.profiles (id) on delete set null
);

do $$
begin
  alter table public.alpha_invite_codes
    add constraint alpha_invite_codes_hash_format_check
    check (code_hash ~ '^[0-9a-f]{64}$');
exception
  when duplicate_object or invalid_table_definition then null;
end;
$$;

create unique index if not exists alpha_invite_codes_redeemed_by_idx
  on public.alpha_invite_codes (redeemed_by)
  where redeemed_by is not null;

alter table public.alpha_gate_config enable row level security;
alter table public.alpha_invite_members enable row level security;
alter table public.alpha_invite_codes enable row level security;
revoke all on public.alpha_gate_config from public, anon, authenticated;
revoke all on public.alpha_invite_members from public, anon, authenticated;
revoke all on public.alpha_invite_codes from public, anon, authenticated;
grant all on public.alpha_gate_config to service_role;
grant all on public.alpha_invite_members to service_role;
grant all on public.alpha_invite_codes to service_role;

create or replace function public.alpha_user_is_allowed(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select not coalesce(
      (select config.invite_only
       from public.alpha_gate_config config
       where config.singleton),
      true
    )
    or exists (
      select 1
      from public.alpha_invite_members member
      where member.user_id = p_user
    );
$$;

revoke all on function public.alpha_user_is_allowed(uuid)
  from public, anon, authenticated;

create or replace function public.enforce_alpha_invite()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is not null
    and auth.role() is distinct from 'service_role'
    and not public.alpha_user_is_allowed(auth.uid())
  then
    raise exception 'ALPHA_INVITE_REQUIRED'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_alpha_invite()
  from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'artists',
    'concert_logs',
    'follows',
    'log_likes',
    'log_comments',
    'blocks',
    'notifications',
    'reports',
    'user_artist_overrides',
    'artist_reports',
    'profile_picks',
    'wishlist_items',
    'cloud_layouts',
    'user_artist_image_overrides',
    'log_media',
    'concert_setlists'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'drop trigger if exists enforce_alpha_invite on public.%I',
        table_name
      );
      execute format(
        'create trigger enforce_alpha_invite
         before insert or update or delete on public.%I
         for each row execute function public.enforce_alpha_invite()',
        table_name
      );
    end if;
  end loop;
end;
$$;

drop trigger if exists enforce_alpha_invite_profile_update
  on public.profiles;
create trigger enforce_alpha_invite_profile_update
before update on public.profiles
for each row execute function public.enforce_alpha_invite();

create or replace function public.redeem_alpha_invite(p_code_hash text)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  invite_only boolean;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_INVITE_CODE' using errcode = '22023';
  end if;

  select config.invite_only
  into invite_only
  from public.alpha_gate_config config
  where config.singleton;

  if not coalesce(invite_only, true) then
    insert into public.alpha_invite_members (user_id)
    values (current_user_id)
    on conflict (user_id) do nothing;
    return true;
  end if;

  if exists (
    select 1 from public.alpha_invite_members
    where user_id = current_user_id
  ) then
    return true;
  end if;

  update public.alpha_invite_codes
  set redeemed_at = now(), redeemed_by = current_user_id
  where code_hash = lower(p_code_hash)
    and redeemed_at is null;

  if not found then
    raise exception 'INVALID_OR_USED_INVITE_CODE' using errcode = '22023';
  end if;

  insert into public.alpha_invite_members (user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;
  return true;
end;
$$;

create or replace function public.has_alpha_invite()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null
    and public.alpha_user_is_allowed(auth.uid());
$$;

revoke all on function public.redeem_alpha_invite(text)
  from public, anon;
grant execute on function public.redeem_alpha_invite(text)
  to authenticated;
revoke all on function public.has_alpha_invite()
  from public, anon;
grant execute on function public.has_alpha_invite()
  to authenticated;

drop policy if exists log_media_storage_insert_owner on storage.objects;
create policy log_media_storage_insert_owner
on storage.objects for insert to authenticated
with check (
  bucket_id = 'log-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.has_alpha_invite()
);

drop policy if exists "users_upload_own_avatar" on storage.objects;
create policy "users_upload_own_avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.has_alpha_invite()
);

drop policy if exists "users_update_own_avatar" on storage.objects;
create policy "users_update_own_avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.has_alpha_invite()
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.has_alpha_invite()
);

drop policy if exists "users_delete_own_avatar" on storage.objects;
create policy "users_delete_own_avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.has_alpha_invite()
);

drop policy if exists "users_upload_manual_artist_images" on storage.objects;
create policy "users_upload_manual_artist_images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'artist-images'
  and (storage.foldername(name))[1] = 'manual'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.has_alpha_invite()
);

drop policy if exists "users_update_manual_artist_images" on storage.objects;
create policy "users_update_manual_artist_images"
on storage.objects for update to authenticated
using (
  bucket_id = 'artist-images'
  and (storage.foldername(name))[1] = 'manual'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.has_alpha_invite()
)
with check (
  bucket_id = 'artist-images'
  and (storage.foldername(name))[1] = 'manual'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.has_alpha_invite()
);

drop policy if exists "users_delete_manual_artist_images" on storage.objects;
create policy "users_delete_manual_artist_images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'artist-images'
  and (storage.foldername(name))[1] = 'manual'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.has_alpha_invite()
);

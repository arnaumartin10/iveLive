-- Migration: Custom artist duplicate check and management policies
-- Date: 2026-10-15

-- 1. Function to query pg_trgm similarity on name_normalized
create or replace function public.find_similar_artists(
  query_name text,
  similarity_threshold float default 0.5
)
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
  similarity float
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
    a.id,
    a.spotify_id,
    a.name,
    a.name_normalized,
    a.image_url_large,
    a.image_url_thumb,
    a.genres,
    a.macro_genres,
    a.primary_macro,
    a.popularity,
    a.source,
    a.created_by,
    extensions.similarity(a.name_normalized, lower(public.immutable_unaccent(query_name)))::float as similarity
  from public.artists a
  where extensions.similarity(a.name_normalized, lower(public.immutable_unaccent(query_name))) >= similarity_threshold
  order by similarity desc
  limit 10;
$$;

revoke all on function public.find_similar_artists(text, float) from public, anon;
grant execute on function public.find_similar_artists(text, float) to authenticated, anon;

-- 2. Update and Delete policies for manual artists
-- Creator can edit or delete a manual artist, but only if no other user has logged it.
grant delete on public.artists to authenticated;

drop policy if exists "artists_update_manual_creator" on public.artists;
create policy "artists_update_manual_creator"
on public.artists for update to authenticated
using (
  source = 'manual'
  and created_by = auth.uid()
  and not exists (
    select 1
    from public.concert_logs
    where artist_id = artists.id
      and user_id <> auth.uid()
  )
)
with check (
  source = 'manual'
  and created_by = auth.uid()
  and not exists (
    select 1
    from public.concert_logs
    where artist_id = artists.id
      and user_id <> auth.uid()
  )
);

drop policy if exists "artists_delete_manual_creator" on public.artists;
create policy "artists_delete_manual_creator"
on public.artists for delete to authenticated
using (
  source = 'manual'
  and created_by = auth.uid()
  and not exists (
    select 1
    from public.concert_logs
    where artist_id = artists.id
      and user_id <> auth.uid()
  )
);

-- 3. Stored function to safely delete a manual artist and creator's logs if any
create or replace function public.delete_manual_artist(p_artist_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_artist public.artists%rowtype;
  v_other_logs_count bigint;
begin
  select * into v_artist from public.artists where id = p_artist_id;
  if not found then
    raise exception 'Artist not found' using errcode = 'P0002';
  end if;

  if v_artist.source <> 'manual' or v_artist.created_by <> auth.uid() then
    raise exception 'Only the creator can delete this manual artist' using errcode = '42501';
  end if;

  select count(*) into v_other_logs_count
  from public.concert_logs
  where artist_id = p_artist_id and user_id <> auth.uid();

  if v_other_logs_count > 0 then
    raise exception 'Cannot delete artist because other users have logged concerts with them' using errcode = '23503';
  end if;

  -- Delete creator's logs for this artist if any
  delete from public.concert_logs where artist_id = p_artist_id and user_id = auth.uid();

  -- Delete the artist
  delete from public.artists where id = p_artist_id;

  return true;
end;
$$;

revoke all on function public.delete_manual_artist(uuid) from public, anon;
grant execute on function public.delete_manual_artist(uuid) to authenticated;

-- 4. Helper function to check if the current user can edit or delete an artist
create or replace function public.can_modify_artist(p_artist_id uuid)
returns table (
  is_creator boolean,
  can_edit boolean,
  can_delete boolean,
  other_user_log_count bigint
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_artist public.artists%rowtype;
  v_count bigint;
begin
  select * into v_artist from public.artists where id = p_artist_id;
  if not found then
    return query select false, false, false, 0::bigint;
    return;
  end if;

  if v_artist.source <> 'manual' or v_artist.created_by <> auth.uid() then
    return query select false, false, false, 0::bigint;
    return;
  end if;

  select count(*) into v_count
  from public.concert_logs
  where artist_id = p_artist_id and user_id <> auth.uid();

  return query select true, (v_count = 0), (v_count = 0), v_count;
end;
$$;

revoke all on function public.can_modify_artist(uuid) from public, anon;
grant execute on function public.can_modify_artist(uuid) to authenticated;

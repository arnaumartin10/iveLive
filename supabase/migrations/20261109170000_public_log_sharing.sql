create or replace function public.get_public_concert_log_share(p_log_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', log.id,
    'user_id', log.user_id,
    'artist_id', log.artist_id,
    'event_date', log.event_date,
    'venue_type', log.venue_type,
    'venue_name', log.venue_name,
    'venue_id', log.venue_id,
    'rating', log.rating,
    'review', log.review,
    'created_at', log.created_at,
    'updated_at', log.updated_at,
    'artist', case
      when artist.id is null then null
      else jsonb_build_object(
        'id', artist.id,
        'name', artist.name,
        'image_url_large', artist.image_url_large,
        'image_url_thumb', artist.image_url_thumb,
        'primary_macro', artist.primary_macro
      )
    end,
    'media', '[]'::jsonb,
    'owner_username', case when not owner.is_private then owner.username end,
    'owner_display_name', case
      when not owner.is_private then owner.display_name
    end,
    'owner_avatar_url', case when not owner.is_private then owner.avatar_url end
  )
  from public.concert_logs log
  join public.profiles owner on owner.id = log.user_id
  left join public.artists artist on artist.id = log.artist_id
  where log.id = p_log_id
    and (
      (
        auth.uid() is null
        and not owner.is_private
      )
      or (
        auth.uid() is not null
        and public.can_view_user(owner.id)
      )
    );
$$;

revoke all on function public.get_public_concert_log_share(uuid)
  from public, anon, authenticated;
grant execute on function public.get_public_concert_log_share(uuid)
  to anon, authenticated, service_role;

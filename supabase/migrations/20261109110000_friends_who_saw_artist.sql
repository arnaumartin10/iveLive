create or replace function public.friends_who_saw_artist(
  p_artist uuid,
  p_limit integer default 50
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  logs_count integer,
  logs jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with visible_logs as (
    select l.*
    from public.concert_logs l
    where l.artist_id = p_artist
      and public.can_view_log(l.id)
  ),
  eligible_friends as (
    select p.id, p.username::text, p.display_name, p.avatar_url
    from public.profiles p
    where p.id <> auth.uid()
      and not p.is_private
      and exists (
        select 1
        from public.follows f
        where f.follower_id = auth.uid()
          and f.followee_id = p.id
          and f.status = 'accepted'
      )
      and not exists (
        select 1
        from public.blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
           or (b.blocker_id = p.id and b.blocked_id = auth.uid())
      )
      and exists (
        select 1
        from visible_logs l
        where l.user_id = p.id
      )
  )
  select
    friend.id,
    friend.username,
    friend.display_name,
    friend.avatar_url,
    count(log.id)::integer as logs_count,
    jsonb_agg(
      jsonb_build_object(
        'id', log.id,
        'event_date', log.event_date,
        'venue_type', log.venue_type,
        'venue_name', log.venue_name,
        'rating', log.rating,
        'review', left(log.review, 160),
        'media_count', (
          select count(*)::integer
          from public.log_media media
          where media.log_id = log.id
        ),
        'has_setlist', setlist.log_id is not null,
        'top_song', (
          select song.value ->> 'title'
          from jsonb_array_elements(coalesce(setlist.songs, '[]'::jsonb))
            with ordinality as song(value, position)
          where song.value ? 'title'
          order by
            case song.value ->> 'medal'
              when 'gold' then 0
              when 'silver' then 1
              when 'bronze' then 2
              else 3
            end,
            song.position
          limit 1
        )
      )
      order by log.event_date desc, log.created_at desc, log.id
    ) as logs
  from eligible_friends friend
  join visible_logs log on log.user_id = friend.id
  left join public.concert_setlists setlist on setlist.log_id = log.id
  group by friend.id, friend.username, friend.display_name, friend.avatar_url
  order by max(log.event_date) desc, max(log.created_at) desc, friend.username
  limit greatest(1, least(coalesce(p_limit, 50), 50));
$$;

revoke all on function public.friends_who_saw_artist(uuid, integer)
  from public, anon;
grant execute on function public.friends_who_saw_artist(uuid, integer)
  to authenticated, service_role;

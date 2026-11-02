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
  media_count integer,
  setlist jsonb
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
    (select count(*)::integer from public.log_media m where m.log_id = l.id),
    (
      select jsonb_build_object(
        'source', s.source,
        'source_url', s.source_url,
        'artist', s.artist,
        'venue', s.venue,
        'city', s.city,
        'event_date', s.event_date,
        'event_year', s.event_year,
        'songs', s.songs
      )
      from public.concert_setlists s
      where s.log_id = l.id
    )
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

revoke all on function public.get_feed(timestamptz, integer) from public, anon;
grant execute on function public.get_feed(timestamptz, integer) to authenticated;

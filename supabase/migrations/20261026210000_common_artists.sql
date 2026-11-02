-- ============================================================
-- Common Artists & Compare Feature – 20261026210000
-- ============================================================

create or replace function public.common_artists(p_a uuid, p_b uuid)
returns table (
  artist_id uuid,
  name text,
  image_url text,
  primary_macro text,
  macro_genres text[],
  times_seen_a bigint,
  times_seen_b bigint,
  shared_dates text[],
  shared_venues text[]
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with a_logs as (
    select artist_id, event_date::text as event_date, venue_name, count(*) as cnt
    from public.concert_logs
    where user_id = p_a
    group by artist_id, event_date, venue_name
  ),
  b_logs as (
    select artist_id, event_date::text as event_date, venue_name, count(*) as cnt
    from public.concert_logs
    where user_id = p_b
      and (public.can_view_profile_content(p_b) or p_b = auth.uid())
    group by artist_id, event_date, venue_name
  ),
  a_artists as (
    select artist_id, sum(cnt)::bigint as times_seen
    from a_logs
    group by artist_id
  ),
  b_artists as (
    select artist_id, sum(cnt)::bigint as times_seen
    from b_logs
    group by artist_id
  ),
  shared_shows as (
    select
      a.artist_id,
      array_agg(distinct a.event_date order by a.event_date desc) as shared_dates,
      array_agg(distinct coalesce(a.venue_name, b.venue_name)) filter (where coalesce(a.venue_name, b.venue_name) is not null) as shared_venues
    from a_logs a
    join b_logs b on a.artist_id = b.artist_id and a.event_date = b.event_date
    group by a.artist_id
  )
  select
    art.id as artist_id,
    art.name,
    coalesce(art.image_url_thumb, art.image_url_large) as image_url,
    art.primary_macro,
    art.macro_genres,
    aa.times_seen as times_seen_a,
    ba.times_seen as times_seen_b,
    coalesce(ss.shared_dates, array[]::text[]) as shared_dates,
    coalesce(ss.shared_venues, array[]::text[]) as shared_venues
  from a_artists aa
  join b_artists ba on aa.artist_id = ba.artist_id
  join public.artists art on art.id = aa.artist_id
  left join shared_shows ss on ss.artist_id = aa.artist_id
  order by (aa.times_seen + ba.times_seen) desc;
$$;

revoke all on function public.common_artists(uuid, uuid) from public, anon;
grant execute on function public.common_artists(uuid, uuid) to authenticated, service_role;

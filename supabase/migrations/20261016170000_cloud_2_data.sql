alter table public.artists add column if not exists begin_year integer;

create or replace function public.user_cloud_data(
  p_user uuid,
  p_year integer default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with scoped_logs as (
    select l.id, l.artist_id, l.event_date, l.venue_type, l.venue_name, l.rating
    from public.concert_logs l
    where l.user_id = p_user
      and (p_year is null or extract(year from l.event_date)::integer = p_year)
  ), artist_ids as (
    select distinct artist_id from scoped_logs
  ), coattendance as (
    select
      first_log.artist_id as source_id,
      second_log.artist_id as target_id,
      count(distinct first_log.event_date)::integer as weight,
      array_agg(distinct first_log.event_date order by first_log.event_date) as shared_dates,
      coalesce(
        array_agg(distinct first_log.venue_name order by first_log.venue_name)
          filter (where first_log.venue_name is not null),
        '{}'::text[]
      ) as venue_names
    from scoped_logs first_log
    join scoped_logs second_log
      on second_log.event_date = first_log.event_date
     and second_log.artist_id > first_log.artist_id
    group by first_log.artist_id, second_log.artist_id
    order by count(distinct first_log.event_date) desc, first_log.artist_id, second_log.artist_id
    limit 150
  )
  select jsonb_build_object(
    'artists', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', artists.id,
        'name', artists.name,
        'image_url_thumb', artists.image_url_thumb,
        'image_url_large', artists.image_url_large,
        'primary_macro', artists.primary_macro,
        'macro_genres', artists.macro_genres,
        'genres', coalesce(artists.genres[1:3], '{}'::text[]),
        'begin_year', artists.begin_year,
        'log_count', stats.log_count,
        'avg_rating', stats.avg_rating,
        'max_rating', stats.max_rating,
        'first_seen', stats.first_seen,
        'last_seen', stats.last_seen,
        'venue_type_counts', coalesce((
          select jsonb_object_agg(venue_counts.venue_type, venue_counts.log_count)
          from (
            select venue_type::text as venue_type, count(*)::integer as log_count
            from scoped_logs venue_logs
            where venue_logs.artist_id = artists.id
            group by venue_type
          ) venue_counts
        ), '{}'::jsonb),
        'logs', coalesce((
          select jsonb_agg(jsonb_build_array(
            artist_logs.event_date,
            artist_logs.venue_type::text,
            artist_logs.rating
          ) order by artist_logs.event_date desc, artist_logs.id desc)
          from (
            select * from scoped_logs
            where artist_id = artists.id
            order by event_date desc, id desc
            limit 30
          ) artist_logs
        ), '[]'::jsonb)
      ) order by stats.log_count desc, artists.name)
      from artist_ids
      join public.artists artists on artists.id = artist_ids.artist_id
      cross join lateral (
        select
          count(*)::integer as log_count,
          avg(rating) as avg_rating,
          max(rating) as max_rating,
          min(event_date) as first_seen,
          max(event_date) as last_seen
        from scoped_logs artist_logs
        where artist_logs.artist_id = artists.id
      ) stats
    ), '[]'::jsonb),
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
        'source_id', source_id,
        'target_id', target_id,
        'weight', weight,
        'shared_dates', shared_dates,
        'venue_names', venue_names
      ) order by weight desc, source_id, target_id)
      from coattendance
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.user_cloud_data(uuid, integer) from public, anon;
grant execute on function public.user_cloud_data(uuid, integer) to authenticated, service_role;

-- ============================================================
-- 20261026130000_populate_artist_era.sql
-- 1. Populates begin_year on existing artists from artist_albums
-- 2. Updates user_cloud_data and user_music_identity to coalesce
--    begin_year with earliest release in artist_albums.
-- ============================================================

-- 1. Populate begin_year for existing artists with albums
update public.artists a
set begin_year = sub.min_year,
    begin_year_source = 'album'
from (
  select artist_id, min(year) as min_year
  from public.artist_albums
  where year is not null and year > 1000
  group by artist_id
) sub
where a.id = sub.artist_id
  and a.begin_year is null;

-- 2. Update user_cloud_data RPC with robust begin_year coalescing
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
        'begin_year', coalesce(
          artists.begin_year,
          (select min(year) from public.artist_albums where artist_id = artists.id and year > 1000)
        ),
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

-- 3. Update user_music_identity to also coalesce begin_year from artist_albums
create or replace function public.user_music_identity(
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
    select
      l.id,
      l.artist_id,
      l.venue_type,
      l.rating,
      l.event_date,
      coalesce(
        a.begin_year,
        (select min(year) from public.artist_albums where artist_id = a.id and year > 1000)
      ) as begin_year,
      coalesce(a.begin_year_source, 'album') as begin_year_source,
      a.macro_genres,
      a.primary_macro,
      a.name as artist_name
    from public.concert_logs l
    join public.artists a on a.id = l.artist_id
    where l.user_id = p_user
      and (p_year is null or extract(year from l.event_date)::integer = p_year)
  ),
  totals as (
    select
      count(distinct id)::integer           as shows,
      count(distinct artist_id)::integer    as unique_artists
    from scoped_logs
  ),
  venue_dist as (
    select
      venue_type::text as venue_type,
      count(*)::integer as cnt
    from scoped_logs
    group by venue_type
  ),
  venue_total as (
    select coalesce(sum(cnt), 0) as total from venue_dist
  ),
  venue_shares as (
    select
      venue_type,
      cnt,
      case when venue_total.total > 0 then round(cnt::numeric / venue_total.total * 100, 1) else 0 end as share
    from venue_dist
    cross join venue_total
  ),
  macro_dist as (
    select
      coalesce(primary_macro, 'unclassified') as macro_genre,
      count(*)::integer as cnt
    from scoped_logs
    group by coalesce(primary_macro, 'unclassified')
  ),
  macro_total as (
    select coalesce(sum(cnt), 0) as total from macro_dist
  ),
  macro_shares as (
    select
      macro_genre,
      cnt,
      case when macro_total.total > 0 then round(cnt::numeric / macro_total.total * 100, 1) else 0 end as share
    from macro_dist
    cross join macro_total
  ),
  artist_log_counts as (
    select
      artist_id,
      count(*)::integer as cnt
    from scoped_logs
    group by artist_id
  ),
  repeat_calc as (
    select
      coalesce(count(*) filter (where cnt > 1), 0)::integer as repeat_artists,
      coalesce(count(*), 0)::integer as total_artists,
      case
        when count(*) > 0 then round(count(*) filter (where cnt > 1)::numeric / count(*) * 100, 1)
        else 0
      end as repeat_ratio
    from artist_log_counts
  ),
  era_tagged_logs as (
    select
      l.*,
      case
        when l.begin_year is null then 'unknown'
        when l.begin_year < 1970  then 'pre-70s'
        when l.begin_year < 1980  then '70s'
        when l.begin_year < 1990  then '80s'
        when l.begin_year < 2000  then '90s'
        when l.begin_year < 2010  then '00s'
        when l.begin_year < 2020  then '10s'
        else '20s'
      end as era_bucket
    from scoped_logs l
  ),
  era_dist as (
    select
      era_bucket,
      count(*)::integer as cnt
    from era_tagged_logs
    group by era_bucket
  ),
  era_total as (
    select coalesce(sum(cnt), 0) as total from era_dist
  ),
  era_all_buckets as (
    select unnest(array['pre-70s', '70s', '80s', '90s', '00s', '10s', '20s', 'unknown']) as era_bucket
  ),
  era_shares as (
    select
      b.era_bucket,
      coalesce(d.cnt, 0)::integer as cnt,
      case
        when t.total > 0 then round(coalesce(d.cnt, 0)::numeric / t.total * 100, 1)
        else 0
      end as share
    from era_all_buckets b
    left join era_dist d on d.era_bucket = b.era_bucket
    cross join era_total t
  ),
  shows_with_era as (
    select begin_year
    from scoped_logs
    where begin_year is not null
  ),
  musical_age_calc as (
    select
      case
        when count(*) >= 3 then round(avg(begin_year))::integer
        else null
      end as musical_age
    from shows_with_era
  ),
  artist_extremes as (
    select
      min(begin_year) as oldest_year,
      max(begin_year) as newest_year
    from scoped_logs
    where begin_year is not null
  ),
  oldest_artist_row as (
    select l.artist_id, l.artist_name, l.begin_year
    from scoped_logs l
    join artist_extremes e on l.begin_year = e.oldest_year
    limit 1
  ),
  newest_artist_row as (
    select l.artist_id, l.artist_name, l.begin_year
    from scoped_logs l
    join artist_extremes e on l.begin_year = e.newest_year
    limit 1
  )
  select jsonb_build_object(
    'shows', coalesce((select shows from totals), 0),
    'unique_artists', coalesce((select unique_artists from totals), 0),
    'repeat_artist_ratio', coalesce((select repeat_ratio from repeat_calc), 0),
    'diversity_score', coalesce((select (public.user_taste_diversity(p_user, p_year)->>'score')::numeric), 0),
    'venue_distribution', coalesce((
      select jsonb_object_agg(venue_type, jsonb_build_object('count', cnt, 'share', share))
      from venue_shares
    ), '{}'::jsonb),
    'macro_genre_distribution', coalesce((
      select jsonb_object_agg(macro_genre, jsonb_build_object('count', cnt, 'share', share))
      from macro_shares
    ), '{}'::jsonb),
    'era_distribution', coalesce((
      select jsonb_object_agg(era_bucket, jsonb_build_object('count', cnt, 'share', share))
      from era_shares
    ), '{}'::jsonb),
    'musical_age', (select musical_age from musical_age_calc),
    'oldest_artist', (
      select case when count(*) > 0 then
        jsonb_build_object('id', artist_id, 'name', artist_name, 'year', begin_year)
      else null end
      from oldest_artist_row group by artist_id, artist_name, begin_year
    ),
    'newest_artist', (
      select case when count(*) > 0 then
        jsonb_build_object('id', artist_id, 'name', artist_name, 'year', begin_year)
      else null end
      from newest_artist_row group by artist_id, artist_name, begin_year
    )
  );
$$;

revoke all on function public.user_music_identity(uuid, integer) from public, anon;
grant execute on function public.user_music_identity(uuid, integer) to authenticated;

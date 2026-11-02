-- ============================================================
-- 20261026120000_music_identity.sql
-- Adds begin_year to artists and the user_music_identity RPC.
-- Idempotent: uses IF NOT EXISTS / OR REPLACE throughout.
-- Do NOT run against the remote DB manually; use:
--   npx supabase db push --linked
-- ============================================================

-- 1. Era columns on artists table (idempotent)
alter table public.artists
  add column if not exists begin_year        integer,
  add column if not exists begin_year_source text;

-- claim_artist_enrichment already exists; extend it to accept p_force
create or replace function public.claim_artist_enrichment(
  p_artist_id uuid,
  p_force     boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed boolean := false;
begin
  if p_force then
    update public.artists
    set last_enrichment_requested_at = now()
    where id = p_artist_id;
    claimed := found;
  else
    update public.artists
    set last_enrichment_requested_at = now()
    where id = p_artist_id
      and (
        last_enrichment_requested_at is null
        or last_enrichment_requested_at < now() - interval '1 hour'
      );
    claimed := found;
  end if;
  return claimed;
end;
$$;

revoke all on function public.claim_artist_enrichment(uuid, boolean) from public, anon, authenticated;
grant execute on function public.claim_artist_enrichment(uuid, boolean) to service_role;

-- 2. user_music_identity RPC
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
      a.begin_year,
      a.begin_year_source,
      a.macro_genres,
      a.primary_macro,
      a.name as artist_name
    from public.concert_logs l
    join public.artists a on a.id = l.artist_id
    where l.user_id = p_user
      and (p_year is null or extract(year from l.event_date)::integer = p_year)
  ),
  -- Total shows and unique artists
  totals as (
    select
      count(distinct id)::integer           as shows,
      count(distinct artist_id)::integer    as unique_artists
    from scoped_logs
  ),
  -- Venue type distribution
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
  -- Macro-genre distribution (show-level, unnested)
  genre_expanded as (
    select distinct
      l.id as log_id,
      unnest(
        case when cardinality(l.macro_genres) = 0
          then array['unclassified']::text[]
          else l.macro_genres
        end
      ) as macro_genre
    from scoped_logs l
  ),
  genre_dist as (
    select
      macro_genre,
      count(*)::integer as cnt
    from genre_expanded
    group by macro_genre
  ),
  genre_total as (
    select coalesce(sum(cnt), 0) as total from genre_dist
  ),
  genre_shares as (
    select
      macro_genre,
      cnt,
      case when genre_total.total > 0 then round(cnt::numeric / genre_total.total * 100, 1) else 0 end as share
    from genre_dist
    cross join genre_total
  ),
  -- Repeat artist ratio
  artist_show_counts as (
    select artist_id, count(*) as seen_times
    from scoped_logs
    group by artist_id
  ),
  repeat_stats as (
    select
      count(*) filter (where seen_times >= 2)::integer as repeat_count,
      count(*)::integer                                 as total_artists
    from artist_show_counts
  ),
  -- Era distribution: group by requested buckets (pre-70s, 70s, 80s, 90s, 00s, 10s, 20s, unknown)
  era_shows as (
    select
      case
        when begin_year is null then 'unknown'
        when begin_year < 1970 then 'pre-70s'
        when begin_year < 1980 then '70s'
        when begin_year < 1990 then '80s'
        when begin_year < 2000 then '90s'
        when begin_year < 2010 then '00s'
        when begin_year < 2020 then '10s'
        else '20s'
      end as bucket,
      case
        when begin_year is null then null
        when begin_year < 1970 then 1960
        else (floor(begin_year / 10) * 10)::integer
      end as decade,
      count(*)::integer as show_count
    from scoped_logs
    group by 1, 2
  ),
  era_total_shows as (
    select coalesce(sum(show_count), 0) as total from era_shows
  ),
  era_dist as (
    select
      b.bucket,
      b.decade,
      coalesce(s.show_count, 0)::integer as count,
      case when t.total > 0
        then round(coalesce(s.show_count, 0)::numeric / t.total * 100, 1)
        else 0
      end as share,
      b.ord
    from (
      values
        ('pre-70s', 1960, 1),
        ('70s',     1970, 2),
        ('80s',     1980, 3),
        ('90s',     1990, 4),
        ('00s',     2000, 5),
        ('10s',     2010, 6),
        ('20s',     2020, 7),
        ('unknown', null::integer, 8)
    ) as b(bucket, decade, ord)
    left join era_shows s on s.bucket = b.bucket
    cross join era_total_shows t
    order by b.ord
  ),
  -- Era coverage
  era_coverage as (
    select
      count(distinct artist_id) filter (where begin_year is not null)::integer as known_artists,
      count(distinct artist_id)::integer                                         as total_artists
    from scoped_logs
  ),
  -- Musical age: weighted avg of begin_year across shows where begin_year is known, null if <3 shows with known era
  musical_age_calc as (
    select
      case
        when count(*) filter (where begin_year is not null) >= 3
        then round(avg(begin_year) filter (where begin_year is not null))::integer
        else null
      end as val
    from scoped_logs
  ),
  -- Weighted median begin_year
  -- Expand rows by show_count, then compute median
  artist_shows as (
    select
      l.artist_id,
      l.begin_year,
      count(*)::integer as show_count
    from scoped_logs l
    where l.begin_year is not null
    group by l.artist_id, l.begin_year
  ),
  weighted_years_ordered as (
    select
      begin_year,
      sum(show_count) over () as total_weight,
      sum(show_count) over (order by begin_year rows between unbounded preceding and current row) as cum_weight
    from artist_shows
    order by begin_year
  ),
  weighted_median as (
    select min(begin_year) as median_year
    from weighted_years_ordered
    where cum_weight >= total_weight / 2.0
  ),
  -- Oldest and newest artists
  oldest_artist as (
    select artist_name as name, begin_year
    from (select distinct artist_id, artist_name, begin_year from scoped_logs where begin_year is not null) t
    order by begin_year asc, artist_name limit 1
  ),
  newest_artist as (
    select artist_name as name, begin_year
    from (select distinct artist_id, artist_name, begin_year from scoped_logs where begin_year is not null) t
    order by begin_year desc, artist_name limit 1
  ),
  -- Share of new artists (debuted in last 5 years)
  current_year as (
    select extract(year from now())::integer as yr
  ),
  new_artists as (
    select count(distinct artist_id) filter (
      where begin_year is not null and begin_year >= (select yr from current_year) - 5
    )::integer as cnt
    from scoped_logs
  ),
  -- Average rating by venue type
  avg_rating_by_venue as (
    select
      venue_type::text as venue_type,
      round(avg(rating), 2) as avg_rating
    from scoped_logs
    where rating is not null
    group by venue_type
  )
  select jsonb_build_object(
    'shows',              (select shows from totals),
    'unique_artists',     (select unique_artists from totals),
    'venue_distribution', coalesce(
      (select jsonb_object_agg(venue_type, jsonb_build_object('count', cnt, 'share', share)) from venue_shares),
      '{}'::jsonb
    ),
    'genre_distribution', coalesce(
      (select jsonb_object_agg(macro_genre, jsonb_build_object('count', cnt, 'share', share)) from genre_shares),
      '{}'::jsonb
    ),
    'repeat_artist_ratio', coalesce(
      (select case when total_artists > 0
        then round(repeat_count::numeric / total_artists * 100, 1)
        else 0 end
      from repeat_stats),
      0
    ),
    'diversity_score', coalesce(
      (select (user_taste_diversity(p_user, p_year))->>'score'),
      '0'
    )::integer,
    'era_distribution', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'bucket', bucket,
        'decade', decade,
        'count',  count,
        'share',  share
      ) order by ord) from era_dist),
      '[]'::jsonb
    ),
    'era_coverage', jsonb_build_object(
      'known_artists',  (select known_artists from era_coverage),
      'total_artists',  (select total_artists from era_coverage),
      'percentage', case when (select total_artists from era_coverage) > 0
        then round(
          (select known_artists from era_coverage)::numeric /
          (select total_artists from era_coverage) * 100, 1
        )
        else 0
      end
    ),
    'musical_age',                (select val from musical_age_calc),
    'weighted_median_begin_year', (select median_year from weighted_median),
    'oldest_artist', case
      when (select name from oldest_artist) is not null
      then jsonb_build_object('name', (select name from oldest_artist), 'begin_year', (select begin_year from oldest_artist))
      else null
    end,
    'newest_artist', case
      when (select name from newest_artist) is not null
      then jsonb_build_object('name', (select name from newest_artist), 'begin_year', (select begin_year from newest_artist))
      else null
    end,
    'share_of_new_artists', coalesce(
      (select case when (select unique_artists from totals) > 0
        then round((select cnt from new_artists)::numeric / (select unique_artists from totals) * 100, 1)
        else 0 end),
      0
    ),
    'average_rating_by_venue', coalesce(
      (select jsonb_object_agg(venue_type, avg_rating) from avg_rating_by_venue),
      '{}'::jsonb
    )
  );
$$;

revoke all on function public.user_music_identity(uuid, integer) from public, anon;
grant execute on function public.user_music_identity(uuid, integer) to authenticated, service_role;

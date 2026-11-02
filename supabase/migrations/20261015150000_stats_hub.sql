drop function if exists public.user_genre_stats(uuid);
drop function if exists public.user_venue_stats(uuid);

create function public.user_stats_overview(p_user uuid, p_year integer default null)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with logs as (
    select l.id, l.event_date, l.venue_type, l.venue_name, l.rating,
      l.artist_id, a.name as artist_name, a.image_url_thumb as image_url
    from public.concert_logs l
    join public.artists a on a.id = l.artist_id
    where l.user_id = p_user
      and (p_year is null or extract(year from l.event_date)::integer = p_year)
  ), artist_counts as (
    select artist_id, artist_name, image_url, count(*)::integer as show_count,
      avg(rating) as avg_rating, min(event_date) as first_seen, max(event_date) as last_seen
    from logs group by artist_id, artist_name, image_url
  ), venue_counts as (
    select lower(trim(venue_name)) as venue_key, min(trim(venue_name)) as venue_name,
      mode() within group (order by venue_type) as venue_type,
      count(*)::integer as show_count
    from logs where venue_name is not null
    group by lower(trim(venue_name))
  ), weeks as (
    select distinct date_trunc('week', event_date::timestamp)::date as week_start
    from logs
  ), streaks as (
    select week_start - (row_number() over (order by week_start)::integer * 7) as streak_group
    from weeks
  ), week_counts as (
    select date_trunc('week', event_date::timestamp)::date as week_start, count(*)::integer as show_count
    from logs group by 1
  ), day_counts as (
    select event_date, count(*)::integer as show_count from logs group by event_date
  ), gaps as (
    select event_date - lag(event_date) over (order by event_date, id) as gap_days
    from logs
  ), months as (
    select extract(month from event_date)::integer as month, count(*)::integer as show_count
    from logs group by 1
  ), weekdays as (
    select extract(isodow from event_date)::integer as weekday, count(*)::integer as show_count
    from logs group by 1
  ), years as (
    select extract(year from event_date)::integer as year, count(*)::integer as show_count
    from logs group by 1
  ), ratings as (
    select round(rating * 2)::integer as bucket, count(*)::integer as show_count
    from logs where rating is not null group by 1
  ), venue_ratings as (
    select venue_type, avg(rating) as avg_rating, count(rating)::integer as rated_count
    from logs group by venue_type
  ), year_ratings as (
    select extract(year from event_date)::integer as year, avg(rating) as avg_rating,
      count(rating)::integer as rated_count
    from logs group by 1
  )
  select jsonb_build_object(
    'total_shows', (select count(*)::integer from logs),
    'unique_artists', (select count(*)::integer from artist_counts),
    'unique_venues', (select count(distinct lower(trim(venue_name)))::integer from logs where venue_name is not null),
    'active_years', (select count(distinct extract(year from event_date))::integer from logs),
    'avg_rating', (select round(avg(rating), 2) from logs),
    'five_star_count', (select count(*)::integer from logs where rating = 5),
    'first_show', (select jsonb_build_object('date', event_date, 'artist', artist_name) from logs order by event_date, id limit 1),
    'latest_show', (select jsonb_build_object('date', event_date, 'artist', artist_name) from logs order by event_date desc, id desc limit 1),
    'most_seen_artist', (select jsonb_build_object('artist', artist_name, 'image_url', image_url, 'count', show_count) from artist_counts order by show_count desc, artist_name limit 1),
    'top_artists_by_count', coalesce((select jsonb_agg(jsonb_build_object('artist_id', artist_id, 'artist', artist_name, 'image_url', image_url, 'count', show_count, 'first_seen', first_seen, 'last_seen', last_seen) order by show_count desc, artist_name) from (select * from artist_counts order by show_count desc, artist_name limit 10) top_count), '[]'::jsonb),
    'top_artists_by_rating', coalesce((select jsonb_agg(jsonb_build_object('artist_id', artist_id, 'artist', artist_name, 'image_url', image_url, 'count', show_count, 'avg_rating', round(avg_rating, 2), 'first_seen', first_seen, 'last_seen', last_seen) order by avg_rating desc, show_count desc, artist_name) from (select * from artist_counts where avg_rating is not null order by avg_rating desc, show_count desc, artist_name limit 10) top_rating), '[]'::jsonb),
    'most_visited_venue', (select jsonb_build_object('name', venue_name, 'count', show_count) from venue_counts order by show_count desc, venue_name limit 1),
    'top_venues_by_name', coalesce((select jsonb_agg(jsonb_build_object('name', venue_name, 'venue_type', venue_type, 'count', show_count) order by show_count desc, venue_name) from (select * from venue_counts order by show_count desc, venue_name limit 5) top_venues), '[]'::jsonb),
    'repeat_artists', (select count(*)::integer from artist_counts where show_count >= 2),
    'one_time_artists', (select count(*)::integer from artist_counts where show_count = 1),
    'busiest_month', (select jsonb_build_object('month', month, 'count', show_count) from months order by show_count desc, month limit 1),
    'busiest_weekday', (select jsonb_build_object('weekday', weekday, 'count', show_count) from weekdays order by show_count desc, weekday limit 1),
    'busiest_year', (select jsonb_build_object('year', year, 'count', show_count) from years order by show_count desc, year limit 1),
    'shows_by_month', (select jsonb_agg(jsonb_build_object('month', bucket, 'count', coalesce(months.show_count, 0)) order by bucket) from generate_series(1, 12) bucket left join months on months.month = bucket),
    'shows_by_weekday', (select jsonb_agg(jsonb_build_object('weekday', bucket, 'count', coalesce(weekdays.show_count, 0)) order by bucket) from generate_series(1, 7) bucket left join weekdays on weekdays.weekday = bucket),
    'shows_by_year', coalesce((select jsonb_agg(jsonb_build_object('year', year, 'count', show_count) order by year) from years), '[]'::jsonb),
    'years', (select coalesce(jsonb_agg(year order by year desc), '[]'::jsonb) from (select distinct extract(year from event_date)::integer as year from public.concert_logs where user_id = p_user) available_years),
    'longest_streak_weeks', coalesce((select max(streak_count)::integer from (select count(*) as streak_count from streaks group by streak_group) streak_lengths), 0),
    'longest_gap_days', coalesce((select max(gap_days)::integer from gaps), 0),
    'most_shows_in_one_week', coalesce((select max(show_count) from week_counts), 0),
    'most_shows_in_one_day', coalesce((select max(show_count) from day_counts), 0),
    'rating_histogram', (select jsonb_agg(jsonb_build_object('rating', bucket / 2.0, 'count', coalesce(ratings.show_count, 0)) order by bucket) from generate_series(1, 10) bucket left join ratings using (bucket)),
    'rating_by_venue_type', coalesce((select jsonb_agg(jsonb_build_object('venue_type', venue_type, 'avg_rating', round(avg_rating, 2), 'rated_count', rated_count) order by venue_type) from venue_ratings), '[]'::jsonb),
    'best_rated_venue_type', (select jsonb_build_object('venue_type', venue_type, 'avg_rating', round(avg_rating, 2)) from venue_ratings where avg_rating is not null order by avg_rating desc, rated_count desc, venue_type limit 1),
    'best_rated_year', (select jsonb_build_object('year', year, 'avg_rating', round(avg_rating, 2)) from year_ratings where avg_rating is not null order by avg_rating desc, rated_count desc, year limit 1)
  );
$$;

create function public.user_genre_stats(p_user uuid, p_year integer default null)
returns table (
  macro_genre text,
  log_count bigint,
  artist_count bigint,
  avg_rating numeric,
  top_artist jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with per_log as (
    select distinct l.id, l.artist_id, l.rating,
      unnest(case when cardinality(a.macro_genres) = 0 then array['other']::text[] else a.macro_genres end) as macro_genre
    from public.concert_logs l join public.artists a on a.id = l.artist_id
    where l.user_id = p_user and (p_year is null or extract(year from l.event_date)::integer = p_year)
  ), totals as (
    select macro_genre, count(*)::bigint as log_count,
      count(distinct artist_id)::bigint as artist_count, avg(rating) as avg_rating
    from per_log group by macro_genre
  ), artist_totals as (
    select per_log.macro_genre, per_log.artist_id, a.name, a.image_url_thumb,
      count(*)::integer as seen_count
    from per_log join public.artists a on a.id = per_log.artist_id
    group by per_log.macro_genre, per_log.artist_id, a.name, a.image_url_thumb
  )
  select totals.macro_genre, totals.log_count, totals.artist_count,
    round(totals.avg_rating, 2),
    (select jsonb_build_object('id', artist_id, 'name', name, 'image_url', image_url_thumb, 'count', seen_count)
     from artist_totals where macro_genre = totals.macro_genre order by seen_count desc, name limit 1)
  from totals order by totals.log_count desc, totals.macro_genre;
$$;

create function public.user_venue_stats(p_user uuid, p_year integer default null)
returns table (
  venue_type public.venue_type,
  log_count bigint,
  artist_count bigint,
  avg_rating numeric,
  top_artist jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with scoped as (
    select l.id, l.artist_id, l.venue_type, l.rating
    from public.concert_logs l
    where l.user_id = p_user and (p_year is null or extract(year from l.event_date)::integer = p_year)
  ), totals as (
    select venue_type, count(*)::bigint as log_count,
      count(distinct artist_id)::bigint as artist_count, avg(rating) as avg_rating
    from scoped group by venue_type
  ), artist_totals as (
    select scoped.venue_type, scoped.artist_id, a.name, a.image_url_thumb,
      count(*)::integer as seen_count
    from scoped join public.artists a on a.id = scoped.artist_id
    group by scoped.venue_type, scoped.artist_id, a.name, a.image_url_thumb
  )
  select totals.venue_type, totals.log_count, totals.artist_count,
    round(totals.avg_rating, 2),
    (select jsonb_build_object('id', artist_id, 'name', name, 'image_url', image_url_thumb, 'count', seen_count)
     from artist_totals where venue_type = totals.venue_type order by seen_count desc, name limit 1)
  from totals order by totals.log_count desc, totals.venue_type;
$$;

create function public.artists_exclusive_to_venue_type(
  p_user uuid, p_type public.venue_type, p_year integer default null
)
returns table (artist_id uuid, name text, image_url text, times_seen bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select a.id, a.name, a.image_url_thumb, count(*)::bigint
  from public.concert_logs l join public.artists a on a.id = l.artist_id
  where l.user_id = p_user and (p_year is null or extract(year from l.event_date)::integer = p_year)
  group by a.id, a.name, a.image_url_thumb
  having bool_and(l.venue_type = p_type)
  order by count(*) desc, a.name;
$$;

create function public.user_artists_by_genre(
  p_user uuid, p_genre text, p_year integer default null
)
returns table (artist_id uuid, name text, image_url text, times_seen bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select a.id, a.name, a.image_url_thumb, count(*)::bigint
  from public.concert_logs l join public.artists a on a.id = l.artist_id
  where l.user_id = p_user
    and (p_year is null or extract(year from l.event_date)::integer = p_year)
    and p_genre = any(case when cardinality(a.macro_genres) = 0 then array['other']::text[] else a.macro_genres end)
  group by a.id, a.name, a.image_url_thumb
  order by count(*) desc, a.name;
$$;

create function public.user_artists_by_venue_type(
  p_user uuid, p_type public.venue_type, p_year integer default null
)
returns table (artist_id uuid, name text, image_url text, times_seen bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select a.id, a.name, a.image_url_thumb, count(*)::bigint
  from public.concert_logs l join public.artists a on a.id = l.artist_id
  where l.user_id = p_user and l.venue_type = p_type
    and (p_year is null or extract(year from l.event_date)::integer = p_year)
  group by a.id, a.name, a.image_url_thumb
  order by count(*) desc, a.name;
$$;

create function public.user_calendar_heatmap(p_user uuid, p_year integer default null)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('date', days.event_date, 'count', days.show_count) order by days.event_date), '[]'::jsonb)
  from (
    select event_date, count(*)::integer as show_count
    from public.concert_logs
    where user_id = p_user and (p_year is null or extract(year from event_date)::integer = p_year)
    group by event_date
  ) days;
$$;

create function public.user_taste_diversity(p_user uuid, p_year integer default null)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with distribution as (
    select genre, count(*)::numeric as genre_count
    from (
      select distinct l.id,
        unnest(case when cardinality(a.macro_genres) = 0 then array['other']::text[] else a.macro_genres end) as genre
      from public.concert_logs l join public.artists a on a.id = l.artist_id
      where l.user_id = p_user and (p_year is null or extract(year from l.event_date)::integer = p_year)
    ) expanded group by genre
  ), proportions as (
    select genre, genre_count,
      genre_count / nullif(sum(genre_count) over (), 0) as share
    from distribution
  ), stats as (
    select sum(genre_count) as total,
      count(*)::integer as genre_count,
      max(genre_count) as dominant_count,
      -sum(share * ln(share)) as entropy
    from proportions
  )
  select jsonb_build_object(
    'score', coalesce(round(100 * entropy / nullif(ln(genre_count), 0))::integer, 0),
    'dominant_genre_share', coalesce(round(100 * dominant_count / nullif(total, 0), 1), 0),
    'dominant_genre', (select genre from proportions order by genre_count desc, genre limit 1)
  ) from stats;
$$;

create function public.friends_leaderboard(p_year integer default null)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  show_count bigint,
  artist_count bigint,
  avg_rating numeric,
  rank bigint
)
language sql
stable
security invoker
set search_path = public, auth, pg_temp
as $$
  with people as (
    select auth.uid() as user_id
    union
    select f.followee_id from public.follows f where f.follower_id = auth.uid()
  ), totals as (
    select p.user_id, count(l.id)::bigint as show_count,
      count(distinct l.artist_id)::bigint as artist_count,
      round(avg(l.rating), 2) as avg_rating
    from people p
    left join public.concert_logs l on l.user_id = p.user_id
      and (p_year is null or extract(year from l.event_date)::integer = p_year)
    group by p.user_id
  )
  select t.user_id, p.username::text, p.display_name, p.avatar_url,
    t.show_count, t.artist_count, t.avg_rating,
    dense_rank() over (order by t.show_count desc)::bigint
  from totals t join public.profiles p on p.id = t.user_id
  order by t.show_count desc, t.user_id;
$$;

revoke all on function public.user_stats_overview(uuid, integer) from public, anon;
revoke all on function public.user_genre_stats(uuid, integer) from public, anon;
revoke all on function public.user_venue_stats(uuid, integer) from public, anon;
revoke all on function public.artists_exclusive_to_venue_type(uuid, public.venue_type, integer) from public, anon;
revoke all on function public.user_artists_by_genre(uuid, text, integer) from public, anon;
revoke all on function public.user_artists_by_venue_type(uuid, public.venue_type, integer) from public, anon;
revoke all on function public.user_calendar_heatmap(uuid, integer) from public, anon;
revoke all on function public.user_taste_diversity(uuid, integer) from public, anon;
revoke all on function public.friends_leaderboard(integer) from public, anon;
grant execute on function public.user_stats_overview(uuid, integer) to authenticated, service_role;
grant execute on function public.user_genre_stats(uuid, integer) to authenticated, service_role;
grant execute on function public.user_venue_stats(uuid, integer) to authenticated, service_role;
grant execute on function public.artists_exclusive_to_venue_type(uuid, public.venue_type, integer) to authenticated, service_role;
grant execute on function public.user_artists_by_genre(uuid, text, integer) to authenticated, service_role;
grant execute on function public.user_artists_by_venue_type(uuid, public.venue_type, integer) to authenticated, service_role;
grant execute on function public.user_calendar_heatmap(uuid, integer) to authenticated, service_role;
grant execute on function public.user_taste_diversity(uuid, integer) to authenticated, service_role;
grant execute on function public.friends_leaderboard(integer) to authenticated, service_role;

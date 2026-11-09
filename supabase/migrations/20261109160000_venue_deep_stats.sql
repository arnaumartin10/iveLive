create or replace function public.user_venue_deep_stats(p_user uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with logs as (
    select
      l.id,
      l.artist_id,
      l.event_date,
      l.venue_type,
      coalesce(nullif(btrim(v.name), ''), nullif(btrim(l.venue_name), '')) as venue_name,
      v.id as venue_id,
      v.lat,
      v.lng,
      nullif(btrim(coalesce(v.city, cs.city)), '') as city,
      nullif(upper(btrim(v.country)), '') as country
    from public.concert_logs l
    left join public.venues v on v.id = l.venue_id
    left join public.concert_setlists cs on cs.log_id = l.id
    where l.user_id = p_user
      and (auth.uid() = p_user or auth.role() = 'service_role')
  ),
  venue_groups as (
    select
      coalesce(venue_id::text, 'name:' || lower(public.immutable_unaccent(btrim(venue_name)))) as venue_key,
      venue_id,
      min(venue_name) as venue_name,
      mode() within group (order by venue_type) as venue_type,
      count(*)::integer as log_count,
      min(event_date) as first_seen,
      max(event_date) as last_seen,
      max(lat) as lat,
      max(lng) as lng,
      min(city) as city,
      min(country) as country
    from logs
    where venue_name is not null
    group by venue_id, lower(public.immutable_unaccent(btrim(venue_name)))
  ),
  city_groups as (
    select city, country, count(*)::integer as log_count,
      count(distinct coalesce(venue_id::text, lower(public.immutable_unaccent(btrim(venue_name)))))::integer as venue_count
    from logs
    where city is not null
    group by city, country
  ),
  country_groups as (
    select country, count(*)::integer as log_count,
      count(distinct city)::integer as city_count
    from logs
    where country is not null
    group by country
  ),
  festival_groups as (
    select
      coalesce(venue_id::text, 'name:' || lower(public.immutable_unaccent(btrim(venue_name)))) as festival_key,
      (array_agg(venue_id))[1] as venue_id,
      min(venue_name) as festival_name,
      count(*)::integer as log_count
    from logs
    where venue_name is not null
      and venue_type in ('festival', 'festa_major')
    group by coalesce(venue_id::text, 'name:' || lower(public.immutable_unaccent(btrim(venue_name))))
  ),
  festival_days as (
    select
      coalesce(venue_id::text, 'name:' || lower(public.immutable_unaccent(btrim(venue_name)))) as festival_key,
      event_date,
      count(distinct artist_id)::numeric as bands_seen
    from logs
    where venue_name is not null
      and venue_type in ('festival', 'festa_major')
    group by
      coalesce(venue_id::text, 'name:' || lower(public.immutable_unaccent(btrim(venue_name)))),
      event_date
  )
  select jsonb_build_object(
    'venues',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'venue_id', venue_id,
          'name', venue_name,
          'venue_type', venue_type,
          'log_count', log_count,
          'first_seen', first_seen,
          'last_seen', last_seen,
          'lat', lat,
          'lng', lng,
          'city', city,
          'country', country
        ) order by log_count desc, venue_name
      )
      from (select * from venue_groups order by log_count desc, venue_name limit 10) top_venues
    ), '[]'::jsonb),
    'cities',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'city', city,
          'country', country,
          'log_count', log_count,
          'venue_count', venue_count
        ) order by log_count desc, city
      )
      from city_groups
    ), '[]'::jsonb),
    'countries',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'country', country,
          'log_count', log_count,
          'city_count', city_count
        ) order by log_count desc, country
      )
      from country_groups
    ), '[]'::jsonb),
    'festivals',
    jsonb_build_object(
      'distinct_festivals', (select count(*)::integer from festival_groups),
      'top_recurring_festival',
        (select jsonb_build_object(
          'venue_id', venue_id,
          'name', festival_name,
          'log_count', log_count
        ) from festival_groups order by log_count desc, festival_name limit 1),
      'avg_bands_per_festival_day',
        (select round(avg(bands_seen), 2) from festival_days),
      'festival_logs',
        (select count(*)::integer from logs where venue_type in ('festival', 'festa_major')),
      'club_logs',
        (select count(*)::integer from logs where venue_type = 'concert_hall_club')
    )
  );
$$;

create or replace function public.user_venue_map_points(p_user uuid)
returns table (
  lat numeric,
  lng numeric,
  venue_name text,
  city text,
  log_count bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    v.lat,
    v.lng,
    coalesce(nullif(btrim(v.name), ''), nullif(btrim(l.venue_name), '')) as venue_name,
    nullif(btrim(coalesce(v.city, cs.city)), '') as city,
    count(*) as log_count
  from public.concert_logs l
  join public.venues v on v.id = l.venue_id
  left join public.concert_setlists cs on cs.log_id = l.id
  where l.user_id = p_user
    and (auth.uid() = p_user or auth.role() = 'service_role')
    and v.lat is not null
    and v.lng is not null
  group by v.lat, v.lng, v.name, l.venue_name, v.city, cs.city
  order by count(*) desc, venue_name
$$;

drop function if exists public.user_venue_city_log_ids(uuid, text);

create function public.user_venue_city_log_ids(
  p_user uuid,
  p_city text,
  p_country text default null
)
returns setof uuid
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select l.id
  from public.concert_logs l
  left join public.venues v on v.id = l.venue_id
  left join public.concert_setlists cs on cs.log_id = l.id
  where l.user_id = p_user
    and (auth.uid() = p_user or auth.role() = 'service_role')
    and lower(public.immutable_unaccent(btrim(coalesce(v.city, cs.city, ''))))
      = lower(public.immutable_unaccent(btrim(p_city)))
    and (
      p_country is null
      or upper(btrim(coalesce(v.country, ''))) = upper(btrim(p_country))
    )
$$;

revoke all on function public.user_venue_deep_stats(uuid) from public, anon;
revoke all on function public.user_venue_map_points(uuid) from public, anon;
revoke all on function public.user_venue_city_log_ids(uuid, text, text) from public, anon;
grant execute on function public.user_venue_deep_stats(uuid) to authenticated, service_role;
grant execute on function public.user_venue_map_points(uuid) to authenticated, service_role;
grant execute on function public.user_venue_city_log_ids(uuid, text, text) to authenticated, service_role;

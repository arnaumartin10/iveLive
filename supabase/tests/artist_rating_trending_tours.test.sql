begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, auth, pg_temp;
select plan(46);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values
  ('00000000-0000-0000-0000-000000000000', '93000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rating_public_one@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '93000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'rating_public_two@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '93000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'rating_private@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false)
on conflict (id) do nothing;

update public.profiles
set username = case id
      when '93000000-0000-4000-8000-000000000001' then 'rating_public_one'
      when '93000000-0000-4000-8000-000000000002' then 'rating_public_two'
      else 'rating_private'
    end,
    is_private = id = '93000000-0000-4000-8000-000000000003'
where id in (
  '93000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000002',
  '93000000-0000-4000-8000-000000000003'
);

insert into public.artists (id, name, genres, macro_genres, primary_macro, source, created_by)
values
  ('93000000-0000-4000-8000-000000000011', 'Rating Artist One', array['rock'], array['rock'], 'rock', 'manual', '93000000-0000-4000-8000-000000000001'),
  ('93000000-0000-4000-8000-000000000012', 'Rating Artist Tour', array['pop'], array['pop'], 'pop', 'manual', '93000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.concert_logs (id, user_id, artist_id, event_date, venue_type, venue_name, rating)
values
  ('93000000-0000-4000-8000-000000000021', '93000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000011', current_date - 1, 'festival', 'Open Field', 5.0),
  ('93000000-0000-4000-8000-000000000022', '93000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000011', current_date - 2, 'stadium', 'Arena', 4.0),
  ('93000000-0000-4000-8000-000000000023', '93000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000011', current_date - 3, 'festival', 'Open Field', 3.0),
  ('93000000-0000-4000-8000-000000000024', '93000000-0000-4000-8000-000000000003', '93000000-0000-4000-8000-000000000011', current_date - 4, 'concert_hall_club', 'Private Hall', 0.5),
  ('93000000-0000-4000-8000-000000000025', '93000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000012', current_date - 1, 'concert_hall_club', 'Club', 2.5)
on conflict (id) do nothing;

insert into public.artist_tour_dates (
  id, artist_id, event_name, venue_name, city, country, country_code,
  event_date, ticket_url, source, status, external_id, latitude, longitude
)
values
  ('93000000-0000-4000-8000-000000000031', '93000000-0000-4000-8000-000000000012', 'Tour stop', 'Main Hall', 'Paris', 'France', 'FR', current_date + 14, 'https://tickets.test.invalid/show', 'test', 'on_sale', 'rating-tour-paris', 48.8566, 2.3522),
  ('93000000-0000-4000-8000-000000000032', '93000000-0000-4000-8000-000000000012', 'Cancelled stop', 'Old Hall', 'Paris', 'France', 'FR', current_date + 20, 'https://tickets.test.invalid/cancelled', 'test', 'cancelled', 'rating-tour-cancelled', 48.8566, 2.3522)
on conflict (id) do nothing;

insert into public.trending_global (
  id, period_kind, period_start, artist_id, rank, score,
  public_show_count, public_listener_count, public_avg_rating
)
values (
  '93000000-0000-4000-8000-000000000041',
  'weekly',
  current_date - 7,
  '93000000-0000-4000-8000-000000000011',
  1,
  12.5,
  3,
  2,
  3.75
)
on conflict (id) do nothing;

select is((select public_rating_count from public.artists where id = '93000000-0000-4000-8000-000000000011'), 2, 'rating aggregate counts public raters rather than logs');
select is((select public_avg_rating from public.artists where id = '93000000-0000-4000-8000-000000000011'), 3.75::numeric, 'artist average first averages each public rater');
select is(
  (select public_weighted_rating from public.artists where id = '93000000-0000-4000-8000-000000000011'),
  (
    select round(2::numeric / 5 * 3.75 + 3::numeric / 5 * avg(rater_average), 2)
    from (
      select avg(logs.rating)::numeric as rater_average
      from public.concert_logs logs
      join public.profiles profiles on profiles.id = logs.user_id
      where logs.rating is not null and not profiles.is_private
      group by logs.artist_id, logs.user_id
    ) public_raters
  ),
  'weighted rating uses public global average as C and m equals 3'
);
select is((select public_rating_count from public.artists where id = '93000000-0000-4000-8000-000000000012'), 1, 'second artist aggregates its public rating');
select is((select public_avg_rating from public.artists where id = '93000000-0000-4000-8000-000000000012'), 2.5::numeric, 'one public rating is retained');

select is((select count(*) from public.top_rated_artists(null, null, null, 2, 20, null) where id = '93000000-0000-4000-8000-000000000011'), 1::bigint, 'top rated RPC honors minimum raters');
select is((select count(*) from public.top_rated_artists(null, null, null, 3, 20, null) where id = '93000000-0000-4000-8000-000000000011'), 0::bigint, 'top rated RPC excludes artists below minimum raters');
select is((select count(*) from public.top_rated_artists(null, 'rock', null, 1, 20, null) where id = '93000000-0000-4000-8000-000000000011'), 1::bigint, 'top rated RPC filters genre');
select is((select count(*) from public.top_rated_artists(null, null, null, 1, 20, 'Tour') where id = '93000000-0000-4000-8000-000000000012'), 1::bigint, 'top rated RPC filters name');
select is((select count(*) from public.top_rated_artists('festival', null, null, 1, 20, null) where id = '93000000-0000-4000-8000-000000000011'), 1::bigint, 'top rated RPC filters venue type');
select is((select count(*) from public.top_rated_artists(null, null, 2000, 1, 20, null) where id = '93000000-0000-4000-8000-000000000011'), 0::bigint, 'top rated RPC filters event year');
select is((select count(*) from public.top_rated_artists(null, null, null, 1, 1000, null)), 2::bigint, 'top rated RPC caps limit and returns public results');
select is(
  (select array_agg(id order by weighted_rating desc, id) from public.top_rated_artists(null, null, null, 1, 20, null)),
  array['93000000-0000-4000-8000-000000000011', '93000000-0000-4000-8000-000000000012']::uuid[],
  'top rated artists are ordered by the weighted public score'
);

select is(public.artist_rating_summary('93000000-0000-4000-8000-000000000011')->>'rating_count', '3', 'summary includes public rated shows');
select is(public.artist_rating_summary('93000000-0000-4000-8000-000000000011')->>'rater_count', '2', 'summary includes distinct public raters');
select is(jsonb_array_length(public.artist_rating_summary('93000000-0000-4000-8000-000000000011')->'histogram'), 10, 'summary includes all ten half-star histogram bins');
select is((select count(*) from jsonb_array_elements(public.artist_rating_summary('93000000-0000-4000-8000-000000000011')->'venue_averages')), 2::bigint, 'summary groups public averages by venue type');
select is(public.artist_rating_summary('93000000-0000-4000-8000-000000000011')->>'viewer_count', '0', 'anonymous viewer has no personal rating stats');

set local role authenticated;
set local "request.jwt.claim.sub" = '93000000-0000-4000-8000-000000000001';
select is(public.artist_rating_summary('93000000-0000-4000-8000-000000000011')->>'viewer_count', '2', 'summary includes viewer own ratings');
select is((public.artist_rating_summary('93000000-0000-4000-8000-000000000011')->>'viewer_average')::numeric, 4.5::numeric, 'summary computes viewer average');
select is((select count(*) from public.trending_in_app(30, 20) where id = '93000000-0000-4000-8000-000000000011'), 1::bigint, 'trending RPC includes public logs');
select is((select show_count from public.trending_in_app(30, 20) where id = '93000000-0000-4000-8000-000000000011'), 3::bigint, 'trending RPC excludes private-profile logs');
select is((select count(*) from public.trending_global where id = '93000000-0000-4000-8000-000000000041'), 1::bigint, 'global trend rows are readable under public RLS');
select is((select count(*) from public.artist_tour_dates where id = '93000000-0000-4000-8000-000000000031'), 1::bigint, 'tour date is publicly readable');
select is((select count(*) from public.artists_on_tour('all', 'FR', null, null, null, 20) where id = '93000000-0000-4000-8000-000000000012'), 1::bigint, 'artists on tour filters country');
select is((select count(*) from public.artists_on_tour('all', 'US', null, null, null, 20) where id = '93000000-0000-4000-8000-000000000012'), 0::bigint, 'artists on tour excludes other countries');
select ok(public.haversine_km(48.8566, 2.3522, 48.86, 2.35) < 1, 'haversine distance is measured in kilometers');
select is((select count(*) from public.artists_on_tour('all', 'FR', 48.86, 2.35, 1, 20) where id = '93000000-0000-4000-8000-000000000012'), 1::bigint, 'nearby tours include events within the requested radius');
select is((select count(*) from public.artists_on_tour('all', 'FR', 48.86, 2.35, 0.1, 20) where id = '93000000-0000-4000-8000-000000000012'), 0::bigint, 'nearby tours exclude events outside the requested radius');
select is((select dates_count from public.artists_on_tour('all', 'FR', null, null, null, 20) where id = '93000000-0000-4000-8000-000000000012'), 1::bigint, 'cancelled events are excluded from upcoming tour counts');
select is((select is_on_tour from public.artists where id = '93000000-0000-4000-8000-000000000012'), true, 'tour date trigger updates artist tour status');
select is((select tour_start_date from public.artists where id = '93000000-0000-4000-8000-000000000012'), current_date + 14, 'tour date trigger updates artist start date');
reset role;

update public.profiles set is_private = true where id = '93000000-0000-4000-8000-000000000002';
select is((select public_rating_count from public.artists where id = '93000000-0000-4000-8000-000000000011'), 1, 'privacy toggle removes newly private rater');
select is((select public_avg_rating from public.artists where id = '93000000-0000-4000-8000-000000000011'), 4.5::numeric, 'privacy toggle recomputes public average');
select is(
  (select public_weighted_rating from public.artists where id = '93000000-0000-4000-8000-000000000012'),
  (
    select round(1::numeric / 4 * 2.5 + 3::numeric / 4 * avg(rater_average), 2)
    from (
      select avg(logs.rating)::numeric as rater_average
      from public.concert_logs logs
      join public.profiles profiles on profiles.id = logs.user_id
      where logs.rating is not null and not profiles.is_private
      group by logs.artist_id, logs.user_id
    ) public_raters
  ),
  'privacy toggle refreshes other artists against the new global prior'
);
update public.profiles set is_private = false where id = '93000000-0000-4000-8000-000000000002';
select is((select public_rating_count from public.artists where id = '93000000-0000-4000-8000-000000000011'), 2, 'making profile public restores aggregate participation');

update public.concert_logs set rating = 2.0 where id = '93000000-0000-4000-8000-000000000023';
select is((select public_avg_rating from public.artists where id = '93000000-0000-4000-8000-000000000011'), 3.25::numeric, 'rating updates recompute aggregates');
delete from public.concert_logs where id = '93000000-0000-4000-8000-000000000023';
select is((select public_rating_count from public.artists where id = '93000000-0000-4000-8000-000000000011'), 1, 'deleting final public log from a rater updates rater count');

select ok((select relrowsecurity from pg_class where oid = 'public.trending_global'::regclass), 'global trends has row-level security enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.artist_tour_dates'::regclass), 'tour dates has row-level security enabled');
select ok((select prosecdef from pg_proc where oid = 'public.recompute_artist_rating_aggregates(uuid)'::regprocedure), 'aggregate recomputation is security definer');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'trending_global_period_rank_idx'), 'global trends has period/rank index');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'artist_tour_dates_artist_event_idx'), 'tour dates has artist/date index');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'artists_public_rating_rank_idx'), 'artists has a ranked rating index');
select is((select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name in ('home_city', 'home_region', 'home_country', 'home_country_code', 'home_latitude', 'home_longitude')), 6::bigint, 'profiles contains home location fields');
select is((select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'artists' and column_name in ('is_on_tour', 'tour_start_date', 'tour_end_date', 'tour_last_checked_at')), 4::bigint, 'artists contains tour metadata');

select * from finish();
rollback;

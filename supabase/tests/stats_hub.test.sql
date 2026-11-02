begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, auth, pg_temp;
select plan(31);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values
  ('00000000-0000-0000-0000-000000000000', '92000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'stats_owner@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '92000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'stats_friend@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '92000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'stats_empty@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false)
on conflict (id) do nothing;

update public.profiles set username = case id
  when '92000000-0000-4000-8000-000000000001' then 'stats_owner'
  when '92000000-0000-4000-8000-000000000002' then 'stats_friend'
  else 'stats_empty' end
where id in (
  '92000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000002',
  '92000000-0000-4000-8000-000000000003'
);

insert into public.artists (id, name, genres, macro_genres, source, created_by)
values
  ('92000000-0000-4000-8000-000000000011', 'Stats Rock Artist', array['rock'], array['rock'], 'manual', '92000000-0000-4000-8000-000000000001'),
  ('92000000-0000-4000-8000-000000000012', 'Stats Friend Artist', array['jazz'], array['jazz_blues'], 'manual', '92000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

insert into public.concert_logs (id, user_id, artist_id, event_date, venue_type, venue_name, rating)
values
  ('92000000-0000-4000-8000-000000000021', '92000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000011', date '2024-06-10', 'festival', 'Park', 5.0),
  ('92000000-0000-4000-8000-000000000022', '92000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000011', date '2024-06-10', 'festival', ' park ', 4.5),
  ('92000000-0000-4000-8000-000000000023', '92000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000012', date '2024-08-01', 'concert_hall_club', 'Small Room', null)
on conflict (id) do nothing;

insert into public.follows (follower_id, followee_id)
values ('92000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000002')
on conflict do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '92000000-0000-4000-8000-000000000001';

select is((public.user_stats_overview('92000000-0000-4000-8000-000000000001', 2024)->>'total_shows')::integer, 2, 'overview scopes total shows to year');
select is((public.user_stats_overview('92000000-0000-4000-8000-000000000001', 2024)->>'unique_artists')::integer, 1, 'overview counts unique artists');
select is((public.user_stats_overview('92000000-0000-4000-8000-000000000001', 2024)->>'unique_venues')::integer, 1, 'overview normalizes venue name');
select is((public.user_stats_overview('92000000-0000-4000-8000-000000000001', 2024)->>'avg_rating')::numeric, 4.75::numeric, 'overview averages ratings');
select is(jsonb_array_length(public.user_stats_overview('92000000-0000-4000-8000-000000000001', 2024)->'shows_by_month'), 12, 'overview returns all month buckets');
select is((select log_count from public.user_genre_stats('92000000-0000-4000-8000-000000000001', 2024) where macro_genre = 'rock'), 2::bigint, 'genre stats count scoped logs');
select is((select log_count from public.user_venue_stats('92000000-0000-4000-8000-000000000001', 2024) where venue_type = 'festival'), 2::bigint, 'venue stats count scoped logs');
select is((select count(*) from public.artists_exclusive_to_venue_type('92000000-0000-4000-8000-000000000001', 'festival', 2024)), 1::bigint, 'exclusive artists are returned for matching type');
select is((select count(*) from public.artists_exclusive_to_venue_type('92000000-0000-4000-8000-000000000001', 'concert_hall_club', 2024)), 0::bigint, 'exclusive artists exclude other venue types');
select is(jsonb_array_length(public.user_calendar_heatmap('92000000-0000-4000-8000-000000000001', 2024)), 1, 'heatmap groups logs by date');
select is((public.user_taste_diversity('92000000-0000-4000-8000-000000000001', 2024)->>'score')::integer, 0, 'single-genre diversity is zero without division errors');
select is((public.user_taste_diversity('92000000-0000-4000-8000-000000000001', 2024)->>'dominant_genre_share')::numeric, 100::numeric, 'dominant genre share is complete');
select is((select show_count from public.friends_leaderboard(2024) where user_id = '92000000-0000-4000-8000-000000000001'), 2::bigint, 'leaderboard includes current user');
select is((select count(*) from public.friends_leaderboard(2024)), 2::bigint, 'leaderboard includes accepted follows');
select is((public.user_stats_overview('92000000-0000-4000-8000-000000000002', 2024)->>'total_shows')::integer, 1, 'single-log user overview renders');
select is((public.user_stats_overview('92000000-0000-4000-8000-000000000002', 2024)->>'longest_gap_days')::integer, 0, 'single-log gap is zero');
select is((public.user_stats_overview('92000000-0000-4000-8000-000000000003', null)->>'avg_rating'), null, 'empty-user average is null');
select is((public.user_stats_overview('92000000-0000-4000-8000-000000000002', 2024)->>'avg_rating'), null, 'single unrated log average is null');
select is((public.user_stats_overview('92000000-0000-4000-8000-000000000002', 2024)->>'longest_streak_weeks')::integer, 1, 'single-log streak is one week');
select is(jsonb_array_length(public.user_stats_overview('92000000-0000-4000-8000-000000000002', 2024)->'rating_histogram'), 10, 'single-log histogram keeps ten buckets');
select is((select count(*) from public.user_genre_stats('92000000-0000-4000-8000-000000000003', null)), 0::bigint, 'empty-user genre stats are empty');
select is((select count(*) from public.user_venue_stats('92000000-0000-4000-8000-000000000003', null)), 0::bigint, 'empty-user venue stats are empty');
select is((select count(*) from public.artists_exclusive_to_venue_type('92000000-0000-4000-8000-000000000003', 'festival', null)), 0::bigint, 'empty-user exclusive artists are empty');
select is((select times_seen from public.user_artists_by_genre('92000000-0000-4000-8000-000000000001', 'rock', 2024) limit 1), 2::bigint, 'genre artist grid counts appearances');
select is((select times_seen from public.user_artists_by_venue_type('92000000-0000-4000-8000-000000000001', 'festival', 2024) limit 1), 2::bigint, 'venue artist grid counts appearances');
select is((select count(*) from public.user_artists_by_genre('92000000-0000-4000-8000-000000000003', 'rock', null)), 0::bigint, 'empty-user genre artist grid is empty');
select is((select count(*) from public.user_artists_by_venue_type('92000000-0000-4000-8000-000000000003', 'festival', null)), 0::bigint, 'empty-user venue artist grid is empty');
select is(jsonb_array_length(public.user_calendar_heatmap('92000000-0000-4000-8000-000000000003', null)), 0, 'empty-user heatmap is empty');
select is((public.user_taste_diversity('92000000-0000-4000-8000-000000000003', null)->>'score')::integer, 0, 'empty-user diversity is zero');
select is((public.user_taste_diversity('92000000-0000-4000-8000-000000000003', null)->>'dominant_genre_share')::numeric, 0::numeric, 'empty-user dominant share is zero');
select is((select bool_and(not prosecdef) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('user_stats_overview', 'user_genre_stats', 'user_venue_stats', 'artists_exclusive_to_venue_type', 'user_artists_by_genre', 'user_artists_by_venue_type', 'user_calendar_heatmap', 'user_taste_diversity', 'friends_leaderboard')), true, 'all stats RPCs use security invoker');

reset role;
select * from finish();
rollback;

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, auth, pg_temp;
select plan(18);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values
  ('00000000-0000-0000-0000-000000000000', '93000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'genre_owner@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '93000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'genre_friend@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false)
on conflict (id) do nothing;

update public.profiles
set username = case id
  when '93000000-0000-4000-8000-000000000001' then 'genre_owner'
  else 'genre_friend'
end
where id in (
  '93000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000002'
);

insert into public.artists (
  id, name, genres, macro_genres, primary_macro, source, created_by
)
values
  ('93000000-0000-4000-8000-000000000011', 'Genre Pillar One', array['rock'], array['rock'], 'rock', 'manual', '93000000-0000-4000-8000-000000000001'),
  ('93000000-0000-4000-8000-000000000012', 'Genre Pillar Two', array['rock'], array['rock'], 'rock', 'manual', '93000000-0000-4000-8000-000000000001'),
  ('93000000-0000-4000-8000-000000000013', 'Genre Pillar Three', array['rock'], array['rock'], 'rock', 'manual', '93000000-0000-4000-8000-000000000001'),
  ('93000000-0000-4000-8000-000000000014', 'Genre Example', array['rock'], array['rock'], 'rock', 'manual', '93000000-0000-4000-8000-000000000001'),
  ('93000000-0000-4000-8000-000000000015', 'Unlisted Artist', array['rock'], array['rock'], 'rock', 'manual', '93000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.concert_logs (
  id, user_id, artist_id, event_date, venue_type, venue_name, rating
)
values
  ('93000000-0000-4000-8000-000000000021', '93000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000011', date '2025-06-10', 'festival', 'Genre Fest', 4),
  ('93000000-0000-4000-8000-000000000022', '93000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000011', date '2025-07-10', 'festival', 'Genre Fest', 5),
  ('93000000-0000-4000-8000-000000000023', '93000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000014', date '2025-08-10', 'festival', 'Genre Fest', 5)
on conflict (id) do nothing;

insert into public.wishlist_items (id, user_id, artist_id, status)
values
  ('93000000-0000-4000-8000-000000000031', '93000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000011', 'wanted'),
  ('93000000-0000-4000-8000-000000000032', '93000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000014', 'wanted')
on conflict (id) do nothing;

insert into public.genre_pages (
  slug, title, tagline, summary, origin_place, origin_years, reviewed
)
values ('rock', 'Rock', 'A test tagline.', 'A test summary.', 'United States', '1950s', false)
on conflict (slug) do update set reviewed = false;

delete from public.genre_examples where genre_slug = 'rock';
delete from public.genre_pillars where genre_slug = 'rock';

insert into public.genre_pillars (genre_slug, position, artist_id, why)
values
  ('rock', 1, '93000000-0000-4000-8000-000000000011', 'Foundational contribution one.'),
  ('rock', 2, '93000000-0000-4000-8000-000000000012', 'Foundational contribution two.'),
  ('rock', 3, '93000000-0000-4000-8000-000000000013', 'Foundational contribution three.')
on conflict (genre_slug, position) do update set artist_id = excluded.artist_id;

insert into public.genre_examples (genre_slug, position, artist_id, note)
values ('rock', 1, '93000000-0000-4000-8000-000000000014', null)
on conflict (genre_slug, position) do update set artist_id = excluded.artist_id;

select is(
  public.get_genre_page('rock')->>'found',
  'true',
  'known genre page is returned'
);
select is(
  public.get_genre_page('not-a-genre')->>'error',
  'not_found',
  'unknown genre returns a clear not-found result'
);
select is(
  jsonb_array_length(public.get_genre_page('rock')->'pillars'),
  3,
  'page returns three pillars'
);
select is(
  jsonb_array_length(public.get_genre_page('rock')->'examples'),
  1,
  'page returns examples in its seeded list'
);
select throws_ok(
  $$
    insert into public.genre_pillars (genre_slug, position, artist_id, why)
    values ('rock', 4, '93000000-0000-4000-8000-000000000015', 'Too many pillars.')
  $$,
  '23514',
  'pillar positions cannot exceed three'
);
select throws_ok(
  $$
    insert into public.genre_pillars (genre_slug, position, artist_id, why)
    values ('rock', 1, '93000000-0000-4000-8000-000000000015', 'Duplicate position.')
  $$,
  '23505',
  'pillar positions are unique'
);
select throws_ok(
  $$
    insert into public.genre_examples (genre_slug, position, artist_id)
    values ('rock', 2, '93000000-0000-4000-8000-000000000011')
  $$,
  '23514',
  'an artist cannot be both a pillar and an example'
);
select ok(
  has_table_privilege('authenticated', 'public.genre_pages', 'SELECT'),
  'authenticated users can read genre pages'
);
select ok(
  not has_table_privilege('authenticated', 'public.genre_pages', 'INSERT'),
  'authenticated users cannot write genre pages'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '93000000-0000-4000-8000-000000000001';

select is(
  (public.get_genre_page('rock')->'pillars'->0->>'seen_count')::integer,
  2,
  'pillar seen count includes only the viewer logs'
);
select is(
  public.get_genre_page('rock')->'pillars'->0->>'in_wishlist',
  'true',
  'pillar wishlist flag reflects the viewer'
);
select is(
  (public.get_genre_page('rock')->'examples'->0->>'seen_count')::integer,
  0,
  'another user logs do not affect example seen count'
);
select is(
  public.get_genre_page('rock')->'examples'->0->>'in_wishlist',
  'false',
  'another user wishlist does not affect example saved flag'
);
select is(
  (public.get_genre_page('rock')->'viewer'->>'shows')::integer,
  2,
  'viewer genre stats reuse their own log total'
);
select is(
  (public.get_genre_page('rock')->'viewer'->>'unique_artists')::integer,
  1,
  'viewer genre stats count unique artists'
);
select is(
  (public.get_genre_page('rock')->'viewer'->>'average_rating')::numeric,
  4.5::numeric,
  'viewer genre stats calculate average rating'
);
select is(
  (public.get_genre_page('rock')->'viewer'->'most_seen_artist'->>'seen_count')::integer,
  2,
  'viewer genre stats return their most-seen artist'
);
select is(
  (public.get_genre_page('rock')->'viewer'->>'seen_feature_count')::integer,
  1,
  'progress counts only featured artists logged by the viewer'
);

reset role;
select * from finish();
rollback;

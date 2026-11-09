begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, auth, pg_temp;
select plan(8);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'friends_viewer@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'friends_recent@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'friends_older@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'friends_private@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'friends_blocked@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'friends_nonfollower@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false)
on conflict (id) do nothing;

update public.profiles
set username = case id
      when '94000000-0000-4000-8000-000000000001' then 'friends_viewer'
      when '94000000-0000-4000-8000-000000000002' then 'friends_recent'
      when '94000000-0000-4000-8000-000000000003' then 'friends_older'
      when '94000000-0000-4000-8000-000000000004' then 'friends_private'
      when '94000000-0000-4000-8000-000000000005' then 'friends_blocked'
      else 'friends_nonfollower'
    end,
    is_private = id = '94000000-0000-4000-8000-000000000004'
where id in (
  '94000000-0000-4000-8000-000000000001',
  '94000000-0000-4000-8000-000000000002',
  '94000000-0000-4000-8000-000000000003',
  '94000000-0000-4000-8000-000000000004',
  '94000000-0000-4000-8000-000000000005',
  '94000000-0000-4000-8000-000000000006'
);

insert into public.artists (
  id, name, genres, macro_genres, primary_macro, source
)
values (
  '94000000-0000-4000-8000-000000000010',
  'Friends Query Artist',
  array['rock'],
  array['rock'],
  'rock',
  'manual'
)
on conflict (id) do nothing;

insert into public.concert_logs (
  id, user_id, artist_id, event_date, venue_type, rating, review
)
values
  ('94000000-0000-4000-8000-000000000021', '94000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000010', date '2026-10-10', 'festival', 4, 'Recent show'),
  ('94000000-0000-4000-8000-000000000022', '94000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000010', date '2026-10-12', 'festival', 5, 'Latest show'),
  ('94000000-0000-4000-8000-000000000023', '94000000-0000-4000-8000-000000000003', '94000000-0000-4000-8000-000000000010', date '2026-10-11', 'stadium', 3, 'Earlier friend'),
  ('94000000-0000-4000-8000-000000000024', '94000000-0000-4000-8000-000000000004', '94000000-0000-4000-8000-000000000010', date '2026-10-14', 'festival', 4, 'Private and not followed'),
  ('94000000-0000-4000-8000-000000000025', '94000000-0000-4000-8000-000000000005', '94000000-0000-4000-8000-000000000010', date '2026-10-15', 'festival', 4, 'Blocked friend'),
  ('94000000-0000-4000-8000-000000000026', '94000000-0000-4000-8000-000000000006', '94000000-0000-4000-8000-000000000010', date '2026-10-16', 'festival', 4, 'Non-follower')
on conflict (id) do nothing;

insert into public.follows (follower_id, followee_id, status)
values
  ('94000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002', 'accepted'),
  ('94000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000003', 'accepted'),
  ('94000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000004', 'accepted'),
  ('94000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000005', 'accepted'),
  ('94000000-0000-4000-8000-000000000005', '94000000-0000-4000-8000-000000000001', 'accepted')
on conflict do nothing;

insert into public.blocks (blocker_id, blocked_id)
values (
  '94000000-0000-4000-8000-000000000001',
  '94000000-0000-4000-8000-000000000005'
)
on conflict do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '94000000-0000-4000-8000-000000000001';

select is(
  (select count(*)::integer
   from public.friends_who_saw_artist('94000000-0000-4000-8000-000000000010', 50)),
  2,
  'only accepted, visible, non-blocked friends are returned'
);
select is(
  (select username
   from public.friends_who_saw_artist('94000000-0000-4000-8000-000000000010', 50)
   limit 1),
  'friends_recent',
  'friends are ordered by their most recent log'
);
select is(
  (select logs_count
   from public.friends_who_saw_artist('94000000-0000-4000-8000-000000000010', 50)
   where username = 'friends_recent'),
  2,
  'the row count includes all logs for that artist'
);
select is(
  (select logs->0->>'event_date'
   from public.friends_who_saw_artist('94000000-0000-4000-8000-000000000010', 50)
   where username = 'friends_recent'),
  '2026-10-12',
  'nested logs are ordered most recent first'
);
select is(
  (select count(*)::integer
   from public.friends_who_saw_artist('94000000-0000-4000-8000-000000000010', 1)),
  1,
  'p_limit caps friend rows'
);
select is(
  (select username
   from public.friends_who_saw_artist('94000000-0000-4000-8000-000000000010', 1)
   limit 1),
  'friends_recent',
  'limited results retain most-recent ordering'
);
select is(
  (select count(*)::integer
   from public.friends_who_saw_artist('94000000-0000-4000-8000-000000000010', 50)
   where username in ('friends_private', 'friends_blocked')),
  0,
  'private profiles, non-followers, and blocked users are excluded'
);
select is(
  (select count(*)::integer
   from public.friends_who_saw_artist('94000000-0000-4000-8000-000000000010', 500)),
  2,
  'limits above the maximum are safely capped'
);

select * from finish();
rollback;

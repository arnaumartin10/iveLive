begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, auth, pg_temp;
select plan(2);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'private_owner@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'non_follower@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false)
on conflict (id) do nothing;

update public.profiles
set username = case id
      when '90000000-0000-4000-8000-000000000001' then 'private_owner'
      else 'non_follower'
    end,
    is_private = id = '90000000-0000-4000-8000-000000000001'
where id in (
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000002'
);

insert into public.artists (
  id, name, genres, source, created_by
)
values (
  '90000000-0000-4000-8000-000000000010',
  'Private Test Artist',
  array['dream pop'],
  'manual',
  '90000000-0000-4000-8000-000000000001'
)
on conflict (id) do nothing;

insert into public.concert_logs (
  id, user_id, artist_id, event_date, venue_type, venue_name, rating
)
values (
  '90000000-0000-4000-8000-000000000020',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000010',
  date '2025-06-12',
  'concert_hall_club',
  'Private Room',
  4.5
)
on conflict (id) do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '90000000-0000-4000-8000-000000000002';

select is(
  (select count(*) from public.concert_logs where id = '90000000-0000-4000-8000-000000000020'),
  0::bigint,
  'a non-follower cannot read a private profile log'
);

reset role;

select throws_ok(
  $$
    insert into public.concert_logs (
      user_id, artist_id, event_date, venue_type, rating
    ) values (
      '90000000-0000-4000-8000-000000000001',
      '90000000-0000-4000-8000-000000000010',
      date '2025-06-13',
      'concert_hall_club',
      4.25
    )
  $$,
  '23514',
  'a quarter-star rating is rejected'
);

select * from finish();
rollback;
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, auth, pg_temp;
select plan(9);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'profile_owner@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'profile_stranger@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false)
on conflict (id) do nothing;

update public.profiles
set username = case id
      when '91000000-0000-4000-8000-000000000001' then 'profile_owner'
      else 'profile_stranger'
    end,
    is_private = id = '91000000-0000-4000-8000-000000000001'
where id in (
  '91000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000002'
);

insert into public.artists (id, name, source, created_by)
values
  ('91000000-0000-4000-8000-000000000011', 'Profile Pick One', 'manual', '91000000-0000-4000-8000-000000000001'),
  ('91000000-0000-4000-8000-000000000012', 'Profile Pick Two', 'manual', '91000000-0000-4000-8000-000000000001'),
  ('91000000-0000-4000-8000-000000000013', 'Profile Pick Three', 'manual', '91000000-0000-4000-8000-000000000001'),
  ('91000000-0000-4000-8000-000000000014', 'Profile Pick Four', 'manual', '91000000-0000-4000-8000-000000000001'),
  ('91000000-0000-4000-8000-000000000015', 'Profile Pick Five', 'manual', '91000000-0000-4000-8000-000000000001'),
  ('91000000-0000-4000-8000-000000000016', 'Profile Pick Six', 'manual', '91000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '91000000-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.set_profile_picks('recent', array[
    '91000000-0000-4000-8000-000000000011'::uuid,
    '91000000-0000-4000-8000-000000000012'::uuid
  ])$$,
  'owner can set their picks'
);
select is(
  (select count(*) from public.profile_picks where user_id = auth.uid() and list_type = 'recent'),
  2::bigint,
  'owner can read their picks'
);
select lives_ok(
  $$insert into public.wishlist_items (user_id, artist_id, event_name)
    values (auth.uid(), '91000000-0000-4000-8000-000000000013', 'Sample festival')$$,
  'owner can add a wishlist item'
);

set local "request.jwt.claim.sub" = '91000000-0000-4000-8000-000000000002';
select is(
  (select count(*) from public.profile_picks where user_id = '91000000-0000-4000-8000-000000000001'),
  0::bigint,
  'stranger cannot read picks from a private profile'
);
select is(
  (select count(*) from public.wishlist_items where user_id = '91000000-0000-4000-8000-000000000001'),
  0::bigint,
  'stranger cannot read wishlist from a private profile'
);

set local "request.jwt.claim.sub" = '91000000-0000-4000-8000-000000000001';
select throws_ok(
  $$select public.set_profile_picks('recent', array[
    '91000000-0000-4000-8000-000000000011'::uuid,
    '91000000-0000-4000-8000-000000000012'::uuid,
    '91000000-0000-4000-8000-000000000013'::uuid,
    '91000000-0000-4000-8000-000000000014'::uuid,
    '91000000-0000-4000-8000-000000000015'::uuid,
    '91000000-0000-4000-8000-000000000016'::uuid
  ])$$,
  '22023',
  'A picks list can contain at most five artists',
  'a sixth pick is rejected'
);
select throws_ok(
  $$select public.set_profile_picks('recent', array[
    '91000000-0000-4000-8000-000000000011'::uuid,
    '91000000-0000-4000-8000-000000000011'::uuid
  ])$$,
  '22023',
  'Artist ids must be distinct',
  'duplicate picks are rejected'
);
select lives_ok(
  $$select public.set_profile_picks('recent', '{}'::uuid[])$$,
  'empty picks list is valid'
);
select is(
  (select count(*) from public.profile_picks where user_id = auth.uid() and list_type = 'recent'),
  0::bigint,
  'empty picks list clears prior entries'
);

select * from finish();
rollback;
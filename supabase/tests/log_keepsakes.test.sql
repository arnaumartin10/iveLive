begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, auth, pg_temp;
select plan(11);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'keepsake_owner@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'keepsake_stranger@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'keepsake_follower@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false)
on conflict (id) do nothing;

update public.profiles
set username = case id
      when '91000000-0000-4000-8000-000000000001' then 'keepsake_owner'
      when '91000000-0000-4000-8000-000000000002' then 'keepsake_public'
      else 'keepsake_stranger'
    end,
    is_private = id = '91000000-0000-4000-8000-000000000001'
where id in (
  '91000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000003'
);

insert into public.artists (id, name, genres, source, created_by)
values (
  '91000000-0000-4000-8000-000000000010',
  'Keepsake SQL Test Artist',
  array['indie'],
  'manual',
  '91000000-0000-4000-8000-000000000001'
)
on conflict (id) do nothing;

insert into public.concert_logs (
  id, user_id, artist_id, event_date, venue_type, rating
)
values
  ('91000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000010', date '2025-06-12', 'concert_hall_club', 4.5),
  ('91000000-0000-4000-8000-000000000021', '91000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000010', date '2025-06-13', 'concert_hall_club', 4.5)
on conflict (id) do nothing;

insert into public.log_media (
  id, log_id, user_id, slot, kind, storage_path, thumb_path,
  width, height, size_bytes, mime
)
values (
  '91000000-0000-4000-8000-000000000030',
  '91000000-0000-4000-8000-000000000020',
  '91000000-0000-4000-8000-000000000001',
  'concert_photo',
  'image',
  '91000000-0000-4000-8000-000000000001/91000000-0000-4000-8000-000000000020/concert_photo-00000000-0000-4000-8000-000000000031.jpg',
  '91000000-0000-4000-8000-000000000001/91000000-0000-4000-8000-000000000020/concert_photo-00000000-0000-4000-8000-000000000031-thumb.jpg',
  1600,
  1200,
  12000,
  'image/jpeg'
)
on conflict (id) do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '91000000-0000-4000-8000-000000000001';
select ok(
  public.can_view_log('91000000-0000-4000-8000-000000000020'),
  'owner can view their log'
);

set local "request.jwt.claim.sub" = '91000000-0000-4000-8000-000000000003';
select ok(
  public.can_view_log('91000000-0000-4000-8000-000000000021'),
  'stranger can view a public profile log'
);
select ok(
  not public.can_view_log('91000000-0000-4000-8000-000000000020'),
  'stranger cannot view a private profile log'
);

reset role;
insert into public.follows (follower_id, followee_id, status)
values (
  '91000000-0000-4000-8000-000000000003',
  '91000000-0000-4000-8000-000000000001',
  'accepted'
)
on conflict (follower_id, followee_id) do update set status = 'accepted';

set local role authenticated;
set local "request.jwt.claim.sub" = '91000000-0000-4000-8000-000000000003';
select ok(
  public.can_view_log('91000000-0000-4000-8000-000000000020'),
  'accepted follower can view a private profile log'
);
select is(
  (select count(*)::integer
   from public.get_user_diary('91000000-0000-4000-8000-000000000001')),
  1,
  'visible diary includes the owner log and its media'
);
select is(
  (select media_count from public.get_user_diary('91000000-0000-4000-8000-000000000001')),
  1,
  'diary RPC reports media only for a visible log'
);
select is(
  (select jsonb_array_length(media)
   from public.get_user_diary('91000000-0000-4000-8000-000000000001')),
  1,
  'visible diary log includes its keepsake in the media array'
);

set local "request.jwt.claim.sub" = '91000000-0000-4000-8000-000000000002';
select is(
  (select count(*)::integer
   from public.get_user_diary('91000000-0000-4000-8000-000000000001')),
  0,
  'stranger diary RPC excludes logs on a private profile'
);

reset role;
select throws_ok(
  $$
    insert into public.log_media (
      log_id, user_id, slot, kind, storage_path, thumb_path,
      width, height, size_bytes, mime
    ) values (
      '91000000-0000-4000-8000-000000000020',
      '91000000-0000-4000-8000-000000000001',
      'concert_photo',
      'image',
      'duplicate.jpg',
      'duplicate-thumb.jpg',
      100,
      100,
      100,
      'image/jpeg'
    )
  $$,
  '23505',
  'a log can have only one item in each slot'
);
select throws_ok(
  $$
    insert into public.log_media (
      log_id, user_id, slot, kind, storage_path, thumb_path,
      width, height, duration_ms, size_bytes, mime
    ) values (
      '91000000-0000-4000-8000-000000000020',
      '91000000-0000-4000-8000-000000000001',
      'concert_photo',
      'video',
      'wrong.mp4',
      'wrong-thumb.jpg',
      100,
      100,
      1000,
      1000,
      'video/mp4'
    )
  $$,
  '23514',
  'video is rejected outside the concert video slot'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '91000000-0000-4000-8000-000000000002';
select throws_ok(
  $$
    insert into public.log_media (
      log_id, user_id, slot, kind, storage_path, thumb_path,
      width, height, size_bytes, mime
    ) values (
      '91000000-0000-4000-8000-000000000020',
      '91000000-0000-4000-8000-000000000002',
      'companions_photo',
      'image',
      'not-owner.jpg',
      'not-owner-thumb.jpg',
      100,
      100,
      100,
      'image/jpeg'
    )
  $$,
  '42501',
  'a non-owner cannot insert keepsake media'
);

select * from finish();
rollback;

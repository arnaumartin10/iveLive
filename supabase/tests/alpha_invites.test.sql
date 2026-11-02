begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, auth, pg_temp;
select plan(7);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'alpha_invited@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '91000001-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'alpha_newcomer@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '91000002-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'alpha_second_newcomer@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false)
on conflict (id) do nothing;

insert into public.alpha_invite_codes (code_hash)
values (repeat('a', 64));

insert into public.artists (id, name, genres, source, created_by)
values (
  '92000000-0000-4000-8000-000000000010',
  'Alpha Test Artist',
  array['rock'],
  'manual',
  '91000000-0000-4000-8000-000000000002'
)
on conflict (id) do nothing;

insert into public.alpha_invite_members (user_id)
values ('91000000-0000-4000-8000-000000000001')
on conflict (user_id) do nothing;

select ok(
  (select invite_only from public.alpha_gate_config where singleton),
  'invite-only mode is enabled by default'
);
select ok(
  public.alpha_user_is_allowed('91000000-0000-4000-8000-000000000001'),
  'an invited profile can create content'
);
select ok(
  not public.alpha_user_is_allowed('91000001-0000-4000-8000-000000000002'),
  'a newly created profile cannot create content before redeeming an invite'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '91000001-0000-4000-8000-000000000002';

select throws_ok(
  $$
    insert into public.concert_logs (
      user_id, artist_id, event_date, venue_type
    ) values (
      '91000001-0000-4000-8000-000000000002',
      '92000000-0000-4000-8000-000000000010',
      date '2025-06-13',
      'concert_hall_club'
    )
  $$,
  '42501',
  'ALPHA_INVITE_REQUIRED',
  'an uninvited profile cannot insert a concert log'
);

select throws_ok(
  $$
    update public.profiles
    set bio = 'Not invited yet'
    where id = '91000001-0000-4000-8000-000000000002'
  $$,
  '42501',
  'ALPHA_INVITE_REQUIRED',
  'an uninvited profile cannot edit profile content'
);

select is(
  public.redeem_alpha_invite(repeat('a', 64)),
  true,
  'a valid invite can be redeemed'
);
set local "request.jwt.claim.sub" = '91000002-0000-4000-8000-000000000003';
select throws_ok(
  $$ select public.redeem_alpha_invite(repeat('a', 64)) $$,
  '22023',
  'INVALID_OR_USED_INVITE_CODE',
  'an invite code cannot be redeemed twice'
);

reset role;
select * from finish();
rollback;

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, auth, pg_temp;
select plan(5);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values
  ('00000000-0000-0000-0000-000000000000', '93000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'atlas_owner@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '93000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'atlas_other@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false)
on conflict (id) do nothing;

update public.profiles
set username = case id
      when '93000000-0000-4000-8000-000000000001' then 'atlas_owner'
      else 'atlas_other'
    end
where id in (
  '93000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000002'
);

insert into public.artists (id, name, genres, macro_genres, primary_macro, source)
values (
  '93000000-0000-4000-8000-000000000011',
  'Atlas Test Artist',
  array['indie rock'],
  array['rock', 'indie'],
  'rock',
  'manual'
)
on conflict (id) do nothing;

select has_table('public', 'cloud_layouts', 'cloud layouts persist by user');
select has_function('public', 'user_territory_stats', array['uuid'], 'territory stats RPC exists');

set local role authenticated;
set local "request.jwt.claim.sub" = '93000000-0000-4000-8000-000000000001';
insert into public.concert_logs (user_id, artist_id, event_date, venue_type, rating)
values (auth.uid(), '93000000-0000-4000-8000-000000000011', date '2024-06-01', 'festival', 4.5);

select is(
  (select concert_count from public.user_territory_stats(auth.uid()) where macro_slug = 'rock'),
  1,
  'territory aggregates the owner’s logged concerts'
);

insert into public.cloud_layouts (user_id, mode, layout_version, positions)
values (auth.uid(), 'genre', 1, '{"artist-a":{"x":12,"y":-8}}');
select is(
  (select positions->'artist-a'->>'x' from public.cloud_layouts where user_id = auth.uid() and mode = 'genre'),
  '12',
  'a user can persist their own layout'
);

set local "request.jwt.claim.sub" = '93000000-0000-4000-8000-000000000002';
select is(
  (select count(*)::integer from public.cloud_layouts),
  0,
  'another user cannot read a private layout'
);

select * from finish();
rollback;

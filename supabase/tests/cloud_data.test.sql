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
  ('00000000-0000-0000-0000-000000000000', '92000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'cloud_empty@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '92000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'cloud_owner@test.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false)
on conflict (id) do nothing;

update public.profiles
set username = case id
      when '92000000-0000-4000-8000-000000000001' then 'cloud_empty'
      else 'cloud_owner'
    end
where id in (
  '92000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000002'
);

insert into public.artists (id, name, genres, source)
values
  ('92000000-0000-4000-8000-000000000011', 'Cloud Artist One', array['indie rock'], 'manual'),
  ('92000000-0000-4000-8000-000000000012', 'Cloud Artist Two', array['rock'], 'manual')
on conflict (id) do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '92000000-0000-4000-8000-000000000001';
select is(
  public.user_cloud_data(auth.uid())->'artists',
  '[]'::jsonb,
  'an empty user gets an empty artists array'
);

set local "request.jwt.claim.sub" = '92000000-0000-4000-8000-000000000002';
insert into public.concert_logs (user_id, artist_id, event_date, venue_type, venue_name, rating)
values (
  auth.uid(),
  '92000000-0000-4000-8000-000000000011',
  date '2024-05-01',
  'festival',
  'Shared Stage',
  5
);

select is(
  (public.user_cloud_data(auth.uid())->'artists'->0->>'log_count')::integer,
  1,
  'single log returns one artist and count'
);
select is(
  public.user_cloud_data(auth.uid(), 2024)->'artists'->0->>'first_seen',
  '2024-05-01',
  'year filter retains only matching logs'
);

insert into public.concert_logs (user_id, artist_id, event_date, venue_type, venue_name, rating)
values (
  auth.uid(),
  '92000000-0000-4000-8000-000000000012',
  date '2024-05-01',
  'festival',
  'Shared Stage',
  4
);
select is(
  (public.user_cloud_data(auth.uid())->'links'->0->>'weight')::integer,
  1,
  'artists logged on the same date produce a co-attendance link'
);
select is(
  (public.user_cloud_data(auth.uid(), 2025)->'artists'),
  '[]'::jsonb,
  'year filter returns no artists when none match'
);

select * from finish();
rollback;

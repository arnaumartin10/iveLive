begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, auth, pg_temp;
select plan(11);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values (
  '00000000-0000-0000-0000-000000000000',
  '94000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'catalog-limit@test.invalid', '',
  now(), '{"provider":"email","providers":["email"]}', '{}',
  now(), now(), false, false
)
on conflict (id) do nothing;

insert into public.genre_pages (
  slug, title, tagline, summary, origin_place, origin_years
)
values (
  'rock', 'Rock', 'A test page.', 'Catalog queue test.', 'Test', '2020s'
)
on conflict (slug) do nothing;

delete from public.catalog_queue
where name_normalized = 'catalog unresolved fixture'
  and genre_slug = 'rock'
  and role = 'pillar';

insert into public.catalog_queue (
  name, name_normalized, genre_slug, role, position, priority
)
values (
  'Catalog Unresolved Fixture',
  'catalog unresolved fixture',
  'rock',
  'pillar',
  1,
  1
);

select ok(
  has_table('public', 'catalog_queue'),
  'catalog queue table exists'
);
select ok(
  not has_table_privilege('authenticated', 'public.catalog_queue', 'SELECT'),
  'authenticated clients cannot query the queue directly'
);
select ok(
  has_table_privilege('service_role', 'public.catalog_queue', 'SELECT'),
  'service role can query the queue'
);
select ok(
  not has_table_privilege('authenticated', 'public.catalog_progress', 'SELECT'),
  'authenticated clients cannot query catalog progress directly'
);

delete from public.spotify_search_cache
where name_normalized = 'catalog test lock';
set local role service_role;
select ok(
  public.claim_spotify_search('catalog test lock', 120),
  'the first request claims the search lease'
);
select ok(
  not public.claim_spotify_search('catalog test lock', 120),
  'a concurrent request cannot claim the active search lease'
);
select ok(
  (select bool_and(public.consume_catalog_resolution_limit(
    '94000000-0000-4000-8000-000000000001',
    10
  )) from generate_series(1, 10)),
  'the per-user limit permits ten resolutions'
);
select ok(
  not public.consume_catalog_resolution_limit(
    '94000000-0000-4000-8000-000000000001',
    10
  ),
  'the per-user limit blocks the eleventh resolution'
);
reset role;

set local role authenticated;
select is(
  public.get_genre_page('rock')->'pillars'->0->>'name',
  'Catalog Unresolved Fixture',
  'genre page returns the unresolved catalog name'
);
select is(
  public.get_genre_page('rock')->'pillars'->0->>'id',
  null,
  'unresolved catalog feature has a null artist id'
);
select ok(
  public.get_genre_page('rock')->'pillars'->0->>'catalog_queue_id' is not null,
  'unresolved catalog feature includes its queue id'
);

reset role;
delete from public.spotify_search_cache
where name_normalized = 'catalog test lock';
delete from public.catalog_queue
where name_normalized = 'catalog unresolved fixture'
  and genre_slug = 'rock'
  and role = 'pillar';
select * from finish();
rollback;

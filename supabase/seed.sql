insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'aria@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Aria Sample"}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'ben@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Ben Sample"}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'cora@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Cora Sample"}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'dev@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Dev Sample"}', now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'eli@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Eli Sample"}', now(), now(), false, false)
on conflict (id) do nothing;

update public.profiles
set username = case id
      when '10000000-0000-4000-8000-000000000001' then 'aria_sample'
      when '10000000-0000-4000-8000-000000000002' then 'ben_sample'
      when '10000000-0000-4000-8000-000000000003' then 'cora_sample'
      when '10000000-0000-4000-8000-000000000004' then 'dev_sample'
      when '10000000-0000-4000-8000-000000000005' then 'eli_sample'
    end,
    display_name = case id
      when '10000000-0000-4000-8000-000000000001' then 'Aria Sample'
      when '10000000-0000-4000-8000-000000000002' then 'Ben Sample'
      when '10000000-0000-4000-8000-000000000003' then 'Cora Sample'
      when '10000000-0000-4000-8000-000000000004' then 'Dev Sample'
      when '10000000-0000-4000-8000-000000000005' then 'Eli Sample'
    end,
    is_private = id = '10000000-0000-4000-8000-000000000001'
where id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000005'
);

insert into public.artists (
  id, spotify_id, name, genres, popularity, source, created_by, last_synced_at
)
values
  ('20000000-0000-4000-8000-000000000001', 'seed_spotify_01', 'Velvet Satellite', array['dream pop', 'shoegaze'], 82, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000002', 'seed_spotify_02', 'Mosaic Hearts', array['indie rock', 'indie pop'], 76, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000003', null, 'Northbound Paper', array['folk', 'singer-songwriter'], null, 'manual', '10000000-0000-4000-8000-000000000001', null),
  ('20000000-0000-4000-8000-000000000004', 'seed_spotify_04', 'Electric Orchard', array['techno', 'minimal techno'], 73, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000005', null, 'Golden Hour Club', array['neo soul', 'r&b'], null, 'manual', '10000000-0000-4000-8000-000000000002', null),
  ('20000000-0000-4000-8000-000000000006', 'seed_spotify_06', 'Paper Tigers', array['punk rock', 'hardcore punk'], 69, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000007', 'seed_spotify_07', 'Low Orbit', array['post-rock', 'alternative rock'], 65, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000008', null, 'Marble Choir', array['modern classical', 'chamber music'], null, 'manual', '10000000-0000-4000-8000-000000000003', null),
  ('20000000-0000-4000-8000-000000000009', 'seed_spotify_09', 'Copper Avenue', array['hard rock', 'blues rock'], 78, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000010', 'seed_spotify_10', 'Luna de Sal', array['rumba catalana', 'flamenco'], 61, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000011', null, 'Static Bloom', array['indie pop', 'bedroom pop'], null, 'manual', '10000000-0000-4000-8000-000000000004', null),
  ('20000000-0000-4000-8000-000000000012', 'seed_spotify_12', 'Neon Undertow', array['house', 'deep house'], 72, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000013', 'seed_spotify_13', 'Basement Poets', array['hip hop', 'boom bap'], 68, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000014', null, 'Amber Current', array['jazz fusion', 'acid jazz'], null, 'manual', '10000000-0000-4000-8000-000000000005', null),
  ('20000000-0000-4000-8000-000000000015', 'seed_spotify_15', 'Iron Comet', array['death metal', 'progressive metal'], 58, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000016', 'seed_spotify_16', 'Cielo Eléctrico', array['reggaeton', 'latin pop'], 85, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000017', null, 'Wildflower Letters', array['americana', 'country folk'], null, 'manual', '10000000-0000-4000-8000-000000000001', null),
  ('20000000-0000-4000-8000-000000000018', 'seed_spotify_18', 'Silver Static', array['synth-pop', 'new wave'], 71, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000019', 'seed_spotify_19', 'Kite Theory', array['drum and bass', 'future bass'], 63, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000020', null, 'Río y Raíz', array['cantautor', 'rumba catalana'], null, 'manual', '10000000-0000-4000-8000-000000000002', null),
  ('20000000-0000-4000-8000-000000000021', 'seed_spotify_21', 'Velour Cinema', array['chamber pop', 'baroque pop'], 67, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000022', 'seed_spotify_22', 'Granite Youth', array['thrash metal', 'metalcore'], 55, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000023', null, 'Blue Lanterns', array['bebop', 'blues'], null, 'manual', '10000000-0000-4000-8000-000000000003', null),
  ('20000000-0000-4000-8000-000000000024', 'seed_spotify_24', 'Palm Reader', array['bachata', 'cumbia'], 74, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000025', 'seed_spotify_25', 'Soft Machine Room', array['ambient techno', 'downtempo'], 62, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000026', null, 'Sunday Telegraph', array['indie folk', 'acoustic'], null, 'manual', '10000000-0000-4000-8000-000000000004', null),
  ('20000000-0000-4000-8000-000000000027', 'seed_spotify_27', 'Redline Parade', array['pop punk', 'ska punk'], 70, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000028', 'seed_spotify_28', 'Orchestra of Small Things', array['classical', 'film score'], 51, 'spotify', null, now()),
  ('20000000-0000-4000-8000-000000000029', null, 'Saffron Signals', array['afrobeat', 'highlife'], null, 'manual', '10000000-0000-4000-8000-000000000005', null),
  ('20000000-0000-4000-8000-000000000030', 'seed_spotify_30', 'Night Market FM', array['trap', 'latin trap'], 80, 'spotify', null, now())
on conflict (id) do update
set spotify_id = excluded.spotify_id,
    name = excluded.name,
    genres = excluded.genres,
    popularity = excluded.popularity,
    source = excluded.source,
    created_by = excluded.created_by,
    last_synced_at = excluded.last_synced_at;

insert into public.follows (follower_id, followee_id)
values
  ('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004'),
  ('10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004'),
  ('10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000005'),
  ('10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002')
on conflict do nothing;

insert into public.concert_logs (
  id, user_id, artist_id, event_date, venue_type, venue_name, rating, review
)
select
  ('30000000-0000-4000-8000-' || lpad(events.n::text, 12, '0'))::uuid,
  case ((events.n - 1) % 5)
    when 0 then '10000000-0000-4000-8000-000000000001'::uuid
    when 1 then '10000000-0000-4000-8000-000000000002'::uuid
    when 2 then '10000000-0000-4000-8000-000000000003'::uuid
    when 3 then '10000000-0000-4000-8000-000000000004'::uuid
    else '10000000-0000-4000-8000-000000000005'::uuid
  end,
  ('20000000-0000-4000-8000-' || lpad((((events.n - 1) % 30) + 1)::text, 12, '0'))::uuid,
  date '2012-01-01' + ((events.n * 67) % 5400),
  (array[
    'festival', 'concert_hall_club', 'stadium',
    'indoor_arena', 'festa_major', 'other'
  ]::public.venue_type[])[((events.n - 1) % 6) + 1],
  case ((events.n - 1) % 6)
    when 0 then 'Open Air Stage ' || events.n
    when 1 then 'The Listening Room ' || events.n
    when 2 then 'North Stadium ' || events.n
    when 3 then 'City Arena ' || events.n
    when 4 then 'Town Square ' || events.n
    else 'Riverside Warehouse ' || events.n
  end,
  (0.5 + ((events.n * 7) % 10) * 0.5)::numeric(2, 1),
  case when events.n % 4 = 0 then 'A night worth remembering.' else null end
from generate_series(1, 80) as events(n)
on conflict (id) do nothing;
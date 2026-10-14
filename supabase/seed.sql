-- ==============================================================================
-- IveLive Seed Data
-- Sample artists, venues, and initial records for local testing
-- ==============================================================================

-- 1. Sample Artists
insert into public.artists (id, name, spotify_id, image_url, genres) values
  ('a1111111-1111-1111-1111-111111111111', 'Radiohead', '4Z8W4fKeB5YxbusRsdQVPb', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop', array['art rock', 'alternative rock', 'electronic']),
  ('a2222222-2222-2222-2222-222222222222', 'Rosalía', '7ltDVBr6mKhRvJCcedOaq3', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop', array['flamenco nuevo', 'latin pop', 'reggaeton']),
  ('a3333333-3333-3333-3333-333333333333', 'The Strokes', '0epOFNiUfyON9DRx7rtzXM', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop', array['garage rock revival', 'indie rock', 'post-punk revival']),
  ('a4444444-4444-4444-4444-444444444444', 'Dua Lipa', '6M2wZ9GZgrQXHCFfjv46we', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop', array['dance pop', 'pop', 'disco']),
  ('a5555555-5555-5555-5555-555555555555', 'Fontaines D.C.', '3ZZAL1mC5p9c8gVpX5iM3O', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop', array['post-punk', 'irish indie', 'alternative rock']),
  ('a6666666-6666-6666-6666-666666666666', 'LCD Soundsystem', '066X20Nz7iquqkk9J6GtAU', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop', array['dance-punk', 'alternative dance', 'electronic']),
  ('a7777777-7777-7777-7777-777777777777', 'Fred again..', '4oLeDaHGWFk2NgkfeZ43AY', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop', array['uk dance', 'house', 'electronic']),
  ('a8888888-8888-8888-8888-888888888888', 'Arctic Monkeys', '7Ln80gUS6He07XvHI8qqHH', 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=600&auto=format&fit=crop', array['garage rock', 'indie rock', 'modern rock'])
on conflict (id) do nothing;

-- 2. Sample Venues
insert into public.venues (id, name, city, country, latitude, longitude) values
  ('v1111111-1111-1111-1111-111111111111', 'Parc del Fòrum (Primavera Sound)', 'Barcelona', 'Spain', 41.4116, 2.2241),
  ('v2222222-2222-2222-2222-222222222222', 'Razzmatazz', 'Barcelona', 'Spain', 41.3977, 2.1911),
  ('v3333333-3333-3333-3333-333333333333', 'Palau Sant Jordi', 'Barcelona', 'Spain', 41.3639, 2.1528),
  ('v4444444-4444-4444-4444-444444444444', 'Wembley Stadium', 'London', 'United Kingdom', 51.5560, -0.2795),
  ('v5555555-5555-5555-5555-555555555555', 'Red Rocks Amphitheatre', 'Morrison', 'United States', 39.6654, -105.2057),
  ('v6666666-6666-6666-6666-666666666666', 'Accor Arena', 'Paris', 'France', 48.8386, 2.3789)
on conflict (id) do nothing;

alter table public.artists
  add column bio text,
  add column bio_source text,
  add column bio_url text,
  add column bio_lang text,
  add column bio_attribution text,
  add column group_image_url text,
  add column banner_image_url text,
  add column musicbrainz_id uuid,
  add column wikidata_id text,
  add column wikipedia_title text,
  add column lastfm_tags jsonb not null default '[]'::jsonb,
  add column enrichment_status text not null default 'pending',
  add column enriched_at timestamptz,
  add column last_enrichment_requested_at timestamptz,
  add column user_edited_fields text[] not null default '{}',
  add constraint artists_enrichment_status_check
    check (enrichment_status in ('pending', 'partial', 'done', 'failed')),
  add constraint artists_lastfm_tags_array_check
    check (jsonb_typeof(lastfm_tags) = 'array');

create table public.artist_albums (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  title text not null,
  year integer,
  cover_url text,
  cover_thumb_url text,
  musicbrainz_release_group_id uuid not null,
  type text not null check (type in ('album', 'ep', 'single')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (artist_id, musicbrainz_release_group_id)
);

create index artist_albums_artist_sort_idx
  on public.artist_albums (artist_id, sort_order, year desc);

create table public.genre_tag_denylist (
  tag text primary key,
  created_at timestamptz not null default now()
);

insert into public.genre_tag_denylist (tag)
select unnest(array[
  'seen live', 'favorites', 'favourite', 'favorite', 'british', 'american',
  'spanish', 'catalan', 'male vocalists', 'female vocalists',
  'under 2000 listeners', 'under 1000 listeners', 'under 5000 listeners',
  'under 10000 listeners', 'seen live 2020', 'seen live 2021',
  'seen live 2022', 'seen live 2023', 'seen live 2024', 'seen live 2025',
  'united states', 'united kingdom', 'england', 'scotland', 'wales', 'ireland',
  'france', 'germany', 'italy', 'portugal', 'mexico', 'argentina', 'brazil',
  'canada', 'australia', 'sweden', 'norway', 'finland', 'japan', 'korea',
  'barcelona', 'madrid', 'london', 'new york', 'los angeles', 'live', 'albums i own',
  'english', 'french', 'german', 'italian', 'portuguese', 'argentinian',
  'mexican', 'brazilian', 'canadian', 'australian', 'swedish', 'norwegian',
  'finnish', 'japanese', 'korean', 'dutch', 'belgian', 'danish', 'polish',
  'greek', 'turkish', 'russian', 'ukrainian', 'chinese', 'indian', 'african',
  'european', 'asian', 'american singer', 'from barcelona', 'from madrid',
  'from london', 'from new york', 'from los angeles', 'from catalonia',
  'from spain', 'from the united states', 'from the uk', 'from england',
  'from france', 'from germany', 'from italy', 'from portugal', 'from mexico',
  'from argentina', 'from brazil', 'from canada', 'from australia',
  'from sweden', 'from norway', 'from finland', 'from japan', 'from korea'
])
on conflict (tag) do nothing;

insert into public.genre_tag_denylist (tag)
select unnest(array[
  'irish', 'welsh', 'scottish', 'chilean', 'colombian', 'peruvian', 'cuban',
  'puerto rican', 'dominican', 'venezuelan', 'uruguayan', 'jamaican', 'nigerian',
  'south african', 'south korean', 'north korean', 'taiwanese', 'indonesian',
  'thai', 'filipino', 'new zealander', 'icelandic', 'austrian', 'swiss', 'czech',
  'hungarian', 'romanian', 'serbian', 'croatian', 'slovenian', 'bulgarian',
  'israeli', 'arabic', 'middle eastern', 'african-american', 'scandinavian',
  'sheffield', 'liverpool', 'manchester', 'birmingham', 'glasgow', 'edinburgh',
  'dublin', 'paris', 'berlin', 'rome', 'lisbon', 'tokyo', 'seoul', 'melbourne',
  'sydney', 'toronto', 'montreal', 'chicago', 'detroit', 'nashville', 'atlanta',
  'san francisco', 'miami', 'mexico city', 'buenos aires', 'sao paulo', 'são paulo',
  'bogota', 'bogotá', 'santiago', 'copenhagen', 'amsterdam', 'brussels', 'vienna',
  'prague', 'warsaw', 'moscow', 'kyiv', 'istanbul', 'athens', 'tel aviv', 'seattle',
  'portland', 'brooklyn', 'queens', 'manila', 'jakarta', 'auckland', 'reykjavik'
])
on conflict (tag) do nothing;

alter table public.artists drop constraint artists_primary_macro_check;
alter table public.artists add constraint artists_primary_macro_check check (
  primary_macro is null or primary_macro in (
    'rock', 'indie', 'pop', 'electronic', 'hip_hop', 'rnb_soul', 'metal',
    'punk', 'folk_acoustic', 'jazz_blues', 'latin', 'classical', 'world',
    'other', 'unclassified'
  )
);

alter table public.genre_rules drop constraint genre_rules_macro_slug_check;
alter table public.genre_rules add constraint genre_rules_macro_slug_check check (
  macro_slug in (
    'rock', 'indie', 'pop', 'electronic', 'hip_hop', 'rnb_soul', 'metal',
    'punk', 'folk_acoustic', 'jazz_blues', 'latin', 'classical', 'world', 'other'
  )
);

insert into public.genre_rules (keyword, macro_slug, priority)
select distinct on (keyword) keyword, macro_slug, priority
from (values
  ('alternative', 'indie', 50), ('alternative rock', 'rock', 90),
  ('indie', 'indie', 60), ('indie pop', 'indie', 110),
  ('indie rock', 'indie', 105), ('indie folk', 'indie', 105),
  ('indie electronic', 'indie', 100), ('indie punk', 'indie', 100),
  ('indie soul', 'indie', 100), ('indie jazz', 'indie', 100),
  ('indie hip hop', 'indie', 100), ('indie hip-hop', 'indie', 100),
  ('indie r&b', 'indie', 100), ('indie rock', 'indie', 110),
  ('synthpop', 'pop', 100), ('synth pop', 'pop', 100),
  ('synth-pop', 'pop', 100), ('electro pop', 'pop', 95),
  ('electropop', 'pop', 100), ('pop-rock', 'rock', 90),
  ('pop rock', 'rock', 90), ('pop punk', 'punk', 100),
  ('power pop', 'pop', 100), ('chamber pop', 'indie', 105),
  ('dream pop', 'indie', 110), ('baroque pop', 'pop', 100),
  ('art pop', 'pop', 100), ('dance pop', 'pop', 100),
  ('teen pop', 'pop', 95), ('bubblegum pop', 'pop', 95),
  ('k-pop', 'pop', 100), ('kpop', 'pop', 100), ('j-pop', 'pop', 100),
  ('jpop', 'pop', 100), ('c-pop', 'pop', 95), ('mandopop', 'pop', 95),
  ('cantopop', 'pop', 95), ('latin pop', 'latin', 110),
  ('pop latino', 'latin', 110), ('latin rock', 'latin', 105),
  ('latin alternative', 'latin', 105), ('latin indie', 'latin', 100),
  ('latin folk', 'latin', 100), ('latin urban', 'latin', 100),
  ('urbano latino', 'latin', 105), ('reggaeton', 'latin', 110),
  ('reggaeton viejo', 'latin', 105), ('reggaeton flow', 'latin', 105),
  ('flamenco', 'latin', 110), ('nuevo flamenco', 'latin', 115),
  ('flamenco pop', 'latin', 110), ('rumba', 'latin', 100),
  ('rumba catalana', 'latin', 120), ('rumba flamenca', 'latin', 110),
  ('canço', 'folk_acoustic', 105), ('canco', 'folk_acoustic', 105),
  ('cançó', 'folk_acoustic', 110), ('rock català', 'rock', 110),
  ('rock catala', 'rock', 110), ('pop català', 'pop', 105),
  ('pop catala', 'pop', 105), ('indie català', 'indie', 110),
  ('indie catala', 'indie', 110), ('folk català', 'folk_acoustic', 110),
  ('folk catala', 'folk_acoustic', 110), ('singer songwriter', 'folk_acoustic', 100),
  ('singer-songwriter', 'folk_acoustic', 110), ('cantautor', 'folk_acoustic', 105),
  ('cantautora', 'folk_acoustic', 105), ('songwriter', 'folk_acoustic', 90),
  ('folk', 'folk_acoustic', 70), ('folk rock', 'rock', 95),
  ('folk pop', 'folk_acoustic', 95), ('folk punk', 'punk', 100),
  ('indie folk', 'indie', 110), ('acoustic', 'folk_acoustic', 60),
  ('americana', 'folk_acoustic', 100), ('country', 'folk_acoustic', 75),
  ('bluegrass', 'folk_acoustic', 100), ('alt-country', 'folk_acoustic', 100),
  ('jazz', 'jazz_blues', 65), ('jazz fusion', 'jazz_blues', 110),
  ('jazz funk', 'jazz_blues', 105), ('acid jazz', 'jazz_blues', 105),
  ('smooth jazz', 'jazz_blues', 105), ('vocal jazz', 'jazz_blues', 100),
  ('bebop', 'jazz_blues', 100), ('swing', 'jazz_blues', 90),
  ('blues', 'jazz_blues', 65), ('blues rock', 'rock', 100),
  ('soul', 'rnb_soul', 80), ('neo soul', 'rnb_soul', 110),
  ('northern soul', 'rnb_soul', 105), ('motown', 'rnb_soul', 100),
  ('funk', 'rnb_soul', 80), ('r&b', 'rnb_soul', 90),
  ('rhythm and blues', 'rnb_soul', 90), ('contemporary r&b', 'rnb_soul', 110),
  ('alternative r&b', 'rnb_soul', 110), ('trap soul', 'rnb_soul', 105),
  ('hip-hop', 'hip_hop', 95), ('hip hop', 'hip_hop', 95),
  ('hiphop', 'hip_hop', 90), ('rap', 'hip_hop', 80),
  ('trap', 'hip_hop', 85), ('latin trap', 'latin', 120),
  ('drill', 'hip_hop', 90), ('uk drill', 'hip_hop', 110),
  ('grime', 'hip_hop', 95), ('boom bap', 'hip_hop', 105),
  ('cloud rap', 'hip_hop', 110), ('conscious hip hop', 'hip_hop', 110),
  ('alternative hip hop', 'hip_hop', 110), ('gangsta rap', 'hip_hop', 100),
  ('emo rap', 'hip_hop', 100), ('jazz rap', 'hip_hop', 100),
  ('techno', 'electronic', 90), ('house', 'electronic', 85),
  ('deep house', 'electronic', 110), ('tech house', 'electronic', 110),
  ('progressive house', 'electronic', 110), ('afro house', 'electronic', 110),
  ('acid house', 'electronic', 110), ('disco house', 'electronic', 105),
  ('minimal techno', 'electronic', 110), ('hard techno', 'electronic', 110),
  ('melodic techno', 'electronic', 110), ('industrial techno', 'electronic', 110),
  ('detroit techno', 'electronic', 110), ('trance', 'electronic', 95),
  ('psytrance', 'electronic', 105), ('progressive trance', 'electronic', 105),
  ('drum and bass', 'electronic', 110), ('drum & bass', 'electronic', 110),
  ('dnb', 'electronic', 100), ('liquid drum and bass', 'electronic', 110),
  ('jungle', 'electronic', 95), ('breakbeat', 'electronic', 100),
  ('breaks', 'electronic', 90), ('dubstep', 'electronic', 100),
  ('brostep', 'electronic', 105), ('future bass', 'electronic', 105),
  ('bass music', 'electronic', 95), ('edm', 'electronic', 85),
  ('electronic dance music', 'electronic', 100), ('electronica', 'electronic', 80),
  ('electro', 'electronic', 80), ('ambient', 'electronic', 75),
  ('dark ambient', 'electronic', 100), ('downtempo', 'electronic', 90),
  ('trip hop', 'electronic', 95), ('trip-hop', 'electronic', 100),
  ('idm', 'electronic', 95), ('industrial', 'electronic', 80),
  ('new wave', 'indie', 90), ('post-punk', 'indie', 100),
  ('post punk', 'indie', 100), ('post-punk revival', 'indie', 110),
  ('garage rock', 'rock', 105), ('garage punk', 'punk', 105),
  ('punk', 'punk', 60), ('punk rock', 'punk', 100),
  ('hardcore', 'punk', 85), ('hardcore punk', 'punk', 110),
  ('post-hardcore', 'punk', 105), ('post hardcore', 'punk', 105),
  ('ska', 'world', 85), ('ska punk', 'punk', 110),
  ('ska-punk', 'punk', 110), ('reggae', 'world', 95),
  ('dancehall', 'world', 95), ('dub', 'world', 85),
  ('roots reggae', 'world', 105), ('afrobeat', 'world', 105),
  ('afrobeats', 'world', 105), ('highlife', 'world', 100),
  ('world music', 'world', 90), ('bossa nova', 'latin', 100),
  ('salsa', 'latin', 105), ('bachata', 'latin', 105),
  ('cumbia', 'latin', 105), ('merengue', 'latin', 100),
  ('samba', 'latin', 95), ('tango', 'latin', 95),
  ('corridos tumbados', 'latin', 110), ('regional mexicano', 'latin', 105),
  ('mariachi', 'latin', 100), ('classical', 'classical', 70),
  ('modern classical', 'classical', 110), ('contemporary classical', 'classical', 110),
  ('neoclassical', 'classical', 100), ('baroque', 'classical', 100),
  ('opera', 'classical', 90), ('orchestral', 'classical', 90),
  ('soundtrack', 'classical', 80), ('film score', 'classical', 100),
  ('metal', 'metal', 60), ('heavy metal', 'metal', 110),
  ('death metal', 'metal', 120), ('black metal', 'metal', 120),
  ('thrash metal', 'metal', 120), ('doom metal', 'metal', 120),
  ('power metal', 'metal', 120), ('progressive metal', 'metal', 120),
  ('metalcore', 'metal', 110), ('deathcore', 'metal', 110),
  ('nu metal', 'metal', 110), ('post-metal', 'metal', 110),
  ('rock', 'rock', 55), ('classic rock', 'rock', 110),
  ('hard rock', 'rock', 110), ('alternative rock', 'rock', 100),
  ('psychedelic rock', 'rock', 110), ('progressive rock', 'rock', 110),
  ('post-rock', 'rock', 100), ('art rock', 'rock', 100),
  ('soft rock', 'rock', 95), ('glam rock', 'rock', 100),
  ('britpop', 'indie', 100), ('shoegaze', 'indie', 110),
  ('dream pop', 'indie', 115), ('noise pop', 'indie', 105),
  ('bedroom pop', 'indie', 105), ('lo-fi', 'indie', 75),
  ('slacker rock', 'indie', 100), ('college rock', 'indie', 100),
  ('world', 'world', 45), ('latin', 'latin', 55),
  ('pop', 'pop', 45), ('electronic', 'electronic', 45),
  ('math rock', 'rock', 105), ('krautrock', 'rock', 105),
  ('grunge', 'rock', 100), ('post-grunge', 'rock', 105),
  ('psychedelic', 'rock', 85), ('psych rock', 'rock', 100),
  ('stoner rock', 'rock', 105), ('stoner', 'rock', 80),
  ('southern rock', 'rock', 105), ('arena rock', 'rock', 100),
  ('rock en español', 'rock', 110), ('rock en espanol', 'rock', 110),
  ('rock nacional', 'rock', 100), ('rock alternativo', 'rock', 100),
  ('alternative rock', 'rock', 105), ('indie dance', 'indie', 105),
  ('indie emo', 'indie', 100), ('indie garage', 'indie', 100),
  ('indie alternative', 'indie', 100), ('indie psychedelia', 'indie', 100),
  ('indie electronic', 'indie', 100), ('indie dance rock', 'indie', 105),
  ('jangle pop', 'indie', 105), ('twee pop', 'indie', 105),
  ('noise rock', 'rock', 100), ('noise pop', 'indie', 105),
  ('art punk', 'punk', 105), ('anarcho punk', 'punk', 100),
  ('crust punk', 'punk', 110), ('street punk', 'punk', 105),
  ('oi', 'punk', 80), ('screamo', 'punk', 105),
  ('emo', 'punk', 85), ('emo pop', 'punk', 95),
  ('melodic hardcore', 'punk', 105), ('hardcore punk', 'punk', 115),
  ('post-punk', 'indie', 105), ('coldwave', 'indie', 100),
  ('darkwave', 'indie', 95), ('new romantic', 'pop', 95),
  ('sophisti-pop', 'pop', 100), ('sophisti pop', 'pop', 100),
  ('indie sleaze', 'indie', 95), ('sunshine pop', 'pop', 95),
  ('orchestral pop', 'pop', 100), ('psychedelic pop', 'pop', 100),
  ('sugar pop', 'pop', 90), ('chanson', 'folk_acoustic', 85),
  ('chanson française', 'folk_acoustic', 100), ('chanson francaise', 'folk_acoustic', 100),
  ('yé-yé', 'pop', 95), ('ye-ye', 'pop', 95),
  ('city pop', 'pop', 100), ('idol pop', 'pop', 90),
  ('indie sleaze', 'indie', 100), ('bedroom soul', 'rnb_soul', 95),
  ('alternative soul', 'rnb_soul', 100), ('modern soul', 'rnb_soul', 100),
  ('deep soul', 'rnb_soul', 95), ('quiet storm', 'rnb_soul', 100),
  ('new jack swing', 'rnb_soul', 100), ('neo funk', 'rnb_soul', 95),
  ('g-funk', 'hip_hop', 100), ('west coast hip hop', 'hip_hop', 100),
  ('east coast hip hop', 'hip_hop', 100), ('southern hip hop', 'hip_hop', 100),
  ('underground hip hop', 'hip_hop', 100), ('uk hip hop', 'hip_hop', 100),
  ('uk rap', 'hip_hop', 95), ('spanish hip hop', 'hip_hop', 100),
  ('spanish rap', 'hip_hop', 100), ('latin hip hop', 'latin', 110),
  ('latin hip-hop', 'latin', 110), ('reggaeton', 'latin', 115),
  ('perreo', 'latin', 100), ('dembow', 'latin', 100),
  ('neo perreo', 'latin', 100), ('bachata urbana', 'latin', 105),
  ('salsa romantica', 'latin', 100), ('salsa romántica', 'latin', 100),
  ('son cubano', 'latin', 100), ('bolero', 'latin', 95),
  ('vallenato', 'latin', 100), ('cuarteto', 'latin', 95),
  ('corrido', 'latin', 95), ('corridos', 'latin', 95),
  ('norteño', 'latin', 100), ('norteno', 'latin', 100),
  ('música mexicana', 'latin', 105), ('musica mexicana', 'latin', 105),
  ('brazilian pop', 'latin', 100), ('mpb', 'latin', 100),
  ('tropicalia', 'latin', 95), ('tropicalismo', 'latin', 95),
  ('fado', 'world', 100), ('afropop', 'world', 95),
  ('afro pop', 'world', 95), ('afro-fusion', 'world', 100),
  ('amapiano', 'world', 100), ('kwaito', 'world', 95),
  ('highlife', 'world', 100), ('reggae fusion', 'world', 100),
  ('rocksteady', 'world', 95), ('ska', 'world', 85),
  ('calypso', 'world', 95), ('soca', 'world', 95),
  ('flamenco nuevo', 'latin', 105), ('copla', 'latin', 90),
  ('cançó d autor', 'folk_acoustic', 110), ('nova cançó', 'folk_acoustic', 115),
  ('nova canco', 'folk_acoustic', 110), ('folk rock', 'rock', 100),
  ('indie folk', 'indie', 115), ('neofolk', 'folk_acoustic', 100),
  ('dark folk', 'folk_acoustic', 100), ('psych folk', 'folk_acoustic', 95),
  ('freak folk', 'folk_acoustic', 100), ('folk metal', 'metal', 110),
  ('contemporary bluegrass', 'folk_acoustic', 100), ('old-time', 'folk_acoustic', 90),
  ('swing jazz', 'jazz_blues', 100), ('gypsy jazz', 'jazz_blues', 100),
  ('free jazz', 'jazz_blues', 100), ('spiritual jazz', 'jazz_blues', 100),
  ('nu jazz', 'jazz_blues', 100), ('jazz vocal', 'jazz_blues', 95),
  ('delta blues', 'jazz_blues', 100), ('chicago blues', 'jazz_blues', 100),
  ('country blues', 'jazz_blues', 95), ('boogie woogie', 'jazz_blues', 90),
  ('drone', 'electronic', 80), ('glitch', 'electronic', 85),
  ('glitch hop', 'electronic', 100), ('footwork', 'electronic', 95),
  ('juke', 'electronic', 90), ('uk bass', 'electronic', 95),
  ('bassline', 'electronic', 90), ('future garage', 'electronic', 100),
  ('speed garage', 'electronic', 100), ('garage house', 'electronic', 100),
  ('afro tech', 'electronic', 95), ('organic house', 'electronic', 100),
  ('melodic house', 'electronic', 100), ('hardstyle', 'electronic', 100),
  ('hardcore techno', 'electronic', 100), ('gabber', 'electronic', 95),
  ('goa trance', 'electronic', 100), ('acid techno', 'electronic', 100),
  ('minimal', 'electronic', 70), ('synthwave', 'electronic', 100),
  ('retrowave', 'electronic', 95), ('vaporwave', 'electronic', 95),
  ('chiptune', 'electronic', 90), ('electroclash', 'electronic', 95),
  ('witch house', 'electronic', 95), ('futurepop', 'electronic', 95),
  ('dark electro', 'electronic', 95), ('ebm', 'electronic', 90),
  ('industrial metal', 'metal', 105), ('symphonic metal', 'metal', 110),
  ('gothic metal', 'metal', 105), ('melodic death metal', 'metal', 115),
  ('technical death metal', 'metal', 115), ('sludge metal', 'metal', 110),
  ('post-metal', 'metal', 110), ('blackgaze', 'metal', 105),
  ('deathcore', 'metal', 110), ('symphonic black metal', 'metal', 115),
  ('mathcore', 'metal', 105), ('crossover thrash', 'metal', 100),
  ('nu metal', 'metal', 115), ('metalcore', 'metal', 115),
  ('hard bop', 'jazz_blues', 95), ('cool jazz', 'jazz_blues', 95),
  ('modal jazz', 'jazz_blues', 95), ('latin jazz', 'latin', 105),
  ('chamber folk', 'folk_acoustic', 95), ('singer songwriter', 'folk_acoustic', 105),
  ('indie singer-songwriter', 'indie', 105), ('roots music', 'folk_acoustic', 85),
  ('contemporary gospel', 'rnb_soul', 90), ('gospel', 'rnb_soul', 80),
  ('christian rock', 'rock', 90), ('christian metal', 'metal', 95),
  ('christian hip hop', 'hip_hop', 95), ('christian pop', 'pop', 90)
) as added(keyword, macro_slug, priority)
order by keyword, priority desc
on conflict (keyword) do update
set macro_slug = excluded.macro_slug,
    priority = excluded.priority;

create or replace function public.classify_genres(weighted_tags jsonb)
returns table (macro_genres text[], primary_macro text)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with tags as (
    select
      lower(public.immutable_unaccent(btrim(source.tag->>'name'))) as name,
      greatest(coalesce((source.tag->>'weight')::numeric, 1), 0) as weight
    from jsonb_array_elements(
      case when jsonb_typeof(weighted_tags) = 'array' then weighted_tags else '[]'::jsonb end
    ) as source(tag)
    where btrim(coalesce(source.tag->>'name', '')) <> ''
      and greatest(coalesce((source.tag->>'weight')::numeric, 1), 0) > 0
      and not (lower(btrim(source.tag->>'name')) ~ '^(19|20)[0-9]{2}s?$')
      and not (lower(btrim(source.tag->>'name')) ~ '^[0-9]{2}s$')
      and not exists (
        select 1 from public.genre_tag_denylist deny
        where lower(public.immutable_unaccent(deny.tag)) = lower(public.immutable_unaccent(btrim(source.tag->>'name')))
      )
  ), matches as (
    select tags.name, tags.weight, coalesce(rule.macro_slug, 'other') as macro_slug
    from tags
    left join lateral (
      select rules.macro_slug
      from public.genre_rules rules
      where tags.name like '%' || lower(public.immutable_unaccent(rules.keyword)) || '%'
      order by char_length(public.immutable_unaccent(rules.keyword)) desc,
        rules.priority desc, rules.keyword asc
      limit 1
    ) rule on true
  ), totals as (
    select macro_slug, sum(weight) as total_weight
    from matches
    group by macro_slug
  ), weighted_totals as (
    select macro_slug, total_weight, sum(total_weight) over () as all_weight
    from (
      select macro_slug, sum(weight) as total_weight
      from matches
      group by macro_slug
    ) sums
  ), ranked as (
    select
      (array_agg(macro_slug order by total_weight desc, macro_slug))[1] as selected_macro,
      array_agg(macro_slug order by total_weight desc, macro_slug)
        filter (where total_weight >= all_weight * 0.15) as selected_macros
    from weighted_totals
  )
  select
    coalesce(ranked.selected_macros, array['unclassified']::text[]),
    coalesce(ranked.selected_macro, 'unclassified')
  from ranked;
$$;

create or replace function public.classify_artist_genres()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  tags jsonb;
begin
  if 'genres' = any(coalesce(new.user_edited_fields, '{}'::text[])) then
    select coalesce(jsonb_agg(jsonb_build_object('name', genre, 'weight', 1)), '[]'::jsonb)
    into tags
    from unnest(coalesce(new.genres, '{}'::text[])) genre
    where btrim(genre) <> '';
  elsif jsonb_array_length(coalesce(new.lastfm_tags, '[]'::jsonb)) > 0 then
    tags := new.lastfm_tags;
  else
    select coalesce(jsonb_agg(jsonb_build_object('name', genre, 'weight', 1)), '[]'::jsonb)
    into tags
    from unnest(coalesce(new.genres, '{}'::text[])) genre
    where btrim(genre) <> '';
  end if;
  select result.macro_genres, result.primary_macro
  into new.macro_genres, new.primary_macro
  from public.classify_genres(tags) result;
  return new;
end;
$$;

drop trigger if exists artists_classify_genres on public.artists;
create trigger artists_classify_genres
before insert or update of genres, lastfm_tags on public.artists
for each row execute function public.classify_artist_genres();

alter table public.artist_albums enable row level security;
create policy "artist_albums_select_authenticated"
  on public.artist_albums for select to authenticated using (true);
grant select on public.artist_albums to authenticated;
revoke insert, update, delete on public.artist_albums from anon, authenticated;
grant all on public.artist_albums to service_role;

alter table public.genre_tag_denylist enable row level security;
create policy "genre_tag_denylist_select_authenticated"
  on public.genre_tag_denylist for select to authenticated using (true);
revoke all on public.genre_tag_denylist from anon, authenticated;
grant select on public.genre_tag_denylist to authenticated;

grant execute on function public.classify_genres(jsonb) to authenticated, service_role;

create function public.claim_artist_enrichment(p_artist_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed boolean := false;
begin
  update public.artists
  set last_enrichment_requested_at = now()
  where id = p_artist_id
    and (
      last_enrichment_requested_at is null
      or last_enrichment_requested_at < now() - interval '1 hour'
    );
  claimed := found;
  return claimed;
end;
$$;

revoke all on function public.claim_artist_enrichment(uuid) from public, anon, authenticated;
grant execute on function public.claim_artist_enrichment(uuid) to service_role;

update public.artists set lastfm_tags = lastfm_tags;

create or replace function public.user_genre_stats(p_user uuid, p_year integer default null)
returns table (
  macro_genre text,
  log_count bigint,
  artist_count bigint,
  avg_rating numeric,
  top_artist jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with per_log as (
    select distinct l.id, l.artist_id, l.rating,
      unnest(case when cardinality(a.macro_genres) = 0 then array['unclassified']::text[] else a.macro_genres end) as macro_genre
    from public.concert_logs l join public.artists a on a.id = l.artist_id
    where l.user_id = p_user and (p_year is null or extract(year from l.event_date)::integer = p_year)
  ), totals as (
    select macro_genre, count(*)::bigint as log_count,
      count(distinct artist_id)::bigint as artist_count, avg(rating) as avg_rating
    from per_log group by macro_genre
  ), artist_totals as (
    select per_log.macro_genre, per_log.artist_id, a.name, a.image_url_thumb,
      count(*)::integer as seen_count
    from per_log join public.artists a on a.id = per_log.artist_id
    group by per_log.macro_genre, per_log.artist_id, a.name, a.image_url_thumb
  )
  select totals.macro_genre, totals.log_count, totals.artist_count,
    round(totals.avg_rating, 2),
    (select jsonb_build_object('id', artist_id, 'name', name, 'image_url', image_url_thumb, 'count', seen_count)
     from artist_totals where macro_genre = totals.macro_genre order by seen_count desc, name limit 1)
  from totals order by totals.log_count desc, totals.macro_genre;
$$;

create or replace function public.user_taste_diversity(p_user uuid, p_year integer default null)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with distribution as (
    select genre, count(*)::numeric as genre_count
    from (
      select distinct l.id,
        unnest(case when cardinality(a.macro_genres) = 0 then array['unclassified']::text[] else a.macro_genres end) as genre
      from public.concert_logs l join public.artists a on a.id = l.artist_id
      where l.user_id = p_user and (p_year is null or extract(year from l.event_date)::integer = p_year)
    ) expanded
    where genre <> 'unclassified'
    group by genre
  ), proportions as (
    select genre, genre_count,
      genre_count / nullif(sum(genre_count) over (), 0) as share
    from distribution
  ), stats as (
    select sum(genre_count) as total,
      count(*)::integer as genre_count,
      max(genre_count) as dominant_count,
      -sum(share * ln(share)) as entropy
    from proportions
  )
  select jsonb_build_object(
    'score', coalesce(round(100 * entropy / nullif(ln(genre_count), 0))::integer, 0),
    'dominant_genre_share', coalesce(round(100 * dominant_count / nullif(total, 0), 1), 0),
    'dominant_genre', (select genre from proportions order by genre_count desc, genre limit 1)
  ) from stats;
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'artists') then
      alter publication supabase_realtime add table public.artists;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'artist_albums') then
      alter publication supabase_realtime add table public.artist_albums;
    end if;
  end if;
end;
$$;
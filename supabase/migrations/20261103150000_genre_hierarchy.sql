create table if not exists public.genres (
  slug text primary key,
  label text not null,
  parent_slug text references public.genres(slug) on delete cascade,
  level smallint not null,
  aliases text[] not null default '{}',
  wikipedia_title text,
  lastfm_tag text,
  origin_years text,
  has_editorial boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.genres
  add column if not exists label text,
  add column if not exists parent_slug text,
  add column if not exists level smallint,
  add column if not exists aliases text[] not null default '{}',
  add column if not exists wikipedia_title text,
  add column if not exists lastfm_tag text,
  add column if not exists origin_years text,
  add column if not exists has_editorial boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

create index if not exists genres_parent_slug_idx
  on public.genres(parent_slug);
create index if not exists genres_aliases_gin_idx
  on public.genres using gin(aliases);

do $$ begin
  alter table public.genres add constraint genres_level_check
    check (level in (1, 2, 3));
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.genres add constraint genres_parent_level_check
    check ((level = 1 and parent_slug is null) or (level > 1 and parent_slug is not null) or level = 3);
exception when duplicate_object or invalid_table_definition then null;
end $$;

insert into public.genres
  (slug, label, parent_slug, level, aliases, wikipedia_title, lastfm_tag, has_editorial)
values
  ('rock', 'Rock', null, 1, array['rock music'], 'Rock music', 'rock', true),
  ('indie', 'Indie', null, 1, array['independent'], 'Indie music', 'indie', true),
  ('pop', 'Pop', null, 1, array['pop music'], 'Pop music', 'pop', true),
  ('electronic', 'Electronic', null, 1, array['electronica'], 'Electronic music', 'electronic', true),
  ('hip_hop', 'Hip-Hop', null, 1, array['hip hop', 'rap'], 'Hip hop music', 'hip-hop', true),
  ('rnb_soul', 'R&B / Soul', null, 1, array['r&b', 'rnb', 'soul'], 'Contemporary R&B', 'rnb', true),
  ('metal', 'Metal', null, 1, array['heavy metal', 'metal music'], 'Heavy metal music', 'metal', true),
  ('punk', 'Punk', null, 1, array['punk rock'], 'Punk rock', 'punk', true),
  ('folk_acoustic', 'Folk / Acoustic', null, 1, array['folk', 'acoustic'], 'Folk music', 'folk', true),
  ('jazz_blues', 'Jazz / Blues', null, 1, array['jazz', 'blues'], 'Jazz', 'jazz', true),
  ('latin', 'Latin', null, 1, array['latin music', 'latino'], 'Latin music', 'latin', true),
  ('classical', 'Classical', null, 1, array['classical music'], 'Classical music', 'classical', true),
  ('world', 'World', null, 1, array['world music'], 'World music', 'world', true),
  ('other', 'Other', null, 1, array[]::text[], null, null, false)
on conflict (slug) do update set
  label = excluded.label,
  parent_slug = null,
  level = 1,
  aliases = excluded.aliases,
  wikipedia_title = excluded.wikipedia_title,
  lastfm_tag = excluded.lastfm_tag,
  has_editorial = excluded.has_editorial;

insert into public.genres
  (slug, label, parent_slug, level, aliases, wikipedia_title, lastfm_tag, origin_years)
values
  ('garage-rock', 'Garage Rock', 'rock', 2, array['garage', 'garage rock revival'], 'Garage rock', 'garage rock', '1960s'),
  ('psychedelic-rock', 'Psychedelic Rock', 'rock', 2, array['psychedelic'], 'Psychedelic rock', 'psychedelic rock', '1960s'),
  ('hard-rock', 'Hard Rock', 'rock', 2, array['hardrock'], 'Hard rock', 'hard rock', '1960s'),
  ('progressive-rock', 'Progressive Rock', 'rock', 2, array['prog rock', 'prog'], 'Progressive rock', 'progressive rock', 'late 1960s'),
  ('grunge', 'Grunge', 'rock', 2, array['Seattle sound'], 'Grunge', 'grunge', '1980s'),
  ('post-rock', 'Post-Rock', 'rock', 2, array['post rock'], 'Post-rock', 'post-rock', '1990s'),
  ('art-rock', 'Art Rock', 'rock', 2, array['art rock'], 'Art rock', 'art rock', '1960s'),
  ('indie-rock', 'Indie Rock', 'indie', 2, array['independent rock'], 'Indie rock', 'indie rock', '1980s'),
  ('dream-pop', 'Dream Pop', 'indie', 2, array['dream-pop'], 'Dream pop', 'dream pop', '1980s'),
  ('shoegaze', 'Shoegaze', 'indie', 2, array['shoegazing'], 'Shoegaze', 'shoegaze', 'late 1980s'),
  ('jangle-pop', 'Jangle Pop', 'indie', 2, array['jangle'], 'Jangle pop', 'jangle pop', '1980s'),
  ('chamber-pop', 'Chamber Pop', 'indie', 2, array['orchestral pop'], 'Chamber pop', 'chamber pop', '1960s'),
  ('lo-fi', 'Lo-Fi', 'indie', 2, array['lo fi', 'lofi'], 'Lo-fi music', 'lo-fi', '1980s'),
  ('britpop', 'Britpop', 'indie', 2, array['brit pop'], 'Britpop', 'britpop', '1990s'),
  ('post-punk', 'Post-Punk', 'punk', 2, array['post punk'], 'Post-punk', 'post-punk', 'late 1970s'),
  ('hardcore-punk', 'Hardcore Punk', 'punk', 2, array['hardcore', 'hardcore punk'], 'Hardcore punk', 'hardcore punk', 'late 1970s'),
  ('pop-punk', 'Pop Punk', 'punk', 2, array['pop punk', 'punk pop'], 'Pop punk', 'pop punk', '1970s'),
  ('new-wave', 'New Wave', 'punk', 2, array['new wave'], 'New wave music', 'new wave', 'late 1970s'),
  ('gothic-rock', 'Gothic Rock', 'punk', 2, array['goth rock', 'gothic'], 'Gothic rock', 'gothic rock', 'late 1970s'),
  ('emo', 'Emo', 'punk', 2, array['emocore'], 'Emo', 'emo', '1980s'),
  ('ska-punk', 'Ska Punk', 'punk', 2, array['ska punk'], 'Ska punk', 'ska punk', '1980s'),
  ('heavy-metal', 'Heavy Metal', 'metal', 2, array['heavy metal'], 'Heavy metal music', 'heavy metal', 'late 1960s'),
  ('thrash-metal', 'Thrash Metal', 'metal', 2, array['thrash'], 'Thrash metal', 'thrash metal', 'early 1980s'),
  ('doom-metal', 'Doom Metal', 'metal', 2, array['doom'], 'Doom metal', 'doom metal', '1970s'),
  ('black-metal', 'Black Metal', 'metal', 2, array['black metal'], 'Black metal', 'black metal', '1980s'),
  ('death-metal', 'Death Metal', 'metal', 2, array['death metal'], 'Death metal', 'death metal', '1980s'),
  ('metalcore', 'Metalcore', 'metal', 2, array['metal core'], 'Metalcore', 'metalcore', '1990s'),
  ('synth-pop', 'Synth-Pop', 'pop', 2, array['synthpop', 'synth pop'], 'Synth-pop', 'synth-pop', 'late 1970s'),
  ('k-pop', 'K-Pop', 'pop', 2, array['kpop', 'korean pop'], 'K-pop', 'k-pop', '1990s'),
  ('art-pop', 'Art Pop', 'pop', 2, array['art pop'], 'Art pop', 'art pop', '1960s'),
  ('electropop', 'Electropop', 'pop', 2, array['electro pop', 'electro-pop'], 'Electropop', 'electropop', '1980s'),
  ('dance-pop', 'Dance-Pop', 'pop', 2, array['dance pop'], 'Dance-pop', 'dance-pop', '1980s'),
  ('teen-pop', 'Teen Pop', 'pop', 2, array['teen pop'], 'Teen pop', 'teen pop', '1990s'),
  ('house', 'House', 'electronic', 2, array['house music'], 'House music', 'house', '1980s'),
  ('techno', 'Techno', 'electronic', 2, array['detroit techno'], 'Techno', 'techno', '1980s'),
  ('trance', 'Trance', 'electronic', 2, array['trance music'], 'Trance music', 'trance', '1990s'),
  ('drum-and-bass', 'Drum and Bass', 'electronic', 2, array['drum n bass', 'dnb', 'drum & bass'], 'Drum and bass', 'drum and bass', '1990s'),
  ('ambient', 'Ambient', 'electronic', 2, array['ambient music'], 'Ambient music', 'ambient', '1970s'),
  ('dubstep', 'Dubstep', 'electronic', 2, array['dub step'], 'Dubstep', 'dubstep', 'late 1990s'),
  ('idm', 'IDM', 'electronic', 2, array['intelligent dance music'], 'Intelligent dance music', 'idm', '1990s'),
  ('synthwave', 'Synthwave', 'electronic', 2, array['outrun', 'retrowave'], 'Synthwave', 'synthwave', '2000s'),
  ('electro', 'Electro', 'electronic', 2, array['electro music'], 'Electro (music)', 'electro', '1980s'),
  ('trap', 'Trap', 'hip_hop', 2, array['trap music'], 'Trap music', 'trap', '1990s'),
  ('boom-bap', 'Boom Bap', 'hip_hop', 2, array['boombap', 'boom bap'], 'Boom bap', 'boom bap', '1980s'),
  ('grime', 'Grime', 'hip_hop', 2, array['uk grime'], 'Grime (music genre)', 'grime', 'early 2000s'),
  ('drill', 'Drill', 'hip_hop', 2, array['drill music'], 'Drill music', 'drill', '2010s'),
  ('conscious-hip-hop', 'Conscious Hip-Hop', 'hip_hop', 2, array['conscious rap'], 'Conscious hip hop', 'conscious hip hop', '1980s'),
  ('neo-soul', 'Neo Soul', 'rnb_soul', 2, array['neosoul'], 'Neo soul', 'neo soul', '1990s'),
  ('funk', 'Funk', 'rnb_soul', 2, array['funk music'], 'Funk', 'funk', '1960s'),
  ('disco', 'Disco', 'rnb_soul', 2, array['disco music'], 'Disco', 'disco', '1970s'),
  ('motown', 'Motown', 'rnb_soul', 2, array['motown sound'], 'Motown', 'motown', '1960s'),
  ('contemporary-rnb', 'Contemporary R&B', 'rnb_soul', 2, array['contemporary r&b', 'contemporary r and b'], 'Contemporary R&B', 'contemporary r&b', '1980s'),
  ('singer-songwriter', 'Singer-Songwriter', 'folk_acoustic', 2, array['singer songwriter', 'songwriter'], 'Singer-songwriter', 'singer-songwriter', '1960s'),
  ('indie-folk', 'Indie Folk', 'folk_acoustic', 2, array['independent folk'], 'Indie folk', 'indie folk', '1990s'),
  ('folk-rock', 'Folk Rock', 'folk_acoustic', 2, array['folk rock'], 'Folk rock', 'folk rock', '1960s'),
  ('americana', 'Americana', 'folk_acoustic', 2, array['americana music'], 'Americana (music)', 'americana', '1990s'),
  ('cantautor', 'Cantautor', 'folk_acoustic', 2, array['cantautora', 'cantautor/a'], null, 'cantautor', null),
  ('bebop', 'Bebop', 'jazz_blues', 2, array['be-bop'], 'Bebop', 'bebop', '1940s'),
  ('cool-jazz', 'Cool Jazz', 'jazz_blues', 2, array['cool jazz'], 'Cool jazz', 'cool jazz', 'late 1940s'),
  ('jazz-fusion', 'Jazz Fusion', 'jazz_blues', 2, array['fusion', 'jazz fusion'], 'Jazz fusion', 'jazz fusion', 'late 1960s'),
  ('delta-blues', 'Delta Blues', 'jazz_blues', 2, array['mississippi delta blues'], 'Delta blues', 'delta blues', '1920s'),
  ('jazz-funk', 'Jazz Funk', 'jazz_blues', 2, array['jazz funk'], 'Jazz-funk', 'jazz funk', 'late 1960s'),
  ('reggaeton', 'Reggaeton', 'latin', 2, array['reggaetón', 'reggaeton viejo'], 'Reggaeton', 'reggaeton', '1990s'),
  ('flamenco', 'Flamenco', 'latin', 2, array['flamenco music'], 'Flamenco', 'flamenco', '18th century'),
  ('flamenco-pop', 'Flamenco Pop', 'latin', 2, array['flamenco pop'], 'Flamenco pop', 'flamenco pop', '1960s'),
  ('salsa', 'Salsa', 'latin', 2, array['salsa music'], 'Salsa music', 'salsa', '1960s'),
  ('bachata', 'Bachata', 'latin', 2, array['bachata music'], 'Bachata (music)', 'bachata', '1960s'),
  ('cumbia', 'Cumbia', 'latin', 2, array['cumbia music'], 'Cumbia', 'cumbia', '19th century'),
  ('rumba-catalana', 'Rumba Catalana', 'latin', 2, array['rumba catalana', 'catalan rumba'], null, 'rumba catalana', '1950s'),
  ('latin-pop', 'Latin Pop', 'latin', 2, array['pop latino', 'latin pop'], 'Latin pop', 'latin pop', '1950s'),
  ('urbano-latino', 'Urbano Latino', 'latin', 2, array['latin urban', 'urbano latino'], 'Latin urban', 'urbano latino', '2000s'),
  ('baroque', 'Baroque', 'classical', 2, array['baroque music'], 'Baroque music', 'baroque', '1600–1750'),
  ('romantic', 'Romantic', 'classical', 2, array['romantic music'], 'Romantic music', 'romantic', '19th century'),
  ('minimalism', 'Minimalism', 'classical', 2, array['minimalist music'], 'Minimal music', 'minimalism', '1960s'),
  ('opera', 'Opera', 'classical', 2, array['opera music'], 'Opera', 'opera', 'late 16th century'),
  ('film-score', 'Film Score', 'classical', 2, array['soundtrack', 'film music', 'score'], 'Film score', 'film score', '20th century'),
  ('afrobeat', 'Afrobeat', 'world', 2, array['afro beat'], 'Afrobeat', 'afrobeat', 'late 1960s'),
  ('highlife', 'Highlife', 'world', 2, array['high life'], 'Highlife', 'highlife', 'early 20th century'),
  ('bossa-nova', 'Bossa Nova', 'world', 2, array['bossa nova'], 'Bossa nova', 'bossa nova', 'late 1950s'),
  ('fado', 'Fado', 'world', 2, array['portuguese fado'], 'Fado', 'fado', '1820s'),
  ('celtic', 'Celtic', 'world', 2, array['celtic music'], 'Celtic music', 'celtic', null),
  ('balkan', 'Balkan', 'world', 2, array['balkan music'], 'Balkan music', 'balkan', null),
  ('k-indie', 'K-Indie', 'world', 2, array['korean indie', 'k indie'], 'K-indie', 'k-indie', '1990s'),
  ('alternative-rock', 'Alternative Rock', 'rock', 2, array['alt rock', 'alternative rock'], 'Alternative rock', 'alternative rock', '1980s'),
  ('southern-rock', 'Southern Rock', 'rock', 2, array['southern rock'], 'Southern rock', 'southern rock', 'late 1960s'),
  ('stoner-rock', 'Stoner Rock', 'rock', 2, array['stoner'], 'Stoner rock', 'stoner rock', '1990s'),
  ('math-rock', 'Math Rock', 'rock', 2, array['math rock'], 'Math rock', 'math rock', 'late 1980s'),
  ('noise-rock', 'Noise Rock', 'rock', 2, array['noise rock'], 'Noise rock', 'noise rock', '1980s'),
  ('sludge-metal', 'Sludge Metal', 'metal', 2, array['sludge'], 'Sludge metal', 'sludge metal', '1980s'),
  ('power-metal', 'Power Metal', 'metal', 2, array['power metal'], 'Power metal', 'power metal', '1980s'),
  ('progressive-metal', 'Progressive Metal', 'metal', 2, array['prog metal'], 'Progressive metal', 'progressive metal', '1980s'),
  ('industrial-metal', 'Industrial Metal', 'metal', 2, array['industrial metal'], 'Industrial metal', 'industrial metal', '1980s'),
  ('symphonic-metal', 'Symphonic Metal', 'metal', 2, array['symphonic metal'], 'Symphonic metal', 'symphonic metal', '1990s'),
  ('electro-house', 'Electro House', 'electronic', 2, array['electro house'], 'Electro house', 'electro house', '2000s'),
  ('deep-house', 'Deep House', 'electronic', 2, array['deep house'], 'Deep house', 'deep house', '1980s'),
  ('minimal-techno', 'Minimal Techno', 'electronic', 2, array['minimal techno'], 'Minimal techno', 'minimal techno', '1990s'),
  ('breakbeat', 'Breakbeat', 'electronic', 2, array['break beat'], 'Breakbeat', 'breakbeat', '1980s'),
  ('trip-hop', 'Trip-Hop', 'electronic', 2, array['trip hop'], 'Trip hop', 'trip-hop', '1990s'),
  ('electronic-body-music', 'Electronic Body Music', 'electronic', 2, array['ebm'], 'Electronic body music', 'ebm', '1980s'),
  ('cloud-rap', 'Cloud Rap', 'hip_hop', 2, array['cloud rap'], 'Cloud rap', 'cloud rap', '2000s'),
  ('gangsta-rap', 'Gangsta Rap', 'hip_hop', 2, array['gangster rap'], 'Gangsta rap', 'gangsta rap', '1980s'),
  ('alternative-hip-hop', 'Alternative Hip-Hop', 'hip_hop', 2, array['alternative hip hop', 'alt hip hop'], 'Alternative hip hop', 'alternative hip-hop', '1980s'),
  ('latin-hip-hop', 'Latin Hip-Hop', 'hip_hop', 2, array['latin rap'], 'Latin hip hop', 'latin hip hop', '1980s'),
  ('quiet-storm', 'Quiet Storm', 'rnb_soul', 2, array['quiet storm'], 'Quiet storm', 'quiet storm', '1970s'),
  ('contemporary-soul', 'Contemporary Soul', 'rnb_soul', 2, array['contemporary soul'], 'Soul music', 'contemporary soul', '1980s'),
  ('roots-reggae', 'Roots Reggae', 'world', 2, array['roots reggae'], 'Roots reggae', 'roots reggae', '1970s'),
  ('dub', 'Dub', 'world', 2, array['dub music'], 'Dub music', 'dub', 'late 1960s'),
  ('dancehall', 'Dancehall', 'world', 2, array['dance hall'], 'Dancehall', 'dancehall', 'late 1970s'),
  ('ska', 'Ska', 'world', 2, array['ska music'], 'Ska', 'ska', '1950s'),
  ('two-tone', 'Two-Tone', 'world', 2, array['2 tone', 'two tone'], '2 Tone (music genre)', 'two-tone', 'late 1970s')
on conflict (slug) do update set
  label = excluded.label,
  parent_slug = excluded.parent_slug,
  level = excluded.level,
  aliases = excluded.aliases,
  wikipedia_title = excluded.wikipedia_title,
  lastfm_tag = excluded.lastfm_tag,
  origin_years = excluded.origin_years;

update public.genres
set has_editorial = true
where slug in (
  'post-punk', 'dream-pop', 'shoegaze', 'house', 'techno',
  'reggaeton', 'flamenco', 'synth-pop', 'grunge', 'afrobeat'
);

alter table public.artists
  add column if not exists sub_genres text[] not null default '{}';

drop trigger if exists artists_classify_genres on public.artists;
drop function if exists public.classify_genres(jsonb);

create or replace function public.classify_genres(weighted_tags jsonb)
returns table (macro_genres text[], primary_macro text, sub_genres text[])
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
        where lower(public.immutable_unaccent(deny.tag)) =
          lower(public.immutable_unaccent(btrim(source.tag->>'name')))
      )
  ), resolved as (
    select
      tags.name,
      tags.weight,
      matched.slug,
      coalesce(
        case when matched.level = 1 then matched.slug else matched.parent_slug end,
        rule.macro_slug,
        'other'
      ) as macro_slug,
      case when matched.level in (2, 3) then matched.slug end as sub_slug
    from tags
    left join lateral (
      select genres.slug, genres.parent_slug, genres.level
      from public.genres
      where lower(public.immutable_unaccent(genres.slug)) = tags.name
        or lower(public.immutable_unaccent(replace(genres.slug, '-', ' '))) = tags.name
        or lower(public.immutable_unaccent(genres.label)) = tags.name
        or exists (
          select 1
          from unnest(genres.aliases) as aliases(alias)
          where lower(public.immutable_unaccent(aliases.alias)) = tags.name
        )
      order by genres.level desc, genres.slug
      limit 1
    ) matched on true
    left join lateral (
      select rules.macro_slug
      from public.genre_rules rules
      where matched.slug is null
        and tags.name like '%' || lower(public.immutable_unaccent(rules.keyword)) || '%'
      order by char_length(public.immutable_unaccent(rules.keyword)) desc,
        rules.priority desc, rules.keyword asc
      limit 1
    ) rule on true
  ), weighted_totals as (
    select macro_slug, total_weight, sum(total_weight) over () as all_weight
    from (
      select macro_slug, sum(weight) as total_weight
      from resolved
      group by macro_slug
    ) totals
  ), ranked as (
    select
      (array_agg(macro_slug order by total_weight desc, macro_slug))[1] as selected_macro,
      array_agg(macro_slug order by total_weight desc, macro_slug)
        filter (where total_weight >= all_weight * 0.15) as selected_macros
    from weighted_totals
  ), ranked_subgenres as (
    select sub_slug, max(weight) as weight
    from resolved
    where sub_slug is not null
    group by sub_slug
  ), fallback as (
    select case when exists (select 1 from tags) then 'other' else 'unclassified' end as macro_slug
  )
  select
    case
      when ranked.selected_macro is not null
        then coalesce(ranked.selected_macros, array[ranked.selected_macro]::text[])
      else array[fallback.macro_slug]::text[]
    end,
    coalesce(ranked.selected_macro, fallback.macro_slug),
    coalesce(
      (select array_agg(ranked_subgenres.sub_slug order by ranked_subgenres.weight desc, ranked_subgenres.sub_slug)
       from ranked_subgenres),
      '{}'::text[]
    )
  from ranked cross join fallback;
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
  select result.macro_genres, result.primary_macro, result.sub_genres
  into new.macro_genres, new.primary_macro, new.sub_genres
  from public.classify_genres(tags) result;
  return new;
end;
$$;

create trigger artists_classify_genres
before insert or update of genres, lastfm_tags on public.artists
for each row execute function public.classify_artist_genres();

create or replace function public.promote_frequent_tags(p_min integer default 3)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  promoted_count integer;
begin
  if p_min < 1 then raise exception 'p_min must be at least 1'; end if;
  insert into public.genres (slug, label, parent_slug, level, aliases, lastfm_tag)
  select distinct on (candidate.slug)
    candidate.slug, candidate.label, null, 3, '{}'::text[], candidate.label
  from (
    select
      trim(both '-' from regexp_replace(
        lower(public.immutable_unaccent(btrim(tags.tag->>'name'))),
        '[^a-z0-9]+', '-', 'g'
      )) as slug,
      regexp_replace(btrim(tags.tag->>'name'), '\s+', ' ', 'g') as label,
      count(distinct artists.id) as artist_count
    from public.artists artists
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(artists.lastfm_tags) = 'array' then artists.lastfm_tags else '[]'::jsonb end
    ) tags(tag)
    where btrim(coalesce(tags.tag->>'name', '')) <> ''
      and not exists (
        select 1 from public.genre_tag_denylist deny
        where lower(public.immutable_unaccent(deny.tag)) =
          lower(public.immutable_unaccent(btrim(tags.tag->>'name')))
      )
      and lower(btrim(tags.tag->>'name')) !~ '^(19|20)[0-9]{2}s?$'
      and lower(btrim(tags.tag->>'name')) !~ '^[0-9]{2}s$'
      and lower(btrim(tags.tag->>'name')) !~ '^(from |born in |based in |british$|american$|spanish$|catalan$|french$|german$|italian$|portuguese$|japanese$|korean$)'
      and char_length(btrim(tags.tag->>'name')) between 2 and 50
    group by 1, 2
    having count(distinct artists.id) >= p_min
  ) candidate
  where candidate.slug <> ''
    and not exists (
      select 1 from public.genres existing
      where lower(public.immutable_unaccent(existing.slug)) = candidate.slug
        or lower(public.immutable_unaccent(existing.label)) =
          lower(public.immutable_unaccent(candidate.label))
        or exists (
          select 1 from unnest(existing.aliases) as aliases(alias)
          where lower(public.immutable_unaccent(alias)) =
            lower(public.immutable_unaccent(candidate.label))
        )
    )
  order by candidate.slug, candidate.artist_count desc
  on conflict (slug) do nothing;
  get diagnostics promoted_count = row_count;
  return promoted_count;
end;
$$;

revoke all on function public.promote_frequent_tags(integer) from public, anon, authenticated;
grant execute on function public.promote_frequent_tags(integer) to service_role;

create or replace function public.reclassify_artists_from_stored_tags()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_count bigint;
begin
  update public.artists
  set lastfm_tags = lastfm_tags
  where id is not null;
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.reclassify_artists_from_stored_tags() from public, anon, authenticated;
grant execute on function public.reclassify_artists_from_stored_tags() to service_role;

create table if not exists public.genre_autopages (
  slug text primary key references public.genres(slug) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

alter table public.genres enable row level security;
drop policy if exists genres_authenticated_read on public.genres;
create policy genres_authenticated_read
  on public.genres for select to authenticated using (true);
revoke all on public.genres from anon, authenticated;
grant select on public.genres to authenticated;
grant all on public.genres to service_role;

alter table public.genre_autopages enable row level security;
drop policy if exists genre_autopages_authenticated_read on public.genre_autopages;
create policy genre_autopages_authenticated_read
  on public.genre_autopages for select to authenticated using (true);
revoke all on public.genre_autopages from anon, authenticated;
grant select on public.genre_autopages to authenticated;
grant all on public.genre_autopages to service_role;

alter table public.genre_pages drop constraint if exists genre_pages_slug_check;
alter table public.genre_pillars drop constraint if exists genre_pillars_position_check;
do $$ begin
  alter table public.genre_pillars add constraint genre_pillars_position_check
    check (position between 1 and 3);
exception when duplicate_object or invalid_table_definition then null;
end $$;
do $$ begin
  alter table public.genre_pages add constraint genre_pages_slug_fkey
    foreign key (slug) references public.genres(slug) on delete cascade;
exception when duplicate_object or invalid_table_definition then null;
end $$;

alter table public.artists enable row level security;
grant select on public.artists to authenticated;
grant execute on function public.classify_genres(jsonb) to authenticated, service_role;
update public.artists set lastfm_tags = lastfm_tags;

create or replace function public.get_genre_page(p_slug text)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with viewer as (
    select auth.uid() as user_id
  ), page as (
    select genre_pages.*
    from public.genre_pages
    where genre_pages.slug = p_slug
  ), features as (
    select
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'position', pillars.position, 'why', pillars.why,
            'id', artists.id, 'name', artists.name,
            'image_url_thumb', artists.image_url_thumb,
            'image_url_large', artists.image_url_large,
            'primary_macro', artists.primary_macro,
            'seen_count', case when viewer.user_id is null then 0 else (
              select count(*)::integer from public.concert_logs logs
              where logs.artist_id = artists.id and logs.user_id = viewer.user_id
            ) end,
            'in_wishlist', case when viewer.user_id is null then false else exists (
              select 1 from public.wishlist_items wishlist
              where wishlist.artist_id = artists.id and wishlist.user_id = viewer.user_id
                and wishlist.status in ('wanted', 'going')
            ) end
          ) order by pillars.position
        )
        from public.genre_pillars pillars
        join public.artists artists on artists.id = pillars.artist_id
        where pillars.genre_slug = p_slug
      ), '[]'::jsonb) as pillars,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'position', examples.position, 'note', examples.note,
            'id', artists.id, 'name', artists.name,
            'image_url_thumb', artists.image_url_thumb,
            'image_url_large', artists.image_url_large,
            'primary_macro', artists.primary_macro,
            'seen_count', case when viewer.user_id is null then 0 else (
              select count(*)::integer from public.concert_logs logs
              where logs.artist_id = artists.id and logs.user_id = viewer.user_id
            ) end,
            'in_wishlist', case when viewer.user_id is null then false else exists (
              select 1 from public.wishlist_items wishlist
              where wishlist.artist_id = artists.id and wishlist.user_id = viewer.user_id
                and wishlist.status in ('wanted', 'going')
            ) end
          ) order by examples.position
        )
        from public.genre_examples examples
        join public.artists artists on artists.id = examples.artist_id
        where examples.genre_slug = p_slug
      ), '[]'::jsonb) as examples
    from viewer
  ), scoped_logs as (
    select distinct logs.id, logs.artist_id, logs.rating
    from public.concert_logs logs
    join public.artists artists on artists.id = logs.artist_id
    join viewer on viewer.user_id = logs.user_id
    where (
      (p_slug in ('rock','indie','pop','electronic','hip_hop','rnb_soul','metal',
        'punk','folk_acoustic','jazz_blues','latin','classical','world','other')
        and p_slug = any(coalesce(artists.macro_genres, '{}'::text[])))
      or p_slug = any(coalesce(artists.sub_genres, '{}'::text[]))
    )
  ), stats as (
    select
      count(*)::integer as shows,
      count(distinct artist_id)::integer as unique_artists,
      round(avg(rating), 2) as average_rating,
      (select jsonb_build_object('id', ranked.artist_id, 'name', ranked.name, 'seen_count', ranked.count)
       from (
         select logs.artist_id, artists.name, count(*)::integer as count
         from scoped_logs logs join public.artists artists on artists.id = logs.artist_id
         group by logs.artist_id, artists.name
         order by count desc, artists.name limit 1
       ) ranked) as most_seen_artist
    from scoped_logs
  ), feature_artist_ids as (
    select artist_id from public.genre_pillars where genre_slug = p_slug
    union select artist_id from public.genre_examples where genre_slug = p_slug
  ), progress as (
    select count(distinct ids.artist_id)::integer as seen_count
    from feature_artist_ids ids
    join viewer on viewer.user_id is not null
    join public.concert_logs logs
      on logs.artist_id = ids.artist_id and logs.user_id = viewer.user_id
  )
  select case
    when not exists (select 1 from page) then
      jsonb_build_object('found', false, 'error', 'not_found', 'slug', p_slug)
    else jsonb_build_object(
      'found', true,
      'page', (select to_jsonb(page) from page),
      'pillars', features.pillars,
      'examples', features.examples,
      'viewer', jsonb_build_object(
        'shows', stats.shows,
        'unique_artists', stats.unique_artists,
        'average_rating', stats.average_rating,
        'most_seen_artist', stats.most_seen_artist,
        'seen_feature_count', progress.seen_count
      )
    )
  end
  from features cross join stats cross join progress;
$$;

revoke all on function public.get_genre_page(text) from public, anon;
grant execute on function public.get_genre_page(text) to authenticated, service_role;

create or replace function public.get_genre_catalog()
returns table (
  slug text,
  label text,
  parent_slug text,
  level smallint,
  aliases text[],
  wikipedia_title text,
  lastfm_tag text,
  origin_years text,
  has_editorial boolean,
  artist_count bigint,
  viewer_seen_count bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    genres.slug,
    genres.label,
    genres.parent_slug,
    genres.level,
    genres.aliases,
    genres.wikipedia_title,
    genres.lastfm_tag,
    genres.origin_years,
    genres.has_editorial,
    count(distinct artists.id)::bigint as artist_count,
    count(distinct logs.artist_id)::bigint as viewer_seen_count
  from public.genres
  left join public.artists
    on case
      when genres.level = 1 then genres.slug = any(coalesce(artists.macro_genres, '{}'::text[]))
      else genres.slug = any(coalesce(artists.sub_genres, '{}'::text[]))
    end
  left join public.concert_logs logs
    on logs.artist_id = artists.id and logs.user_id = auth.uid()
  group by genres.slug
  order by genres.level, genres.label;
$$;

revoke all on function public.get_genre_catalog() from public, anon;
grant execute on function public.get_genre_catalog() to authenticated, service_role;

create or replace function public.user_subgenre_stats(
  p_user uuid,
  p_year integer default null
)
returns table (
  sub_genre text,
  parent_macro text,
  log_count bigint,
  artist_count bigint,
  avg_rating numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    genres.slug as sub_genre,
    genres.parent_slug as parent_macro,
    count(logs.id)::bigint as log_count,
    count(distinct artists.id)::bigint as artist_count,
    round(avg(logs.rating), 2) as avg_rating
  from public.concert_logs logs
  join public.artists artists on artists.id = logs.artist_id
  cross join lateral unnest(
    coalesce(artists.sub_genres, '{}'::text[])
  ) as artist_genres(slug)
  join public.genres genres on genres.slug = artist_genres.slug
  where logs.user_id = auth.uid()
    and p_user = auth.uid()
    and (p_year is null or extract(year from logs.event_date)::integer = p_year)
  group by genres.slug, genres.parent_slug
  order by count(logs.id) desc, genres.label;
$$;

revoke all on function public.user_subgenre_stats(uuid, integer)
  from public, anon;
grant execute on function public.user_subgenre_stats(uuid, integer)
  to authenticated, service_role;

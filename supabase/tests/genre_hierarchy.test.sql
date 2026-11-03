begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, auth, pg_temp;
select plan(6);

insert into public.genres (
  slug, label, parent_slug, level, aliases
)
values (
  'test-cancion-alternativa',
  'Canción Alternativa',
  'punk',
  2,
  array['canción alternativa']
)
on conflict (slug) do update set
  label = excluded.label,
  parent_slug = excluded.parent_slug,
  level = excluded.level,
  aliases = excluded.aliases;

select is(
  (select sub_genres
   from public.classify_genres('[{"name":"synthpop","weight":1}]'::jsonb)),
  array['synth-pop']::text[],
  'aliases resolve to the most specific subgenre'
);
select is(
  (select macro_genres
   from public.classify_genres('[{"name":"synthpop","weight":1}]'::jsonb)),
  array['pop']::text[],
  'subgenre classification keeps its macro parent'
);
select is(
  (select sub_genres
   from public.classify_genres('[{"name":"POST-PUNK","weight":1}]'::jsonb)),
  array['post-punk']::text[],
  'post-punk resolves to its specific genre row'
);
select is(
  (select sub_genres
   from public.classify_genres('[{"name":"cancion alternativa","weight":1}]'::jsonb)),
  array['test-cancion-alternativa']::text[],
  'genre labels and aliases match without accents'
);
select ok(
  not exists (
    select 1 from public.genres
    where level = 2 and (parent_slug is null or not exists (
      select 1 from public.genres parent where parent.slug = genres.parent_slug
    ))
  ),
  'every curated subgenre has an existing parent'
);

insert into public.artists (
  id, name, genres, macro_genres, primary_macro, source
)
values (
  '94000000-0000-4000-8000-000000000001',
  'Unknown Genre Preservation Test',
  array['future-noise-tag'],
  array['other'],
  'other',
  'manual'
)
on conflict (id) do update set genres = excluded.genres;
select is(
  (select genres from public.artists
   where id = '94000000-0000-4000-8000-000000000001'),
  array['future-noise-tag']::text[],
  'unrecognized tags remain available as artist text'
);

select * from finish();
rollback;

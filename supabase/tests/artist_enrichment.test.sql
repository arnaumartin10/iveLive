begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_temp;
select plan(15);

select is(
  (select primary_macro from public.classify_genres('[{"name":"seen live","weight":30},{"name":"indie","weight":10},{"name":"spanish","weight":20},{"name":"dream pop","weight":8}]'::jsonb)),
  'indie',
  'denylisted noise does not overwhelm weighted genre tags'
);
select is(
  (select macro_genres from public.classify_genres('[{"name":"seen live","weight":30},{"name":"indie","weight":10},{"name":"spanish","weight":20},{"name":"dream pop","weight":8}]'::jsonb)),
  array['indie']::text[],
  'noise tags are omitted from macro genres'
);
select is(
  (select primary_macro from public.classify_genres('[]'::jsonb)),
  'unclassified',
  'empty tags are unclassified rather than other'
);
select is(
  (select primary_macro from public.classify_genres('[{"name":"unmapped experimental style","weight":10}]'::jsonb)),
  'other',
  'unmapped real genre tags remain other'
);
select is(
  (select macro_genres from public.classify_genres('[{"name":"indie","weight":70},{"name":"pop","weight":15},{"name":"rock","weight":14},{"name":"unmapped style","weight":1}]'::jsonb)),
  array['indie','pop']::text[],
  'secondary macros are included only when they reach fifteen percent weight'
);
select is(
  (select primary_macro from public.classify_genres('[{"name":"1980s","weight":100}]'::jsonb)),
  'unclassified',
  'decade tags are ignored as noise'
);

select ok(
  (select primary_macro in ('punk', 'rock')
      and macro_genres @> array['rock', 'punk', 'indie']::text[]
      and not ('other' = any(macro_genres))
   from public.classify_genres('[{"name":"post-punk","weight":6},{"name":"gothic rock","weight":5},{"name":"new wave","weight":4},{"name":"alternative rock","weight":3},{"name":"indie rock","weight":2}]'::jsonb)),
  'The Cure classifies as punk or rock and includes rock, punk, and indie'
);
select ok(
  (select primary_macro in ('rock', 'indie')
      and not ('other' = any(macro_genres))
   from public.classify_genres('[{"name":"indie rock","weight":6},{"name":"garage rock","weight":5},{"name":"alternative rock","weight":3},{"name":"british","weight":100},{"name":"seen live","weight":100}]'::jsonb)),
  'Arctic Monkeys classifies as rock or indie without other'
);
select ok(
  (select primary_macro in ('punk', 'indie')
      and not ('other' = any(macro_genres))
   from public.classify_genres('[{"name":"post punk","weight":6},{"name":"post-punk revival","weight":5},{"name":"indie rock","weight":4},{"name":"punk","weight":3}]'::jsonb)),
  'Fontaines D.C. classifies as punk or indie without other'
);
select ok(
  (select primary_macro = 'rock'
      and macro_genres @> array['rock']::text[]
      and not ('other' = any(macro_genres))
   from public.classify_genres('[{"name":"alternative rock","weight":8},{"name":"art rock","weight":6},{"name":"indie rock","weight":5},{"name":"electronic","weight":3},{"name":"seen live","weight":100},{"name":"british","weight":100}]'::jsonb)),
  'Radiohead classifies as rock with no other macro'
);
select ok(
  (select primary_macro = 'latin'
      and not ('other' = any(macro_genres))
   from public.classify_genres('[{"name":"latin pop","weight":8},{"name":"flamenco pop","weight":6},{"name":"reggaeton","weight":5},{"name":"pop","weight":3},{"name":"spanish","weight":100}]'::jsonb)),
  'ROSALIA classifies as latin without other'
);
select ok(
  (select primary_macro in ('indie', 'rock')
      and not ('other' = any(macro_genres))
   from public.classify_genres('[{"name":"experimental rock","weight":6},{"name":"art rock","weight":5},{"name":"indie rock","weight":4},{"name":"post-rock","weight":3}]'::jsonb)),
  'Black Country, New Road classifies as indie or rock without other'
);
select ok(
  (select primary_macro in ('indie', 'rock')
      and not ('other' = any(macro_genres))
   from public.classify_genres('[{"name":"indie rock","weight":6},{"name":"garage rock","weight":5},{"name":"post-punk revival","weight":4},{"name":"rock","weight":3}]'::jsonb)),
  'The Strokes classifies as indie or rock without other'
);
select is(
  (select primary_macro from public.classify_genres('[{"name":"rock","weight":1},{"name":"unmapped listener tag","weight":1000}]'::jsonb)),
  'rock',
  'unmatched tags do not contribute weight when a real macro matches'
);
select is(
  (select macro_genres from public.classify_genres('[{"name":"rock","weight":1},{"name":"unmapped listener tag","weight":1000}]'::jsonb)),
  array['rock']::text[],
  'unmatched tags never add other to macro genres'
);

select * from finish();
rollback;
update public.genre_rules
set macro_slug = case keyword
      when 'post-punk' then 'punk'
      when 'post punk' then 'punk'
      when 'new wave' then 'punk'
      when 'coldwave' then 'punk'
      when 'darkwave' then 'punk'
      when 'baroque pop' then 'indie'
      when 'art pop' then 'indie'
    end,
    priority = case keyword
      when 'post-punk' then 115
      when 'post punk' then 115
      when 'new wave' then 95
      when 'coldwave' then 105
      when 'darkwave' then 105
      when 'baroque pop' then 105
      when 'art pop' then 105
    end
where keyword in (
  'post-punk', 'post punk', 'new wave', 'coldwave', 'darkwave',
  'baroque pop', 'art pop'
);

insert into public.genre_rules (keyword, macro_slug, priority)
values
  ('no wave', 'punk', 95),
  ('goth', 'punk', 95),
  ('gothic', 'punk', 95),
  ('gothic rock', 'punk', 110),
  ('deathrock', 'punk', 100),
  ('garage rock revival', 'rock', 105),
  ('neo-psychedelia', 'rock', 105),
  ('experimental rock', 'rock', 100),
  ('prog', 'rock', 75),
  ('britrock', 'rock', 95),
  ('post-britpop', 'indie', 100),
  ('indietronica', 'indie', 100),
  ('dance-pop', 'pop', 100),
  ('ambient pop', 'pop', 100)
on conflict (keyword) do nothing;

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
    select tags.name, tags.weight, rule.macro_slug
    from tags
    cross join lateral (
      select rules.macro_slug
      from public.genre_rules rules
      where rules.macro_slug <> 'other'
        and tags.name like '%' || lower(public.immutable_unaccent(rules.keyword)) || '%'
      order by char_length(public.immutable_unaccent(rules.keyword)) desc,
        rules.priority desc, rules.keyword asc
      limit 1
    ) rule
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
  ), fallback as (
    select case
      when exists (select 1 from tags) then 'other'
      else 'unclassified'
    end as macro_slug
  )
  select
    case
      when ranked.selected_macro is not null
        then coalesce(ranked.selected_macros, array[ranked.selected_macro]::text[])
      else array[fallback.macro_slug]::text[]
    end,
    coalesce(ranked.selected_macro, fallback.macro_slug)
  from ranked
  cross join fallback;
$$;

update public.artists
set lastfm_tags = lastfm_tags;
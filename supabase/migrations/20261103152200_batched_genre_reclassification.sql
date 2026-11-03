drop function if exists public.reclassify_artists_from_stored_tags();

create or replace function public.reclassify_artists_batch(
  p_after_id uuid default null,
  p_batch_size integer default 100
)
returns table (updated_count bigint, last_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_batch_size < 1 or p_batch_size > 100 then
    raise exception 'p_batch_size must be between 1 and 100';
  end if;

  return query
  with batch as materialized (
    select artists.id
    from public.artists
    where p_after_id is null or artists.id > p_after_id
    order by artists.id
    limit p_batch_size
  ), updated as (
    update public.artists
    set lastfm_tags = artists.lastfm_tags
    from batch
    where artists.id = batch.id
    returning artists.id
  )
  select
    count(*)::bigint,
    (select updated.id from updated order by updated.id desc limit 1);
end;
$$;

revoke all on function public.reclassify_artists_batch(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.reclassify_artists_batch(uuid, integer)
  to service_role;

create or replace function public.promote_frequent_tags(p_min integer default 3)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  promoted_count integer;
begin
  if p_min < 1 then
    raise exception 'p_min must be at least 1';
  end if;

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
      count(distinct source_tags.artist_id) as artist_count
    from (
      select
        artists.id as artist_id,
        case
          when 'genres' = any(coalesce(artists.user_edited_fields, '{}'::text[]))
            then genre_tags.tags
          else case
            when jsonb_typeof(artists.lastfm_tags) = 'array' then case
              when jsonb_array_length(artists.lastfm_tags) > 0
                then artists.lastfm_tags
              else genre_tags.tags
            end
            else genre_tags.tags
          end
        end as tags
      from public.artists artists
      cross join lateral (
        select coalesce(
          jsonb_agg(jsonb_build_object('name', genre, 'weight', 1)),
          '[]'::jsonb
        ) as tags
        from unnest(coalesce(artists.genres, '{}'::text[])) genre
        where btrim(genre) <> ''
      ) genre_tags
    ) source_tags
    cross join lateral jsonb_array_elements(source_tags.tags) as tags(tag)
    where btrim(coalesce(tags.tag->>'name', '')) <> ''
      and not exists (
        select 1
        from public.genre_tag_denylist deny
        where lower(public.immutable_unaccent(deny.tag)) =
          lower(public.immutable_unaccent(btrim(tags.tag->>'name')))
      )
      and lower(btrim(tags.tag->>'name')) !~ '^(19|20)[0-9]{2}s?$'
      and lower(btrim(tags.tag->>'name')) !~ '^[0-9]{2}s$'
      and lower(btrim(tags.tag->>'name')) !~ '^(from |born in |based in |british$|american$|spanish$|catalan$|french$|german$|italian$|portuguese$|japanese$|korean$)'
      and char_length(btrim(tags.tag->>'name')) between 2 and 50
    group by 1, 2
    having count(distinct source_tags.artist_id) >= p_min
  ) candidate
  where candidate.slug <> ''
    and not exists (
      select 1
      from public.genres existing
      where lower(public.immutable_unaccent(existing.slug)) = candidate.slug
        or lower(public.immutable_unaccent(existing.label)) =
          lower(public.immutable_unaccent(candidate.label))
        or exists (
          select 1
          from unnest(existing.aliases) as aliases(alias)
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

revoke all on function public.promote_frequent_tags(integer)
  from public, anon, authenticated;
grant execute on function public.promote_frequent_tags(integer)
  to service_role;

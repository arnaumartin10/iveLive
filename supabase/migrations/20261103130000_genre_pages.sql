create table if not exists public.genre_pages (
  slug text primary key,
  title text not null,
  tagline text not null,
  summary text not null,
  origin_place text not null,
  origin_years text not null,
  history jsonb not null default '[]'::jsonb,
  related_slugs text[] not null default '{}',
  wikipedia_title text,
  content_version integer not null default 1,
  reviewed boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.genre_pages
  add column if not exists title text,
  add column if not exists tagline text,
  add column if not exists summary text,
  add column if not exists origin_place text,
  add column if not exists origin_years text,
  add column if not exists history jsonb not null default '[]'::jsonb,
  add column if not exists related_slugs text[] not null default '{}',
  add column if not exists wikipedia_title text,
  add column if not exists content_version integer not null default 1,
  add column if not exists reviewed boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.genre_pages add constraint genre_pages_slug_check
    check (slug in (
      'rock', 'indie', 'pop', 'electronic', 'hip_hop', 'rnb_soul',
      'metal', 'punk', 'folk_acoustic', 'jazz_blues', 'latin', 'classical',
      'world'
    ));
exception when duplicate_object or invalid_table_definition then null;
end $$;

create table if not exists public.genre_pillars (
  genre_slug text not null references public.genre_pages(slug) on delete cascade,
  position smallint not null,
  artist_id uuid not null references public.artists(id) on delete cascade,
  why text not null
);

alter table public.genre_pillars
  add column if not exists genre_slug text,
  add column if not exists position smallint,
  add column if not exists artist_id uuid,
  add column if not exists why text;

do $$ begin
  alter table public.genre_pillars add constraint genre_pillars_pkey
    primary key (genre_slug, position);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.genre_pillars add constraint genre_pillars_artist_unique
    unique (genre_slug, artist_id);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.genre_pillars add constraint genre_pillars_position_check
    check (position between 1 and 3);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.genre_pillars add constraint genre_pillars_why_length_check
    check (char_length(btrim(why)) between 1 and 220);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.genre_pillars add constraint genre_pillars_genre_slug_fkey
    foreign key (genre_slug) references public.genre_pages(slug) on delete cascade;
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.genre_pillars add constraint genre_pillars_artist_id_fkey
    foreign key (artist_id) references public.artists(id) on delete cascade;
exception when duplicate_object or invalid_table_definition then null;
end $$;

create table if not exists public.genre_examples (
  genre_slug text not null references public.genre_pages(slug) on delete cascade,
  position smallint not null,
  artist_id uuid not null references public.artists(id) on delete cascade,
  note text
);

alter table public.genre_examples
  add column if not exists genre_slug text,
  add column if not exists position smallint,
  add column if not exists artist_id uuid,
  add column if not exists note text;

do $$ begin
  alter table public.genre_examples add constraint genre_examples_pkey
    primary key (genre_slug, position);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.genre_examples add constraint genre_examples_artist_unique
    unique (genre_slug, artist_id);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.genre_examples add constraint genre_examples_position_check
    check (position between 1 and 20);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.genre_examples add constraint genre_examples_note_length_check
    check (note is null or char_length(note) <= 220);
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.genre_examples add constraint genre_examples_genre_slug_fkey
    foreign key (genre_slug) references public.genre_pages(slug) on delete cascade;
exception when duplicate_object or invalid_table_definition then null;
end $$;

do $$ begin
  alter table public.genre_examples add constraint genre_examples_artist_id_fkey
    foreign key (artist_id) references public.artists(id) on delete cascade;
exception when duplicate_object or invalid_table_definition then null;
end $$;

create or replace function public.prevent_duplicate_genre_feature_artist()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.genre_slug));

  if tg_table_name = 'genre_pillars' then
    if exists (
      select 1 from public.genre_examples
      where genre_slug = new.genre_slug and artist_id = new.artist_id
    ) then
      raise exception 'artist cannot be both a pillar and an example for the same genre'
        using errcode = '23514';
    end if;
  elsif exists (
    select 1 from public.genre_pillars
    where genre_slug = new.genre_slug and artist_id = new.artist_id
  ) then
    raise exception 'artist cannot be both a pillar and an example for the same genre'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists genre_pillars_prevent_duplicate_example on public.genre_pillars;
create trigger genre_pillars_prevent_duplicate_example
before insert or update of genre_slug, artist_id on public.genre_pillars
for each row execute function public.prevent_duplicate_genre_feature_artist();

drop trigger if exists genre_examples_prevent_duplicate_pillar on public.genre_examples;
create trigger genre_examples_prevent_duplicate_pillar
before insert or update of genre_slug, artist_id on public.genre_examples
for each row execute function public.prevent_duplicate_genre_feature_artist();

alter table public.genre_pages enable row level security;
alter table public.genre_pillars enable row level security;
alter table public.genre_examples enable row level security;

drop policy if exists genre_pages_authenticated_read on public.genre_pages;
create policy genre_pages_authenticated_read
  on public.genre_pages for select to authenticated using (true);

drop policy if exists genre_pillars_authenticated_read on public.genre_pillars;
create policy genre_pillars_authenticated_read
  on public.genre_pillars for select to authenticated using (true);

drop policy if exists genre_examples_authenticated_read on public.genre_examples;
create policy genre_examples_authenticated_read
  on public.genre_examples for select to authenticated using (true);

revoke all on public.genre_pages, public.genre_pillars, public.genre_examples
  from anon, authenticated;
grant select on public.genre_pages, public.genre_pillars, public.genre_examples
  to authenticated;
grant all on public.genre_pages, public.genre_pillars, public.genre_examples
  to service_role;

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
            'position', pillars.position,
            'why', pillars.why,
            'id', artists.id,
            'name', artists.name,
            'image_url_thumb', artists.image_url_thumb,
            'image_url_large', artists.image_url_large,
            'primary_macro', artists.primary_macro,
            'seen_count', case when viewer.user_id is null then 0 else (
              select count(*)::integer from public.concert_logs logs
              where logs.artist_id = artists.id and logs.user_id = viewer.user_id
            ) end,
            'in_wishlist', case when viewer.user_id is null then false else exists (
              select 1 from public.wishlist_items wishlist
              where wishlist.artist_id = artists.id
                and wishlist.user_id = viewer.user_id
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
            'position', examples.position,
            'note', examples.note,
            'id', artists.id,
            'name', artists.name,
            'image_url_thumb', artists.image_url_thumb,
            'image_url_large', artists.image_url_large,
            'primary_macro', artists.primary_macro,
            'seen_count', case when viewer.user_id is null then 0 else (
              select count(*)::integer from public.concert_logs logs
              where logs.artist_id = artists.id and logs.user_id = viewer.user_id
            ) end,
            'in_wishlist', case when viewer.user_id is null then false else exists (
              select 1 from public.wishlist_items wishlist
              where wishlist.artist_id = artists.id
                and wishlist.user_id = viewer.user_id
                and wishlist.status in ('wanted', 'going')
            ) end
          ) order by examples.position
        )
        from public.genre_examples examples
        join public.artists artists on artists.id = examples.artist_id
        where examples.genre_slug = p_slug
      ), '[]'::jsonb) as examples
    from viewer
  ), stats as (
    select
      coalesce(user_genre_stats.log_count::integer, 0) as shows,
      coalesce(user_genre_stats.artist_count::integer, 0) as unique_artists,
      user_genre_stats.avg_rating as average_rating,
      (
        case when user_genre_stats.top_artist is null then null else
          jsonb_build_object(
            'id', user_genre_stats.top_artist->'id',
            'name', user_genre_stats.top_artist->'name',
            'seen_count', user_genre_stats.top_artist->'count'
          )
        end
      ) as most_seen_artist
    from viewer
    left join lateral public.user_genre_stats(viewer.user_id, null) user_genre_stats
      on user_genre_stats.macro_genre = p_slug
  ), feature_artist_ids as (
    select artist_id from public.genre_pillars where genre_slug = p_slug
    union
    select artist_id from public.genre_examples where genre_slug = p_slug
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
revoke all on function public.prevent_duplicate_genre_feature_artist()
  from public, anon, authenticated;

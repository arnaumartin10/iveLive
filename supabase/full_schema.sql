create schema if not exists extensions;

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create type public.venue_type as enum (
  'festival',
  'concert_hall_club',
  'stadium',
  'indoor_arena',
  'festa_major',
  'other'
);

create type public.artist_source as enum ('spotify', 'manual');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext not null unique,
  display_name text,
  avatar_url text,
  bio text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  constraint profiles_username_format_check
    check (username::text ~ '^[a-z0-9_.]{3,20}$'),
  constraint profiles_bio_length_check
    check (bio is null or char_length(bio) <= 160)
);

create table public.genre_rules (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique,
  macro_slug text not null,
  priority integer not null default 0,
  constraint genre_rules_keyword_nonempty_check check (btrim(keyword) <> ''),
  constraint genre_rules_macro_slug_check check (
    macro_slug in (
      'rock', 'indie', 'pop', 'electronic', 'hip_hop', 'rnb_soul',
      'metal', 'punk', 'folk_acoustic', 'jazz_blues', 'latin', 'classical',
      'world', 'other'
    )
  )
);

create function public.immutable_unaccent(value text)
returns text
language sql
immutable
strict
parallel safe
set search_path = extensions, pg_temp
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value);
$$;

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  spotify_id text unique,
  name text not null,
  name_normalized text generated always as (
    lower(public.immutable_unaccent(name))
  ) stored,
  image_url_large text,
  image_url_thumb text,
  genres text[] not null default '{}',
  macro_genres text[] not null default '{}',
  primary_macro text,
  popularity integer,
  source public.artist_source not null,
  created_by uuid references public.profiles (id) on delete set null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  constraint artists_name_nonempty_check check (btrim(name) <> ''),
  constraint artists_popularity_range_check
    check (popularity is null or popularity between 0 and 100),
  constraint artists_primary_macro_check check (
    primary_macro is null or primary_macro in (
      'rock', 'indie', 'pop', 'electronic', 'hip_hop', 'rnb_soul',
      'metal', 'punk', 'folk_acoustic', 'jazz_blues', 'latin', 'classical',
      'world', 'other'
    )
  ),
  constraint artists_spotify_id_required_check
    check (source <> 'spotify' or spotify_id is not null)
);

create index artists_name_normalized_trgm_idx
  on public.artists using gin (name_normalized extensions.gin_trgm_ops);
create index artists_genres_gin_idx on public.artists using gin (genres);

create table public.concert_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete restrict,
  event_date date not null,
  venue_type public.venue_type not null,
  venue_name text,
  rating numeric(2, 1),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint concert_logs_event_date_check check (event_date <= current_date),
  constraint concert_logs_venue_name_length_check
    check (venue_name is null or char_length(venue_name) <= 120),
  constraint concert_logs_rating_check check (
    rating is null or (
      rating between 0.5 and 5
      and rating * 2 = floor(rating * 2)
    )
  ),
  constraint concert_logs_review_length_check
    check (review is null or char_length(review) <= 2000)
);

create index concert_logs_user_event_date_idx
  on public.concert_logs (user_id, event_date desc);
create index concert_logs_artist_idx on public.concert_logs (artist_id);
create index concert_logs_venue_type_idx on public.concert_logs (venue_type);
create index concert_logs_created_at_idx
  on public.concert_logs (created_at desc, id desc);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self_check check (follower_id <> followee_id)
);

create index follows_followee_idx on public.follows (followee_id, follower_id);

create table public.log_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  log_id uuid not null references public.concert_logs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, log_id)
);

create index log_likes_log_id_idx on public.log_likes (log_id);

create table public.log_comments (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references public.concert_logs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint log_comments_body_length_check
    check (char_length(body) between 1 and 500)
);

create index log_comments_log_created_idx
  on public.log_comments (log_id, created_at asc);

insert into public.genre_rules (keyword, macro_slug, priority) values
  ('dream pop', 'indie', 100),
  ('shoegaze', 'indie', 100),
  ('indie rock', 'indie', 100),
  ('indie folk', 'indie', 100),
  ('indie electronic', 'indie', 95),
  ('noise pop', 'indie', 95),
  ('jangle pop', 'indie', 95),
  ('twee pop', 'indie', 95),
  ('bedroom pop', 'indie', 95),
  ('lo-fi indie', 'indie', 95),
  ('slacker rock', 'indie', 90),
  ('college rock', 'indie', 90),
  ('britpop', 'indie', 90),
  ('post-punk revival', 'indie', 90),
  ('post-punk', 'indie', 85),
  ('new wave', 'indie', 80),
  ('alternative rock', 'rock', 80),
  ('hard rock', 'rock', 100),
  ('classic rock', 'rock', 100),
  ('psychedelic rock', 'rock', 100),
  ('garage rock', 'rock', 100),
  ('southern rock', 'rock', 100),
  ('progressive rock', 'rock', 100),
  ('blues rock', 'rock', 100),
  ('folk rock', 'rock', 95),
  ('arena rock', 'rock', 95),
  ('rock and roll', 'rock', 95),
  ('rockabilly', 'rock', 95),
  ('soft rock', 'rock', 90),
  ('art rock', 'rock', 90),
  ('glam rock', 'rock', 90),
  ('post-rock', 'rock', 90),
  ('pop rock', 'rock', 85),
  ('rock', 'rock', 40),
  ('synth-pop', 'pop', 100),
  ('dance pop', 'pop', 100),
  ('art pop', 'pop', 100),
  ('baroque pop', 'pop', 100),
  ('chamber pop', 'indie', 105),
  ('electropop', 'pop', 95),
  ('k-pop', 'pop', 95),
  ('j-pop', 'pop', 95),
  ('power pop', 'pop', 95),
  ('teen pop', 'pop', 90),
  ('hyperpop', 'pop', 95),
  ('indie pop', 'indie', 110),
  ('pop', 'pop', 30),
  ('hard techno', 'electronic', 100),
  ('minimal techno', 'electronic', 100),
  ('melodic techno', 'electronic', 100),
  ('detroit techno', 'electronic', 100),
  ('deep house', 'electronic', 100),
  ('tech house', 'electronic', 100),
  ('progressive house', 'electronic', 100),
  ('acid house', 'electronic', 100),
  ('afro house', 'electronic', 100),
  ('drum and bass', 'electronic', 100),
  ('drum & bass', 'electronic', 100),
  ('liquid funk', 'electronic', 95),
  ('future bass', 'electronic', 95),
  ('bass house', 'electronic', 95),
  ('uk garage', 'electronic', 95),
  ('breakbeat', 'electronic', 90),
  ('electro house', 'electronic', 95),
  ('ambient techno', 'electronic', 95),
  ('downtempo', 'electronic', 85),
  ('IDM', 'electronic', 85),
  ('dubstep', 'electronic', 90),
  ('trance', 'electronic', 85),
  ('techno', 'electronic', 80),
  ('house', 'electronic', 70),
  ('electronica', 'electronic', 70),
  ('electronic', 'electronic', 30),
  ('conscious hip hop', 'hip_hop', 100),
  ('alternative hip hop', 'hip_hop', 100),
  ('cloud rap', 'hip_hop', 100),
  ('gangsta rap', 'hip_hop', 100),
  ('boom bap', 'hip_hop', 95),
  ('trap soul', 'rnb_soul', 100),
  ('uk drill', 'hip_hop', 100),
  ('brooklyn drill', 'hip_hop', 100),
  ('hip hop', 'hip_hop', 85),
  ('hip-hop', 'hip_hop', 85),
  ('rap', 'hip_hop', 70),
  ('drill', 'hip_hop', 80),
  ('trap', 'hip_hop', 75),
  ('contemporary r&b', 'rnb_soul', 100),
  ('neo soul', 'rnb_soul', 100),
  ('alternative r&b', 'rnb_soul', 100),
  ('quiet storm', 'rnb_soul', 90),
  ('northern soul', 'rnb_soul', 90),
  ('funk', 'rnb_soul', 70),
  ('soul', 'rnb_soul', 70),
  ('r&b', 'rnb_soul', 75),
  ('rhythm and blues', 'rnb_soul', 75),
  ('death metal', 'metal', 110),
  ('black metal', 'metal', 110),
  ('thrash metal', 'metal', 110),
  ('doom metal', 'metal', 110),
  ('power metal', 'metal', 110),
  ('progressive metal', 'metal', 110),
  ('symphonic metal', 'metal', 110),
  ('folk metal', 'metal', 105),
  ('metalcore', 'metal', 100),
  ('deathcore', 'metal', 100),
  ('nu metal', 'metal', 100),
  ('heavy metal', 'metal', 100),
  ('stoner metal', 'metal', 100),
  ('metal', 'metal', 45),
  ('hardcore punk', 'punk', 110),
  ('pop punk', 'punk', 100),
  ('ska punk', 'punk', 100),
  ('anarcho-punk', 'punk', 100),
  ('post-hardcore', 'punk', 95),
  ('crust punk', 'punk', 100),
  ('street punk', 'punk', 95),
  ('punk rock', 'punk', 90),
  ('punk', 'punk', 45),
  ('singer-songwriter', 'folk_acoustic', 100),
  ('cantautor', 'folk_acoustic', 100),
  ('cantautora', 'folk_acoustic', 100),
  ('indie acoustic', 'folk_acoustic', 95),
  ('acoustic folk', 'folk_acoustic', 95),
  ('contemporary folk', 'folk_acoustic', 95),
  ('traditional folk', 'folk_acoustic', 95),
  ('americana', 'folk_acoustic', 90),
  ('bluegrass', 'folk_acoustic', 90),
  ('country folk', 'folk_acoustic', 90),
  ('alt-country', 'folk_acoustic', 90),
  ('country', 'folk_acoustic', 70),
  ('folk', 'folk_acoustic', 60),
  ('acoustic', 'folk_acoustic', 55),
  ('jazz fusion', 'jazz_blues', 100),
  ('smooth jazz', 'jazz_blues', 100),
  ('acid jazz', 'jazz_blues', 100),
  ('jazz funk', 'jazz_blues', 95),
  ('bebop', 'jazz_blues', 90),
  ('big band', 'jazz_blues', 90),
  ('delta blues', 'jazz_blues', 95),
  ('chicago blues', 'jazz_blues', 95),
  ('jazz', 'jazz_blues', 55),
  ('blues', 'jazz_blues', 55),
  ('rumba catalana', 'latin', 115),
  ('latin alternative', 'latin', 100),
  ('latin pop', 'latin', 100),
  ('latin jazz', 'latin', 100),
  ('latin rock', 'latin', 100),
  ('latin trap', 'latin', 115),
  ('reggaeton', 'latin', 105),
  ('bachata', 'latin', 95),
  ('merengue', 'latin', 95),
  ('cumbia', 'latin', 95),
  ('salsa', 'latin', 95),
  ('flamenco', 'latin', 95),
  ('bossa nova', 'latin', 90),
  ('regional mexicano', 'latin', 95),
  ('corridos tumbados', 'latin', 100),
  ('latin', 'latin', 45),
  ('contemporary classical', 'classical', 100),
  ('modern classical', 'classical', 100),
  ('chamber music', 'classical', 95),
  ('film score', 'classical', 90),
  ('soundtrack', 'classical', 75),
  ('baroque', 'classical', 90),
  ('opera', 'classical', 80),
  ('classical', 'classical', 60),
  ('afrobeat', 'world', 95),
  ('highlife', 'world', 90),
  ('reggae', 'world', 90),
  ('ska', 'world', 75),
  ('dancehall', 'world', 85),
  ('soukous', 'world', 90),
  ('qawwali', 'world', 90),
  ('klezmer', 'world', 90),
  ('world music', 'world', 80),
  ('world', 'world', 30)
on conflict (keyword) do update
set macro_slug = excluded.macro_slug,
    priority = excluded.priority;

create function public.classify_genres(genres text[])
returns table (macro_genres text[], primary_macro text)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with normalized_genres as (
    select distinct lower(public.immutable_unaccent(btrim(input.genre))) as genre
    from unnest(coalesce(genres, '{}'::text[])) as input(genre)
    where btrim(input.genre) <> ''
  ), classified as (
    select
      coalesce(genre_match.macro_slug, 'other') as macro_slug,
      coalesce(genre_match.priority, 0) as priority
    from normalized_genres as source
    left join lateral (
      select rules.macro_slug, rules.priority
      from public.genre_rules as rules
      where source.genre like '%' || lower(public.immutable_unaccent(rules.keyword)) || '%'
      order by char_length(public.immutable_unaccent(rules.keyword)) desc,
               rules.priority desc,
               rules.keyword asc
      limit 1
    ) as genre_match on true
  ), totals as (
    select macro_slug, count(*) as genre_count, max(priority) as priority
    from classified
    group by macro_slug
  ), ranked as (
    select
      array_agg(macro_slug order by genre_count desc, priority desc, macro_slug) as macro_values,
      (array_agg(macro_slug order by genre_count desc, priority desc, macro_slug))[1] as selected_macro
    from totals
  )
  select
    coalesce(nullif(ranked.macro_values, '{}'::text[]), array['other']::text[]),
    coalesce(ranked.selected_macro, 'other')
  from ranked;
$$;

create function public.classify_artist_genres()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  select result.macro_genres, result.primary_macro
  into new.macro_genres, new.primary_macro
  from public.classify_genres(new.genres) as result;
  return new;
end;
$$;

create trigger artists_classify_genres
before insert or update of genres on public.artists
for each row execute function public.classify_artist_genres();

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger concert_logs_set_updated_at
before update on public.concert_logs
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    'user_' || left(new.id::text, 8),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.can_view_profile(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = profile_id and not p.is_private
    )
    or exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.followee_id = profile_id
    );
$$;

create function public.can_view_log(log_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.concert_logs logs
    where logs.id = log_id
      and public.can_view_profile(logs.user_id)
  );
$$;

create function public.is_log_owner(log_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from public.concert_logs logs
    where logs.id = log_id and logs.user_id = auth.uid()
  );
$$;

create view public.profiles_public
with (security_barrier = true)
as
select p.id, p.username, p.display_name, p.avatar_url
from public.profiles p
where auth.uid() is not null;

create function public.user_artist_summary(p_user uuid)
returns table (
  id uuid,
  spotify_id text,
  name text,
  name_normalized text,
  image_url_large text,
  image_url_thumb text,
  genres text[],
  macro_genres text[],
  primary_macro text,
  popularity integer,
  source public.artist_source,
  created_by uuid,
  last_synced_at timestamptz,
  created_at timestamptz,
  log_count bigint,
  avg_rating numeric,
  max_rating numeric,
  first_seen date,
  last_seen date
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.can_view_profile(p_user) then
    raise exception 'Not allowed to view this profile' using errcode = '42501';
  end if;

  return query
  select
    artists.id,
    artists.spotify_id,
    artists.name,
    artists.name_normalized,
    artists.image_url_large,
    artists.image_url_thumb,
    artists.genres,
    artists.macro_genres,
    artists.primary_macro,
    artists.popularity,
    artists.source,
    artists.created_by,
    artists.last_synced_at,
    artists.created_at,
    count(logs.id)::bigint,
    avg(logs.rating),
    max(logs.rating),
    min(logs.event_date),
    max(logs.event_date)
  from public.concert_logs logs
  join public.artists artists on artists.id = logs.artist_id
  where logs.user_id = p_user
  group by artists.id;
end;
$$;

create function public.user_genre_stats(p_user uuid)
returns table (
  macro_genre text,
  log_count bigint,
  artist_count bigint,
  percentage numeric
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.can_view_profile(p_user) then
    raise exception 'Not allowed to view this profile' using errcode = '42501';
  end if;

  return query
  with per_log_genres as (
    select distinct logs.id as log_id, logs.artist_id, unnest(
      case when cardinality(artists.macro_genres) = 0
        then array['other']::text[] else artists.macro_genres end
    ) as macro_genre
    from public.concert_logs logs
    join public.artists artists on artists.id = logs.artist_id
    where logs.user_id = p_user
  ), genre_totals as (
    select macro_genre, count(*)::bigint as logs, count(distinct artist_id)::bigint as artists
    from per_log_genres
    group by macro_genre
  )
  select
    totals.macro_genre,
    totals.logs,
    totals.artists,
    round(100.0 * totals.logs / nullif(sum(totals.logs) over (), 0), 2)
  from genre_totals totals
  order by totals.logs desc, totals.macro_genre;
end;
$$;

create function public.user_venue_stats(p_user uuid)
returns table (venue_type public.venue_type, log_count bigint, percentage numeric)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.can_view_profile(p_user) then
    raise exception 'Not allowed to view this profile' using errcode = '42501';
  end if;

  return query
  with venue_totals as (
    select logs.venue_type, count(*)::bigint as logs
    from public.concert_logs logs
    where logs.user_id = p_user
    group by logs.venue_type
  )
  select
    totals.venue_type,
    totals.logs,
    round(100.0 * totals.logs / nullif(sum(totals.logs) over (), 0), 2)
  from venue_totals totals
  order by totals.logs desc, totals.venue_type;
end;
$$;

create function public.get_feed(p_cursor timestamptz, p_limit integer)
returns table (
  id uuid,
  user_id uuid,
  artist_id uuid,
  event_date date,
  venue_type public.venue_type,
  venue_name text,
  rating numeric,
  review text,
  created_at timestamptz,
  updated_at timestamptz,
  artist jsonb,
  author jsonb,
  like_count bigint,
  comment_count bigint,
  liked_by_me boolean
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    logs.id,
    logs.user_id,
    logs.artist_id,
    logs.event_date,
    logs.venue_type,
    logs.venue_name,
    logs.rating,
    logs.review,
    logs.created_at,
    logs.updated_at,
    to_jsonb(artists),
    jsonb_build_object(
      'id', profiles.id,
      'username', profiles.username,
      'display_name', profiles.display_name,
      'avatar_url', profiles.avatar_url
    ),
    (select count(*) from public.log_likes likes where likes.log_id = logs.id),
    (select count(*) from public.log_comments comments where comments.log_id = logs.id),
    exists (
      select 1 from public.log_likes likes
      where likes.log_id = logs.id and likes.user_id = auth.uid()
    )
  from public.follows follows
  join public.concert_logs logs on logs.user_id = follows.followee_id
  join public.artists artists on artists.id = logs.artist_id
  join public.profiles profiles on profiles.id = logs.user_id
  where follows.follower_id = auth.uid()
    and (p_cursor is null or logs.created_at < p_cursor)
  order by logs.created_at desc, logs.id desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.genre_rules enable row level security;
alter table public.concert_logs enable row level security;
alter table public.follows enable row level security;
alter table public.log_likes enable row level security;
alter table public.log_comments enable row level security;

create policy "profiles_select_owner_or_public"
on public.profiles for select to authenticated
using (id = auth.uid() or not is_private);

create policy "profiles_insert_own"
on public.profiles for insert to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy "artists_select_authenticated"
on public.artists for select to authenticated using (true);

create policy "artists_insert_manual_own"
on public.artists for insert to authenticated
with check (source = 'manual' and created_by = auth.uid());

create policy "artists_update_manual_creator"
on public.artists for update to authenticated
using (source = 'manual' and created_by = auth.uid())
with check (source = 'manual' and created_by = auth.uid());

create policy "concert_logs_select_visible"
on public.concert_logs for select to authenticated
using (public.can_view_profile(user_id));

create policy "concert_logs_insert_own"
on public.concert_logs for insert to authenticated
with check (user_id = auth.uid());

create policy "concert_logs_update_own"
on public.concert_logs for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "concert_logs_delete_own"
on public.concert_logs for delete to authenticated
using (user_id = auth.uid());

create policy "follows_select_authenticated"
on public.follows for select to authenticated using (true);

create policy "follows_insert_own"
on public.follows for insert to authenticated
with check (follower_id = auth.uid());

create policy "follows_delete_own"
on public.follows for delete to authenticated
using (follower_id = auth.uid());

create policy "log_likes_select_visible"
on public.log_likes for select to authenticated
using (public.can_view_log(log_id));

create policy "log_likes_insert_own_visible"
on public.log_likes for insert to authenticated
with check (user_id = auth.uid() and public.can_view_log(log_id));

create policy "log_likes_delete_own"
on public.log_likes for delete to authenticated
using (user_id = auth.uid());

create policy "log_comments_select_visible"
on public.log_comments for select to authenticated
using (public.can_view_log(log_id));

create policy "log_comments_insert_own_visible"
on public.log_comments for insert to authenticated
with check (user_id = auth.uid() and public.can_view_log(log_id));

create policy "log_comments_delete_author_or_log_owner"
on public.log_comments for delete to authenticated
using (user_id = auth.uid() or public.is_log_owner(log_id));

grant usage on schema public to authenticated, service_role;
grant usage on schema extensions to authenticated, service_role;
grant usage on type public.venue_type, public.artist_source to authenticated, service_role;
grant select on public.profiles to authenticated;
grant insert (id, username, display_name, avatar_url, bio, is_private)
  on public.profiles to authenticated;
grant update (username, display_name, avatar_url, bio, is_private)
  on public.profiles to authenticated;
grant select on public.profiles_public to authenticated;
grant select on public.artists to authenticated;
grant insert (spotify_id, name, image_url_large, image_url_thumb, genres, source, created_by)
  on public.artists to authenticated;
grant update (name, image_url_large, image_url_thumb, genres)
  on public.artists to authenticated;
grant select, insert, update, delete on public.concert_logs to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, insert, delete on public.log_likes to authenticated;
grant select, insert, delete on public.log_comments to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all on table
  public.profiles,
  public.artists,
  public.genre_rules,
  public.concert_logs,
  public.follows,
  public.log_likes,
  public.log_comments
to service_role;

revoke all on public.genre_rules from anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.classify_artist_genres() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.immutable_unaccent(text) from public, anon, authenticated;
revoke all on function public.classify_genres(text[]) from public, anon;
revoke all on function public.can_view_profile(uuid) from public, anon;
revoke all on function public.can_view_log(uuid) from public, anon;
revoke all on function public.is_log_owner(uuid) from public, anon;
revoke all on function public.user_artist_summary(uuid) from public, anon;
revoke all on function public.user_genre_stats(uuid) from public, anon;
revoke all on function public.user_venue_stats(uuid) from public, anon;
revoke all on function public.get_feed(timestamptz, integer) from public, anon;
grant execute on function public.immutable_unaccent(text) to authenticated, service_role;
grant execute on function public.classify_genres(text[]) to authenticated, service_role;
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.can_view_log(uuid) to authenticated;
grant execute on function public.is_log_owner(uuid) to authenticated;
grant execute on function public.user_artist_summary(uuid) to authenticated;
grant execute on function public.user_genre_stats(uuid) to authenticated;
grant execute on function public.user_venue_stats(uuid) to authenticated;
grant execute on function public.get_feed(timestamptz, integer) to authenticated;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('artist-images', 'artist-images', true)
on conflict (id) do update set public = excluded.public;

create policy "public_read_ivelive_images"
on storage.objects for select to anon, authenticated
using (bucket_id in ('avatars', 'artist-images'));

create policy "users_upload_own_avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users_update_own_avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users_delete_own_avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users_upload_manual_artist_images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'artist-images'
  and (storage.foldername(name))[1] = 'manual'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "users_update_manual_artist_images"
on storage.objects for update to authenticated
using (
  bucket_id = 'artist-images'
  and (storage.foldername(name))[1] = 'manual'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'artist-images'
  and (storage.foldername(name))[1] = 'manual'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "users_delete_manual_artist_images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'artist-images'
  and (storage.foldername(name))[1] = 'manual'
  and (storage.foldername(name))[2] = auth.uid()::text
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = 'concert_logs'
    ) then
      alter publication supabase_realtime add table public.concert_logs;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = 'log_likes'
    ) then
      alter publication supabase_realtime add table public.log_likes;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = 'log_comments'
    ) then
      alter publication supabase_realtime add table public.log_comments;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = 'follows'
    ) then
      alter publication supabase_realtime add table public.follows;
    end if;
  end if;
end;
$$;create function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, extensions, pg_temp
as $$
  select p_username ~ '^[a-z0-9_.]{3,20}$'
    and not exists (
      select 1
      from public.profiles p
      where p.username = p_username::extensions.citext
        and p.id <> auth.uid()
    );
$$;

revoke all on function public.is_username_available(text) from public, anon;
grant execute on function public.is_username_available(text) to authenticated;-- Migration: Custom artist duplicate check and management policies
-- Date: 2026-10-15

-- 1. Function to query pg_trgm similarity on name_normalized
create or replace function public.find_similar_artists(
  query_name text,
  similarity_threshold float default 0.5
)
returns table (
  id uuid,
  spotify_id text,
  name text,
  name_normalized text,
  image_url_large text,
  image_url_thumb text,
  genres text[],
  macro_genres text[],
  primary_macro text,
  popularity integer,
  source public.artist_source,
  created_by uuid,
  similarity float
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
    a.id,
    a.spotify_id,
    a.name,
    a.name_normalized,
    a.image_url_large,
    a.image_url_thumb,
    a.genres,
    a.macro_genres,
    a.primary_macro,
    a.popularity,
    a.source,
    a.created_by,
    extensions.similarity(a.name_normalized, lower(public.immutable_unaccent(query_name)))::float as similarity
  from public.artists a
  where extensions.similarity(a.name_normalized, lower(public.immutable_unaccent(query_name))) >= similarity_threshold
  order by similarity desc
  limit 10;
$$;

revoke all on function public.find_similar_artists(text, float) from public, anon;
grant execute on function public.find_similar_artists(text, float) to authenticated, anon;

-- 2. Update and Delete policies for manual artists
-- Creator can edit or delete a manual artist, but only if no other user has logged it.
grant delete on public.artists to authenticated;

drop policy if exists "artists_update_manual_creator" on public.artists;
create policy "artists_update_manual_creator"
on public.artists for update to authenticated
using (
  source = 'manual'
  and created_by = auth.uid()
  and not exists (
    select 1
    from public.concert_logs
    where artist_id = artists.id
      and user_id <> auth.uid()
  )
)
with check (
  source = 'manual'
  and created_by = auth.uid()
  and not exists (
    select 1
    from public.concert_logs
    where artist_id = artists.id
      and user_id <> auth.uid()
  )
);

drop policy if exists "artists_delete_manual_creator" on public.artists;
create policy "artists_delete_manual_creator"
on public.artists for delete to authenticated
using (
  source = 'manual'
  and created_by = auth.uid()
  and not exists (
    select 1
    from public.concert_logs
    where artist_id = artists.id
      and user_id <> auth.uid()
  )
);

-- 3. Stored function to safely delete a manual artist and creator's logs if any
create or replace function public.delete_manual_artist(p_artist_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_artist public.artists%rowtype;
  v_other_logs_count bigint;
begin
  select * into v_artist from public.artists where id = p_artist_id;
  if not found then
    raise exception 'Artist not found' using errcode = 'P0002';
  end if;

  if v_artist.source <> 'manual' or v_artist.created_by <> auth.uid() then
    raise exception 'Only the creator can delete this manual artist' using errcode = '42501';
  end if;

  select count(*) into v_other_logs_count
  from public.concert_logs
  where artist_id = p_artist_id and user_id <> auth.uid();

  if v_other_logs_count > 0 then
    raise exception 'Cannot delete artist because other users have logged concerts with them' using errcode = '23503';
  end if;

  -- Delete creator's logs for this artist if any
  delete from public.concert_logs where artist_id = p_artist_id and user_id = auth.uid();

  -- Delete the artist
  delete from public.artists where id = p_artist_id;

  return true;
end;
$$;

revoke all on function public.delete_manual_artist(uuid) from public, anon;
grant execute on function public.delete_manual_artist(uuid) to authenticated;

-- 4. Helper function to check if the current user can edit or delete an artist
create or replace function public.can_modify_artist(p_artist_id uuid)
returns table (
  is_creator boolean,
  can_edit boolean,
  can_delete boolean,
  other_user_log_count bigint
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_artist public.artists%rowtype;
  v_count bigint;
begin
  select * into v_artist from public.artists where id = p_artist_id;
  if not found then
    return query select false, false, false, 0::bigint;
    return;
  end if;

  if v_artist.source <> 'manual' or v_artist.created_by <> auth.uid() then
    return query select false, false, false, 0::bigint;
    return;
  end if;

  select count(*) into v_count
  from public.concert_logs
  where artist_id = p_artist_id and user_id <> auth.uid();

  return query select true, (v_count = 0), (v_count = 0), v_count;
end;
$$;

revoke all on function public.can_modify_artist(uuid) from public, anon;
grant execute on function public.can_modify_artist(uuid) to authenticated;

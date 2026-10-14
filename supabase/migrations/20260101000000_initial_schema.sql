-- ==============================================================================
-- IveLive: Initial Database Schema
-- Live-music logging app inspired by 'Been' country-logging app
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (1-to-1 with auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null check (char_length(username) >= 2),
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Artists Table (Catalog of artists seen live)
create table if not exists public.artists (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  spotify_id text unique,
  image_url text,
  genres text[] default '{}'::text[] not null,
  created_at timestamptz default now() not null
);

-- 3. Venues Table (Concert locations)
create table if not exists public.venues (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  city text not null,
  country text not null,
  latitude double precision,
  longitude double precision,
  created_at timestamptz default now() not null,
  constraint uq_venue_name_city_country unique (name, city, country)
);

-- 4. Concerts Table (User live music attendance logs)
create table if not exists public.concerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  artist_id uuid references public.artists(id) on delete restrict not null,
  venue_id uuid references public.venues(id) on delete set null,
  concert_date date not null,
  notes text,
  setlist text[],
  rating smallint check (rating between 1 and 5),
  ticket_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes for performance
create index if not exists idx_concerts_user_id on public.concerts (user_id);
create index if not exists idx_concerts_artist_id on public.concerts (artist_id);
create index if not exists idx_concerts_date on public.concerts (concert_date desc);
create index if not exists idx_artists_name on public.artists (name);
create index if not exists idx_venues_country on public.venues (country);

-- 5. User Stats Aggregate View
create or replace view public.user_stats as
select
  c.user_id,
  count(c.id)::int as total_concerts,
  count(distinct c.artist_id)::int as unique_artists,
  count(distinct c.venue_id)::int as unique_venues,
  count(distinct v.country)::int as unique_countries,
  min(c.concert_date)::text as first_concert_date,
  count(case when extract(year from c.concert_date) = extract(year from current_date) then 1 end)::int as concerts_this_year
from public.concerts c
left join public.venues v on c.venue_id = v.id
group by c.user_id;

-- 6. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.venues enable row level security;
alter table public.concerts enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Artists policies (viewable by everyone, insertable by authenticated users)
create policy "Artists are viewable by authenticated users"
  on public.artists for select
  using (true);

create policy "Authenticated users can create artists"
  on public.artists for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update artists"
  on public.artists for update
  using (auth.role() = 'authenticated');

-- Venues policies (viewable by everyone, insertable by authenticated users)
create policy "Venues are viewable by authenticated users"
  on public.venues for select
  using (true);

create policy "Authenticated users can create venues"
  on public.venues for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update venues"
  on public.venues for update
  using (auth.role() = 'authenticated');

-- Concerts policies (users manage their own concerts, public can view)
create policy "Concerts are viewable by authenticated users"
  on public.concerts for select
  using (true);

create policy "Users can insert their own concerts"
  on public.concerts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own concerts"
  on public.concerts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own concerts"
  on public.concerts for delete
  using (auth.uid() = user_id);

-- 7. Automatic Profile Creation on User Sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'fan_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

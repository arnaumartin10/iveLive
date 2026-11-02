create table public.user_artist_image_overrides (
  user_id uuid not null references public.profiles (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  profile_image_url text,
  banner_image_url text,
  updated_at timestamptz not null default now(),
  primary key (user_id, artist_id),
  constraint user_artist_image_overrides_has_image_check
    check (profile_image_url is not null or banner_image_url is not null)
);

alter table public.user_artist_image_overrides enable row level security;

create policy "Users can view their own artist image choices"
  on public.user_artist_image_overrides
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can save their own artist image choices"
  on public.user_artist_image_overrides
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own artist image choices"
  on public.user_artist_image_overrides
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can remove their own artist image choices"
  on public.user_artist_image_overrides
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete
  on public.user_artist_image_overrides
  to authenticated;

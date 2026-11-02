create table public.artist_image_gallery (
  artist_id uuid not null references public.artists (id) on delete cascade,
  image_url text not null,
  image_role text not null check (image_role in ('profile', 'banner')),
  source text not null,
  label text not null,
  sort_order integer not null default 0,
  primary key (artist_id, image_url, image_role)
);

alter table public.artist_image_gallery enable row level security;

create policy "Artist image gallery is publicly readable"
  on public.artist_image_gallery
  for select
  to anon, authenticated
  using (true);

grant select on public.artist_image_gallery to anon, authenticated;
grant all on public.artist_image_gallery to service_role;

alter table public.profiles
  add column if not exists banner_image_url text;

create or replace view public.profile_overview_basics
with (security_barrier = true)
as
select
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.is_private,
  p.banner_image_url
from public.profiles p
where auth.uid() is not null;

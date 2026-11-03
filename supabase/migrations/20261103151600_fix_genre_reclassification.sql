create or replace function public.reclassify_artists_from_stored_tags()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_count bigint;
begin
  update public.artists
  set lastfm_tags = lastfm_tags
  where id is not null;
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.reclassify_artists_from_stored_tags()
  from public, anon, authenticated;
grant execute on function public.reclassify_artists_from_stored_tags()
  to service_role;

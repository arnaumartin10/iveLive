alter table public.artists
  add column if not exists enrichment_error text;

insert into public.genre_rules (keyword, macro_slug, priority)
values
  ('alt rock', 'rock', 105),
  ('alt-rock', 'rock', 105),
  ('alt pop', 'pop', 95),
  ('alt-pop', 'pop', 95),
  ('alt indie', 'indie', 100),
  ('indie alternative', 'indie', 105),
  ('alternative indie', 'indie', 105)
on conflict (keyword) do update
set macro_slug = excluded.macro_slug,
    priority = excluded.priority;

insert into public.genre_tag_denylist (tag)
values
  ('favorite artists'),
  ('favourite artists'),
  ('my favorites'),
  ('my favourites'),
  ('all-time favorites'),
  ('all-time favourites'),
  ('male vocalist'),
  ('female vocalist'),
  ('under 50 listeners'),
  ('under 100 listeners'),
  ('under 200 listeners'),
  ('under 500 listeners'),
  ('awesome'),
  ('beautiful'),
  ('cool')
on conflict (tag) do nothing;

drop function if exists public.claim_artist_enrichment(uuid, boolean);
drop function if exists public.claim_artist_enrichment(uuid);

create function public.claim_artist_enrichment(
  p_artist_id uuid,
  p_force boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed boolean := false;
begin
  update public.artists
  set last_enrichment_requested_at = now()
  where id = p_artist_id
    and (
      p_force
      or (
        enrichment_status = 'pending'
        and (
          last_enrichment_requested_at is null
          or last_enrichment_requested_at < now() - interval '10 minutes'
        )
      )
      or (
        enrichment_status = 'partial'
        and coalesce(last_enrichment_requested_at, enriched_at, created_at) < now() - interval '10 minutes'
      )
      or (
        enrichment_status = 'failed'
        and coalesce(enriched_at, last_enrichment_requested_at, created_at) < now() - interval '24 hours'
      )
      or (
        enrichment_status = 'done'
        and coalesce(enriched_at, created_at) < now() - interval '90 days'
      )
    );
  claimed := found;
  return claimed;
end;
$$;

revoke all on function public.claim_artist_enrichment(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.claim_artist_enrichment(uuid, boolean)
  to service_role;
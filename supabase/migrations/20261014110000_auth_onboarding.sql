create function public.is_username_available(p_username text)
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
grant execute on function public.is_username_available(text) to authenticated;
create table if not exists public.concert_setlists (
  log_id uuid primary key references public.concert_logs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('setlistfm', 'text', 'json', 'csv', 'manual')),
  source_url text,
  setlistfm_id text,
  artist text,
  venue text,
  city text,
  event_date date,
  event_year integer,
  songs jsonb not null default '[]'::jsonb check (jsonb_typeof(songs) = 'array'),
  updated_at timestamptz not null default now()
);

create index if not exists concert_setlists_user_updated_idx
  on public.concert_setlists (user_id, updated_at desc);

alter table public.concert_setlists enable row level security;

drop policy if exists concert_setlists_select_visible on public.concert_setlists;
create policy concert_setlists_select_visible
  on public.concert_setlists for select to authenticated
  using (public.can_view_log(log_id));

drop policy if exists concert_setlists_insert_owner on public.concert_setlists;
create policy concert_setlists_insert_owner
  on public.concert_setlists for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.concert_logs l
      where l.id = log_id and l.user_id = auth.uid()
    )
  );

drop policy if exists concert_setlists_update_owner on public.concert_setlists;
create policy concert_setlists_update_owner
  on public.concert_setlists for update to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.concert_logs l
      where l.id = log_id and l.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.concert_logs l
      where l.id = log_id and l.user_id = auth.uid()
    )
  );

drop policy if exists concert_setlists_delete_owner on public.concert_setlists;
create policy concert_setlists_delete_owner
  on public.concert_setlists for delete to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.concert_logs l
      where l.id = log_id and l.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.concert_setlists to authenticated;

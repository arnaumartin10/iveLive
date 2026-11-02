drop policy if exists "concert_logs_insert_own" on public.concert_logs;
create policy "concert_logs_insert_own"
  on public.concert_logs for insert to authenticated
  with check (user_id = auth.uid());

grant insert on public.concert_logs to authenticated;

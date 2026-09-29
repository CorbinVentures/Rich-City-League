begin;
alter table public.player_highlights alter column status set default 'pending';
drop policy if exists "members submit highlights" on public.player_highlights;
drop policy if exists "members manage own highlights" on public.player_highlights;
create policy "members submit highlights" on public.player_highlights for insert to authenticated with check ((uploaded_by=auth.uid() and status in ('draft','pending')) or public.is_staff_or_admin());
create policy "members manage own pending highlights" on public.player_highlights for update to authenticated using (uploaded_by=auth.uid() or public.is_staff_or_admin()) with check ((uploaded_by=auth.uid() and status in ('draft','pending')) or public.is_staff_or_admin());
commit;

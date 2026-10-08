drop policy if exists "users request fan role" on public.profile_roles;
drop policy if exists "users request pending fan role" on public.profile_roles;
create policy "users request own member role" on public.profile_roles for insert to authenticated with check (profile_id = auth.uid() and role in ('fan'::public.app_role,'player'::public.app_role,'coach'::public.app_role) and status = 'pending');

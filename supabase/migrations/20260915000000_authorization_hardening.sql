-- Keep role requests separate from the authorization field and only let
-- authorized operators approve them.
drop policy if exists "public active profile roles" on public.profile_roles;
drop policy if exists "users manage own fan role request" on public.profile_roles;
drop policy if exists "staff manage profile roles" on public.profile_roles;

create policy "users view own or active profile roles"
  on public.profile_roles for select
  using (profile_id = auth.uid() or status = 'active' or public.is_staff_or_admin());

create policy "users request pending fan role"
  on public.profile_roles for insert
  with check (profile_id = auth.uid() and role = 'fan' and status = 'pending');

create policy "staff manage profile roles"
  on public.profile_roles for all
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

create or replace function public.sync_verified_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    update public.profiles
    set role = new.role, updated_at = now()
    where id = new.profile_id;
  elsif new.status = 'revoked' and (tg_op = 'INSERT' or old.status is distinct from 'revoked') then
    update public.profiles
    set role = 'player'::public.app_role, updated_at = now()
    where id = new.profile_id and role = new.role;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_verified_profile_role on public.profile_roles;
create trigger sync_verified_profile_role
  after insert or update of status on public.profile_roles
  for each row execute procedure public.sync_verified_profile_role();

-- Gravity Location Intelligence: opt-in, owner-only cross-device city preference.
-- No raw GPS, device coordinates, IP addresses, addresses or location history.
begin;

create table public.gravity_member_location_preferences (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  city_id text,
  radius_miles integer not null default 50
    check (radius_miles in (25, 50, 100)),
  updated_at timestamptz not null default now(),
  constraint gravity_member_city_id_valid check (
    city_id is null or (
      char_length(city_id) between 2 and 64
      and city_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    )
  )
);

comment on table public.gravity_member_location_preferences is
  'Private, opt-in coarse Virginia city and soft search radius for the account owner. A row only exists after explicit enablement.';
comment on column public.gravity_member_location_preferences.city_id is
  'Coarse city anchor ID only. Never exact GPS, IP location, street or venue.';
  
create or replace function public.gravity_touch_location_preference()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create trigger gravity_location_preference_updated_at
before update on public.gravity_member_location_preferences
for each row execute function public.gravity_touch_location_preference();

alter table public.gravity_member_location_preferences enable row level security;

revoke all on public.gravity_member_location_preferences from public, anon, authenticated;
grant select, insert, update, delete on public.gravity_member_location_preferences to authenticated;

create policy gravity_location_owner_select
  on public.gravity_member_location_preferences for select to authenticated
  using (profile_id = (select auth.uid()));

create policy gravity_location_owner_insert
  on public.gravity_member_location_preferences for insert to authenticated
  with check (profile_id = (select auth.uid()));

create policy gravity_location_owner_update
  on public.gravity_member_location_preferences for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy gravity_location_owner_delete
  on public.gravity_member_location_preferences for delete to authenticated
  using (profile_id = (select auth.uid()));

revoke all on function public.gravity_touch_location_preference() from public;
commit;

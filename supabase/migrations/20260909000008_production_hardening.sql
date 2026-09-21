-- Expose only intentionally public player fields and require authenticated
-- ownership for applicant registration writes.

create or replace view public.public_players
with (security_invoker = false)
as
select
  id,
  first_name,
  last_name,
  jersey_number,
  position,
  hometown,
  photo_url,
  is_active
from public.players
where is_active;

revoke all on table public.players from public, anon;
grant select on table public.players to authenticated;

drop policy "public players" on public.players;
create policy "authorized users view player records"
  on public.players
  for select
  to authenticated
  using (public.is_staff_or_admin() or profile_id = auth.uid());

grant select on public.public_players to anon, authenticated;

-- Explicitly define the least-privilege Data API surface used by registration.
-- RLS still determines which rows are visible/writable.
grant select on table public.seasons, public.divisions to anon, authenticated;
grant select, insert, update on table public.registrations to authenticated;

-- Coach and staff operations are also mediated by RLS. Grant the SQL
-- operations those policies are designed to authorize so policy evaluation,
-- rather than a missing table ACL, is the security boundary.
grant select, update on table public.rosters to authenticated;
grant select on table public.team_seasons, public.team_coaches to authenticated;
grant select, update on table public.games to authenticated;
grant update on table public.seasons, public.profiles to authenticated;

drop policy "users submit registrations" on public.registrations;
create policy "users submit registrations"
  on public.registrations
  for insert
  to authenticated
  with check (
    public.is_staff_or_admin()
    or (
      applicant_id = auth.uid()
      and exists (
        select 1
        from public.seasons s
        where s.id = season_id
          and s.registration_open
      )
      and (
        division_id is null
        or exists (
          select 1
          from public.divisions d
          where d.id = division_id
            and d.season_id = season_id
        )
      )
    )
  );

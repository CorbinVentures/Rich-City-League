-- Preserve the registration's intended division independently of later team assignment.
alter table public.registrations
  add column division_id uuid references public.divisions(id) on delete set null;

create index registrations_season_division_idx
  on public.registrations (season_id, division_id);

create unique index registrations_applicant_season_uidx
  on public.registrations (applicant_id, season_id)
  where applicant_id is not null;

create or replace function public.validate_registration_division()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.division_id is not null and not exists (
    select 1 from public.divisions
    where id = new.division_id and season_id = new.season_id
  ) then
    raise exception 'Registration division must belong to its season';
  end if;
  return new;
end;
$$;

create trigger validate_registration_division
  before insert or update of season_id, division_id on public.registrations
  for each row execute procedure public.validate_registration_division();

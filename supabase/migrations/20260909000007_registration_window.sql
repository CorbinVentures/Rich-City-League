-- Prevent applicants from creating registrations outside an open season.

drop policy "users submit registrations" on public.registrations;

create policy "users submit registrations"
  on public.registrations
  for insert
  with check (
    public.is_staff_or_admin()
    or (
      (applicant_id = auth.uid() or applicant_id is null)
      and exists (
        select 1
        from public.seasons s
        where s.id = season_id
          and s.registration_open
      )
    )
  );

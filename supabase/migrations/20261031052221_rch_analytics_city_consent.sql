-- Members explicitly decide whether their coarse Virginia city may be counted in
-- Command Center planning. No coordinates, IP address, GPS history or street data.
create table if not exists public.rch_analytics_city_consent (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  city_id text not null check (city_id ~ '^[a-z0-9-]{2,60}$'),
  consented_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.rch_analytics_city_consent is
 'Explicit opt-in coarse Virginia city for aggregate RCL planning. Delete row immediately on opt-out. Never use this to assert user presence or attendance.';

alter table public.rch_analytics_city_consent enable row level security;
revoke all on public.rch_analytics_city_consent from public, anon, authenticated;
grant select, insert, update, delete on public.rch_analytics_city_consent to authenticated;

create policy "member reads own voluntary analytics city"
 on public.rch_analytics_city_consent for select to authenticated
 using (profile_id = (select auth.uid()));

create policy "member opts in own analytics city"
 on public.rch_analytics_city_consent for insert to authenticated
 with check (profile_id = (select auth.uid()));

create policy "member changes own analytics city"
 on public.rch_analytics_city_consent for update to authenticated
 using (profile_id = (select auth.uid()))
 with check (profile_id = (select auth.uid()));

create policy "member revokes own analytics city"
 on public.rch_analytics_city_consent for delete to authenticated
 using (profile_id = (select auth.uid()));

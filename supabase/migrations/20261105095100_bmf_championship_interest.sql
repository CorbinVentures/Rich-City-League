-- Interest in the January 2027 event is not paid entry or a confirmed slot.
create table public.rch_bmf_championship_interests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  email text not null check (char_length(trim(email)) between 3 and 320),
  phone text check (phone is null or char_length(phone) <= 40),
  city text check (city is null or char_length(city) <= 120),
  status text not null default 'interest' check (status in ('interest','invited','waitlist','withdrawn')),
  staff_notes text check (staff_notes is null or char_length(staff_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);
create index rch_bmf_championship_interests_created_idx on public.rch_bmf_championship_interests (created_at desc);
alter table public.rch_bmf_championship_interests enable row level security;
revoke all on public.rch_bmf_championship_interests from public, anon;
grant select, insert, update on public.rch_bmf_championship_interests to authenticated;

create policy "players view own BMF interest" on public.rch_bmf_championship_interests
  for select to authenticated using (profile_id = (select auth.uid()) or (select public.is_admin()));
create policy "players submit own BMF interest" on public.rch_bmf_championship_interests
  for insert to authenticated with check (profile_id = (select auth.uid()) and status = 'interest' and staff_notes is null);
create policy "players update own BMF interest" on public.rch_bmf_championship_interests
  for update to authenticated using (profile_id = (select auth.uid()) and status = 'interest')
  with check (profile_id = (select auth.uid()) and status = 'interest' and staff_notes is null);
create policy "admins manage BMF interests" on public.rch_bmf_championship_interests
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

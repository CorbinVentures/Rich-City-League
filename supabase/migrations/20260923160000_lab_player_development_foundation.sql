-- The Lab player-development foundation
create table if not exists public.lab_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  skill text not null,
  duration_minutes integer not null check (duration_minutes between 1 and 240),
  status text not null default 'planned' check (status in ('planned','in_progress','completed')),
  source text not null default 'builder' check (source in ('builder','program','coach','challenge')),
  workout jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists lab_sessions_profile_created_idx on public.lab_sessions(profile_id, created_at desc);

create table if not exists public.lab_program_enrollments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  program_key text not null,
  program_name text not null,
  total_sessions integer not null check (total_sessions > 0),
  completed_sessions integer not null default 0 check (completed_sessions >= 0),
  focus text,
  status text not null default 'active' check (status in ('active','completed','paused')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(profile_id, program_key)
);

create table if not exists public.lab_assessments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('scoring','creation','playmaking','defense','athleticism','iq')),
  score integer not null check (score between 0 and 100),
  verification_status text not null default 'self' check (verification_status in ('self','coach','rcl_verified')),
  notes text,
  assessed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists lab_assessments_profile_category_idx on public.lab_assessments(profile_id, category, assessed_at desc);

create table if not exists public.lab_notebook_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.lab_sessions(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 4000),
  visibility text not null default 'private' check (visibility in ('private','coach')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lab_notebook_profile_created_idx on public.lab_notebook_entries(profile_id, created_at desc);

alter table public.lab_sessions enable row level security;
alter table public.lab_program_enrollments enable row level security;
alter table public.lab_assessments enable row level security;
alter table public.lab_notebook_entries enable row level security;

drop policy if exists "lab sessions owner" on public.lab_sessions;
create policy "lab sessions owner" on public.lab_sessions for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "lab programs owner" on public.lab_program_enrollments;
create policy "lab programs owner" on public.lab_program_enrollments for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "lab assessments owner read" on public.lab_assessments;
create policy "lab assessments owner read" on public.lab_assessments for select using (profile_id = auth.uid());
drop policy if exists "lab assessments owner insert" on public.lab_assessments;
create policy "lab assessments owner insert" on public.lab_assessments for insert with check (profile_id = auth.uid() and verification_status = 'self');
drop policy if exists "lab assessments owner update" on public.lab_assessments;
create policy "lab assessments owner update" on public.lab_assessments for update using (profile_id = auth.uid() and verification_status = 'self') with check (profile_id = auth.uid() and verification_status = 'self');
drop policy if exists "lab notebook owner" on public.lab_notebook_entries;
create policy "lab notebook owner" on public.lab_notebook_entries for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

revoke all on public.lab_sessions, public.lab_program_enrollments, public.lab_assessments, public.lab_notebook_entries from anon;
grant select, insert, update, delete on public.lab_sessions, public.lab_program_enrollments, public.lab_notebook_entries to authenticated;
grant select, insert, update on public.lab_assessments to authenticated;

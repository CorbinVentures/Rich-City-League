-- RCL Runs: real-world pickup/open-run coordination for Rich City Social.
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 100),
  description text,
  location text not null check (length(trim(location)) between 2 and 160),
  starts_at timestamptz not null,
  skill_level text not null default 'all' check (skill_level in ('all','beginner','intermediate','advanced','elite')),
  game_format text not null default '5v5' check (game_format in ('1v1','3v3','4v4','5v5','shootaround','open_run')),
  max_players integer not null default 10 check (max_players between 2 and 50),
  status text not null default 'open' check (status in ('open','full','cancelled','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.run_players (
  run_id uuid not null references public.runs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (run_id, profile_id)
);

create index if not exists runs_upcoming_idx on public.runs (starts_at asc, status);
create index if not exists runs_host_idx on public.runs (host_id, starts_at desc);
create index if not exists run_players_profile_idx on public.run_players (profile_id, joined_at desc);

alter table public.runs enable row level security;
alter table public.run_players enable row level security;

create policy "anyone views non_cancelled runs" on public.runs
  for select using (status <> 'cancelled');
create policy "users create runs" on public.runs
  for insert to authenticated with check (host_id = auth.uid());
create policy "hosts update runs" on public.runs
  for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "hosts delete runs" on public.runs
  for delete to authenticated using (host_id = auth.uid());

create policy "anyone views run players" on public.run_players
  for select using (true);
create policy "users join open runs" on public.run_players
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.runs r
      where r.id = run_id
        and r.status = 'open'
        and r.starts_at > now()
        and (select count(*) from public.run_players rp where rp.run_id = r.id) < r.max_players
    )
  );
create policy "users leave runs" on public.run_players
  for delete to authenticated using (profile_id = auth.uid());

-- Realtime keeps player counts and newly-created runs feeling live.
alter publication supabase_realtime add table public.runs;
alter publication supabase_realtime add table public.run_players;

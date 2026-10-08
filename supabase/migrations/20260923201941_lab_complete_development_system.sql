-- Complete The Lab: programs, challenges, film, proof and safe social sharing.
create table if not exists public.lab_film_entries (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 120), media_url text, possession_type text, lesson text not null default '' check(char_length(lesson)<=4000),
 visibility text not null default 'private' check(visibility in ('private','coach')), created_at timestamptz not null default now()
);
create table if not exists public.lab_challenge_attempts (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
 challenge_key text not null, challenge_name text not null, result numeric not null check(result>=0), attempts integer check(attempts is null or attempts>0),
 verification_status text not null default 'self' check(verification_status in ('self','coach','rcl_verified')), created_at timestamptz not null default now()
);
create table if not exists public.lab_proof_snapshots (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
 category text not null, lab_score integer check(lab_score between 0 and 100), game_metric text not null, game_value numeric,
 games_sampled integer not null default 0 check(games_sampled>=0), captured_at timestamptz not null default now()
);
alter table public.lab_film_entries enable row level security; alter table public.lab_challenge_attempts enable row level security; alter table public.lab_proof_snapshots enable row level security;
create policy "lab film owner" on public.lab_film_entries for all using(profile_id=auth.uid()) with check(profile_id=auth.uid());
create policy "lab challenge owner read" on public.lab_challenge_attempts for select using(profile_id=auth.uid());
create policy "lab challenge owner self insert" on public.lab_challenge_attempts for insert with check(profile_id=auth.uid() and verification_status='self');
create policy "lab proof owner read" on public.lab_proof_snapshots for select using(profile_id=auth.uid());
grant select,insert,update,delete on public.lab_film_entries to authenticated; grant select,insert on public.lab_challenge_attempts to authenticated; grant select on public.lab_proof_snapshots to authenticated;
revoke all on public.lab_film_entries,public.lab_challenge_attempts,public.lab_proof_snapshots from anon;
insert into public.lab_program_enrollments(profile_id,program_key,program_name,total_sessions,completed_sessions,focus,status)
select p.id,'starter-baseline','Baseline Builder',6,0,'Complete a baseline, train the priority skill, and establish proof.','paused' from public.profiles p where false;

-- RCL league operations: preseason, draft, roster lifecycle, requests, and discipline.

create table if not exists public.tryout_sessions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  eligibility text not null default '',
  evaluator_staff_ids uuid[] not null default '{}',
  notes text,
  status text not null default 'DRAFT' check (status in ('DRAFT','OPEN','FULL','COMPLETED','CANCELLED')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.tryout_registrations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tryout_sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  registered_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create table if not exists public.tryout_attendance (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.tryout_registrations(id) on delete cascade,
  status text not null check (status in ('PRESENT','ABSENT','EXCUSED','LATE')),
  marked_by uuid not null references public.profiles(id),
  notes text,
  marked_at timestamptz not null default now()
);

create table if not exists public.player_evaluations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  session_id uuid not null references public.tryout_sessions(id) on delete cascade,
  evaluator_id uuid not null references public.profiles(id),
  scores jsonb not null default '{}'::jsonb,
  evaluation_score numeric(5,2) not null default 0 check (evaluation_score >= 0 and evaluation_score <= 100),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.draft_pools (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  eligible boolean not null default true,
  eligibility_reason text,
  added_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (season_id, player_id)
);

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,
  rounds integer not null default 1 check (rounds > 0),
  roster_limit integer not null default 12 check (roster_limit > 0),
  status text not null default 'SETUP' check (status in ('SETUP','OPEN','PAUSED','COMPLETED','CANCELLED')),
  current_pick integer not null default 1 check (current_pick > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.draft_picks (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  pick_number integer not null check (pick_number > 0),
  round_number integer not null check (round_number > 0),
  team_id uuid not null references public.teams(id),
  player_id uuid not null references public.players(id),
  selected_by uuid not null references public.profiles(id),
  selected_at timestamptz not null default now(),
  unique (draft_id, pick_number),
  unique (draft_id, player_id)
);

create table if not exists public.roster_status_history (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.rosters(id) on delete cascade,
  status text not null check (status in ('ACTIVE','INACTIVE','DNP','SUSPENDED','INJURED','RELEASED','TRADED','WAIVED')),
  reason text,
  effective_at timestamptz not null default now(),
  changed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.league_transactions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('DRAFT','TRADE','RELEASE','WAIVE','ACTIVATE','STATUS_CHANGE')),
  sending_team_id uuid references public.teams(id),
  receiving_team_id uuid references public.teams(id),
  player_ids uuid[] not null default '{}',
  status text not null default 'DRAFT' check (status in ('DRAFT','PROPOSED','TEAM_APPROVED','LEAGUE_REVIEW','APPROVED','DECLINED','CANCELLED','EXECUTED')),
  notes text,
  reason text,
  proposed_by uuid not null references public.profiles(id),
  approved_by uuid references public.profiles(id),
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.league_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  category text not null check (category in ('TRADE_REQUEST','DNP_INQUIRY','SCHEDULE_CONFLICT','INJURY_STATUS','LEAVE','EQUIPMENT','REGISTRATION','PAYMENT','TEAM_CONCERN','CONDUCT_CONCERN','GENERAL','ROSTER_CHANGE','PLAYER_RELEASE','PLAYER_ACTIVATION','GAME_RESCHEDULE','DISCIPLINARY_REPORT')),
  subject text not null,
  description text not null,
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION','APPROVED','DENIED','RESOLVED','CLOSED')),
  assigned_to uuid references public.profiles(id),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.league_request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.league_requests(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.game_participation_status (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null check (status in ('ACTIVE','STARTER','BENCH','DNP_COACH_DECISION','DNP_INJURY','DNP_SUSPENSION','DNP_INELIGIBLE','DNP_ABSENCE','DNP_OTHER')),
  reason text,
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (game_id, player_id)
);

create table if not exists public.discipline_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.discipline_cases (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete set null,
  reported_profile_id uuid references public.profiles(id) on delete set null,
  game_id uuid references public.games(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  category_id uuid references public.discipline_categories(id),
  incident_date date not null,
  description text not null,
  evidence jsonb not null default '[]'::jsonb,
  witnesses text,
  status text not null default 'OPEN' check (status in ('OPEN','UNDER_REVIEW','DECIDED','APPEALED','FINAL','CLOSED')),
  decision text,
  sanction text check (sanction is null or sanction in ('WARNING','FINE','GAME_SUSPENSION','MULTI_GAME_SUSPENSION','PROBATION','GAME_REMOVAL','ROSTER_RESTRICTION','LEAGUE_SUSPENSION','DISMISSAL')),
  decision_notes text,
  created_by uuid not null references public.profiles(id),
  decision_maker uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discipline_appeals (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.discipline_cases(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id),
  reason text not null,
  outcome text check (outcome is null or outcome in ('UPHELD','MODIFIED','REVERSED')),
  reviewer_id uuid references public.profiles(id),
  decision_notes text,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists tryout_sessions_season_status_idx on public.tryout_sessions(season_id, status);
create index if not exists draft_picks_draft_order_idx on public.draft_picks(draft_id, pick_number);
create index if not exists league_requests_status_idx on public.league_requests(status, updated_at desc);
create index if not exists discipline_cases_status_idx on public.discipline_cases(status, created_at desc);

create or replace function public.calculate_evaluation_score()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.evaluation_score := coalesce((select avg(value::numeric) from jsonb_each_text(new.scores)), 0);
  return new;
end;
$$;
drop trigger if exists calculate_evaluation_score on public.player_evaluations;
create trigger calculate_evaluation_score before insert or update on public.player_evaluations
for each row execute procedure public.calculate_evaluation_score();

create or replace function public.register_for_tryout(target_session uuid, target_player uuid)
returns public.tryout_registrations
language plpgsql security definer set search_path = public
as $$
declare result public.tryout_registrations;
begin
  if target_player <> (select id from public.players where profile_id = auth.uid()) and not public.is_staff_or_admin() then
    raise exception 'Players may only register themselves';
  end if;
  if not exists (select 1 from public.tryout_sessions where id = target_session and status in ('OPEN','FULL')) then
    raise exception 'Tryout registration is closed';
  end if;
  if (select count(*) from public.tryout_registrations where session_id = target_session) >=
     (select capacity from public.tryout_sessions where id = target_session) then
    raise exception 'Tryout session is full';
  end if;
  insert into public.tryout_registrations(session_id, player_id, registered_by)
  values (target_session, target_player, auth.uid())
  returning * into result;
  update public.tryout_sessions set status = case when (select count(*) from public.tryout_registrations where session_id = target_session) >= capacity then 'FULL' else status end where id = target_session;
  return result;
exception when unique_violation then
  raise exception 'Player is already registered for this tryout';
end;
$$;

create or replace function public.record_draft_pick(target_draft uuid, target_team uuid, target_player uuid)
returns public.draft_picks
language plpgsql security definer set search_path = public
as $$
declare d public.drafts; result public.draft_picks; pool_ok boolean;
begin
  if not public.is_staff_or_admin() then raise exception 'Only league staff may make draft picks'; end if;
  select * into d from public.drafts where id = target_draft for update;
  if d.status <> 'OPEN' then raise exception 'Draft is not open'; end if;
  select eligible into pool_ok from public.draft_pools where season_id = d.season_id and player_id = target_player;
  if coalesce(pool_ok, false) is not true then raise exception 'Player is not draft eligible'; end if;
  if exists (select 1 from public.draft_picks where draft_id = target_draft and player_id = target_player) then raise exception 'Player has already been drafted'; end if;
  if (select count(*) from public.rosters r join public.team_seasons ts on ts.id = r.team_season_id where ts.season_id = d.season_id and ts.team_id = target_team and r.left_at is null) >= d.roster_limit then raise exception 'Team roster is full'; end if;
  insert into public.draft_picks(draft_id, pick_number, round_number, team_id, player_id, selected_by)
  values (target_draft, d.current_pick, ((d.current_pick - 1) / (select count(*) from public.teams where is_active)) + 1, target_team, target_player, auth.uid())
  returning * into result;
  update public.drafts set current_pick = current_pick + 1 where id = target_draft;
  insert into public.audit_logs(user_id, action, details) values (auth.uid(), 'PLAYER_DRAFTED', jsonb_build_object('draft_id', target_draft, 'team_id', target_team, 'player_id', target_player)::text);
  return result;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['tryout_sessions','tryout_registrations','tryout_attendance','player_evaluations','draft_pools','drafts','draft_picks','roster_status_history','league_transactions','league_requests','league_request_messages','game_participation_status','discipline_categories','discipline_cases','discipline_appeals'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "staff manage tryouts" on public.tryout_sessions for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "players view open tryouts" on public.tryout_sessions for select using (status in ('OPEN','FULL') or public.is_staff_or_admin());
create policy "players manage own tryout registrations" on public.tryout_registrations for all using (player_id = (select id from public.players where profile_id = auth.uid()) or public.is_staff_or_admin()) with check (player_id = (select id from public.players where profile_id = auth.uid()) or public.is_staff_or_admin());
create policy "staff manage tryout attendance" on public.tryout_attendance for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage evaluations" on public.player_evaluations for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "players view own evaluations" on public.player_evaluations for select using (player_id = (select id from public.players where profile_id = auth.uid()) or public.is_staff_or_admin());
create policy "staff manage draft operations" on public.draft_pools for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "players view eligible pool" on public.draft_pools for select using (eligible or public.is_staff_or_admin());
create policy "staff manage drafts" on public.drafts for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "authenticated view draft picks" on public.draft_picks for select using (auth.uid() is not null);
create policy "staff create draft picks" on public.draft_picks for insert with check (public.is_staff_or_admin());
create policy "staff manage roster history" on public.roster_status_history for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "authorized view transactions" on public.league_transactions for select using (public.is_staff_or_admin() or proposed_by = auth.uid());
create policy "authorized create transactions" on public.league_transactions for insert with check (public.is_staff_or_admin() or proposed_by = auth.uid());
create policy "staff manage transactions" on public.league_transactions for update using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "requesters view own requests" on public.league_requests for select using (requester_id = auth.uid() or assigned_to = auth.uid() or public.is_staff_or_admin());
create policy "users create requests" on public.league_requests for insert with check (requester_id = auth.uid());
create policy "staff manage requests" on public.league_requests for update using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "request participants view messages" on public.league_request_messages for select using (author_id = auth.uid() or exists (select 1 from public.league_requests r where r.id = request_id and (r.requester_id = auth.uid() or r.assigned_to = auth.uid() or public.is_staff_or_admin())));
create policy "request participants create messages" on public.league_request_messages for insert with check (author_id = auth.uid());
create policy "staff manage participation" on public.game_participation_status for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage discipline categories" on public.discipline_categories for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "authorized view discipline" on public.discipline_cases for select using (public.is_staff_or_admin() or player_id = (select id from public.players where profile_id = auth.uid()) or reported_profile_id = auth.uid());
create policy "staff manage discipline" on public.discipline_cases for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "authorized view appeals" on public.discipline_appeals for select using (public.is_staff_or_admin() or submitted_by = auth.uid());
create policy "eligible users appeal" on public.discipline_appeals for insert with check (submitted_by = auth.uid());
create policy "staff decide appeals" on public.discipline_appeals for update using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

insert into public.discipline_categories(name) values
  ('UNSPORTSMANLIKE CONDUCT'),('FIGHTING'),('THREATS'),('HARASSMENT'),('REFEREE ABUSE'),
  ('OPPONENT ABUSE'),('TEAM MISCONDUCT'),('LEAGUE POLICY VIOLATION'),('NO-SHOW'),
  ('REPEATED FOUL CONDUCT'),('PROPERTY DAMAGE'),('SOCIAL MEDIA MISCONDUCT'),('OTHER')
on conflict (name) do nothing;

create table if not exists public.leagueapps_program_scope (
  program_id bigint primary key,
  program_name text not null,
  scope text not null check (scope in ('mens','excluded')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.leagueapps_program_scope enable row level security;
drop policy if exists "Admins manage LeagueApps program scope" on public.leagueapps_program_scope;
create policy "Admins manage LeagueApps program scope" on public.leagueapps_program_scope for all to authenticated using (public.is_admin()) with check (public.is_admin());
insert into public.leagueapps_program_scope(program_id,program_name,scope,enabled) values
(10047,'Rich City League Winter Season','mens',true),(10226,'Rich City Summer League','mens',true),
(25421,'Rich City League 2.0','mens',true),(33245,'Rich City League Premier Basketball','mens',true),
(4009394,'The Soul Food League','mens',true),(3371627,'VBA 30 & UP LEAGUE','mens',true),
(20998,'Dominion Women''s Basketball League','excluded',false),(62246,'Allure Domination Referee Training','excluded',false)
on conflict(program_id) do update set program_name=excluded.program_name,scope=excluded.scope,enabled=excluded.enabled,updated_at=now();
create or replace view public.leagueapps_mens_registrations as
select r.* from public.leagueapps_records r join public.leagueapps_program_scope s
on s.program_id=nullif(coalesce(r.payload->>'programId',r.payload->>'programID'),'')::bigint
where r.resource='registrations-2' and s.scope='mens' and s.enabled;
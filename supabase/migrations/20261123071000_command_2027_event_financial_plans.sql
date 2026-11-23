-- Private RCH event budgets. Forecasts are NOT actual ledger transactions.
-- Additive migration; do not backfill or modify rcl_command_ledger.
begin;
create table if not exists public.rcl_command_event_financial_plans (
 id uuid primary key default gen_random_uuid(),
 year integer not null check (year between 2026 and 2100),
 event_key text not null check (event_key in ('bmf','cup','tryouts','shootout','full_team')),
 name text not null check (length(name) between 3 and 120),
 event_count integer not null default 0 check (event_count between 0 and 100),
 cash_prize numeric(12,2) check (cash_prize is null or cash_prize >= 0),
 notes text not null default '',
 assumptions jsonb not null check (jsonb_typeof(assumptions)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (year,event_key),
 constraint rch_jersey_cap check (event_key not in ('cup','shootout') or (assumptions->>'jerseyUnitCost')::numeric <= 9)
);
alter table public.rcl_command_event_financial_plans enable row level security;
revoke all on table public.rcl_command_event_financial_plans from public,anon,authenticated;
grant select,update on table public.rcl_command_event_financial_plans to authenticated;
create policy "Command 2027 financial plans read" on public.rcl_command_event_financial_plans for select to authenticated using (public.rcl_command_is_admin());
create policy "Command 2027 financial plans update" on public.rcl_command_event_financial_plans for update to authenticated using (public.rcl_command_is_admin()) with check (public.rcl_command_is_admin());
create trigger command_audit_event_financial_plans before update on public.rcl_command_event_financial_plans for each row execute function public.rcl_command_touch_audit();
insert into public.rcl_command_event_financial_plans (year,event_key,name,event_count,cash_prize,notes,assumptions)
values
(2027,'bmf','BMF 1v1 Tournament',10,0,'32 players assumed; event duration and referee billing units still provisional.','{"teams":32,"entryFee":40,"spectators":80,"ticketPrice":10,"sponsors":500,"vendors":1,"vendorFee":100,"days":1,"games":31,"jerseysPerTeam":0,"beltCount":1,"venueRental":510,"venueStaff":240,"officials":240,"media":300,"dj":150,"otherAwards":0,"insurance":125,"security":100,"marketing":150,"equipment":75,"permits":25,"otherStaff":0,"contingencyRate":0.1,"processingRate":0.03,"beltCost":299,"jerseyUnitCost":9}'::jsonb),
(2027,'cup','Commonwealth Cup 3v3',4,0,'Confirmed: 32 teams, single elimination, 31 games, two days, 5 all-in jerseys/team at $9; four Cups scheduled provisionally.','{"teams":32,"entryFee":450,"spectators":120,"ticketPrice":10,"sponsors":750,"vendors":2,"vendorFee":100,"days":2,"games":31,"jerseysPerTeam":5,"beltCount":1,"venueRental":1700,"venueStaff":400,"officials":800,"media":800,"dj":300,"otherAwards":200,"insurance":150,"security":300,"marketing":200,"equipment":100,"permits":25,"otherStaff":0,"contingencyRate":0.1,"processingRate":0.03,"beltCost":299,"jerseyUnitCost":9}'::jsonb),
(2027,'tryouts','Rich City League Tryouts',1,0,'$25/player confirmed; 60 participants and event date are estimates. No belts or jerseys.','{"teams":60,"entryFee":25,"spectators":0,"ticketPrice":0,"sponsors":0,"vendors":0,"vendorFee":0,"days":1,"games":0,"jerseysPerTeam":0,"beltCount":0,"venueRental":340,"venueStaff":160,"officials":0,"media":200,"dj":0,"otherAwards":0,"insurance":100,"security":0,"marketing":100,"equipment":75,"permits":25,"otherStaff":150,"contingencyRate":0.1,"processingRate":0.03,"beltCost":299,"jerseyUnitCost":9}'::jsonb),
(2027,'shootout','RVA Shootout 5v5',1,null,'Confirmed: 12 teams, $900/team, double elimination, two days (May 15–16 provisional), 22–23 games; modeled 23. Cash prize TBD.','{"teams":12,"entryFee":900,"spectators":250,"ticketPrice":10,"sponsors":1000,"vendors":3,"vendorFee":100,"days":2,"games":23,"jerseysPerTeam":12,"beltCount":1,"venueRental":2720,"venueStaff":640,"officials":920,"media":1150,"dj":300,"otherAwards":250,"insurance":300,"security":300,"marketing":300,"equipment":150,"permits":25,"otherStaff":0,"contingencyRate":0.1,"processingRate":0.03,"beltCost":299,"jerseyUnitCost":9}'::jsonb),
(2027,'full_team','Other Full-Team Tournament',0,0,'Optional format, NOT scheduled; $700/team fee confirmed. Other operating quantities are estimates.','{"teams":12,"entryFee":700,"spectators":200,"ticketPrice":10,"sponsors":0,"vendors":2,"vendorFee":100,"days":1,"games":23,"jerseysPerTeam":0,"beltCount":1,"venueRental":1360,"venueStaff":320,"officials":920,"media":1150,"dj":150,"otherAwards":250,"insurance":200,"security":200,"marketing":250,"equipment":125,"permits":25,"otherStaff":0,"contingencyRate":0.1,"processingRate":0.03,"beltCost":299,"jerseyUnitCost":9}'::jsonb)
on conflict (year,event_key) do nothing;
comment on table public.rcl_command_event_financial_plans is 'Admin-only RCH financial planning scenarios, never recorded receipts or registration payments';
commit;

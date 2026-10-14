-- Franchise Growth Intelligence 1.0. Retain original RCL territory authority and team-scoped access.
-- No purchased third-party audiences, inferred protected traits, fabricated sponsor revenue, or auto-sent outreach.
create or replace function public.rcl_growth_team_access(p_team_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select (select auth.uid()) is not null and (
   (select public.rcl_command_is_admin())
   or (select public.rcl_has_staff_assignment('franchise_owner',p_team_id))
 )
$$;
revoke all on function public.rcl_growth_team_access(uuid) from public;
grant execute on function public.rcl_growth_team_access(uuid) to authenticated;

-- Approved franchise owners may READ their assigned home market. Territory edits remain admin-only.
drop policy if exists "RCL approved owner territories read" on public.rcl_command_territories;
create policy "RCL approved owner territories read" on public.rcl_command_territories
 for select to authenticated using (public.rcl_growth_team_access(team_id));
drop policy if exists "RCL approved owner localities read" on public.rcl_command_territory_localities;
create policy "RCL approved owner localities read" on public.rcl_command_territory_localities
 for select to authenticated using (
  exists(select 1 from public.rcl_command_territories t
   where t.id=territory_id and public.rcl_growth_team_access(t.team_id))
 );

-- Official public census *observations*, never proprietary identity or household-level targeting.
-- NULL fields remain unknown. Population is not fan reach. County medians must not be averaged.
create table if not exists public.rcl_growth_market_facts (
 id uuid primary key default gen_random_uuid(),
 fips text not null unique references public.rcl_command_territory_localities(fips) on delete restrict,
 population integer check(population is null or population>=0),
 adults_18_34 integer check(adults_18_34 is null or adults_18_34>=0),
 households integer check(households is null or households>=0),
 median_household_income numeric(12,2) check(median_household_income is null or median_household_income>=0),
 source_name text not null check(length(trim(source_name)) between 6 and 180),
 source_url text not null check(source_url ~ '^https://[^ ]{5,600}$'),
 source_year integer not null check(source_year between 2010 and 2100),
 verified_on date not null default current_date,
 notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(adults_18_34 is null or population is null or adults_18_34 <= population)
);
comment on table public.rcl_growth_market_facts is 'Staff-reviewed public area-level ACS or similar facts. NULL=unknown; do not average county median household incomes or assert estimated fan reach.';

-- Organization leads: proposals and manually confirmed outcomes only. No auto-contacting.
create table if not exists public.rcl_growth_prospects (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id) on delete restrict,
 name text not null check(length(trim(name)) between 2 and 170),
 category text not null check(category in
   ('local_business','corporate','health_wellness','restaurants','automotive','education','financial_services','retail','media_creator','basketball_organization','nonprofit','other')),
 relationship_type text not null default 'sponsor' check(relationship_type in ('sponsor','media','venue','community','promotional','other')),
 city text not null default '',
 website_url text check(website_url is null or website_url ~ '^https://[^ ]{5,600}$'),
 source_url text check(source_url is null or source_url ~ '^https://[^ ]{5,600}$'),
 source_checked_on date,
 public_contact text not null default '',
 stage text not null default 'research' check(stage in ('research','qualified','contacted','meeting','proposal','negotiating','won','lost')),
 est_ask numeric(12,2) check(est_ask is null or est_ask>=0),
 contracted_amount numeric(12,2) check(contracted_amount is null or contracted_amount>=0),
 signed_reference text not null default '',
 next_action text not null default '',
 next_action_on date,
 notes text not null default '',
 created_by uuid default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint growth_won_requires_document check(
  stage <> 'won' or (length(trim(signed_reference))>=6 and contracted_amount is not null)
 )
);
create index if not exists rcl_growth_prospects_team_idx on public.rcl_growth_prospects(team_id,stage,next_action_on);
comment on table public.rcl_growth_prospects is 'Team-scoped strategic sponsorship and partnership leads. Won means signed document cited; contracted amounts are not verified received revenue.';

-- Track work from concept through evidence-backed outcomes; plans are never automatically published.
create table if not exists public.rcl_growth_campaigns (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id) on delete restrict,
 title text not null check(length(trim(title)) between 3 and 160),
 playbook text not null check(playbook in ('founding_fans','sponsor_drive','court_to_crowd','community_clinic','rch_tv','local_rivalry','other')),
 channel text not null check(channel in ('social','community','email','partners','venue','multi_channel')),
 audience text not null default 'Local basketball fans and community' check(length(audience) between 3 and 160),
 offer text not null default '' check(length(offer)<=500),
 call_to_action text not null default '' check(length(call_to_action)<=300),
 status text not null default 'draft' check(status in ('draft','ready','active','completed','paused')),
 starts_on date,
 ends_on date,
 target_tickets integer check(target_tickets is null or target_tickets>=0),
 target_leads integer check(target_leads is null or target_leads>=0),
 budget numeric(12,2) check(budget is null or budget>=0),
 actual_spend numeric(12,2) check(actual_spend is null or actual_spend>=0),
 actual_tickets integer check(actual_tickets is null or actual_tickets>=0),
 actual_leads integer check(actual_leads is null or actual_leads>=0),
 actual_reach integer check(actual_reach is null or actual_reach>=0),
 evidence_reference text not null default '',
 notes text not null default '',
 created_by uuid default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(ends_on is null or starts_on is null or ends_on>=starts_on),
 check(
  (actual_spend is null and actual_tickets is null and actual_leads is null and actual_reach is null)
  or length(trim(evidence_reference))>=6
 )
);
create index if not exists rcl_growth_campaigns_team_idx on public.rcl_growth_campaigns(team_id,status,starts_on);
comment on table public.rcl_growth_campaigns is 'Manual franchise growth campaign workbench. Reported results require evidence reference and are not an automated ad-platform measurement.';

-- Live count of the exact locality-labelled entries RCH has catalogued. These are NOT total
-- real facilities, open facilities, confirmed gym bookings or advertising reach.
create or replace view public.rcl_growth_locality_court_signals
with (security_invoker=true) as
with locality_names as (
 select fips,name,locality_type,territory_id,
 row_number() over(partition by lower(trim(name)) order by case when locality_type='city' then 0 else 1 end,fips) as preferred
 from public.rcl_command_territory_localities
)
select l.fips,l.territory_id,count(b.slug)::integer as mapped_court_records
from locality_names l left join public.basketball_locations b
 on b.is_active is true and (
  (l.locality_type='county' and lower(trim(b.locality))=lower(trim(l.name||' County')))
  or (l.preferred=1 and lower(trim(b.locality))=lower(trim(l.name)))
 )
group by l.fips,l.territory_id;
comment on view public.rcl_growth_locality_court_signals is 'Exact locality-name matched active RCH directory records only. Name ambiguity resolved once; may undercount and is not a count of proven rentable facilities.';
revoke all on public.rcl_growth_locality_court_signals from anon;
grant select on public.rcl_growth_locality_court_signals to authenticated;

do $$
declare tbl text;
begin
 foreach tbl in array array['rcl_growth_market_facts','rcl_growth_prospects','rcl_growth_campaigns'] loop
  execute format('alter table public.%I enable row level security',tbl);
  execute format('revoke all on public.%I from anon',tbl);
  execute format('grant select,insert,update on public.%I to authenticated',tbl);
  execute format('drop trigger if exists command_audit_%I on public.%I',tbl,tbl);
  execute format('create trigger command_audit_%I before insert or update on public.%I for each row execute function public.rcl_command_touch_audit()',tbl,tbl);
 end loop;
end $$;
drop policy if exists "Growth sourced facts read" on public.rcl_growth_market_facts;
create policy "Growth sourced facts read" on public.rcl_growth_market_facts
for select to authenticated using (exists(
 select 1 from public.rcl_command_territory_localities l join public.rcl_command_territories t on t.id=l.territory_id
 where l.fips=fips and public.rcl_growth_team_access(t.team_id)
));
drop policy if exists "Growth sourced facts admin insert" on public.rcl_growth_market_facts;
create policy "Growth sourced facts admin insert" on public.rcl_growth_market_facts
for insert to authenticated with check(public.rcl_command_is_admin());
drop policy if exists "Growth sourced facts admin update" on public.rcl_growth_market_facts;
create policy "Growth sourced facts admin update" on public.rcl_growth_market_facts
for update to authenticated using(public.rcl_command_is_admin()) with check(public.rcl_command_is_admin());
drop policy if exists "Growth prospects read" on public.rcl_growth_prospects;
create policy "Growth prospects read" on public.rcl_growth_prospects
for select to authenticated using(public.rcl_growth_team_access(team_id));
drop policy if exists "Growth prospects create" on public.rcl_growth_prospects;
create policy "Growth prospects create" on public.rcl_growth_prospects
for insert to authenticated with check(public.rcl_growth_team_access(team_id));
drop policy if exists "Growth prospects update" on public.rcl_growth_prospects;
create policy "Growth prospects update" on public.rcl_growth_prospects
for update to authenticated using(public.rcl_growth_team_access(team_id)) with check(public.rcl_growth_team_access(team_id));
drop policy if exists "Growth campaigns read" on public.rcl_growth_campaigns;
create policy "Growth campaigns read" on public.rcl_growth_campaigns
for select to authenticated using(public.rcl_growth_team_access(team_id));
drop policy if exists "Growth campaigns create" on public.rcl_growth_campaigns;
create policy "Growth campaigns create" on public.rcl_growth_campaigns
for insert to authenticated with check(public.rcl_growth_team_access(team_id));
drop policy if exists "Growth campaigns update" on public.rcl_growth_campaigns;
create policy "Growth campaigns update" on public.rcl_growth_campaigns
for update to authenticated using(public.rcl_growth_team_access(team_id)) with check(public.rcl_growth_team_access(team_id));

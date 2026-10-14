-- RCL statewide franchise marketing / development territories.
-- Each of Virginia's 95 counties + 38 independent cities is a single, unique jurisdiction.
-- Approved home markets are internal planning assignments, NOT property or exclusive player rights.
create table public.rcl_command_territories (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null unique references public.teams(id) on delete restrict,
 home_market text not null check(length(trim(home_market)) between 3 and 120),
 division text not null check(division in ('Northern','Central','Western','Coastal & South')),
 status text not null default 'approved_market' check(status in ('approved_market','protected')),
 home_lat double precision not null check(home_lat between 36 and 40),
 home_lon double precision not null check(home_lon between -84 and -75),
 signed_agreement_reference text not null default '',
 protection_effective_on date,
 notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint rcl_territory_protection_requires_agreement check (
  status <> 'protected' or
  (length(trim(signed_agreement_reference)) >= 6 and protection_effective_on is not null)
 )
);
create table public.rcl_command_territory_localities (
 id uuid primary key default gen_random_uuid(),
 fips text not null unique check (fips ~ '^51[0-9]{3}$'),
 name text not null check(length(trim(name)) > 1),
 locality_type text not null check(locality_type in ('county','city')),
 scope text not null default 'development' check(scope in ('core','development')),
 territory_id uuid not null references public.rcl_command_territories(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index rcl_territory_localities_team_idx on public.rcl_command_territory_localities(territory_id,scope);

alter table public.rcl_command_territories enable row level security;
alter table public.rcl_command_territory_localities enable row level security;
revoke all on public.rcl_command_territories,public.rcl_command_territory_localities from anon;
grant select,insert,update on public.rcl_command_territories,public.rcl_command_territory_localities to authenticated;
create policy "RCL admin territories read" on public.rcl_command_territories for select to authenticated using (public.rcl_command_is_admin());
create policy "RCL admin territories insert" on public.rcl_command_territories for insert to authenticated with check(public.rcl_command_is_admin());
create policy "RCL admin territories update" on public.rcl_command_territories for update to authenticated using(public.rcl_command_is_admin()) with check(public.rcl_command_is_admin());
create policy "RCL admin localities read" on public.rcl_command_territory_localities for select to authenticated using(public.rcl_command_is_admin());
create policy "RCL admin localities insert" on public.rcl_command_territory_localities for insert to authenticated with check(public.rcl_command_is_admin());
create policy "RCL admin localities update" on public.rcl_command_territory_localities for update to authenticated using(public.rcl_command_is_admin()) with check(public.rcl_command_is_admin());
create trigger command_audit_rcl_command_territories before insert or update on public.rcl_command_territories for each row execute function public.rcl_command_touch_audit();
create trigger command_audit_rcl_command_territory_localities before insert or update on public.rcl_command_territory_localities for each row execute function public.rcl_command_touch_audit();

-- Idempotent adoption: teams are externally imported, so a fresh database may initially be empty.
with planned(team_name,home_market,division,lat,lon) as (values
 ('Goats','Fairfax / Northern Virginia','Northern',38.8462,-77.3064),
 ('Winchester Phantoms','Winchester','Northern',39.1857,-78.1633),
 ('Spartans','Fredericksburg','Northern',38.3032,-77.4605),
 ('River City Renegades','Richmond','Central',37.5407,-77.436),
 ('Charlottesville Summit','Charlottesville','Central',38.0293,-78.4767),
 ('Full Court Love','Harrisonburg','Central',38.4496,-78.8689),
 ('Wolves','Roanoke','Western',37.271,-79.9414),
 ('Team Fast Break Family','Lynchburg','Western',37.4138,-79.1422),
 ('Team Never Give Up','Bristol / Southwest Virginia','Western',36.5951,-82.1887),
 ('Hoop Dreamz','Petersburg / Tri-Cities','Coastal & South',37.2279,-77.4019),
 ('Norfolk Destroyers','Norfolk / South Hampton Roads','Coastal & South',36.8508,-76.2859),
 ('ROC Nation Hoops','Newport News / Hampton','Coastal & South',37.0871,-76.473)
)
insert into public.rcl_command_territories(team_id,home_market,division,home_lat,home_lon)
select t.id,p.home_market,p.division,p.lat,p.lon
from planned p join public.teams t on t.name=p.team_name and t.is_active is true
on conflict (team_id) do nothing;

with jurisdiction(fips,name,kind,scope,team_name) as (values
 ('51059','Fairfax','county','core','Goats'),
 ('51013','Arlington','county','core','Goats'),
 ('51107','Loudoun','county','development','Goats'),
 ('51153','Prince William','county','development','Goats'),
 ('51061','Fauquier','county','development','Goats'),
 ('51510','Alexandria','city','core','Goats'),
 ('51600','Fairfax','city','core','Goats'),
 ('51610','Falls Church','city','core','Goats'),
 ('51683','Manassas','city','development','Goats'),
 ('51685','Manassas Park','city','development','Goats'),
 ('51069','Frederick','county','core','Winchester Phantoms'),
 ('51043','Clarke','county','development','Winchester Phantoms'),
 ('51187','Warren','county','development','Winchester Phantoms'),
 ('51171','Shenandoah','county','development','Winchester Phantoms'),
 ('51139','Page','county','development','Winchester Phantoms'),
 ('51840','Winchester','city','core','Winchester Phantoms'),
 ('51033','Caroline','county','development','Spartans'),
 ('51047','Culpeper','county','development','Spartans'),
 ('51057','Essex','county','development','Spartans'),
 ('51099','King George','county','development','Spartans'),
 ('51103','Lancaster','county','development','Spartans'),
 ('51133','Northumberland','county','development','Spartans'),
 ('51159','Richmond','county','development','Spartans'),
 ('51177','Spotsylvania','county','core','Spartans'),
 ('51179','Stafford','county','core','Spartans'),
 ('51193','Westmoreland','county','development','Spartans'),
 ('51630','Fredericksburg','city','core','Spartans'),
 ('51036','Charles City','county','development','River City Renegades'),
 ('51041','Chesterfield','county','core','River City Renegades'),
 ('51075','Goochland','county','development','River City Renegades'),
 ('51085','Hanover','county','core','River City Renegades'),
 ('51087','Henrico','county','core','River City Renegades'),
 ('51097','King and Queen','county','development','River City Renegades'),
 ('51101','King William','county','development','River City Renegades'),
 ('51127','New Kent','county','development','River City Renegades'),
 ('51145','Powhatan','county','development','River City Renegades'),
 ('51760','Richmond','city','core','River City Renegades'),
 ('51003','Albemarle','county','core','Charlottesville Summit'),
 ('51029','Buckingham','county','development','Charlottesville Summit'),
 ('51049','Cumberland','county','development','Charlottesville Summit'),
 ('51065','Fluvanna','county','development','Charlottesville Summit'),
 ('51079','Greene','county','development','Charlottesville Summit'),
 ('51109','Louisa','county','development','Charlottesville Summit'),
 ('51113','Madison','county','development','Charlottesville Summit'),
 ('51125','Nelson','county','development','Charlottesville Summit'),
 ('51137','Orange','county','development','Charlottesville Summit'),
 ('51157','Rappahannock','county','development','Charlottesville Summit'),
 ('51540','Charlottesville','city','core','Charlottesville Summit'),
 ('51005','Alleghany','county','development','Full Court Love'),
 ('51015','Augusta','county','core','Full Court Love'),
 ('51017','Bath','county','development','Full Court Love'),
 ('51091','Highland','county','development','Full Court Love'),
 ('51163','Rockbridge','county','development','Full Court Love'),
 ('51165','Rockingham','county','core','Full Court Love'),
 ('51530','Buena Vista','city','development','Full Court Love'),
 ('51580','Covington','city','development','Full Court Love'),
 ('51660','Harrisonburg','city','core','Full Court Love'),
 ('51678','Lexington','city','development','Full Court Love'),
 ('51790','Staunton','city','core','Full Court Love'),
 ('51820','Waynesboro','city','core','Full Court Love'),
 ('51019','Bedford','county','development','Wolves'),
 ('51023','Botetourt','county','core','Wolves'),
 ('51045','Craig','county','development','Wolves'),
 ('51063','Floyd','county','development','Wolves'),
 ('51067','Franklin','county','development','Wolves'),
 ('51071','Giles','county','development','Wolves'),
 ('51121','Montgomery','county','development','Wolves'),
 ('51155','Pulaski','county','development','Wolves'),
 ('51161','Roanoke','county','core','Wolves'),
 ('51750','Radford','city','development','Wolves'),
 ('51770','Roanoke','city','core','Wolves'),
 ('51775','Salem','city','core','Wolves'),
 ('51009','Amherst','county','core','Team Fast Break Family'),
 ('51011','Appomattox','county','development','Team Fast Break Family'),
 ('51031','Campbell','county','core','Team Fast Break Family'),
 ('51037','Charlotte','county','development','Team Fast Break Family'),
 ('51083','Halifax','county','development','Team Fast Break Family'),
 ('51089','Henry','county','development','Team Fast Break Family'),
 ('51141','Patrick','county','development','Team Fast Break Family'),
 ('51143','Pittsylvania','county','development','Team Fast Break Family'),
 ('51147','Prince Edward','county','development','Team Fast Break Family'),
 ('51590','Danville','city','development','Team Fast Break Family'),
 ('51680','Lynchburg','city','core','Team Fast Break Family'),
 ('51690','Martinsville','city','development','Team Fast Break Family'),
 ('51021','Bland','county','development','Team Never Give Up'),
 ('51027','Buchanan','county','development','Team Never Give Up'),
 ('51035','Carroll','county','development','Team Never Give Up'),
 ('51051','Dickenson','county','development','Team Never Give Up'),
 ('51077','Grayson','county','development','Team Never Give Up'),
 ('51105','Lee','county','development','Team Never Give Up'),
 ('51167','Russell','county','development','Team Never Give Up'),
 ('51169','Scott','county','development','Team Never Give Up'),
 ('51173','Smyth','county','development','Team Never Give Up'),
 ('51185','Tazewell','county','development','Team Never Give Up'),
 ('51191','Washington','county','core','Team Never Give Up'),
 ('51195','Wise','county','development','Team Never Give Up'),
 ('51197','Wythe','county','development','Team Never Give Up'),
 ('51520','Bristol','city','core','Team Never Give Up'),
 ('51640','Galax','city','development','Team Never Give Up'),
 ('51720','Norton','city','development','Team Never Give Up'),
 ('51007','Amelia','county','development','Hoop Dreamz'),
 ('51025','Brunswick','county','development','Hoop Dreamz'),
 ('51053','Dinwiddie','county','core','Hoop Dreamz'),
 ('51081','Greensville','county','development','Hoop Dreamz'),
 ('51111','Lunenburg','county','development','Hoop Dreamz'),
 ('51117','Mecklenburg','county','development','Hoop Dreamz'),
 ('51135','Nottoway','county','development','Hoop Dreamz'),
 ('51149','Prince George','county','core','Hoop Dreamz'),
 ('51175','Southampton','county','development','Hoop Dreamz'),
 ('51181','Surry','county','development','Hoop Dreamz'),
 ('51183','Sussex','county','development','Hoop Dreamz'),
 ('51570','Colonial Heights','city','core','Hoop Dreamz'),
 ('51595','Emporia','city','development','Hoop Dreamz'),
 ('51620','Franklin','city','development','Hoop Dreamz'),
 ('51670','Hopewell','city','core','Hoop Dreamz'),
 ('51730','Petersburg','city','core','Hoop Dreamz'),
 ('51093','Isle of Wight','county','development','Norfolk Destroyers'),
 ('51550','Chesapeake','city','core','Norfolk Destroyers'),
 ('51710','Norfolk','city','core','Norfolk Destroyers'),
 ('51740','Portsmouth','city','core','Norfolk Destroyers'),
 ('51800','Suffolk','city','development','Norfolk Destroyers'),
 ('51810','Virginia Beach','city','core','Norfolk Destroyers'),
 ('51001','Accomack','county','development','ROC Nation Hoops'),
 ('51073','Gloucester','county','development','ROC Nation Hoops'),
 ('51095','James City','county','development','ROC Nation Hoops'),
 ('51115','Mathews','county','development','ROC Nation Hoops'),
 ('51119','Middlesex','county','development','ROC Nation Hoops'),
 ('51131','Northampton','county','development','ROC Nation Hoops'),
 ('51199','York','county','core','ROC Nation Hoops'),
 ('51650','Hampton','city','core','ROC Nation Hoops'),
 ('51700','Newport News','city','core','ROC Nation Hoops'),
 ('51735','Poquoson','city','development','ROC Nation Hoops'),
 ('51830','Williamsburg','city','development','ROC Nation Hoops')
)
insert into public.rcl_command_territory_localities(fips,name,locality_type,scope,territory_id)
select j.fips,j.name,j.kind,j.scope,tr.id from jurisdiction j
join public.teams t on t.name=j.team_name and t.is_active is true
join public.rcl_command_territories tr on tr.team_id=t.id
on conflict (fips) do nothing;

comment on table public.rcl_command_territories is 'RCL approved franchise home markets; legal protection only with signed agreement reference and effective date. Not venue or public property ownership.';
comment on table public.rcl_command_territory_localities is 'Complete VA county-equivalent marketing/development coverage. A unique FIPS prevents overlaps. Core vs development are planning scope, not player residence restrictions.';

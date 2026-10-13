-- RCL Command Center: exclusive league operations, never public data.
create or replace function public.rcl_command_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role::text = 'admin' and coalesce(p.is_active,true)
) $$;
revoke all on function public.rcl_command_is_admin() from public;
grant execute on function public.rcl_command_is_admin() to authenticated, service_role;

create table if not exists public.rcl_command_budgets (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 2 and 150),
 category text not null check(length(trim(category)) between 2 and 70),
 season_id uuid references public.seasons(id) on delete set null,
 team_id uuid references public.teams(id) on delete set null,
 planned_amount numeric(12,2) not null check (planned_amount >= 0),
 notes text not null default '',
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.rcl_command_ledger (
 id uuid primary key default gen_random_uuid(),
 direction text not null check(direction in ('income','expense')),
 category text not null check(length(trim(category)) between 2 and 70),
 description text not null check(length(trim(description)) between 2 and 200),
 amount numeric(12,2) not null check(amount > 0),
 state text not null default 'projected' check(state in ('projected','recorded','reconciled','void')),
 game_id uuid references public.games(id) on delete set null,
 team_id uuid references public.teams(id) on delete set null,
 season_id uuid references public.seasons(id) on delete set null,
 occurred_on date not null default current_date,
 reference text not null default '',
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.rcl_command_venues (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 2 and 160),
 city text not null check(length(trim(city)) between 2 and 90),
 address text not null default '',
 hourly_rate numeric(10,2) check(hourly_rate >= 0),
 capacity integer check(capacity >= 0),
 contact text not null default '',
 state text not null default 'researching' check(state in ('researching','contacted','available','contracted','unavailable')),
 home_team_id uuid references public.teams(id) on delete set null,
 notes text not null default '',
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.rcl_command_bookings (
 id uuid primary key default gen_random_uuid(),
 venue_id uuid not null references public.rcl_command_venues(id) on delete restrict,
 team_id uuid references public.teams(id) on delete set null,
 game_id uuid references public.games(id) on delete set null,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 hourly_rate numeric(10,2) not null check(hourly_rate >= 0),
 status text not null default 'tentative' check(status in ('tentative','confirmed','cancelled')),
 notes text not null default '',
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint rcl_command_booking_time_check check (ends_at > starts_at)
);
create table if not exists public.rcl_command_inventory (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 2 and 120),
 unit_cost numeric(10,2) not null check(unit_cost >= 0),
 sale_price numeric(10,2) not null check(sale_price >= 0),
 stock_count integer not null default 0 check(stock_count >= 0),
 reorder_at integer not null default 5 check(reorder_at >= 0),
 active boolean not null default true,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.rcl_command_concession_sales (
 id uuid primary key default gen_random_uuid(),
 item_id uuid not null references public.rcl_command_inventory(id) on delete restrict,
 game_id uuid references public.games(id) on delete set null,
 quantity integer not null check(quantity > 0),
 unit_price numeric(10,2) not null check(unit_price >= 0),
 unit_cost numeric(10,2) not null check(unit_cost >= 0),
 recorded_at timestamptz not null default now(),
 created_by uuid not null default auth.uid() references auth.users(id)
);
create table if not exists public.rcl_command_trades (
 id uuid primary key default gen_random_uuid(),
 sending_team_id uuid not null references public.teams(id) on delete restrict,
 receiving_team_id uuid not null references public.teams(id) on delete restrict,
 player_id uuid references public.players(id) on delete set null,
 proposal text not null check(length(trim(proposal)) between 5 and 2500),
 status text not null default 'proposed' check(status in ('proposed','under_review','approved','rejected','cancelled')),
 decision_notes text not null default '',
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint rcl_command_trade_distinct_teams check(sending_team_id <> receiving_team_id)
);
create table if not exists public.rcl_command_stories (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 2 and 160),
 format text not null default 'game_promo' check(format in ('game_promo','rivalry','player_feature','rch_tv','press','other')),
 narrative text not null check(length(trim(narrative)) between 5 and 5000),
 status text not null default 'draft' check(status in ('draft','review','approved','released')),
 game_id uuid references public.games(id) on delete set null,
 team_id uuid references public.teams(id) on delete set null,
 scheduled_for date,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.rcl_command_tasks (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 2 and 180),
 category text not null default 'operations' check(category in ('operations','game_day','staffing','media','finance','venue')),
 priority text not null default 'normal' check(priority in ('low','normal','urgent')),
 status text not null default 'open' check(status in ('open','in_progress','done')),
 due_on date,
 game_id uuid references public.games(id) on delete set null,
 team_id uuid references public.teams(id) on delete set null,
 notes text not null default '',
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.rcl_command_audit (
 id bigint generated always as identity primary key,
 table_name text not null,
 record_id uuid not null,
 operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
 actor_id uuid,
 before_record jsonb,
 after_record jsonb,
 created_at timestamptz not null default now()
);
create or replace function public.rcl_command_touch_audit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare before_doc jsonb; after_doc jsonb;
begin
 if tg_op = 'UPDATE' then new.updated_at = now(); end if;
 if tg_op in ('UPDATE','DELETE') then before_doc = to_jsonb(old); end if;
 if tg_op in ('UPDATE','INSERT') then after_doc = to_jsonb(new); end if;
 insert into public.rcl_command_audit(table_name,record_id,operation,actor_id,before_record,after_record)
 values (tg_table_name,coalesce(new.id,old.id),tg_op,auth.uid(),before_doc,after_doc);
 if tg_op = 'DELETE' then return old; else return new; end if;
end $$;
create or replace function public.rcl_command_check_booking()
returns trigger language plpgsql set search_path = ''
as $$
begin
 if new.status='confirmed' and exists (
 select 1 from public.rcl_command_bookings b
 where b.venue_id=new.venue_id and b.id<>new.id and b.status='confirmed'
 and b.starts_at < new.ends_at and b.ends_at > new.starts_at
 ) then raise exception 'Venue already has a confirmed booking in that time range'; end if;
 return new;
end $$;
create trigger rcl_command_check_booking before insert or update on public.rcl_command_bookings
for each row execute function public.rcl_command_check_booking();
create or replace function public.rcl_command_sale_stock()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare item record;
begin
 select unit_cost,sale_price,stock_count,active into item from public.rcl_command_inventory where id=new.item_id for update;
 if not found or not item.active then raise exception 'Item unavailable'; end if;
 if item.stock_count < new.quantity then raise exception 'Insufficient concession stock'; end if;
 new.unit_cost := item.unit_cost; new.unit_price := item.sale_price;
 update public.rcl_command_inventory set stock_count=stock_count-new.quantity,updated_at=now() where id=new.item_id;
 return new;
end $$;
create trigger rcl_command_sale_stock before insert on public.rcl_command_concession_sales
for each row execute function public.rcl_command_sale_stock();

do $$
declare t text;
begin
 foreach t in array array[
  'rcl_command_budgets','rcl_command_ledger','rcl_command_venues','rcl_command_bookings',
  'rcl_command_inventory','rcl_command_concession_sales','rcl_command_trades',
  'rcl_command_stories','rcl_command_tasks','rcl_command_audit'
 ] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('create policy "RCL admins read" on public.%I for select to authenticated using (public.rcl_command_is_admin())',t);
  if t <> 'rcl_command_audit' then
   execute format('create policy "RCL admins insert" on public.%I for insert to authenticated with check (public.rcl_command_is_admin())',t);
   execute format('create policy "RCL admins update" on public.%I for update to authenticated using (public.rcl_command_is_admin()) with check (public.rcl_command_is_admin())',t);
  end if;
 end loop;
end $$;
-- Audits, ledger, and concession sales are append-only from the client. Voids are tracked as audited state changes.
drop policy if exists "RCL admins update" on public.rcl_command_concession_sales;
drop policy if exists "RCL admins update" on public.rcl_command_budgets;
create policy "RCL admins budget edits" on public.rcl_command_budgets for update to authenticated using(public.rcl_command_is_admin()) with check(public.rcl_command_is_admin());
-- financial entries may transition between projected/recorded/reconciled/void with audited before-and-after states.
do $$
declare t text;
begin
 foreach t in array array['rcl_command_budgets','rcl_command_ledger','rcl_command_venues','rcl_command_bookings','rcl_command_inventory','rcl_command_trades','rcl_command_stories','rcl_command_tasks'] loop
  execute format('create trigger command_audit_%I before insert or update or delete on public.%I for each row execute function public.rcl_command_touch_audit()',t,t);
 end loop;
end $$;
-- Sales are append-only; record a sales audit after stock is adjusted.
create trigger command_audit_sale after insert on public.rcl_command_concession_sales
for each row execute function public.rcl_command_touch_audit();
create index if not exists rcl_command_ledger_game_idx on public.rcl_command_ledger(game_id,occurred_on);
create index if not exists rcl_command_booking_time_idx on public.rcl_command_bookings(venue_id,starts_at,ends_at);
create index if not exists rcl_command_sale_game_idx on public.rcl_command_concession_sales(game_id,recorded_at);
create index if not exists rcl_command_task_status_idx on public.rcl_command_tasks(status,due_on);
comment on table public.rcl_command_trades is 'Command Center proposal and approvals only; no automatic LeagueApps or official roster mutation.';

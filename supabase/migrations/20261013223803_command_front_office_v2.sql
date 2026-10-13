-- RCL Command Center 2.0: basketball-specific templates, game attendance,
-- franchise financial scenarios, guided operations and wholesale catalog.
-- The existing Command administrator guard is reused without widening access.

alter table public.rcl_command_budgets
 add constraint rcl_command_budget_standard_categories
 check (category in ('uniforms_jerseys','uniforms_warmups','venue_game_rental','venue_practice_rental','venue_staffing_deposits','officials_referees','scorekeepers_statcrew','security_medical','staff_payroll','equipment_basketballs','equipment_scoreboards','media_streaming_production','media_photography','marketing_digital','marketing_print','insurance_permits','technology_platform','travel_transport','awards_trophies','concession_inventory','concession_equipment','merchandise_cost','cleaning_utilities','contingency'));
alter table public.rcl_command_ledger
 add constraint rcl_command_ledger_standard_categories
 check ((direction='income' and category in ('registration_fees','team_franchise_fees','ticket_general','ticket_vip','ticket_season_pass','ticket_door_cash','sponsorship_league','sponsorship_game','sponsorship_team','advertising_in_venue','merchandise_sales','media_subscription','media_sponsorship','donations_grants','vendor_fees','parking_revenue','other_income'))
     or (direction='expense' and category in ('uniforms_jerseys','venue_game_rental','venue_practice_rental','venue_staffing_deposits','officials_referees','scorekeepers_statcrew','security_medical','staff_payroll','equipment_supplies','media_streaming_production','marketing_promotion','insurance_permits','technology_fees','travel_transport','awards_prizes','merchant_processing_fees','merchandise_cost','concession_purchases','cleaning_utilities','other_operating')));

create table public.rcl_command_game_reports (
 id uuid primary key default gen_random_uuid(),
 game_id uuid not null unique references public.games(id) on delete cascade,
 paid_attendance integer check (paid_attendance is null or paid_attendance >= 0),
 complimentary_attendance integer check (complimentary_attendance is null or complimentary_attendance >= 0),
 tickets_sold integer check (tickets_sold is null or tickets_sold >= 0),
 attendance_source text not null default 'not_recorded'
  check (attendance_source in ('not_recorded','staff_gate_count','ticket_scans','venue_turnstile','box_office_report')),
 notes text not null default '',
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint rcl_command_report_source_required check (
  (paid_attendance is null and complimentary_attendance is null)
  or attendance_source <> 'not_recorded'
 )
);
create index rcl_command_game_reports_game_idx on public.rcl_command_game_reports(game_id);

create table public.rcl_command_franchise_models (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null unique references public.teams(id) on delete cascade,
 independently_verified_assets numeric(12,2) not null default 0 check(independently_verified_assets >= 0),
 outstanding_liabilities numeric(12,2) not null default 0 check(outstanding_liabilities >= 0),
 annual_revenue_multiple numeric(5,2) check(annual_revenue_multiple between 0.1 and 20.0),
 assumptions text not null default '',
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.rcl_command_game_checks (
 id uuid primary key default gen_random_uuid(),
 game_id uuid not null references public.games(id) on delete cascade,
 check_key text not null check(length(check_key) between 3 and 80),
 completed boolean not null default false,
 notes text not null default '',
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(game_id,check_key)
);
create index rcl_command_game_checks_game_idx on public.rcl_command_game_checks(game_id);

create table public.rcl_command_concession_catalog (
 id uuid primary key default gen_random_uuid(),
 sku text not null unique check(length(sku) between 3 and 100),
 name text not null check(length(name) between 3 and 160),
 category text not null check(category in ('water','sports_drinks','soda','chips','candy','snack_bars','hot_food','popcorn','nachos','supplies')),
 supplier text not null check(supplier in ('Sam''s Club','Restaurant Depot','US Foods CHEF''STORE')),
 supplier_product_url text,
 pack_quantity integer not null check(pack_quantity > 0),
 pack_price numeric(10,2) check(pack_price is null or pack_price > 0),
 suggested_sale_price numeric(10,2) not null check(suggested_sale_price > 0),
 source_status text not null default 'quote_required' check(source_status in ('published_reference','operator_verified','quote_required','stale')),
 price_observed_at timestamptz,
 refresh_attempted_at timestamptz,
 refresh_status text not null default 'not_checked' check(refresh_status in ('not_checked','verified_updated','verified_unchanged','needs_review','source_unavailable')),
 retailer_location text not null default 'Online reference; Richmond-area shelf price not confirmed',
 supplier_notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index rcl_command_catalog_supplier_idx on public.rcl_command_concession_catalog(supplier);
create table public.rcl_command_price_history (
 id bigint generated always as identity primary key,
 catalog_id uuid not null references public.rcl_command_concession_catalog(id) on delete cascade,
 previous_price numeric(10,2),
 new_price numeric(10,2) not null check(new_price > 0),
 source text not null check(source in ('seeded_reference','machine_verified','admin_quoted')),
 observed_at timestamptz not null default now()
);
create index rcl_command_price_history_catalog_idx on public.rcl_command_price_history(catalog_id,observed_at desc);

create or replace function public.rcl_command_catalog_price_audit()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if tg_op='INSERT' and new.pack_price is not null then
  insert into public.rcl_command_price_history(catalog_id,previous_price,new_price,source,observed_at)
  values(new.id,null,new.pack_price,'seeded_reference',coalesce(new.price_observed_at,now()));
 elsif tg_op='UPDATE' and new.pack_price is distinct from old.pack_price and new.pack_price is not null then
  insert into public.rcl_command_price_history(catalog_id,previous_price,new_price,source,observed_at)
  values(new.id,old.pack_price,new.pack_price,case when new.refresh_status='verified_updated' then 'machine_verified' else 'admin_quoted' end,coalesce(new.price_observed_at,now()));
 end if;
 return new;
end $$;
create trigger rcl_command_catalog_price_history_trigger
 after insert or update on public.rcl_command_concession_catalog
 for each row execute function public.rcl_command_catalog_price_audit();

do $$
declare t text;
begin
 foreach t in array array[
 'rcl_command_game_reports','rcl_command_franchise_models','rcl_command_game_checks','rcl_command_concession_catalog','rcl_command_price_history'
 ] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon',t);
  execute format('grant select,insert,update on public.%I to authenticated',t);
  execute format('create policy "RCL admin reads" on public.%I for select to authenticated using (public.rcl_command_is_admin())',t);
  if t <> 'rcl_command_price_history' then
   execute format('create policy "RCL admin writes" on public.%I for insert to authenticated with check(public.rcl_command_is_admin())',t);
   execute format('create policy "RCL admin updates" on public.%I for update to authenticated using (public.rcl_command_is_admin()) with check(public.rcl_command_is_admin())',t);
  end if;
 end loop;
end $$;
-- Append-only wholesale history and audit; never allow authenticated direct modifications.
revoke insert,update,delete on public.rcl_command_price_history from authenticated;
revoke delete on public.rcl_command_game_reports,public.rcl_command_franchise_models,
 public.rcl_command_game_checks,public.rcl_command_concession_catalog from authenticated;
-- Audit trail includes all business updates; catalog prices retain a separate price history.
create trigger command_audit_rcl_command_game_reports before insert or update
 on public.rcl_command_game_reports for each row execute function public.rcl_command_touch_audit();
create trigger command_audit_rcl_command_franchise_models before insert or update
 on public.rcl_command_franchise_models for each row execute function public.rcl_command_touch_audit();
create trigger command_audit_rcl_command_game_checks before insert or update
 on public.rcl_command_game_checks for each row execute function public.rcl_command_touch_audit();
create trigger command_audit_rcl_command_concession_catalog before insert or update
 on public.rcl_command_concession_catalog for each row execute function public.rcl_command_touch_audit();

comment on table public.rcl_command_concession_catalog is
 'Sourced wholesale PACK-price references. These are neither invoices nor actual inventory costs. Supplier-specific customer prices may require login.';
comment on table public.rcl_command_franchise_models is
 'Scenario estimates, NOT an independent appraisal or sale price. Requires staff-entered revenue multiple and documented assets/liabilities.';
comment on table public.rcl_command_game_reports is
 'Entered gate attendance counts, not automatically derived from a shop order or ticket booking.';

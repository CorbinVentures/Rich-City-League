create table if not exists public.network_partner_plans (
  code text primary key check (code in ('network','amplify','premier')),
  name text not null,
  monthly_price_cents integer not null default 0 check (monthly_price_cents >= 0),
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.network_partner_plan_entitlements (
  plan_code text not null references public.network_partner_plans(code) on delete cascade,
  entitlement_code text not null,
  monthly_quantity integer,
  enabled boolean not null default true,
  primary key (plan_code, entitlement_code)
);

create table if not exists public.network_organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.network_organizations(id) on delete cascade,
  plan_code text not null references public.network_partner_plans(code),
  status text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','unpaid','incomplete','canceled')),
  provider text not null default 'stripe',
  provider_customer_id text,
  provider_subscription_id text unique,
  provider_price_id text,
  price_cents integer,
  currency text not null default 'usd',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  started_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.network_partner_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  plan_code text references public.network_partner_plans(code),
  credit_type text not null check (credit_type in ('event-spotlight','regional-feature','statewide-feature','social-feed','media-feature')),
  quantity integer not null check (quantity <> 0),
  cycle_start timestamptz,
  cycle_end timestamptz,
  reason text not null,
  allocation_key text unique,
  campaign_id uuid references public.network_campaigns(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.network_editorial_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.network_organizations(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  submission_type text not null check (submission_type in ('announcement','tryout','tournament','championship','player-spotlight','highlight','news-tip','community')),
  title text not null check (char_length(title) between 3 and 160),
  summary text not null check (char_length(summary) between 10 and 2000),
  source_url text,
  media_url text,
  status text not null default 'submitted' check (status in ('submitted','reviewing','accepted','declined','published')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.network_partner_billing_events (
  id text primary key,
  event_type text not null,
  organization_id uuid references public.network_organizations(id) on delete set null,
  processed_at timestamptz not null default now()
);

alter table public.network_campaigns add column if not exists entitlement_source text not null default 'manual' check (entitlement_source in ('manual','credit','subscription','purchase'));
alter table public.network_campaigns add column if not exists credit_type text check (credit_type is null or credit_type in ('event-spotlight','regional-feature','statewide-feature','social-feed','media-feature'));
alter table public.network_campaigns add column if not exists payment_status text not null default 'not_required' check (payment_status in ('not_required','pending','paid','credited','refunded'));
alter table public.network_campaigns add column if not exists stripe_checkout_session_id text;

create index if not exists network_org_subscriptions_status_idx on public.network_organization_subscriptions(status, plan_code);
create index if not exists network_partner_credit_org_idx on public.network_partner_credit_ledger(organization_id, credit_type, created_at desc);
create index if not exists network_partner_credit_campaign_idx on public.network_partner_credit_ledger(campaign_id) where campaign_id is not null;
create index if not exists network_editorial_org_idx on public.network_editorial_submissions(organization_id, created_at desc);
create index if not exists network_editorial_status_idx on public.network_editorial_submissions(status, created_at desc);
create index if not exists network_editorial_submitted_by_idx on public.network_editorial_submissions(submitted_by);
create index if not exists network_editorial_reviewed_by_idx on public.network_editorial_submissions(reviewed_by) where reviewed_by is not null;
create index if not exists network_billing_events_org_idx on public.network_partner_billing_events(organization_id) where organization_id is not null;

alter table public.network_partner_plans enable row level security;
alter table public.network_partner_plan_entitlements enable row level security;
alter table public.network_organization_subscriptions enable row level security;
alter table public.network_partner_credit_ledger enable row level security;
alter table public.network_editorial_submissions enable row level security;
alter table public.network_partner_billing_events enable row level security;

insert into public.network_partner_plans(code,name,monthly_price_cents,description) values
 ('network','Network',0,'Free organization presence and organic RCL Network discovery.'),
 ('amplify','Amplify',4900,'Enhanced discovery, recurring promotion credits and RCL Reach reporting.'),
 ('premier','Premier Partner',14900,'Statewide promotion inventory, deeper reporting and priority media consideration.')
on conflict (code) do update set name=excluded.name, monthly_price_cents=excluded.monthly_price_cents, description=excluded.description, updated_at=now();

insert into public.network_partner_plan_entitlements(plan_code,entitlement_code,monthly_quantity,enabled) values
 ('network','organization_page',null,true),('network','reach_basic',null,true),
 ('amplify','organization_page',null,true),('amplify','reach_full',null,true),('amplify','enhanced_discovery',null,true),('amplify','event-spotlight',2,true),('amplify','regional-feature',1,true),('amplify','social-feed',1,true),
 ('premier','organization_page',null,true),('premier','reach_full',null,true),('premier','enhanced_discovery',null,true),('premier','cross_channel_distribution',null,true),('premier','media_priority',null,true),('premier','event-spotlight',4,true),('premier','regional-feature',2,true),('premier','statewide-feature',1,true),('premier','social-feed',2,true),('premier','media-feature',1,true)
on conflict (plan_code,entitlement_code) do update set monthly_quantity=excluded.monthly_quantity, enabled=excluded.enabled;

create policy "public read partner plans" on public.network_partner_plans for select to anon, authenticated using (is_active = true);
create policy "public read partner entitlements" on public.network_partner_plan_entitlements for select to anon, authenticated using (true);
create policy "org members read subscription" on public.network_organization_subscriptions for select to authenticated using ((select public.is_admin()) or organization_id in (select m.organization_id from public.network_organization_members m where m.profile_id=(select auth.uid()) and m.status='active'));
create policy "org members read credits" on public.network_partner_credit_ledger for select to authenticated using ((select public.is_admin()) or organization_id in (select m.organization_id from public.network_organization_members m where m.profile_id=(select auth.uid()) and m.status='active'));
create policy "org members read editorial" on public.network_editorial_submissions for select to authenticated using ((select public.is_admin()) or organization_id in (select m.organization_id from public.network_organization_members m where m.profile_id=(select auth.uid()) and m.status='active'));
create policy "org members submit editorial" on public.network_editorial_submissions for insert to authenticated with check (submitted_by=(select auth.uid()) and organization_id in (select m.organization_id from public.network_organization_members m where m.profile_id=(select auth.uid()) and m.status='active'));
create policy "admins update editorial" on public.network_editorial_submissions for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete editorial" on public.network_editorial_submissions for delete to authenticated using ((select public.is_admin()));

revoke all on public.network_partner_billing_events from anon, authenticated;
grant select on public.network_partner_plans to anon, authenticated, service_role;
grant select on public.network_partner_plan_entitlements to anon, authenticated, service_role;
grant select on public.network_organization_subscriptions to authenticated, service_role;
grant select on public.network_partner_credit_ledger to authenticated, service_role;
grant select, insert, update on public.network_editorial_submissions to authenticated, service_role;
grant all on public.network_partner_billing_events to service_role;
grant select, insert, update, delete on public.network_organization_subscriptions to service_role;
grant select, insert, update, delete on public.network_partner_credit_ledger to service_role;

create or replace function public.set_network_editorial_status(p_submission_id uuid,p_status text,p_review_notes text default null)
returns void language plpgsql security invoker set search_path=public as $$
begin
  if not (select public.is_admin()) then raise exception 'Admin access required'; end if;
  if p_status not in ('reviewing','accepted','declined','published') then raise exception 'Invalid editorial status'; end if;
  update public.network_editorial_submissions set status=p_status,reviewed_by=(select auth.uid()),review_notes=nullif(trim(coalesce(p_review_notes,'')),''),reviewed_at=now(),updated_at=now() where id=p_submission_id;
end;$$;
revoke all on function public.set_network_editorial_status(uuid,text,text) from public, anon;
grant execute on function public.set_network_editorial_status(uuid,text,text) to authenticated, service_role;
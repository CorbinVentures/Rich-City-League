create table if not exists public.membership_plans (
  code text primary key,
  name text not null,
  tagline text not null,
  description text not null,
  monthly_price_cents integer not null default 0 check (monthly_price_cents >= 0),
  annual_price_cents integer not null default 0 check (annual_price_cents >= 0),
  entitlements jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  is_public boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.membership_plans (code,name,tagline,description,monthly_price_cents,annual_price_cents,entitlements,is_active,is_public,sort_order)
values
  ('free','RCL Community','Be part of Virginia basketball.','The complete RCL social and basketball community experience.',0,0,'{"my_hoops":false,"personalized_opportunities":false,"calendar_export":false,"profile_analytics":false,"passport_studio":false,"advanced_exposure":false,"monthly_spotlight":false,"priority_access":false,"rcl_pass":false}'::jsonb,true,true,10),
  ('rcl_plus','RCL+','Your basketball world, organized.','Personalized Virginia basketball discovery, career tools, saved opportunities, calendar export and exposure analytics.',599,5999,'{"my_hoops":true,"personalized_opportunities":true,"calendar_export":true,"profile_analytics":true,"passport_studio":true,"advanced_exposure":false,"monthly_spotlight":false,"priority_access":false,"rcl_pass":false}'::jsonb,true,true,20),
  ('all_access','RCL All Access','Get the most out of the RCL network.','Everything in RCL+ plus deeper exposure intelligence, monthly Spotlight access and priority benefits for RCL-owned experiences.',1199,11999,'{"my_hoops":true,"personalized_opportunities":true,"calendar_export":true,"profile_analytics":true,"passport_studio":true,"advanced_exposure":true,"monthly_spotlight":true,"priority_access":true,"rcl_pass":true}'::jsonb,true,true,30)
on conflict (code) do update set
  name=excluded.name, tagline=excluded.tagline, description=excluded.description,
  monthly_price_cents=excluded.monthly_price_cents, annual_price_cents=excluded.annual_price_cents,
  entitlements=excluded.entitlements, is_active=excluded.is_active, is_public=excluded.is_public,
  sort_order=excluded.sort_order, updated_at=now();

create table if not exists public.member_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  plan_code text not null references public.membership_plans(code),
  status text not null default 'active' check (status in ('active','trialing','past_due','canceled','incomplete','incomplete_expired','unpaid','paused')),
  billing_interval text not null default 'monthly' check (billing_interval in ('monthly','annual','none')),
  provider text not null default 'stripe',
  provider_customer_id text unique,
  provider_subscription_id text unique,
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text not null default 'usd',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  started_at timestamptz not null default now(),
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('organization','network_event','run','game','player')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id,item_type,item_id)
);

create table if not exists public.member_opportunity_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  regions text[] not null default array['central-virginia']::text[],
  event_types text[] not null default '{}'::text[],
  run_skill_levels text[] not null default '{}'::text[],
  digest_frequency text not null default 'weekly' check (digest_frequency in ('off','daily','weekly')),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_spotlight_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('profile','post','highlight')),
  target_id uuid,
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending','approved','scheduled','completed','rejected','canceled')),
  requested_month date not null default date_trunc('month', now())::date,
  scheduled_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, requested_month)
);

create table if not exists public.profile_exposure_daily (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  metric_date date not null default current_date,
  profile_views integer not null default 0 check (profile_views >= 0),
  passport_views integer not null default 0 check (passport_views >= 0),
  profile_shares integer not null default 0 check (profile_shares >= 0),
  media_views integer not null default 0 check (media_views >= 0),
  updated_at timestamptz not null default now(),
  primary key (profile_id, metric_date)
);

create table if not exists public.profile_exposure_dedupe (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  metric_date date not null default current_date,
  metric_type text not null check (metric_type in ('profile_view','passport_view','profile_share','media_view')),
  visitor_hash text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, metric_date, metric_type, visitor_hash)
);

create table if not exists public.membership_webhook_events (
  provider text not null default 'stripe',
  provider_event_id text primary key,
  event_type text not null,
  provider_customer_id text,
  provider_subscription_id text,
  processing_status text not null default 'processed' check (processing_status in ('processed','ignored','failed')),
  error_message text,
  processed_at timestamptz not null default now()
);

create index if not exists member_subscriptions_plan_status_idx on public.member_subscriptions(plan_code,status);
create index if not exists member_subscriptions_period_end_idx on public.member_subscriptions(current_period_end) where current_period_end is not null;
create index if not exists member_saved_items_user_type_idx on public.member_saved_items(user_id,item_type,created_at desc);
create index if not exists member_spotlight_requests_status_idx on public.member_spotlight_requests(status,created_at desc);
create index if not exists profile_exposure_daily_profile_date_idx on public.profile_exposure_daily(profile_id,metric_date desc);
create index if not exists profile_exposure_dedupe_created_idx on public.profile_exposure_dedupe(created_at);
create index if not exists membership_webhook_events_processed_idx on public.membership_webhook_events(processed_at desc);

alter table public.membership_plans enable row level security;
alter table public.member_subscriptions enable row level security;
alter table public.member_saved_items enable row level security;
alter table public.member_opportunity_preferences enable row level security;
alter table public.member_spotlight_requests enable row level security;
alter table public.profile_exposure_daily enable row level security;
alter table public.profile_exposure_dedupe enable row level security;
alter table public.membership_webhook_events enable row level security;

create or replace function public.current_membership_plan()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce((
    select s.plan_code
    from public.member_subscriptions s
    where s.user_id = (select auth.uid())
      and s.status in ('active','trialing')
      and (s.current_period_end is null or s.current_period_end > now())
    limit 1
  ), 'free');
$$;

create or replace function public.member_has_entitlement(entitlement_key text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce((p.entitlements ->> entitlement_key)::boolean, false)
  from public.membership_plans p
  where p.code = public.current_membership_plan()
    and p.is_active = true
  limit 1;
$$;

grant execute on function public.current_membership_plan() to authenticated;
grant execute on function public.member_has_entitlement(text) to authenticated;

revoke all on public.membership_plans from anon, authenticated;
grant select on public.membership_plans to anon, authenticated;
revoke all on public.member_subscriptions from anon, authenticated;
grant select on public.member_subscriptions to authenticated;
revoke all on public.member_saved_items from anon, authenticated;
grant select, insert, delete on public.member_saved_items to authenticated;
revoke all on public.member_opportunity_preferences from anon, authenticated;
grant select, insert, update, delete on public.member_opportunity_preferences to authenticated;
revoke all on public.member_spotlight_requests from anon, authenticated;
grant select, update on public.member_spotlight_requests to authenticated;
revoke all on public.profile_exposure_daily from anon, authenticated;
grant select on public.profile_exposure_daily to authenticated;
revoke all on public.profile_exposure_dedupe from anon, authenticated;
revoke all on public.membership_webhook_events from anon, authenticated;
grant select on public.membership_webhook_events to authenticated;

drop policy if exists membership_plans_public_read on public.membership_plans;
create policy membership_plans_public_read on public.membership_plans for select to anon, authenticated using (is_active and is_public);
drop policy if exists membership_plans_admin_read on public.membership_plans;
create policy membership_plans_admin_read on public.membership_plans for select to authenticated using ((select public.is_admin()));

drop policy if exists member_subscriptions_self_read on public.member_subscriptions;
create policy member_subscriptions_self_read on public.member_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists member_subscriptions_admin_read on public.member_subscriptions;
create policy member_subscriptions_admin_read on public.member_subscriptions for select to authenticated using ((select public.is_admin()));

drop policy if exists member_saved_items_self_select on public.member_saved_items;
create policy member_saved_items_self_select on public.member_saved_items for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists member_saved_items_self_insert on public.member_saved_items;
create policy member_saved_items_self_insert on public.member_saved_items for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists member_saved_items_self_delete on public.member_saved_items;
create policy member_saved_items_self_delete on public.member_saved_items for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists member_opportunity_preferences_self_select on public.member_opportunity_preferences;
create policy member_opportunity_preferences_self_select on public.member_opportunity_preferences for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists member_opportunity_preferences_self_insert on public.member_opportunity_preferences;
create policy member_opportunity_preferences_self_insert on public.member_opportunity_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists member_opportunity_preferences_self_update on public.member_opportunity_preferences;
create policy member_opportunity_preferences_self_update on public.member_opportunity_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists member_opportunity_preferences_self_delete on public.member_opportunity_preferences;
create policy member_opportunity_preferences_self_delete on public.member_opportunity_preferences for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists member_spotlight_requests_self_read on public.member_spotlight_requests;
create policy member_spotlight_requests_self_read on public.member_spotlight_requests for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists member_spotlight_requests_admin_all on public.member_spotlight_requests;
create policy member_spotlight_requests_admin_all on public.member_spotlight_requests for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists profile_exposure_daily_member_read on public.profile_exposure_daily;
create policy profile_exposure_daily_member_read on public.profile_exposure_daily for select to authenticated using ((select auth.uid()) = profile_id and (select public.member_has_entitlement('profile_analytics')));
drop policy if exists profile_exposure_daily_admin_read on public.profile_exposure_daily;
create policy profile_exposure_daily_admin_read on public.profile_exposure_daily for select to authenticated using ((select public.is_admin()));

drop policy if exists membership_webhook_events_admin_read on public.membership_webhook_events;
create policy membership_webhook_events_admin_read on public.membership_webhook_events for select to authenticated using ((select public.is_admin()));

drop trigger if exists membership_plans_set_updated_at on public.membership_plans;
create trigger membership_plans_set_updated_at before update on public.membership_plans for each row execute function public.set_updated_at();
drop trigger if exists member_subscriptions_set_updated_at on public.member_subscriptions;
create trigger member_subscriptions_set_updated_at before update on public.member_subscriptions for each row execute function public.set_updated_at();
drop trigger if exists member_opportunity_preferences_set_updated_at on public.member_opportunity_preferences;
create trigger member_opportunity_preferences_set_updated_at before update on public.member_opportunity_preferences for each row execute function public.set_updated_at();
drop trigger if exists member_spotlight_requests_set_updated_at on public.member_spotlight_requests;
create trigger member_spotlight_requests_set_updated_at before update on public.member_spotlight_requests for each row execute function public.set_updated_at();
drop trigger if exists profile_exposure_daily_set_updated_at on public.profile_exposure_daily;
create trigger profile_exposure_daily_set_updated_at before update on public.profile_exposure_daily for each row execute function public.set_updated_at();

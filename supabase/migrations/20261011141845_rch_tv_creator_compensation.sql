-- RCH TV creator compensation foundation. Accounting only: no automatic cash transfers.
-- The 25% creator pool is a configurable pilot policy, NOT a promise of payment.
create table if not exists public.rch_creator_accounts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','paused')),
  terms_accepted_at timestamptz,
  agreement_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approved_requires_agreement check (status <> 'approved' or (terms_accepted_at is not null and nullif(btrim(agreement_url),'') is not null))
);

create table if not exists public.rch_creator_titles (
  media_id uuid primary key references public.media(id) on delete cascade,
  creator_id uuid not null references public.rch_creator_accounts(profile_id) on delete restrict,
  status text not null default 'review' check (status in ('review','active','paused')),
  rights_verified_at timestamptz,
  agreement_url text,
  created_at timestamptz not null default now(),
  constraint active_requires_rights check (status <> 'active' or (rights_verified_at is not null and nullif(btrim(agreement_url),'') is not null))
);
create index if not exists rch_creator_titles_owner_idx on public.rch_creator_titles(creator_id);

create table if not exists public.rch_creator_periods (
  month date primary key,
  eligible_net_revenue_cents bigint not null default 0 check (eligible_net_revenue_cents >= 0),
  pool_rate_bps integer not null default 2500 check (pool_rate_bps between 0 and 10000),
  revenue_evidence_url text not null,
  status text not null default 'draft' check (status in ('draft','closed')),
  closed_at timestamptz,
  closed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint first_day_period check (extract(day from month) = 1),
  constraint period_evidence check (nullif(btrim(revenue_evidence_url),'') is not null),
  constraint period_closed_metadata check (status = 'draft' or (closed_at is not null and closed_by is not null))
);

-- Only audited/approved viewing totals belong here. Browser pings are never payable evidence.
create table if not exists public.rch_creator_verified_usage (
  month date not null references public.rch_creator_periods(month) on delete restrict,
  media_id uuid not null references public.rch_creator_titles(media_id) on delete restrict,
  qualified_seconds bigint not null check (qualified_seconds >= 0),
  evidence_url text not null check (nullif(btrim(evidence_url),'') is not null),
  verified_by uuid not null references public.profiles(id),
  verified_at timestamptz not null default now(),
  primary key (month,media_id)
);
create index if not exists rch_creator_verified_usage_media_idx on public.rch_creator_verified_usage(media_id);

create table if not exists public.rch_creator_earnings (
  id uuid primary key default gen_random_uuid(),
  month date not null references public.rch_creator_periods(month) on delete restrict,
  creator_id uuid not null references public.rch_creator_accounts(profile_id) on delete restrict,
  qualified_seconds bigint not null check (qualified_seconds >= 0),
  earned_cents bigint not null check (earned_cents >= 0),
  status text not null default 'held' check (status in ('held','approved','paid')),
  payment_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(month,creator_id),
  constraint paid_reference_required check (
    status <> 'paid' or (nullif(btrim(payment_reference),'') is not null and paid_at is not null)
  )
);
create index if not exists rch_creator_earnings_owner_idx on public.rch_creator_earnings(creator_id,month desc);

-- Only administrators can change accounting data; creators can read their own.
alter table public.rch_creator_accounts enable row level security;
alter table public.rch_creator_titles enable row level security;
alter table public.rch_creator_periods enable row level security;
alter table public.rch_creator_verified_usage enable row level security;
alter table public.rch_creator_earnings enable row level security;
revoke all on public.rch_creator_accounts, public.rch_creator_titles, public.rch_creator_periods,
 public.rch_creator_verified_usage, public.rch_creator_earnings from anon,authenticated;
grant select,insert,update,delete on public.rch_creator_accounts,public.rch_creator_titles,
 public.rch_creator_periods,public.rch_creator_verified_usage to authenticated;
grant select,update(status,payment_reference,paid_at) on public.rch_creator_earnings to authenticated;

create policy "creators read own compensation account" on public.rch_creator_accounts
 for select to authenticated using (profile_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins manage creator accounts" on public.rch_creator_accounts
 for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "creators read own licensed titles" on public.rch_creator_titles
 for select to authenticated using (creator_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins manage licensed titles" on public.rch_creator_titles
 for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins manage revenue periods" on public.rch_creator_periods
 for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins manage audited usage" on public.rch_creator_verified_usage
 for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "creators read own earnings" on public.rch_creator_earnings
 for select to authenticated using (creator_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins update payout status" on public.rch_creator_earnings
 for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Freeze periods and usage after closing, and financial allocations after creation.
create or replace function public.rch_creator_guard_financial_rows()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'rch_creator_earnings' then
    if tg_op = 'UPDATE' then
      if (old.month,old.creator_id,old.qualified_seconds,old.earned_cents)
        is distinct from (new.month,new.creator_id,new.qualified_seconds,new.earned_cents)
        then raise exception 'Creator earnings amounts are immutable'; end if;
      if old.status = 'paid' or
        (old.status = 'approved' and new.status not in ('approved','paid')) or
        (old.status = 'held' and new.status not in ('held','approved'))
        then raise exception 'Invalid payout state transition'; end if;
      if new.status = 'paid' and old.status <> 'approved' then
        raise exception 'Approve payout before marking paid'; end if;
    end if;
  elsif tg_table_name = 'rch_creator_periods' then
    if tg_op = 'UPDATE' and old.status = 'closed' then raise exception 'Closed revenue period cannot be edited'; end if;
    if tg_op = 'DELETE' and old.status = 'closed' then raise exception 'Closed revenue period cannot be deleted'; end if;
  elsif tg_table_name = 'rch_creator_verified_usage' then
    if exists (select 1 from public.rch_creator_periods where month=coalesce(old.month,new.month) and status='closed')
    then raise exception 'Audited usage cannot change after closing a period'; end if;
  end if;
  return case when tg_op='DELETE' then old else new end;
end; $$;
drop trigger if exists rch_creator_earnings_guard on public.rch_creator_earnings;
create trigger rch_creator_earnings_guard before update on public.rch_creator_earnings
 for each row execute function public.rch_creator_guard_financial_rows();
drop trigger if exists rch_creator_periods_guard on public.rch_creator_periods;
create trigger rch_creator_periods_guard before update or delete on public.rch_creator_periods
 for each row execute function public.rch_creator_guard_financial_rows();
drop trigger if exists rch_creator_usage_guard on public.rch_creator_verified_usage;
create trigger rch_creator_usage_guard before update or delete on public.rch_creator_verified_usage
 for each row execute function public.rch_creator_guard_financial_rows();

-- Transactional allocation with largest-remainder penny distribution.
-- Only eligible accounts with signed agreements, verified title rights and approved evidence are payable.
create or replace function public.rch_creator_close_month(p_month date)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_period public.rch_creator_periods%rowtype;
  v_total bigint;
  v_pool bigint;
  v_inserted integer;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Administrator access required';
  end if;
  select * into v_period from public.rch_creator_periods where month=p_month for update;
  if not found or v_period.status <> 'draft' then raise exception 'Period missing or already closed'; end if;
  if p_month >= date_trunc('month',current_date)::date then raise exception 'Only completed months can be closed'; end if;
  if v_period.eligible_net_revenue_cents <= 0 then raise exception 'Verified eligible revenue must be positive'; end if;
  select coalesce(sum(u.qualified_seconds),0) into v_total
    from public.rch_creator_verified_usage u
    join public.rch_creator_titles t on t.media_id=u.media_id and t.status='active'
      and t.rights_verified_at is not null and nullif(btrim(t.agreement_url),'') is not null
    join public.rch_creator_accounts a on a.profile_id=t.creator_id
      and a.status='approved' and a.terms_accepted_at is not null
    join public.media m on m.id=t.media_id and m.status='published'
      and m.rch_tv_category <> 'general'
    where u.month=p_month;
  if v_total <= 0 then raise exception 'No eligible verified watch seconds'; end if;
  v_pool := floor(v_period.eligible_net_revenue_cents::numeric * v_period.pool_rate_bps / 10000)::bigint;
  with creator_usage as (
    select t.creator_id,sum(u.qualified_seconds)::bigint as seconds
      from public.rch_creator_verified_usage u
      join public.rch_creator_titles t on t.media_id=u.media_id and t.status='active'
       and t.rights_verified_at is not null and nullif(btrim(t.agreement_url),'') is not null
      join public.rch_creator_accounts a on a.profile_id=t.creator_id
       and a.status='approved' and a.terms_accepted_at is not null
      join public.media m on m.id=t.media_id and m.status='published' and m.rch_tv_category <> 'general'
     where u.month=p_month and u.qualified_seconds>0 group by t.creator_id
  ), initial as (
    select creator_id,seconds,
       floor(v_pool::numeric*seconds/v_total)::bigint as whole,
       mod(v_pool::numeric*seconds,v_total)::numeric as rem
    from creator_usage
  ), rank_alloc as (
    select *,row_number() over(order by rem desc,creator_id) as position,
      (v_pool-sum(whole) over()) as pennies_left from initial
  )
  insert into public.rch_creator_earnings(month,creator_id,qualified_seconds,earned_cents)
    select p_month,creator_id,seconds,whole+case when position<=pennies_left then 1 else 0 end
    from rank_alloc;
  get diagnostics v_inserted = row_count;
  update public.rch_creator_periods set status='closed',closed_at=now(),closed_by=(select auth.uid()) where month=p_month;
  return v_inserted;
end $$;
revoke all on function public.rch_creator_close_month(date) from public,anon;
grant execute on function public.rch_creator_close_month(date) to authenticated;
comment on function public.rch_creator_close_month(date) is 'Closes a historic audited month; freezes the ledger, does not transfer funds.';
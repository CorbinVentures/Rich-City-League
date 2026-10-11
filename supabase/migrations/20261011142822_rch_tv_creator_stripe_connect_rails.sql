-- Stripe Connect payout rails: onboarding and transfer audit, disabled by default in application settings.
alter table public.rch_creator_accounts
 add column if not exists stripe_connect_account_id text unique,
 add column if not exists stripe_details_submitted boolean not null default false,
 add column if not exists stripe_payouts_enabled boolean not null default false,
 add column if not exists stripe_checked_at timestamptz;

create table if not exists public.rch_creator_disbursements (
 earning_id uuid primary key references public.rch_creator_earnings(id) on delete restrict,
 creator_id uuid not null references public.rch_creator_accounts(profile_id) on delete restrict,
 amount_cents bigint not null check (amount_cents>0),
 currency text not null default 'usd' check (currency='usd'),
 idempotency_key text not null unique,
 stripe_transfer_id text unique,
 status text not null default 'initiated' check (status in ('initiated','transferred','needs_review')),
 error_note text,
 initiated_by uuid not null references public.profiles(id),
 initiated_at timestamptz not null default now(),
 transferred_at timestamptz,
 constraint transfer_state_consistent check (status <> 'transferred' or (stripe_transfer_id is not null and transferred_at is not null))
);
create index if not exists rch_creator_disbursements_owner_idx on public.rch_creator_disbursements(creator_id);
alter table public.rch_creator_disbursements enable row level security;
revoke all on public.rch_creator_disbursements from anon,authenticated;
grant select on public.rch_creator_disbursements to authenticated;
create policy "creator sees own transfer receipts" on public.rch_creator_disbursements for select
 to authenticated using (creator_id=(select auth.uid()) or (select public.is_admin()));
comment on table public.rch_creator_disbursements is
 'Each earning may trigger at most one Stripe transfer attempt. Initiated/needs_review requires manual investigation, never blind retry. Transferred means platform-to-Connect, NOT verified bank payout.';
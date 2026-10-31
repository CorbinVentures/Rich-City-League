-- RCH TV production recording ledger: service-only writes, private operator history.
create table if not exists public.rch_tv_recordings (
 id uuid primary key default gen_random_uuid(),
 channel text not null check (channel in ('live_games','the_pulse')),
 created_by uuid references auth.users(id) on delete set null,
 state text not null default 'reserved' check (state in ('reserved','starting','active','stopping','finalizing','verified','failed','needs_review')),
 egress_id text unique,
 output_path text,
 started_at timestamptz not null default now(),
 deadline_at timestamptz not null,
 stopped_at timestamptz,
 verified_at timestamptz,
 file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
 note text,
 constraint rch_tv_recording_deadline_valid check (deadline_at > started_at and deadline_at <= started_at + interval '180 minutes')
);
-- Globally one billable or reserved session across either RCH TV channel.
create unique index if not exists rch_tv_one_live_recording_idx
 on public.rch_tv_recordings ((true))
 where state in ('reserved','starting','active','stopping');
create index if not exists rch_tv_recordings_recent_idx
 on public.rch_tv_recordings (started_at desc);
alter table public.rch_tv_recordings enable row level security;
revoke all on public.rch_tv_recordings from public, anon, authenticated;
grant select, insert, update on public.rch_tv_recordings to service_role;
comment on table public.rch_tv_recordings is
 'Private RCH TV recording control ledger; only admin-authenticated server routes with service-role access may read/write. Never publish storage keys or output files.';

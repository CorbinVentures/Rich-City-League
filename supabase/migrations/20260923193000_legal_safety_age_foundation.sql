-- RCL legal/safety and age-assurance foundation. 2026-09-23
alter table public.profiles
  add column if not exists date_of_birth date,
  add column if not exists legal_terms_accepted_at timestamptz,
  add column if not exists privacy_policy_acknowledged_at timestamptz;

create table if not exists public.privacy_requests (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
 request_type text not null check(request_type in ('access','correct','delete','appeal','other')),
 status text not null default 'open' check(status in ('open','verifying','processing','completed','denied')),
 details text, response_note text, reviewed_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), completed_at timestamptz
);
alter table public.privacy_requests enable row level security;
create policy "users create privacy requests" on public.privacy_requests for insert with check(profile_id=auth.uid());
create policy "users view privacy requests" on public.privacy_requests for select using(profile_id=auth.uid() or public.is_staff_or_admin());
create policy "staff update privacy requests" on public.privacy_requests for update using(public.is_staff_or_admin()) with check(public.is_staff_or_admin());

create table if not exists public.minor_parental_consents (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
 daily_limit_minutes integer not null default 60 check(daily_limit_minutes between 1 and 1440),
 verification_method text, verified_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now()
);
alter table public.minor_parental_consents enable row level security;
create policy "minor sees own consent status" on public.minor_parental_consents for select using(profile_id=auth.uid() or public.is_staff_or_admin());
create policy "staff manage parental consent" on public.minor_parental_consents for all using(public.is_staff_or_admin()) with check(public.is_staff_or_admin());

create table if not exists public.social_usage_daily (
 profile_id uuid not null references public.profiles(id) on delete cascade, usage_date date not null default current_date,
 seconds_used integer not null default 0 check(seconds_used>=0), updated_at timestamptz not null default now(),
 primary key(profile_id,usage_date)
);
alter table public.social_usage_daily enable row level security;
create policy "users see own social usage" on public.social_usage_daily for select using(profile_id=auth.uid() or public.is_staff_or_admin());

comment on column public.profiles.date_of_birth is 'Age-screen input. Restrict use to age determination and age-appropriate experiences.';

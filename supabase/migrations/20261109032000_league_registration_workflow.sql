alter table public.divisions
  add column if not exists min_registration_age smallint,
  add column if not exists max_registration_age smallint,
  add column if not exists registration_fee_cents integer,
  add column if not exists registration_currency text not null default 'usd',
  add column if not exists registration_fields jsonb not null default '[]'::jsonb,
  add column if not exists waiver_title text,
  add column if not exists waiver_body text,
  add column if not exists waiver_version text;

alter table public.divisions
  drop constraint if exists divisions_registration_fee_nonnegative,
  drop constraint if exists divisions_registration_age_range,
  drop constraint if exists divisions_registration_currency_format,
  drop constraint if exists divisions_registration_fields_array,
  drop constraint if exists divisions_registration_waiver_version;

alter table public.divisions
  add constraint divisions_registration_fee_nonnegative
    check (registration_fee_cents is null or registration_fee_cents >= 0),
  add constraint divisions_registration_age_range
    check (
      (min_registration_age is null or min_registration_age between 0 and 120)
      and (max_registration_age is null or max_registration_age between 0 and 120)
      and (min_registration_age is null or max_registration_age is null or min_registration_age <= max_registration_age)
    ),
  add constraint divisions_registration_currency_format
    check (registration_currency ~ '^[a-z]{3}$'),
  add constraint divisions_registration_fields_array
    check (jsonb_typeof(registration_fields) = 'array'),
  add constraint divisions_registration_waiver_version
    check (
      nullif(btrim(coalesce(waiver_body, '')), '') is null
      or (
        nullif(btrim(coalesce(waiver_title, '')), '') is not null
        and nullif(btrim(coalesce(waiver_version, '')), '') is not null
      )
    );

create table if not exists public.registration_responses (
  registration_id uuid primary key references public.registrations(id) on delete cascade,
  custom_answers jsonb not null default '{}'::jsonb,
  registration_fields_snapshot jsonb not null default '[]'::jsonb,
  eligibility_answers jsonb not null default '{}'::jsonb,
  waiver_title text,
  waiver_body_snapshot text,
  waiver_version text,
  signed_name text,
  waiver_accepted_at timestamptz,
  fee_amount_cents integer,
  fee_currency text not null default 'usd',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registration_responses_custom_answers_object
    check (jsonb_typeof(custom_answers) = 'object'),
  constraint registration_responses_fields_snapshot_array
    check (jsonb_typeof(registration_fields_snapshot) = 'array'),
  constraint registration_responses_eligibility_object
    check (jsonb_typeof(eligibility_answers) = 'object'),
  constraint registration_responses_fee_nonnegative
    check (fee_amount_cents is null or fee_amount_cents >= 0),
  constraint registration_responses_fee_currency_format
    check (fee_currency ~ '^[a-z]{3}$'),
  constraint registration_responses_waiver_snapshot_complete
    check (
      (waiver_body_snapshot is null and waiver_title is null and waiver_version is null and signed_name is null and waiver_accepted_at is null)
      or
      (waiver_body_snapshot is not null and nullif(btrim(coalesce(waiver_title, '')), '') is not null
       and nullif(btrim(coalesce(waiver_version, '')), '') is not null
       and nullif(btrim(coalesce(signed_name, '')), '') is not null
       and waiver_accepted_at is not null)
    )
);

alter table public.registration_responses enable row level security;
revoke all on table public.registration_responses from anon, authenticated;
grant select on table public.registration_responses to authenticated;
drop policy if exists "Applicants and league staff view registration responses" on public.registration_responses;
create policy "Applicants and league staff view registration responses"
  on public.registration_responses
  for select
  to authenticated
  using (
    is_staff_or_admin()
    or exists (
      select 1 from public.registrations r
      where r.id = registration_responses.registration_id
        and r.applicant_id = (select auth.uid())
    )
  );

alter table public.payments
  add column if not exists provider_checkout_session_id text;
create unique index if not exists payments_provider_checkout_session_id_key
  on public.payments(provider_checkout_session_id)
  where provider_checkout_session_id is not null;
create unique index if not exists payments_one_pending_stripe_registration
  on public.payments(registration_id)
  where status = 'pending' and provider = 'stripe';

create table if not exists public.registration_payment_events (
  provider_event_id text primary key,
  payment_id uuid not null references public.payments(id) on delete cascade,
  event_type text not null,
  processing_status text not null default 'processing'
    check (processing_status in ('processing','processed','failed','ignored')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.registration_payment_events enable row level security;
revoke all on table public.registration_payment_events from anon, authenticated;
grant all on table public.registration_payment_events to service_role;

drop policy if exists "users submit registrations" on public.registrations;

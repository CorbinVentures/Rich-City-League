-- Minimal, privacy-conscious funnel events for the public basketball website.
-- A random browser-tab session UUID is not a person or cross-device identifier.
create table if not exists public.rch_conversion_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  event_type text not null check (event_type in (
    'join_click', 'signup_view', 'signup_account_continue',
    'signup_role_continue', 'signup_submitted', 'signup_created',
    'signup_failed'
  )),
  context text not null check (context in (
    'home_hero', 'home_benefits', 'home_footer', 'header',
    'audience_player', 'audience_fan', 'audience_coach',
    'audience_creator', 'audience_organizer', 'email', 'oauth',
    'unknown'
  )),
  bucket_at timestamptz not null default date_trunc('hour', now()),
  created_at timestamptz not null default now(),
  constraint rch_conversion_session_hour_unique unique (session_id, event_type, context, bucket_at)
);

create index if not exists rch_conversion_created_event_idx
  on public.rch_conversion_events (created_at desc, event_type);

alter table public.rch_conversion_events enable row level security;
revoke all on public.rch_conversion_events from public, anon, authenticated;
-- Clients may only supply these three harmless fields. IDs and timestamps are server-generated.
grant insert (session_id, event_type, context)
  on public.rch_conversion_events to anon, authenticated;
create policy "Allow bounded anonymous funnel events"
  on public.rch_conversion_events for insert to anon, authenticated
  with check (
    session_id is not null
    and event_type in (
      'join_click', 'signup_view', 'signup_account_continue',
      'signup_role_continue', 'signup_submitted', 'signup_created',
      'signup_failed'
    )
  );
-- Read access stays with trusted administration/service role; never expose sessions publicly.

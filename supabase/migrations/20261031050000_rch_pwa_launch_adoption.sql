-- PWA launch observations: recorded only when an authenticated member opens
-- the installed iOS/Android web app. Not an OS-level install or uninstall census.
create table if not exists public.rch_pwa_installations (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  installation_id uuid not null,
  platform text not null check (platform in ('ios', 'android')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  launch_count integer not null default 1 check (launch_count >= 1),
  constraint rch_pwa_installations_pkey primary key (profile_id, installation_id)
);

create index if not exists rch_pwa_installations_platform_last_seen_idx
  on public.rch_pwa_installations (platform, last_seen_at desc);

comment on table public.rch_pwa_installations is
  'Observed signed-in standalone PWA launches. Browser tabs, installs without a launch, uninstalls, and opted-out sessions are not observable.';

alter table public.rch_pwa_installations enable row level security;
revoke all on public.rch_pwa_installations from public, anon, authenticated;
-- No client SELECT/INSERT/UPDATE/DELETE policies. The restricted RPC verifies
-- ownership using auth.uid(); service-only administration reads the rows.
create or replace function public.record_rch_pwa_launch(
  p_installation_id uuid,
  p_platform text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := auth.uid();
begin
  if v_profile_id is null then
    raise exception 'Sign-in required' using errcode = '28000';
  end if;
  if p_installation_id is null or p_platform is null
    or p_platform not in ('ios', 'android') then
    raise exception 'Invalid PWA launch metadata' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = v_profile_id
      and p.is_active is distinct from false
      and p.is_system_account is distinct from true
  ) then
    raise exception 'Active member profile required' using errcode = '28000';
  end if;

  insert into public.rch_pwa_installations (
    profile_id, installation_id, platform
  ) values (v_profile_id, p_installation_id, p_platform)
  on conflict (profile_id, installation_id) do update
    set platform = excluded.platform,
        launch_count = case
          when public.rch_pwa_installations.last_seen_at < now() - interval '30 minutes'
          then public.rch_pwa_installations.launch_count + 1
          else public.rch_pwa_installations.launch_count
        end,
        last_seen_at = now();
end;
$$;

revoke all on function public.record_rch_pwa_launch(uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_rch_pwa_launch(uuid, text)
  to authenticated;
-- Transactional registration welcome email: verified, complete members only.
-- Reuses the existing RCH Resend sender / Vault secret and is independent of
-- marketing and optional activity-email preferences.
begin;

create table if not exists public.registration_welcome_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default true,
  started_at timestamptz not null default now()
);
insert into public.registration_welcome_settings (singleton) values (true)
on conflict (singleton) do nothing;
alter table public.registration_welcome_settings enable row level security;
revoke all on public.registration_welcome_settings from public, anon, authenticated;

create table if not exists public.registration_welcome_deliveries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  recipient_email text not null,
  request_id bigint,
  status text not null default 'queued' check (status in ('queued', 'error')),
  detail text,
  created_at timestamptz not null default now()
);
alter table public.registration_welcome_deliveries enable row level security;
revoke all on public.registration_welcome_deliveries from public, anon, authenticated;

create or replace function public.dispatch_registration_welcome(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  setting public.registration_welcome_settings%rowtype;
  cfg public.notification_email_config%rowtype;
  target_email text;
  recipient_name text;
  is_complete boolean;
  is_system boolean;
  is_active_profile boolean;
  is_verified boolean;
  registered_at timestamptz;
  delivery_id uuid;
  api_key text;
  request bigint;
  subject_line text := 'Welcome to Rich City Hoops — get the app and get in the game';
  app_url text;
  html_body text;
  text_body text;
begin
  select * into setting from public.registration_welcome_settings where singleton = true;
  if not found or not setting.enabled then return; end if;

  select * into cfg from public.notification_email_config where singleton = true;
  if not found then return; end if;

  select u.email,
         coalesce(nullif(trim(p.first_name), ''), nullif(trim(p.display_name), ''), 'hooper'),
         p.onboarding_complete,
         coalesce(p.is_system_account, false),
         coalesce(p.is_active, true),
         (u.email_confirmed_at is not null),
         u.created_at
  into target_email, recipient_name, is_complete, is_system, is_active_profile, is_verified, registered_at
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.id = p_user_id;

  if target_email is null or not coalesce(is_complete, false) or is_system
    or not is_active_profile or not is_verified
    or registered_at < setting.started_at then
    return;
  end if;

  -- The PRIMARY KEY makes profile and confirmation triggers safe to race.
  insert into public.registration_welcome_deliveries (user_id, recipient_email, status, detail)
  values (p_user_id, target_email, 'queued', 'Preparing RCH welcome email')
  on conflict (user_id) do nothing
  returning user_id into delivery_id;
  if delivery_id is null then return; end if;

  select decrypted_secret into api_key
  from vault.decrypted_secrets
  where name = 'rch_resend_api_key'
  order by created_at desc limit 1;
  if api_key is null or length(api_key) < 20 then
    raise exception 'Resend secret unavailable for RCH welcome email';
  end if;

  app_url := rtrim(cfg.site_base_url, '/') || '/app';
  text_body := format(
    'Welcome to Rich City Hoops, %s!%s%s' ||
    'Your free basketball community is ready. To use the full platform, add RCH to your phone:%s%s' ||
    'Get the app: %s%s%s' ||
    'iPhone/iPad: Open that link in Safari, tap Share, select Add to Home Screen, enable Open as Web App if shown, then tap Add.%s' ||
    'Android: Open that link in Chrome and choose Install app; if an official Android download is offered, follow the instructions on that page.%s%s' ||
    'Here is what you can do:%s' ||
    '- Find open runs, nearby courts, training, and meetups.%s' ||
    '- Build your profile, share highlights, and message or call other members.%s' ||
    '- Join communities and discover Virginia basketball organizations.%s' ||
    '- Earn REP and badges and compete on runs leaderboards.%s' ||
    '- Follow Rich City League news, events, and RCH TV.%s%s' ||
    'Verify your email if prompted before signing in. We are glad you are part of the city.%s%s' ||
    'Rich City Hoops | Questions? %s',
    recipient_name, E'\n', E'\n',
    E'\n', E'\n',
    app_url, E'\n', E'\n',
    E'\n', E'\n', E'\n',
    E'\n', E'\n', E'\n', E'\n', E'\n', E'\n', E'\n',
    E'\n', E'\n',
    cfg.reply_to
  );

  html_body := format(
    '<!doctype html><html lang="en"><body style="margin:0;background:#07111d;color:#f8fafc;font-family:Arial,sans-serif;">' ||
    '<div style="max-width:600px;margin:auto;padding:30px 20px;">' ||
    '<div style="padding:24px;background:#10243a;border-radius:16px 16px 0 0;border-bottom:3px solid #fb923c;">' ||
    '<p style="margin:0;font-size:12px;font-weight:800;letter-spacing:2px;color:#9ad4ff;">RICH CITY HOOPS</p>' ||
    '<h1 style="font-size:29px;line-height:1.2;margin:16px 0 10px;color:white;">Your city. Your court. Your community.</h1>' ||
    '<p style="color:#d9e2ed;line-height:1.6;">Welcome, %s! Your free RCH profile is ready. Install the app to experience the full Virginia basketball network.</p>' ||
    '<a href="%s" style="display:inline-block;background:#fb923c;color:#101827;padding:15px 23px;text-decoration:none;font-weight:800;border-radius:10px;">GET RCH ON YOUR PHONE</a>' ||
    '</div><div style="background:#0b1b2c;padding:24px;">' ||
    '<h2 style="color:white;font-size:19px;">Install in under a minute</h2>' ||
    '<p style="color:#d9e2ed;line-height:1.6;"><b>iPhone / iPad:</b> Open the link above in Safari, tap <b>Share</b> → <b>Add to Home Screen</b>, select <b>Open as Web App</b> if offered, then tap <b>Add</b>.</p>' ||
    '<p style="color:#d9e2ed;line-height:1.6;"><b>Android:</b> Open the link in Chrome and select <b>Install app</b>. If an official Android download is available, the install page will offer it.</p>' ||
    '<h2 style="color:white;font-size:19px;margin-top:28px;">What is waiting for you</h2>' ||
    '<p style="color:#d9e2ed;line-height:1.8;">🏀 Open runs, courts and training<br>🤝 Player profiles, messaging and calls<br>📍 Communities and organizations<br>🏆 REP, badges and run leaderboards<br>📺 Rich City League, highlights and RCH TV</p>' ||
    '<p style="color:#d9e2ed;line-height:1.6;">If you have not verified your email, finish that step before signing in. We are building a stronger basketball community together.</p>' ||
    '</div><div style="padding:20px 24px;background:#07111d;color:#8fa7bd;font-size:12px;line-height:1.6;">' ||
    'This is a one-time account setup email for your Rich City Hoops registration. Questions? <a style="color:#9ad4ff;" href="mailto:%s">%s</a>.' ||
    '</div></div></body></html>',
    public.rch_email_escape(recipient_name),
    public.rch_email_escape(app_url),
    public.rch_email_escape(cfg.reply_to), public.rch_email_escape(cfg.reply_to)
  );

  request := net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || api_key, 'Content-Type', 'application/json', 'Idempotency-Key', 'rch-welcome-' || p_user_id::text),
    body := jsonb_build_object(
      'from', cfg.sender_name || ' <' || cfg.sender_email || '>',
      'to', jsonb_build_array(target_email),
      'reply_to', cfg.reply_to,
      'subject', subject_line,
      'text', text_body,
      'html', html_body
    ),
    timeout_milliseconds := 5000
  );
  update public.registration_welcome_deliveries
  set request_id = request, detail = 'Queued via pg_net for Resend'
  where user_id = p_user_id;

exception when others then
  if delivery_id is not null then
    update public.registration_welcome_deliveries
    set status = 'error', detail = left(sqlerrm, 500)
    where user_id = delivery_id;
  end if;
  raise warning 'RCH registration welcome dispatch failed: %', sqlerrm;
end;
$$;
revoke all on function public.dispatch_registration_welcome(uuid) from public, anon, authenticated;

create or replace function public.rch_welcome_profile_trigger()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.dispatch_registration_welcome(new.id);
  return new;
end;
$$;
revoke all on function public.rch_welcome_profile_trigger() from public, anon, authenticated;

create or replace function public.rch_welcome_auth_trigger()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.dispatch_registration_welcome(new.id);
  return new;
end;
$$;
revoke all on function public.rch_welcome_auth_trigger() from public, anon, authenticated;

drop trigger if exists rch_welcome_after_profile_create on public.profiles;
create trigger rch_welcome_after_profile_create
after insert on public.profiles
for each row execute function public.rch_welcome_profile_trigger();

drop trigger if exists rch_welcome_after_profile_complete on public.profiles;
create trigger rch_welcome_after_profile_complete
after update of onboarding_complete on public.profiles
for each row
when (old.onboarding_complete is distinct from new.onboarding_complete and new.onboarding_complete = true)
execute function public.rch_welcome_profile_trigger();

drop trigger if exists rch_welcome_after_email_confirm on auth.users;
create trigger rch_welcome_after_email_confirm
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.rch_welcome_auth_trigger();

commit;

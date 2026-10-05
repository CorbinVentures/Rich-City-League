begin;

create table if not exists public.notification_email_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  sender_name text not null default 'Rich City Hoops',
  sender_email text not null default 'notifications@mail.richcityhoops.com',
  reply_to text not null default 'info@richcityhoops.com',
  site_base_url text not null default 'https://richcityhoops.com',
  updated_at timestamptz not null default now()
);

insert into public.notification_email_config(singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.notification_email_config enable row level security;
drop policy if exists "notification email config is server only" on public.notification_email_config;
create policy "notification email config is server only"
  on public.notification_email_config for all
  using (false) with check (false);

revoke all on public.notification_email_config from public, anon, authenticated;

create table if not exists public.notification_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null unique references public.notifications(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  recipient_email text,
  notification_type text not null,
  email_category text not null check (email_category in ('messages','social','league')),
  request_id bigint,
  status text not null default 'queued' check (status in ('queued','skipped','error')),
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists notification_email_deliveries_recipient_idx
  on public.notification_email_deliveries(recipient_id, created_at desc);

alter table public.notification_email_deliveries enable row level security;
drop policy if exists "notification email deliveries are server only" on public.notification_email_deliveries;
create policy "notification email deliveries are server only"
  on public.notification_email_deliveries for all
  using (false) with check (false);

revoke all on public.notification_email_deliveries from public, anon, authenticated;

create or replace function public.rch_email_escape(value text)
returns text
language sql
immutable
as $$
  select replace(
    replace(
      replace(
        replace(
          replace(coalesce(value,''),'&','&amp;'),
        '<','&lt;'),
      '>','&gt;'),
    '"','&quot;'),
  '''','&#39;')
$$;

revoke execute on function public.rch_email_escape(text) from public, anon, authenticated;

create or replace function public.dispatch_notification_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault, auth
as $$
declare
  cfg public.notification_email_config%rowtype;
  pref public.notification_preferences%rowtype;
  pref_found boolean := false;
  target_email text;
  recipient_name text;
  is_system boolean := false;
  is_active_profile boolean := true;
  email_category text;
  target_url text;
  api_key text;
  request bigint;
  html_body text;
  text_body text;
  allowed boolean := true;
begin
  select * into cfg
  from public.notification_email_config
  where singleton=true;

  if not found or not cfg.enabled then
    return new;
  end if;

  if exists (
    select 1 from public.notification_email_deliveries d
    where d.notification_id = new.id
  ) then
    return new;
  end if;

  email_category := case
    when new.type = 'message' then 'messages'
    when new.type in (
      'follow','friend_request','comment','reaction','repost','profile_post',
      'mention','tag','story_reply','community_invite','community_post'
    ) then 'social'
    else 'league'
  end;

  select * into pref
  from public.notification_preferences
  where profile_id = new.recipient_id;
  pref_found := found;

  if pref_found and not pref.email_enabled then
    allowed := false;
  elsif pref_found and email_category='messages' and not pref.email_messages then
    allowed := false;
  elsif pref_found and email_category='social' and not pref.email_social then
    allowed := false;
  elsif pref_found and email_category='league' and not pref.email_league then
    allowed := false;
  end if;

  if not allowed then
    insert into public.notification_email_deliveries(
      notification_id,recipient_id,notification_type,email_category,status,detail
    ) values (
      new.id,new.recipient_id,new.type,email_category,'skipped','Recipient email preference disabled'
    ) on conflict (notification_id) do nothing;
    return new;
  end if;

  select
    u.email,
    coalesce(nullif(trim(p.display_name),''), nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''), 'RCH member'),
    p.is_system_account,
    p.is_active
  into target_email, recipient_name, is_system, is_active_profile
  from auth.users u
  left join public.profiles p on p.id=u.id
  where u.id=new.recipient_id
    and u.email_confirmed_at is not null;

  if target_email is null or is_system or not coalesce(is_active_profile,true) then
    insert into public.notification_email_deliveries(
      notification_id,recipient_id,recipient_email,notification_type,email_category,status,detail
    ) values (
      new.id,new.recipient_id,target_email,new.type,email_category,'skipped',
      case
        when target_email is null then 'No confirmed recipient email'
        when is_system then 'System profile'
        else 'Inactive profile'
      end
    ) on conflict (notification_id) do nothing;
    return new;
  end if;

  select decrypted_secret into api_key
  from vault.decrypted_secrets
  where name='rch_resend_api_key'
  order by created_at desc
  limit 1;

  if api_key is null or length(api_key) < 20 then
    insert into public.notification_email_deliveries(
      notification_id,recipient_id,recipient_email,notification_type,email_category,status,detail
    ) values (
      new.id,new.recipient_id,target_email,new.type,email_category,'error','Resend API key is unavailable'
    ) on conflict (notification_id) do nothing;
    return new;
  end if;

  target_url := case
    when coalesce(new.link,'') like '/%' then rtrim(cfg.site_base_url,'/') || new.link
    else rtrim(cfg.site_base_url,'/')
  end;

  text_body :=
    new.title || E'\n\n' ||
    coalesce(new.body,'') || E'\n\n' ||
    'Open Rich City Hoops: ' || target_url || E'\n\n' ||
    'Manage notification preferences: ' || rtrim(cfg.site_base_url,'/') || '/settings/notifications';

  html_body := format(
    '<!doctype html><html><body style="margin:0;background:#03070d;font-family:Arial,Helvetica,sans-serif;color:#f8fafc;">' ||
    '<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#03070d;padding:28px 12px;"><tr><td align="center">' ||
    '<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#071522;border:1px solid #17314a;border-radius:18px;overflow:hidden;">' ||
    '<tr><td style="padding:22px 26px;background:#0b2033;border-bottom:1px solid #17314a;">' ||
    '<div style="font-size:12px;font-weight:800;letter-spacing:1.6px;color:#8fd3ff;text-transform:uppercase;">Rich City Hoops</div>' ||
    '<div style="margin-top:5px;font-size:12px;color:#94a3b8;">Virginia Basketball Network</div>' ||
    '</td></tr>' ||
    '<tr><td style="padding:30px 26px 26px;">' ||
    '<div style="font-size:13px;color:#94a3b8;margin-bottom:10px;">Hi %s,</div>' ||
    '<h1 style="margin:0 0 12px;font-size:25px;line-height:1.25;color:#ffffff;">%s</h1>' ||
    '<p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#cbd5e1;">%s</p>' ||
    '<a href="%s" style="display:inline-block;background:#f97316;color:#07111c;text-decoration:none;font-weight:800;font-size:13px;padding:13px 18px;border-radius:10px;">View in Rich City Hoops</a>' ||
    '</td></tr>' ||
    '<tr><td style="padding:19px 26px 24px;border-top:1px solid #17314a;font-size:11px;line-height:1.6;color:#64748b;">' ||
    'You received this because email notifications are enabled for your Rich City Hoops account. ' ||
    '<a href="%s" style="color:#8fd3ff;text-decoration:none;">Manage notification preferences</a>.' ||
    '</td></tr></table></td></tr></table></body></html>',
    public.rch_email_escape(recipient_name),
    public.rch_email_escape(new.title),
    public.rch_email_escape(coalesce(new.body,'')),
    public.rch_email_escape(target_url),
    public.rch_email_escape(rtrim(cfg.site_base_url,'/') || '/settings/notifications')
  );

  request := net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization','Bearer ' || api_key,
      'Content-Type','application/json'
    ),
    body := jsonb_build_object(
      'from', cfg.sender_name || ' <' || cfg.sender_email || '>',
      'to', jsonb_build_array(target_email),
      'reply_to', cfg.reply_to,
      'subject', new.title,
      'html', html_body,
      'text', text_body,
      'headers', jsonb_build_object(
        'X-Entity-Ref-ID', new.id::text,
        'X-RCH-Notification-Type', new.type
      )
    ),
    timeout_milliseconds := 5000
  );

  insert into public.notification_email_deliveries(
    notification_id,recipient_id,recipient_email,notification_type,email_category,request_id,status,detail
  ) values (
    new.id,new.recipient_id,target_email,new.type,email_category,request,'queued','Submitted to Resend'
  ) on conflict (notification_id) do nothing;

  return new;
exception when others then
  insert into public.notification_email_deliveries(
    notification_id,recipient_id,recipient_email,notification_type,email_category,status,detail
  ) values (
    new.id,new.recipient_id,target_email,new.type,coalesce(email_category,'league'),'error',left(sqlerrm,500)
  ) on conflict (notification_id) do nothing;
  raise warning 'RCH notification email dispatch skipped: %', sqlerrm;
  return new;
end
$$;

revoke all on function public.dispatch_notification_email() from public, anon, authenticated;

drop trigger if exists notifications_email_dispatch on public.notifications;
create trigger notifications_email_dispatch
after insert on public.notifications
for each row execute function public.dispatch_notification_email();

commit;

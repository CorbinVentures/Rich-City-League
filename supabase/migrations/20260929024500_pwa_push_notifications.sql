begin;

create extension if not exists pg_net with schema extensions;

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists web_push_subscriptions_profile_idx
  on public.web_push_subscriptions(profile_id, updated_at desc);

alter table public.web_push_subscriptions enable row level security;

drop policy if exists "members read own web push subscriptions" on public.web_push_subscriptions;
create policy "members read own web push subscriptions"
  on public.web_push_subscriptions for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists "members delete own web push subscriptions" on public.web_push_subscriptions;
create policy "members delete own web push subscriptions"
  on public.web_push_subscriptions for delete to authenticated
  using (profile_id = auth.uid());

create table if not exists public.web_push_config (
  singleton boolean primary key default true check (singleton),
  vapid_keys jsonb,
  application_server_key text,
  webhook_secret text,
  contact_information text not null default 'mailto:info@corbin-ventures.com',
  updated_at timestamptz not null default now()
);

alter table public.web_push_config enable row level security;
drop policy if exists "web push config is server only" on public.web_push_config;
create policy "web push config is server only"
  on public.web_push_config for all
  using (false) with check (false);

insert into public.web_push_config(singleton)
values (true)
on conflict (singleton) do nothing;

create or replace function public.register_web_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  subscription_id uuid;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if coalesce(length(trim(p_endpoint)),0) < 20 then raise exception 'Invalid push endpoint'; end if;
  if coalesce(length(trim(p_p256dh)),0) < 20 or coalesce(length(trim(p_auth)),0) < 8 then raise exception 'Invalid push keys'; end if;

  insert into public.web_push_subscriptions(profile_id,endpoint,p256dh,auth,user_agent,updated_at)
  values(actor,trim(p_endpoint),trim(p_p256dh),trim(p_auth),left(p_user_agent,500),now())
  on conflict(endpoint) do update set
    profile_id=excluded.profile_id,
    p256dh=excluded.p256dh,
    auth=excluded.auth,
    user_agent=excluded.user_agent,
    updated_at=now()
  returning id into subscription_id;

  return subscription_id;
end
$$;

revoke all on function public.register_web_push_subscription(text,text,text,text) from public,anon;
grant execute on function public.register_web_push_subscription(text,text,text,text) to authenticated;

create or replace function public.unregister_web_push_subscription(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  removed integer := 0;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  delete from public.web_push_subscriptions where endpoint=p_endpoint and profile_id=actor;
  get diagnostics removed = row_count;
  return removed > 0;
end
$$;

revoke all on function public.unregister_web_push_subscription(text) from public,anon;
grant execute on function public.unregister_web_push_subscription(text) to authenticated;

create or replace function public.dispatch_notification_web_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  secret text;
begin
  select webhook_secret into secret
    from public.web_push_config
    where singleton=true;

  if secret is null or length(secret) < 20 then
    return new;
  end if;

  perform net.http_post(
    url := 'https://eoamxxvxswzudqwtbxvo.supabase.co/functions/v1/rcl-web-push',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-rcl-push-secret',secret
    ),
    body := jsonb_build_object(
      'type','INSERT',
      'table','notifications',
      'schema','public',
      'record',to_jsonb(new)
    ),
    timeout_milliseconds := 5000
  );

  return new;
exception when others then
  raise warning 'RCL web push dispatch skipped: %', sqlerrm;
  return new;
end
$$;

revoke all on function public.dispatch_notification_web_push() from public,anon,authenticated;

drop trigger if exists notifications_web_push_dispatch on public.notifications;
create trigger notifications_web_push_dispatch
after insert on public.notifications
for each row execute function public.dispatch_notification_web_push();

commit;

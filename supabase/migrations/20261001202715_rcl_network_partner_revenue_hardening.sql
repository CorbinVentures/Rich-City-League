alter table public.network_partner_billing_events add column if not exists processing_status text not null default 'processing' check (processing_status in ('processing','processed','ignored','failed'));
alter table public.network_partner_billing_events add column if not exists error_message text;
alter table public.network_partner_billing_events add column if not exists provider_customer_id text;
alter table public.network_partner_billing_events add column if not exists provider_subscription_id text;

create schema if not exists private;
revoke all on schema private from anon, authenticated;

create or replace function private.notify_network_org_members(p_organization_id uuid,p_type text,p_title text,p_body text,p_link text)
returns void language sql security definer set search_path=public,private as $$
  insert into public.notifications(recipient_id,actor_id,type,title,body,link)
  select m.profile_id,null,p_type,p_title,p_body,p_link
  from public.network_organization_members m
  where m.organization_id=p_organization_id and m.status='active';
$$;
revoke all on function private.notify_network_org_members(uuid,text,text,text,text) from public, anon, authenticated;

create or replace function private.network_subscription_notify_trigger()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
  if tg_op='INSERT' or old.status is distinct from new.status or old.plan_code is distinct from new.plan_code then
    perform private.notify_network_org_members(new.organization_id,'network_billing',
      case when new.status in ('active','trialing') then 'RCL Network plan active' when new.status='past_due' then 'RCL Network payment needs attention' when new.status='canceled' then 'RCL Network plan cancelled' else 'RCL Network billing updated' end,
      case when new.status in ('active','trialing') then 'Your '||initcap(replace(new.plan_code,'_',' '))||' partner benefits are active.' when new.status='past_due' then 'A partner plan payment failed. Open billing to update the payment method.' when new.status='canceled' then 'Your paid partner plan has ended. Your free Network listing remains available.' else 'Your organization billing status changed to '||new.status||'.' end,
      '/network/dashboard/billing');
  end if;
  return new;
end;$$;
revoke all on function private.network_subscription_notify_trigger() from public, anon, authenticated;
drop trigger if exists network_subscription_notify on public.network_organization_subscriptions;
create trigger network_subscription_notify after insert or update on public.network_organization_subscriptions for each row execute function private.network_subscription_notify_trigger();

create or replace function private.network_campaign_notify_trigger()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
  if tg_op='UPDATE' and old.status is distinct from new.status then
    perform private.notify_network_org_members(new.organization_id,'network_campaign','RCL Reach campaign '||replace(new.status,'_',' '),new.name||' is now '||replace(new.status,'_',' ')||'.','/network/dashboard/reach');
  end if;
  return new;
end;$$;
revoke all on function private.network_campaign_notify_trigger() from public, anon, authenticated;
drop trigger if exists network_campaign_notify on public.network_campaigns;
create trigger network_campaign_notify after update of status on public.network_campaigns for each row execute function private.network_campaign_notify_trigger();

create or replace function private.network_editorial_notify_trigger()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
  if tg_op='UPDATE' and old.status is distinct from new.status then
    insert into public.notifications(recipient_id,actor_id,type,title,body,link)
    values(new.submitted_by,null,'network_editorial','Editorial submission '||replace(new.status,'_',' '),new.title||' is now '||replace(new.status,'_',' ')||'.','/network/dashboard/editorial');
  end if;
  return new;
end;$$;
revoke all on function private.network_editorial_notify_trigger() from public, anon, authenticated;
drop trigger if exists network_editorial_notify on public.network_editorial_submissions;
create trigger network_editorial_notify after update of status on public.network_editorial_submissions for each row execute function private.network_editorial_notify_trigger();

create or replace function private.network_claim_notify_trigger()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
  if tg_op='UPDATE' and old.status is distinct from new.status then
    insert into public.notifications(recipient_id,actor_id,type,title,body,link)
    values(new.claimant_id,null,'network_claim','Organization claim '||replace(new.status,'_',' '),'Your RCL Network organization claim is now '||replace(new.status,'_',' ')||'.','/network/dashboard');
  end if;
  return new;
end;$$;
revoke all on function private.network_claim_notify_trigger() from public, anon, authenticated;
drop trigger if exists network_claim_notify on public.network_organization_claims;
create trigger network_claim_notify after update of status on public.network_organization_claims for each row execute function private.network_claim_notify_trigger();

create or replace function public.submit_network_campaign_with_credit(
  p_organization_id uuid,p_name text,p_objective text,p_credit_type text,p_destination_url text,p_headline text,
  p_requested_starts_at timestamptz,p_requested_ends_at timestamptz,p_target_regions text[] default array['statewide']::text[]
) returns uuid language plpgsql security invoker set search_path=public as $$
declare
  v_user uuid := (select auth.uid());
  v_balance integer;
  v_campaign_id uuid;
  v_placement text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.network_organization_members m where m.organization_id=p_organization_id and m.profile_id=v_user and m.status='active') then raise exception 'Organization access required'; end if;
  if p_credit_type not in ('event-spotlight','regional-feature','statewide-feature','social-feed','media-feature') then raise exception 'Invalid credit type'; end if;
  select coalesce(sum(quantity),0) into v_balance from public.network_partner_credit_ledger where organization_id=p_organization_id and credit_type=p_credit_type;
  if v_balance <= 0 then raise exception 'No available promotion credit'; end if;
  v_placement := case when p_credit_type='statewide-feature' then 'network-home' else p_credit_type end;
  insert into public.network_campaigns(organization_id,name,objective,package,requested_placement,destination_url,headline,requested_starts_at,requested_ends_at,target_regions,status,created_by,entitlement_source,credit_type,payment_status)
  values(p_organization_id,trim(p_name),p_objective,'boost',v_placement,nullif(trim(coalesce(p_destination_url,'')),''),nullif(trim(coalesce(p_headline,'')),''),p_requested_starts_at,p_requested_ends_at,p_target_regions,'pending',v_user,'credit',p_credit_type,'credited') returning id into v_campaign_id;
  insert into public.network_partner_credit_ledger(organization_id,credit_type,quantity,reason,campaign_id,created_by)
  values(p_organization_id,p_credit_type,-1,'Campaign credit redeemed',v_campaign_id,v_user);
  return v_campaign_id;
end;$$;
revoke all on function public.submit_network_campaign_with_credit(uuid,text,text,text,text,text,timestamptz,timestamptz,text[]) from public, anon;
grant execute on function public.submit_network_campaign_with_credit(uuid,text,text,text,text,text,timestamptz,timestamptz,text[]) to authenticated;
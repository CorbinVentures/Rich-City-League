-- Complete RCL compliance operations foundation.
-- Persist age/legal signup metadata, provide TIDA request tracking, and harden privileged RPC execution.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.app_role;
  safe_profile_role public.app_role;
  requested_type text;
  dob date;
begin
  requested_type := coalesce(new.raw_user_meta_data ->> 'requested_profile_type', 'fan');
  requested_role := case requested_type when 'player' then 'player'::public.app_role when 'coach' then 'coach'::public.app_role when 'fan' then 'fan'::public.app_role else 'fan'::public.app_role end;
  safe_profile_role := case when requested_role = 'fan'::public.app_role then 'fan'::public.app_role else 'player'::public.app_role end;
  begin dob := nullif(new.raw_user_meta_data ->> 'date_of_birth','')::date; exception when others then dob := null; end;
  if dob is null or dob > current_date - interval '13 years' then
    raise exception 'RCL social accounts require a valid age of 13 or older';
  end if;
  insert into public.profiles(id,username,first_name,last_name,display_name,bio,location,role,date_of_birth,legal_terms_accepted_at,privacy_policy_acknowledged_at)
  values(new.id,nullif(trim(new.raw_user_meta_data->>'username'),''),nullif(trim(new.raw_user_meta_data->>'first_name'),''),nullif(trim(new.raw_user_meta_data->>'last_name'),''),coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),new.email),nullif(trim(new.raw_user_meta_data->>'bio'),''),nullif(trim(new.raw_user_meta_data->>'location'),''),safe_profile_role,dob,nullif(new.raw_user_meta_data->>'legal_terms_accepted_at','')::timestamptz,nullif(new.raw_user_meta_data->>'privacy_policy_acknowledged_at','')::timestamptz);
  if requested_role='coach'::public.app_role then insert into public.profile_roles(profile_id,role,status) values(new.id,'coach','pending') on conflict(profile_id,role) do nothing; end if;
  if requested_role='fan'::public.app_role then insert into public.fan_profiles(profile_id) values(new.id) on conflict(profile_id) do nothing; end if;
  return new;
end; $$;

create table if not exists public.intimate_image_removal_requests (
 id uuid primary key default gen_random_uuid(),
 requester_profile_id uuid references public.profiles(id) on delete set null,
 requester_email text,
 content_url text not null,
 statement text not null,
 status text not null default 'open' check(status in ('open','validating','removed','rejected')),
 received_at timestamptz not null default now(),
 deadline_at timestamptz generated always as (received_at + interval '48 hours') stored,
 removed_at timestamptz,
 reviewed_by uuid references public.profiles(id) on delete set null,
 response_note text
);
alter table public.intimate_image_removal_requests enable row level security;
drop policy if exists "requester views tida requests" on public.intimate_image_removal_requests;
create policy "requester views tida requests" on public.intimate_image_removal_requests for select to authenticated using(requester_profile_id=(select auth.uid()) or public.is_staff_or_admin());
drop policy if exists "authenticated creates tida requests" on public.intimate_image_removal_requests;
create policy "authenticated creates tida requests" on public.intimate_image_removal_requests for insert to authenticated with check(requester_profile_id=(select auth.uid()));
drop policy if exists "staff manages tida requests" on public.intimate_image_removal_requests;
create policy "staff manages tida requests" on public.intimate_image_removal_requests for update to authenticated using(public.is_staff_or_admin()) with check(public.is_staff_or_admin());

create or replace function public.create_intimate_image_removal_request(target_url text, victim_statement text)
returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if length(trim(target_url))<5 or length(trim(victim_statement))<5 then raise exception 'Content URL and statement are required'; end if;
 insert into public.intimate_image_removal_requests(requester_profile_id,content_url,statement)
 values(auth.uid(),trim(target_url),trim(victim_statement)) returning id into rid;
 return rid;
end; $$;
revoke all on function public.create_intimate_image_removal_request(text,text) from public, anon;
grant execute on function public.create_intimate_image_removal_request(text,text) to authenticated;

-- Explicitly remove PUBLIC/anon execution from compliance RPCs created earlier.
revoke all on function public.rcl_social_usage_status() from public, anon;
revoke all on function public.rcl_record_social_usage(integer) from public, anon;
revoke all on function public.create_privacy_request(text,text) from public, anon;
grant execute on function public.rcl_social_usage_status() to authenticated;
grant execute on function public.rcl_record_social_usage(integer) to authenticated;
grant execute on function public.create_privacy_request(text,text) to authenticated;

create index if not exists intimate_image_requests_deadline_idx on public.intimate_image_removal_requests(status,deadline_at);

-- Give real RCL administrators a direct, audited staff assignment workflow
-- for existing members. No application is required, but assignments stay
-- team-scoped and never modify member profiles.role or platform-admin rights.
create or replace function public.rcl_admin_assign_staff_role(
 p_profile_id uuid,
 p_role_code text,
 p_team_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path=public,pg_catalog
as $function$
declare
 v_actor uuid:=auth.uid();
 v_id uuid;
 v_app_id uuid;
 v_created_coach boolean:=false;
begin
 if v_actor is null or not public.is_admin() then
  raise exception 'Administrator authorization required';
 end if;
 if p_profile_id is null or p_profile_id=v_actor then
  raise exception 'Select a different member account';
 end if;
 if not exists(
  select 1 from public.profiles p
  where p.id=p_profile_id and p.is_active=true and p.is_system_account=false
 ) then raise exception 'Member account is not eligible'; end if;
 if p_role_code is null or p_role_code not in (
  'league_coach','accountant','video_staff','cheerleading_coach','referee','franchise_owner'
 ) then raise exception 'Invalid RCL staff role'; end if;
 if p_role_code in ('league_coach','franchise_owner') and p_team_id is null then
  raise exception 'A specific team is required for this role'; end if;
 if p_team_id is not null and not exists(
  select 1 from public.teams where id=p_team_id and is_active=true
 ) then raise exception 'The selected team is not active'; end if;
 -- Atomic and backed by rcl_staff_one_active_role_team unique index.
 if exists(
  select 1 from public.rcl_staff_assignments a
  where a.profile_id=p_profile_id and a.role_code=p_role_code
  and a.team_id is not distinct from p_team_id and a.active=true
 ) then raise exception 'Member already holds this active assignment'; end if;
 -- If this member had already applied for this exact role and team,
 -- resolve that application as approved instead of leaving a stale pending request.
 select id into v_app_id from public.rcl_staff_applications
 where profile_id=p_profile_id and role_code=p_role_code
 and team_id is not distinct from p_team_id and status='pending'
 for update;
 if v_app_id is not null then
  update public.rcl_staff_applications
  set status='approved',reviewed_by=v_actor,reviewed_at=now(),
      review_note='Assigned directly by RCL administration',updated_at=now()
  where id=v_app_id;
 end if;
 if p_role_code='league_coach' then
  insert into public.team_coaches(team_id,profile_id,title)
  values(p_team_id,p_profile_id,'RCL Coach')
  on conflict (team_id,profile_id) do nothing;
  v_created_coach=found;
 end if;
 insert into public.rcl_staff_assignments(
  application_id,profile_id,role_code,team_id,approved_by,managed_team_coach
 ) values(
  v_app_id,p_profile_id,p_role_code,p_team_id,v_actor,v_created_coach
 ) returning id into v_id;
 return v_id;
end;
$function$;
revoke all on function public.rcl_admin_assign_staff_role(uuid,text,uuid) from public,anon;
grant execute on function public.rcl_admin_assign_staff_role(uuid,text,uuid) to authenticated;

begin;
-- Enforce MFA at the execution boundary: SECURITY DEFINER bypasses RLS.

CREATE OR REPLACE FUNCTION public.rcl_admin_assign_staff_role(p_profile_id uuid, p_role_code text, p_team_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
 v_actor uuid:=auth.uid();
 v_id uuid;
 v_app_id uuid;
 v_created_coach boolean:=false;
begin
 if v_actor is null or not public.is_admin() then
  raise exception 'Administrator authorization required';
 end if;
 if coalesce((auth.jwt()->>'aal'),'aal1') <> 'aal2' then raise exception 'Authenticator verification required'; end if;
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

CREATE OR REPLACE FUNCTION public.rcl_review_staff_application(p_application_id uuid, p_decision text, p_note text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare v_app public.rcl_staff_applications%rowtype;
v_actor uuid:=auth.uid();v_id uuid;v_created_coach boolean:=false;
begin
 if v_actor is null or not public.is_admin() then raise exception 'Administrator approval required'; end if;
 if coalesce((auth.jwt()->>'aal'),'aal1') <> 'aal2' then raise exception 'Authenticator verification required'; end if;
 if p_decision not in ('approved','rejected') then raise exception 'Invalid review decision'; end if;
 if char_length(coalesce(p_note,''))>800 then raise exception 'Review note too long'; end if;
 select * into v_app from public.rcl_staff_applications where id=p_application_id for update;
 if not found then raise exception 'Role application not found'; end if;
 if v_app.status <> 'pending' then raise exception 'Application already reviewed'; end if;
 if v_app.profile_id=v_actor then raise exception 'Self approval is prohibited'; end if;
 if not exists(select 1 from public.profiles where id=v_app.profile_id and is_active=true) then
   raise exception 'Member account is not active';
 end if;
 if v_app.team_id is not null and not exists(
  select 1 from public.teams where id=v_app.team_id and is_active=true
 ) then raise exception 'The selected team is not active'; end if;
 if v_app.role_code in ('franchise_owner','league_coach') and v_app.team_id is null then
   raise exception 'A team assignment is required';
 end if;
 if p_decision='approved' and exists(
  select 1 from public.rcl_staff_assignments a
  where a.profile_id=v_app.profile_id and a.role_code=v_app.role_code
  and a.team_id is not distinct from v_app.team_id and a.active
 ) then raise exception 'Member already holds this active assignment'; end if;
 update public.rcl_staff_applications
 set status=p_decision,reviewed_at=now(),reviewed_by=v_actor,
     review_note=coalesce(p_note,''),updated_at=now()
 where id=v_app.id;
 if p_decision='approved' then
   if v_app.role_code='league_coach' then
     insert into public.team_coaches(team_id,profile_id,title)
     values(v_app.team_id,v_app.profile_id,'RCL Coach')
     on conflict (team_id,profile_id) do nothing;
     v_created_coach=found;
   end if;
   insert into public.rcl_staff_assignments
   (application_id,profile_id,role_code,team_id,approved_by,managed_team_coach)
   values(v_app.id,v_app.profile_id,v_app.role_code,v_app.team_id,v_actor,v_created_coach)
   returning id into v_id;
 end if;
 return v_id;
end;$function$;

CREATE OR REPLACE FUNCTION public.rcl_revoke_staff_assignment(p_assignment_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare v_row public.rcl_staff_assignments%rowtype; v_actor uuid:=auth.uid();
begin
 if v_actor is null or not public.is_admin() then raise exception 'Administrator approval required'; end if;
 if coalesce((auth.jwt()->>'aal'),'aal1') <> 'aal2' then raise exception 'Authenticator verification required'; end if;
 select * into v_row from public.rcl_staff_assignments where id=p_assignment_id for update;
 if not found or not v_row.active then raise exception 'Assignment already inactive or not found'; end if;
 update public.rcl_staff_assignments
 set active=false,revoked_at=now(),revoked_by=v_actor where id=v_row.id;
 if v_row.role_code='league_coach' and v_row.managed_team_coach then
  delete from public.team_coaches where profile_id=v_row.profile_id and team_id=v_row.team_id;
 end if;
 return true;
end;$function$;
commit;

-- RCL production staff workflow. Does NOT change profiles.role or grant generic
-- staff/admin access: approved assignments are scoped to role/team only.
create table if not exists public.rcl_staff_applications (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.profiles(id) on delete cascade,
 role_code text not null check (role_code in ('league_coach','accountant','video_staff','cheerleading_coach','referee','franchise_owner')),
 team_id uuid references public.teams(id) on delete restrict,
 motivation text not null default '' check (char_length(motivation)<=1000),
 status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn')),
 reviewed_by uuid references public.profiles(id),
 reviewed_at timestamptz,
 review_note text not null default '' check (char_length(review_note)<=800),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint rcl_staff_team_required check (
   role_code not in ('franchise_owner','league_coach') or team_id is not null
 ),
 constraint rcl_staff_review_state check (
   (status in ('pending','withdrawn') and reviewed_at is null and reviewed_by is null)
   or (status in ('approved','rejected') and reviewed_at is not null and reviewed_by is not null)
 )
);
create unique index if not exists rcl_staff_one_pending_role_team
on public.rcl_staff_applications(profile_id,role_code,coalesce(team_id,'00000000-0000-0000-0000-000000000000'::uuid))
where status='pending';
create index if not exists rcl_staff_applications_status_idx on public.rcl_staff_applications(status,created_at desc);

create table if not exists public.rcl_staff_assignments (
 id uuid primary key default gen_random_uuid(),
 application_id uuid unique references public.rcl_staff_applications(id) on delete restrict,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 role_code text not null check(role_code in ('league_coach','accountant','video_staff','cheerleading_coach','referee','franchise_owner')),
 team_id uuid references public.teams(id) on delete restrict,
 approved_by uuid not null references public.profiles(id),
 assigned_at timestamptz not null default now(),
 active boolean not null default true,
 revoked_at timestamptz,
 revoked_by uuid references public.profiles(id),
 managed_team_coach boolean not null default false,
 constraint rcl_staff_assignment_team_required check(role_code not in ('franchise_owner','league_coach') or team_id is not null),
 constraint rcl_staff_assignment_revocation_state check(
   (active and revoked_at is null and revoked_by is null) or
   (not active and revoked_at is not null and revoked_by is not null)
 )
);
create unique index if not exists rcl_staff_one_active_role_team
on public.rcl_staff_assignments(profile_id,role_code,coalesce(team_id,'00000000-0000-0000-0000-000000000000'::uuid))
where active=true;
create index if not exists rcl_staff_assignments_by_member on public.rcl_staff_assignments(profile_id,active);

alter table public.rcl_staff_applications enable row level security;
alter table public.rcl_staff_assignments enable row level security;
create policy "member or admin see role applications" on public.rcl_staff_applications for select to authenticated
using(profile_id=(select auth.uid()) or public.is_admin());
create policy "member requests own pending role" on public.rcl_staff_applications for insert to authenticated
with check (
 profile_id=(select auth.uid()) and status='pending' and reviewed_at is null
 and reviewed_by is null and review_note=''
 and exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active)
);
-- No member UPDATE/DELETE policy, and no client write grants for assignments.
create policy "members see only their approved assignments" on public.rcl_staff_assignments for select to authenticated
using(profile_id=(select auth.uid()) or public.is_admin());

revoke all on public.rcl_staff_applications from public,anon;
revoke all on public.rcl_staff_assignments from public,anon,authenticated;
grant select,insert on public.rcl_staff_applications to authenticated;
grant select on public.rcl_staff_assignments to authenticated;

-- Approval requires a REAL existing administrator and a current pending application.
-- No self-approval; a franchise owner must have a concrete, active team.
create or replace function public.rcl_review_staff_application(
 p_application_id uuid, p_decision text, p_note text default ''
) returns uuid language plpgsql security definer
set search_path=public,pg_catalog as $function$
declare v_app public.rcl_staff_applications%rowtype;
v_actor uuid:=auth.uid();v_id uuid;v_created_coach boolean:=false;
begin
 if v_actor is null or not public.is_admin() then raise exception 'Administrator approval required'; end if;
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

create or replace function public.rcl_revoke_staff_assignment(
 p_assignment_id uuid
) returns boolean language plpgsql security definer
set search_path=public,pg_catalog as $function$
declare v_row public.rcl_staff_assignments%rowtype; v_actor uuid:=auth.uid();
begin
 if v_actor is null or not public.is_admin() then raise exception 'Administrator approval required'; end if;
 select * into v_row from public.rcl_staff_assignments where id=p_assignment_id for update;
 if not found or not v_row.active then raise exception 'Assignment already inactive or not found'; end if;
 update public.rcl_staff_assignments
 set active=false,revoked_at=now(),revoked_by=v_actor where id=v_row.id;
 if v_row.role_code='league_coach' and v_row.managed_team_coach then
  delete from public.team_coaches where profile_id=v_row.profile_id and team_id=v_row.team_id;
 end if;
 return true;
end;$function$;

create or replace function public.rcl_has_staff_assignment(
 p_role_code text,p_team_id uuid default null
) returns boolean language sql stable security definer
set search_path=public,pg_catalog as $function$
select auth.uid() is not null and exists(
 select 1 from public.rcl_staff_assignments a
 join public.profiles p on p.id=a.profile_id
 where a.profile_id=auth.uid() and p.is_active=true and a.active=true
 and a.role_code=p_role_code
 and ((p_team_id is not null and a.team_id=p_team_id)
      or (p_team_id is null and p_role_code not in ('franchise_owner','league_coach')))
);$function$;

revoke all on function public.rcl_review_staff_application(uuid,text,text) from public,anon;
revoke all on function public.rcl_revoke_staff_assignment(uuid) from public,anon;
revoke all on function public.rcl_has_staff_assignment(text,uuid) from public,anon;
grant execute on function public.rcl_review_staff_application(uuid,text,text) to authenticated;
grant execute on function public.rcl_revoke_staff_assignment(uuid) to authenticated;
grant execute on function public.rcl_has_staff_assignment(text,uuid) to authenticated;

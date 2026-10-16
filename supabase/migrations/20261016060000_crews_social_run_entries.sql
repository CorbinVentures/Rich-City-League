begin;

-- Extend the founding crew identity instead of creating a second membership system.
alter table public.commonwealth_crews add column if not exists logo_path text;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('rch-crew-logos','rch-crew-logos',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Crew captains upload crew logos" on storage.objects;
create policy "Crew captains upload crew logos" on storage.objects
for insert to authenticated with check (
  bucket_id='rch-crew-logos'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1 from public.commonwealth_crews c
    where c.id=((storage.foldername(name))[1])::uuid and c.captain_id=(select auth.uid())
  )
);

-- Public crew branding needs public membership identity, but a private profile stays hidden from guests.
grant select on public.commonwealth_crew_members to anon;
drop policy if exists commonwealth_public_members on public.commonwealth_crew_members;
create policy commonwealth_public_members on public.commonwealth_crew_members
for select to anon using (
  exists(select 1 from public.profiles p where p.id=profile_id and p.is_active and p.profile_visibility='public')
);

create table if not exists public.commonwealth_crew_invitations (
 id uuid primary key default gen_random_uuid(),
 crew_id uuid not null references public.commonwealth_crews(id) on delete cascade,
 inviter_id uuid not null references public.profiles(id) on delete cascade,
 invitee_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 answered_at timestamptz,
 unique(crew_id,invitee_id),
 check(inviter_id<>invitee_id)
);
create index if not exists commonwealth_invites_recipient_idx on public.commonwealth_crew_invitations(invitee_id,status,created_at desc);
alter table public.commonwealth_crew_invitations enable row level security;
revoke all on public.commonwealth_crew_invitations from public,anon,authenticated;
grant select on public.commonwealth_crew_invitations to authenticated;
create policy commonwealth_invite_inbox on public.commonwealth_crew_invitations
for select to authenticated using (
 invitee_id=(select auth.uid()) or inviter_id=(select auth.uid())
 or exists(select 1 from public.commonwealth_crews c where c.id=crew_id and c.captain_id=(select auth.uid()))
);

-- Five hand-picked teammates per owner, not one algorithmic team-wide top-five.
create table if not exists public.commonwealth_crew_favorites (
 owner_id uuid not null references public.profiles(id) on delete cascade,
 crew_id uuid not null references public.commonwealth_crews(id) on delete cascade,
 member_id uuid not null references public.profiles(id) on delete cascade,
 position smallint not null check(position between 1 and 5),
 primary key(owner_id,member_id),
 unique(owner_id,position),
 foreign key (crew_id,owner_id) references public.commonwealth_crew_members(crew_id,profile_id) on delete cascade,
 foreign key (crew_id,member_id) references public.commonwealth_crew_members(crew_id,profile_id) on delete cascade
);
alter table public.commonwealth_crew_favorites enable row level security;
revoke all on public.commonwealth_crew_favorites from public,anon,authenticated;
grant select on public.commonwealth_crew_favorites to anon,authenticated;
create policy commonwealth_favorite_public on public.commonwealth_crew_favorites
for select to anon,authenticated using (
 owner_id=(select auth.uid()) or exists (
  select 1 from public.profiles p where p.id=owner_id and p.is_active and p.profile_visibility='public'
 )
);

-- Crew entry is distinct from a player's individual RSVP. It never reserves unconsenting members' places.
create table if not exists public.commonwealth_run_entries (
 id uuid primary key default gen_random_uuid(),
 crew_id uuid not null references public.commonwealth_crews(id) on delete cascade,
 run_id uuid not null references public.runs(id) on delete cascade,
 registered_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),
 unique(crew_id,run_id)
);
create index if not exists commonwealth_run_entries_run_idx on public.commonwealth_run_entries(run_id);
alter table public.commonwealth_run_entries enable row level security;
revoke all on public.commonwealth_run_entries from public,anon,authenticated;
grant select on public.commonwealth_run_entries to anon,authenticated;
create policy commonwealth_run_entries_public on public.commonwealth_run_entries
for select to anon,authenticated using(true);

create or replace function public.commonwealth_set_crew_logo(p_crew uuid,p_path text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not exists(select 1 from public.commonwealth_crews c where c.id=p_crew and c.captain_id=(select auth.uid())) then
   raise exception 'Only the crew captain may change the logo';
 end if;
 if p_path !~ ('^'||p_crew::text||'/logo-[0-9]+[.](png|jpg|jpeg|webp)$') then
   raise exception 'Invalid crew logo path';
 end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='rch-crew-logos' and o.name=p_path) then
   raise exception 'Upload your logo first';
 end if;
 update public.commonwealth_crews set logo_path=p_path where id=p_crew;
end $$;

create or replace function public.commonwealth_invite_player(p_crew uuid,p_player uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_season uuid; v_invite uuid;
begin
 if v_actor is null then raise exception 'Sign in to invite teammates'; end if;
 select c.season_id into v_season from public.commonwealth_crews c
 join public.commonwealth_crew_members m on m.crew_id=c.id and m.profile_id=v_actor
 join public.commonwealth_seasons s on s.id=c.season_id
 where c.id=p_crew and s.status in ('enrollment','active');
 if v_season is null then raise exception 'Join this crew before inviting players'; end if;
 if p_player=v_actor then raise exception 'You cannot invite yourself'; end if;
 if not exists(select 1 from public.profiles p where p.id=p_player and p.is_active and not p.is_system_account
 and (p.date_of_birth is null or p.date_of_birth<=current_date-interval '16 years')) then
   raise exception 'Invite an eligible RCH member'; end if;
 if exists(select 1 from public.commonwealth_crew_members m where m.season_id=v_season and m.profile_id=p_player) then
   raise exception 'This player already represents a crew this season'; end if;
 if (select count(*) from public.commonwealth_crew_invitations i where i.inviter_id=v_actor
 and i.created_at>now()-interval '24 hours')>=15 then raise exception 'Daily invitation limit reached'; end if;
 insert into public.commonwealth_crew_invitations(crew_id,inviter_id,invitee_id,status)
 values(p_crew,v_actor,p_player,'pending')
 on conflict (crew_id,invitee_id) do update set
 status='pending',inviter_id=excluded.inviter_id,created_at=now(),answered_at=null
 where public.commonwealth_crew_invitations.status='declined'
 and public.commonwealth_crew_invitations.created_at<now()-interval '7 days'
 returning id into v_invite;
 if v_invite is null then raise exception 'An invitation for this player is already pending or accepted'; end if;
 return v_invite;
end $$;

create or replace function public.commonwealth_respond_invitation(p_invitation uuid,p_accept boolean)
returns text language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_inv public.commonwealth_crew_invitations%rowtype;
v_season uuid; v_captain uuid; v_count int;
begin
 if v_actor is null then raise exception 'Sign in to respond'; end if;
 select * into v_inv from public.commonwealth_crew_invitations where id=p_invitation and invitee_id=v_actor and status='pending' for update;
 if v_inv.id is null then raise exception 'Invitation not found or already answered'; end if;
 select c.season_id,c.captain_id into v_season,v_captain from public.commonwealth_crews c
 join public.commonwealth_seasons s on s.id=c.season_id where c.id=v_inv.crew_id and s.status in ('enrollment','active');
 if v_season is null then raise exception 'Crew season is not active'; end if;
 if p_accept and exists(select 1 from public.commonwealth_crew_members where season_id=v_season and profile_id=v_actor) then
   raise exception 'You already represent a crew this season'; end if;
 if p_accept then
   select count(*) into v_count from public.commonwealth_crew_members where crew_id=v_inv.crew_id;
   if v_count>=12 then raise exception 'This crew roster is full'; end if;
   if v_inv.inviter_id=v_captain then
     insert into public.commonwealth_crew_members(crew_id,season_id,profile_id,role)
     values(v_inv.crew_id,v_season,v_actor,'player');
   else
     insert into public.commonwealth_join_requests(crew_id,profile_id,status)
     values(v_inv.crew_id,v_actor,'pending')
     on conflict(crew_id,profile_id) do update set status='pending',created_at=now(),decided_at=null;
   end if;
 end if;
 update public.commonwealth_crew_invitations set status=case when p_accept then 'accepted' else 'declined' end,
 answered_at=now() where id=v_inv.id;
 return case when not p_accept then 'declined' when v_inv.inviter_id=v_captain then 'joined' else 'pending_approval' end;
end $$;

create or replace function public.commonwealth_set_crew_favorites(p_members uuid[])
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_crew uuid; v_member uuid; v_position int:=0;
begin
 if v_actor is null then raise exception 'Sign in to choose featured teammates'; end if;
 select m.crew_id into v_crew from public.commonwealth_crew_members m
 join public.commonwealth_seasons s on s.id=m.season_id
 where m.profile_id=v_actor and s.status in ('enrollment','active')
 order by m.joined_at desc limit 1;
 if v_crew is null then raise exception 'Join a crew to feature teammates'; end if;
 if coalesce(array_length(p_members,1),0)>5 then raise exception 'Choose up to five teammates'; end if;
 if exists(select 1 from unnest(coalesce(p_members,array[]::uuid[])) u(id)
 where u.id=v_actor or not exists(select 1 from public.commonwealth_crew_members m where m.crew_id=v_crew and m.profile_id=u.id))
 then raise exception 'Favorites must be other members of your crew'; end if;
 if (select count(distinct x) from unnest(coalesce(p_members,array[]::uuid[])) x)
 <>coalesce(array_length(p_members,1),0) then raise exception 'Choose each teammate once'; end if;
 delete from public.commonwealth_crew_favorites where owner_id=v_actor;
 foreach v_member in array coalesce(p_members,array[]::uuid[]) loop
   v_position:=v_position+1;
   insert into public.commonwealth_crew_favorites(owner_id,crew_id,member_id,position)
   values(v_actor,v_crew,v_member,v_position);
 end loop;
end $$;

create or replace function public.commonwealth_register_crew_run(p_crew uuid,p_run uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_id uuid;
begin
 if v_actor is null or not exists(select 1 from public.commonwealth_crews c where c.id=p_crew and c.captain_id=v_actor)
 then raise exception 'Only the captain can register the crew'; end if;
 if not exists(select 1 from public.runs r where r.id=p_run and r.run_type='competitive'
 and r.status='open' and r.starts_at>now()) then
 raise exception 'Select an upcoming competitive Run with registration open'; end if;
 insert into public.commonwealth_run_entries(crew_id,run_id,registered_by)
 values(p_crew,p_run,v_actor)
 on conflict(crew_id,run_id) do nothing
 returning id into v_id;
 if v_id is null then select id into v_id from public.commonwealth_run_entries where crew_id=p_crew and run_id=p_run; end if;
 return v_id;
end $$;

revoke all on function public.commonwealth_set_crew_logo(uuid,text),
public.commonwealth_invite_player(uuid,uuid),
public.commonwealth_respond_invitation(uuid,boolean),
public.commonwealth_set_crew_favorites(uuid[]),
public.commonwealth_register_crew_run(uuid,uuid) from public,anon;
grant execute on function public.commonwealth_set_crew_logo(uuid,text),
public.commonwealth_invite_player(uuid,uuid),
public.commonwealth_respond_invitation(uuid,boolean),
public.commonwealth_set_crew_favorites(uuid[]),
public.commonwealth_register_crew_run(uuid,uuid) to authenticated;

comment on table public.commonwealth_run_entries is
'Crew registration intent for a competitive Run. Members must RSVP individually; Cup ratings only change after independently verified matches.';
commit;

begin;

-- A five-slot profile showcase can feature a skill, World milestone, location
-- collectible, or previously earned member badge. No client can invent a pin:
-- all writes pass through an authenticated RPC that verifies current ownership.
create table public.rch_badge_cabinet_pins (
 profile_id uuid not null references public.profiles(id) on delete cascade,
 badge_kind text not null check(badge_kind in ('skill','world','location','achievement')),
 badge_key text not null check(char_length(badge_key) between 1 and 120),
 slot smallint not null check(slot between 1 and 5),
 created_at timestamptz not null default now(),
 primary key(profile_id,badge_kind,badge_key),
 unique(profile_id,slot)
);
create index rch_badge_cabinet_pins_profile_idx
 on public.rch_badge_cabinet_pins(profile_id,slot);
alter table public.rch_badge_cabinet_pins enable row level security;
revoke all on public.rch_badge_cabinet_pins from public,anon,authenticated;
grant select on public.rch_badge_cabinet_pins to anon,authenticated;
create policy rch_badge_cabinet_pins_public_read
 on public.rch_badge_cabinet_pins for select to anon,authenticated
 using(profile_id=(select auth.uid()) or exists(
   select 1 from public.profiles p where p.id=rch_badge_cabinet_pins.profile_id
    and p.is_active and not coalesce(p.is_system_account,false)
    and p.profile_visibility='public'
 ));

-- Preserve every existing featured place medal in the new cross-family layout.
insert into public.rch_badge_cabinet_pins(profile_id,badge_kind,badge_key,slot)
select profile_id,'location',award_id::text,slot
from public.rch_badge_showcase_pins
on conflict do nothing;

create function public.rch_set_badge_cabinet_pin(
 p_badge_kind text,p_badge_key text,p_slot smallint,p_pinned boolean
) returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_key uuid;v_journey jsonb;v_earned boolean:=false;
begin
 if v_user is null then raise exception 'Sign in to manage your badge showcase';end if;
 if p_badge_kind not in ('skill','world','location','achievement')
    or p_badge_key is null or char_length(p_badge_key) not between 1 and 120
 then raise exception 'Invalid badge selection';end if;
 if not p_pinned then
  delete from public.rch_badge_cabinet_pins
   where profile_id=v_user and badge_kind=p_badge_kind and badge_key=p_badge_key;
  return;
 end if;
 if p_slot is null or p_slot not between 1 and 5 then raise exception 'Choose a showcase slot from 1 to 5';end if;

 if p_badge_kind='skill' then
  select exists(select 1 from public.get_rch_skill_mastery(v_user) s
    where s.badge_code=p_badge_key and s.tier_index>0) into v_earned;
 elsif p_badge_kind='world' then
  if p_badge_key not in ('first_battle','first_win','five_verified_games','three_arenas','ten_verified_wins','crown_defender')
  then raise exception 'Unknown World milestone';end if;
  v_journey:=public.get_rch_world_journey();
  v_earned:=coalesce((v_journey->'milestones'->>p_badge_key)::boolean,false);
 elsif p_badge_kind='location' then
  begin v_key:=p_badge_key::uuid;exception when invalid_text_representation then raise exception 'Invalid location award';end;
  select exists(select 1 from public.rch_place_badge_awards a
    where a.id=v_key and a.profile_id=v_user) into v_earned;
 elsif p_badge_kind='achievement' then
  begin v_key:=p_badge_key::uuid;exception when invalid_text_representation then raise exception 'Invalid achievement';end;
  select exists(select 1 from public.fan_badges b where b.badge_id=v_key and b.profile_id=v_user)
    or exists(select 1 from public.coach_badges b where b.badge_id=v_key and b.profile_id=v_user)
    or exists(select 1 from public.player_badges b join public.players p on p.id=b.player_id
      where b.badge_id=v_key and p.profile_id=v_user and p.is_active)
  into v_earned;
 end if;
 if not v_earned then raise exception 'Only a badge already earned by this profile can be featured';end if;

 delete from public.rch_badge_cabinet_pins
  where profile_id=v_user and (slot=p_slot or (badge_kind=p_badge_kind and badge_key=p_badge_key));
 insert into public.rch_badge_cabinet_pins(profile_id,badge_kind,badge_key,slot)
 values(v_user,p_badge_kind,p_badge_key,p_slot);
end $$;
revoke all on function public.rch_set_badge_cabinet_pin(text,text,smallint,boolean) from public,anon,authenticated;
grant execute on function public.rch_set_badge_cabinet_pin(text,text,smallint,boolean) to authenticated;
comment on function public.rch_set_badge_cabinet_pin(text,text,smallint,boolean) is
 'Owner-only five-slot featured badge setter. Verifies a real earned skill, World milestone, location collectible, or legacy player/fan/coach award before saving.';

commit;

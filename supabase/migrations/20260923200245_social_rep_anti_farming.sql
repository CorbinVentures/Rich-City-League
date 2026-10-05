begin;

-- Harden social REP against reversible-action farming and self-engagement.
create table if not exists public.social_rep_claims (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null check (action_type in ('posts','comments','reactions','follows')),
  target_id uuid not null,
  claimed_at timestamptz not null default now(),
  primary key(profile_id,action_type,target_id)
);
alter table public.social_rep_claims enable row level security;
-- Claims are server bookkeeping; no client read/write policy is intentionally provided.

create or replace function public.award_social_rep()
returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid; reward integer; reason_name text; source_name text; source_uuid uuid; target_uuid uuid; owner uuid; claim_rows integer:=0;
begin
  if tg_table_name='posts' then
    actor:=new.author_id; reward:=20; reason_name:='quality_content'; source_name:='post'; source_uuid:=new.id; target_uuid:=new.id;
  elsif tg_table_name='comments' then
    actor:=new.author_id; reward:=5; reason_name:='meaningful_engagement'; source_name:='comment'; source_uuid:=new.id; target_uuid:=new.post_id;
    select author_id into owner from public.posts where id=new.post_id;
    if owner=actor then return new; end if;
  elsif tg_table_name='reactions' then
    actor:=new.user_id; reward:=2; reason_name:='meaningful_engagement'; source_name:='reaction'; source_uuid:=new.id; target_uuid:=new.post_id;
    select author_id into owner from public.posts where id=new.post_id;
    if owner=actor then return new; end if;
  elsif tg_table_name='follows' then
    actor:=new.follower_id; reward:=3; reason_name:='community_contribution'; source_name:='follow'; source_uuid:=new.following_id; target_uuid:=new.following_id;
    if actor=new.following_id then return new; end if;
  else return new; end if;

  if actor is null or target_uuid is null then return new; end if;

  insert into public.social_rep_claims(profile_id,action_type,target_id)
  values(actor,tg_table_name::text,target_uuid)
  on conflict do nothing;
  get diagnostics claim_rows = row_count;
  if claim_rows=0 then return new; end if;

  insert into public.user_levels(profile_id) values(actor) on conflict do nothing;
  insert into public.xp_transactions(profile_id,amount,reason,source_type,source_id)
  values(actor,reward,reason_name,source_name,source_uuid) on conflict do nothing;
  if found then
    update public.user_levels set xp=xp+reward,level=public.level_for_xp(xp+reward),updated_at=now() where profile_id=actor;
  end if;
  return new;
end $$;

revoke all on public.social_rep_claims from anon,authenticated;
revoke execute on function public.award_social_rep() from public,anon,authenticated;

commit;

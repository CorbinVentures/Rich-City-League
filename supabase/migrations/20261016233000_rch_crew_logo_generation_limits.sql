begin;
-- Cost-bound AI logo credits; user-specific daily quotas and cooldown are atomic.
-- No user-writable table grants: only the authenticated RPC may claim an image job.
create table if not exists public.rch_crew_logo_generation_limits (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  usage_day date not null,
  generation_count integer not null default 1 check(generation_count between 1 and 3),
  last_generated_at timestamptz not null default now(),
  primary key(profile_id,usage_day)
);
alter table public.rch_crew_logo_generation_limits enable row level security;
revoke all on public.rch_crew_logo_generation_limits from public,anon,authenticated;

create or replace function public.rch_claim_crew_logo_generation()
returns boolean language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=(select auth.uid());
 v_day date:=(now() at time zone 'America/New_York')::date;
 v_claimed uuid;
begin
 if v_actor is null or not exists (
   select 1 from public.profiles p where p.id=v_actor and p.is_active
     and not coalesce(p.is_system_account,false)
     and (p.date_of_birth is null or p.date_of_birth<=current_date-interval '16 years')
 ) then return false; end if;
 insert into public.rch_crew_logo_generation_limits as q
 (profile_id,usage_day,generation_count,last_generated_at)
 values(v_actor,v_day,1,now())
 on conflict(profile_id,usage_day) do update
  set generation_count=q.generation_count+1,
      last_generated_at=excluded.last_generated_at
  where q.generation_count<3
    and q.last_generated_at<now()-interval '60 seconds'
 returning profile_id into v_claimed;
 return v_claimed is not null;
end $$;
revoke all on function public.rch_claim_crew_logo_generation() from public,anon,authenticated;
grant execute on function public.rch_claim_crew_logo_generation() to authenticated;
comment on function public.rch_claim_crew_logo_generation() is
'Atomic maximum of 3 AI image generations per active adult/eligible member per Eastern day, minimum 60 seconds apart. Only authenticated members can claim.';
commit;

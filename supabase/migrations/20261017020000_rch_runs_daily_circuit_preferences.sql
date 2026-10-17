begin;

-- Daily Circuit member settings: optional, private and deliberately small.
-- Never persist device GPS, behavioral shadow profiles, or notification consent.
create table public.rch_run_daily_preferences(
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_format text not null default 'all'
    check (preferred_format in ('all','1v1','2v2','3v3','4v4','5v5')),
  preferred_type text not null default 'all'
    check (preferred_type in ('all','competitive','social','training')),
  watched_courts text[] not null default '{}'::text[]
    check (cardinality(watched_courts)<=12),
  updated_at timestamptz not null default now()
);

alter table public.rch_run_daily_preferences enable row level security;
revoke all on public.rch_run_daily_preferences from public,anon,authenticated;
grant select on public.rch_run_daily_preferences to authenticated;
create policy "daily preferences visible only to owner"
 on public.rch_run_daily_preferences for select to authenticated
 using (profile_id=(select auth.uid()));

-- Writes must go through the RPC to validate court slugs, capacity and identity.
create or replace function public.rch_set_run_daily_preferences(
  p_format text default 'all',
  p_type text default 'all',
  p_court text default null,
  p_watch boolean default true
) returns void language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid();
  v_courts text[];
begin
  if v_actor is null or not exists (
    select 1 from public.profiles p
     where p.id=v_actor and p.is_active
      and not coalesce(p.is_system_account,false)
  ) then raise exception 'An active member account is required'; end if;
  if p_format is null or p_format not in ('all','1v1','2v2','3v3','4v4','5v5')
     or p_type is null or p_type not in ('all','competitive','social','training')
  then raise exception 'Unsupported format or play type'; end if;
  if p_court is not null and not exists(
    select 1 from public.basketball_locations c
    where c.slug=p_court and c.is_active
  ) then raise exception 'Select an active mapped basketball court'; end if;

  insert into public.rch_run_daily_preferences(profile_id)
    values(v_actor) on conflict(profile_id) do nothing;
  select watched_courts into v_courts
    from public.rch_run_daily_preferences
   where profile_id=v_actor for update;

  if p_court is not null then
    v_courts:=array_remove(v_courts,p_court);
    if coalesce(p_watch,false) then
      if cardinality(v_courts)>=12 then
        raise exception 'Watch up to 12 courts at a time'; end if;
      v_courts:=array_append(v_courts,p_court);
    end if;
  end if;

  update public.rch_run_daily_preferences
     set preferred_format=p_format,
         preferred_type=p_type,
         watched_courts=v_courts,
         updated_at=now()
   where profile_id=v_actor;
end $$;

revoke all on function public.rch_set_run_daily_preferences(text,text,text,boolean)
 from public,anon,authenticated;
grant execute on function public.rch_set_run_daily_preferences(text,text,text,boolean)
 to authenticated;
commit;

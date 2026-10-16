-- Near-real-time Command Center observability. Visitor privacy and MFA are invariants.
-- Each tab has one short-lived coarse-section presence row, no IP/path/device data.
begin;

create table if not exists public.rch_live_presence (
  session_id uuid primary key,
  section text not null check (section in (
    'home','social','discover','runs','crews','commonwealth','league',
    'players','teams','media','news','communities','organizations',
    'shop','professional','other'
  )),
  member_id uuid references public.profiles(id) on delete set null,
  last_seen_at timestamptz not null default now()
);
create index if not exists rch_live_presence_seen_idx
  on public.rch_live_presence(last_seen_at desc);
create index if not exists rch_live_presence_section_seen_idx
  on public.rch_live_presence(section,last_seen_at desc);
alter table public.rch_live_presence enable row level security;
revoke all on public.rch_live_presence from public,anon,authenticated;
comment on table public.rch_live_presence is
  'Ephemeral first-party opt-out-respecting browser tab presence; private to MFA-gated aggregate function. No IP, exact location or raw URL.';

create or replace function public.record_rch_live_heartbeat(p_session_id uuid,p_section text)
returns void language plpgsql volatile security definer set search_path=''
as $$
begin
  if p_session_id is null or p_section is null or p_section not in (
    'home','social','discover','runs','crews','commonwealth','league',
    'players','teams','media','news','communities','organizations',
    'shop','professional','other'
  ) then return; end if;

  insert into public.rch_live_presence(session_id,section,member_id,last_seen_at)
  values(p_session_id,p_section,(select auth.uid()),now())
  on conflict(session_id) do update
    set section=excluded.section,member_id=excluded.member_id,last_seen_at=excluded.last_seen_at
    where public.rch_live_presence.last_seen_at < now()-interval '25 seconds'
      or public.rch_live_presence.section is distinct from excluded.section
      or public.rch_live_presence.member_id is distinct from excluded.member_id;

  -- Low-rate opportunistic TTL maintenance; sessions stale for >48 h are removed.
  -- This avoids introducing a new deployment scheduler or collecting device IDs.
  if random()<0.002 then
    delete from public.rch_live_presence where last_seen_at<now()-interval '48 hours';
  end if;
end;
$$;
revoke all on function public.record_rch_live_heartbeat(uuid,text) from public,anon,authenticated;
grant execute on function public.record_rch_live_heartbeat(uuid,text) to anon,authenticated;

create or replace function public.get_rch_live_analytics()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare
  v_now timestamptz:=now();
  v_result jsonb;
begin
  if (select auth.uid()) is null
    or coalesce((select auth.jwt()->>'aal'),'')<>'aal2'
    or not exists (
      select 1 from public.profiles p
      where p.id=(select auth.uid())
        and p.role::text='admin' and p.is_active=true
    ) then
    raise exception 'Administrator MFA verification required' using errcode='42501';
  end if;

  select jsonb_build_object(
    'generated_at',v_now,
    'collection_since',(select min(last_seen_at) from public.rch_live_presence),
    'active_sessions',(select count(*) from public.rch_live_presence
      where last_seen_at>=v_now-interval '2 minutes'),
    'active_members',(select count(distinct member_id) from public.rch_live_presence
      where last_seen_at>=v_now-interval '2 minutes' and member_id is not null),
    'guest_sessions',(select count(*) from public.rch_live_presence
      where last_seen_at>=v_now-interval '2 minutes' and member_id is null),
    'seen_15_minutes',(select count(*) from public.rch_live_presence
      where last_seen_at>=v_now-interval '15 minutes'),
    'sections',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'section',section,'sessions',sessions,'members',members
      ) order by sessions desc),'[]'::jsonb)
      from (
        select section,count(*) sessions,count(distinct member_id) members
        from public.rch_live_presence
        where last_seen_at>=v_now-interval '2 minutes'
        group by section order by sessions desc limit 16
      ) s
    ),
    'traffic',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'bucket',series.bucket,'visits',coalesce(v.visits,0),
        'sessions',coalesce(v.sessions,0)
      ) order by series.bucket),'[]'::jsonb)
      from (
        select generate_series(
          date_bin('5 minutes',v_now,'2000-01-01'::timestamptz)-interval '55 minutes',
          date_bin('5 minutes',v_now,'2000-01-01'::timestamptz),
          interval '5 minutes'
        ) bucket
      ) series
      left join (
        select date_bin('5 minutes',first_seen_at,'2000-01-01'::timestamptz) bucket,
          count(*) visits,count(distinct session_id) sessions
        from public.rch_site_section_visits
        where first_seen_at>=v_now-interval '60 minutes'
        group by 1
      ) v using(bucket)
    ),
    'pulse',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'key',s.key,'label',s.label,
        'current',s.current_count,'previous',s.previous_count,
        'latest',s.latest_at
      ) order by s.sort_key),'[]'::jsonb)
      from (
        select 1 sort_key,'members'::text key,'New members'::text label,
          count(*) filter(where created_at>=v_now-interval '15 minutes') current_count,
          count(*) filter(where created_at<v_now-interval '15 minutes') previous_count,
          max(created_at) filter(where created_at>=v_now-interval '15 minutes') latest_at
        from public.profiles
        where created_at>=v_now-interval '30 minutes'
          and is_system_account is distinct from true
        union all
        select 2,'posts','Organic posts',
          count(*) filter(where created_at>=v_now-interval '15 minutes'),
          count(*) filter(where created_at<v_now-interval '15 minutes'),
          max(created_at) filter(where created_at>=v_now-interval '15 minutes')
        from public.posts
        where created_at>=v_now-interval '30 minutes'
          and is_automated is distinct from true and status::text='published'
        union all
        select 3,'reactions','Reactions',
          count(*) filter(where created_at>=v_now-interval '15 minutes'),
          count(*) filter(where created_at<v_now-interval '15 minutes'),
          max(created_at) filter(where created_at>=v_now-interval '15 minutes')
        from public.reactions where created_at>=v_now-interval '30 minutes'
        union all
        select 4,'comments','Comments',
          count(*) filter(where created_at>=v_now-interval '15 minutes'),
          count(*) filter(where created_at<v_now-interval '15 minutes'),
          max(created_at) filter(where created_at>=v_now-interval '15 minutes')
        from public.comments where created_at>=v_now-interval '30 minutes'
        union all
        select 5,'run_signups','Run joins',
          count(*) filter(where joined_at>=v_now-interval '15 minutes'),
          count(*) filter(where joined_at<v_now-interval '15 minutes'),
          max(joined_at) filter(where joined_at>=v_now-interval '15 minutes')
        from public.run_players where joined_at>=v_now-interval '30 minutes'
        union all
        select 6,'messages','Messages',
          count(*) filter(where created_at>=v_now-interval '15 minutes'),
          count(*) filter(where created_at<v_now-interval '15 minutes'),
          max(created_at) filter(where created_at>=v_now-interval '15 minutes')
        from public.messages
        where created_at>=v_now-interval '30 minutes' and deleted_at is null
      ) s
    )
  ) into v_result;

  return v_result;
end;
$$;
revoke all on function public.get_rch_live_analytics() from public,anon,authenticated;
grant execute on function public.get_rch_live_analytics() to authenticated;
comment on function public.get_rch_live_analytics() is
  'MFA-verified administrator-only, privacy-safe 30-second refresh live Command Center pulse with two-minute observable tab presence and 15-minute changes.';
commit;
-- Sitewide executive analytics: server-aggregated, administrator-only reports.
-- Traffic telemetry collects coarse screen categories and an ephemeral tab-session
-- token only. No IP, device fingerprint, search terms, precise position or raw URL.
begin;

create table if not exists public.rch_site_section_visits (
  session_id uuid not null,
  section text not null check (section in (
    'home','social','discover','runs','crews','commonwealth','league',
    'players','teams','media','news','communities','organizations',
    'shop','professional','other'
  )),
  bucket_at timestamptz not null,
  member_id uuid references public.profiles(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  primary key (session_id, section, bucket_at)
);
create index if not exists rch_site_section_visits_time_idx
  on public.rch_site_section_visits(bucket_at desc, section);
create index if not exists rch_site_section_visits_member_idx
  on public.rch_site_section_visits(member_id, bucket_at desc)
  where member_id is not null;
alter table public.rch_site_section_visits enable row level security;
revoke all on public.rch_site_section_visits from public, anon, authenticated;

create or replace function public.record_rch_site_visit(p_session_id uuid, p_section text)
returns void language plpgsql security definer set search_path=''
as $$
declare
  v_bucket timestamptz;
begin
  if p_session_id is null or p_section is null or p_section not in (
    'home','social','discover','runs','crews','commonwealth','league',
    'players','teams','media','news','communities','organizations',
    'shop','professional','other'
  ) then return; end if;
  v_bucket := date_trunc('hour',now())
    + (floor(extract(minute from now())/10)::integer * interval '10 minutes');
  -- 10-minute de-duplication avoids re-render inflation; per-tab cap reduces abuse.
  if (select count(*) from public.rch_site_section_visits
      where session_id=p_session_id and bucket_at>=now()-interval '1 day') >= 180 then
    return;
  end if;
  insert into public.rch_site_section_visits(session_id,section,bucket_at,member_id)
  values(p_session_id,p_section,v_bucket,(select auth.uid()))
  on conflict (session_id,section,bucket_at) do nothing;
end;
$$;
revoke all on function public.record_rch_site_visit(uuid,text) from public,anon,authenticated;
grant execute on function public.record_rch_site_visit(uuid,text) to anon,authenticated;

create or replace function public.get_rch_executive_analytics(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare
  v_start timestamptz;
  v_since date;
  v_result jsonb;
begin
  if p_days is null or p_days not in (7,30,90,365) then
    raise exception 'Period must be 7, 30, 90 or 365 days' using errcode='22023';
  end if;
  if (select auth.uid()) is null
    or coalesce((select auth.jwt()->>'aal'), '') <> 'aal2'
    or not exists (
      select 1 from public.profiles p
      where p.id=(select auth.uid()) and p.role::text='admin' and p.is_active=true
    ) then
    raise exception 'Administrator MFA verification required' using errcode='42501';
  end if;
  v_since := (now() at time zone 'UTC')::date - (p_days-1);
  v_start := v_since::timestamp at time zone 'UTC';

  select jsonb_build_object(
    'generated_at',now(),'days',p_days,
    'data_since',(select min(bucket_at) from public.rch_site_section_visits),
    'summary',jsonb_build_object(
      'members_total',(select count(*) from public.profiles where is_system_account is distinct from true),
      'new_members',(select count(*) from public.profiles where created_at>=v_start and is_system_account is distinct from true),
      'active_members_observed',(select count(distinct member_id) from public.rch_site_section_visits where bucket_at>=v_start and member_id is not null),
      'sessions_observed',(select count(distinct session_id) from public.rch_site_section_visits where bucket_at>=v_start),
      'section_visits',(select count(*) from public.rch_site_section_visits where bucket_at>=v_start),
      'content_views',(select count(*) from public.professional_post_views where viewed_at>=v_start),
      'published_posts',(select count(*) from public.posts where created_at>=v_start and status::text='published'),
      'organic_posts',(select count(*) from public.posts where created_at>=v_start and status::text='published' and is_automated is distinct from true),
      'reactions',(select count(*) from public.reactions where created_at>=v_start),
      'comments',(select count(*) from public.comments where created_at>=v_start),
      'reposts',(select count(*) from public.post_reposts where created_at>=v_start),
      'saves',(select count(*) from public.saved_posts where created_at>=v_start),
      'new_follows',(select count(*) from public.follows where created_at>=v_start),
      'messages_sent',(select count(*) from public.messages where created_at>=v_start and deleted_at is null),
      'new_friends',(select count(*) from public.friendships where created_at>=v_start and status='accepted'),
      'new_referrals',(select count(*) from public.referrals where created_at>=v_start),
      'qualified_referrals',(select count(*) from public.referrals where qualified_at>=v_start),
      'crews_created',(select count(*) from public.commonwealth_crews where created_at>=v_start),
      'runs_created',(select count(*) from public.runs where created_at>=v_start),
      'run_signups',(select count(*) from public.run_players where joined_at>=v_start),
      'run_checkins',(select count(*) from public.run_checkins where checked_in_at>=v_start),
      'ranked_games_verified',(select count(*) from public.run_ranked_matches where verified_at>=v_start),
      'crew_run_entries',(select count(*) from public.commonwealth_run_entries where created_at>=v_start),
      'games_scheduled',(select count(*) from public.games where created_at>=v_start),
      'player_registrations',(select count(*) from public.registrations where submitted_at>=v_start),
      'tryout_registrations',(select count(*) from public.tryout_registrations where created_at>=v_start),
      'organizations_added',(select count(*) from public.network_organizations where created_at>=v_start),
      'network_events_added',(select count(*) from public.network_events where created_at>=v_start),
      'news_published',(select count(*) from public.news where published_at>=v_start and status::text='published'),
      'community_joins',(select count(*) from public.community_members where joined_at>=v_start),
      'lab_sessions',(select count(*) from public.lab_sessions where created_at>=v_start),
      'paid_orders',(select count(*) from public.orders where created_at>=v_start and payment_status in ('paid','succeeded','completed')),
      'paid_order_cents',(select coalesce(sum(total),0) from public.orders where created_at>=v_start and payment_status in ('paid','succeeded','completed')),
      'active_subscriptions',(select count(*) from public.member_subscriptions where status in ('active','trialing')),
      'ledger_income',(select coalesce(sum(amount),0) from public.rcl_command_ledger where occurred_on>=v_since and direction='income' and state='reconciled'),
      'ledger_expenses',(select coalesce(sum(amount),0) from public.rcl_command_ledger where occurred_on>=v_since and direction='expense' and state='reconciled')
    ),
    'daily',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'day',d.report_day,'members',coalesce(m.c,0),
        'visits',coalesce(v.c,0),'sessions',coalesce(v.sessions,0),
        'posts',coalesce(p.c,0),'content_views',coalesce(w.c,0)
      ) order by d.report_day),'[]'::jsonb)
      from generate_series(v_since,(now() at time zone 'UTC')::date,interval '1 day') as d(report_day)
      left join (
        select (created_at at time zone 'UTC')::date as report_day,count(*) c
        from public.profiles where created_at>=v_start and is_system_account is distinct from true group by 1
      ) m on m.report_day=d.report_day::date
      left join (
        select (bucket_at at time zone 'UTC')::date as report_day,count(*) c,count(distinct session_id) sessions
        from public.rch_site_section_visits where bucket_at>=v_start group by 1
      ) v on v.report_day=d.report_day::date
      left join (
        select (created_at at time zone 'UTC')::date as report_day,count(*) c
        from public.posts where created_at>=v_start and status::text='published' group by 1
      ) p on p.report_day=d.report_day::date
      left join (
        select (viewed_at at time zone 'UTC')::date as report_day,count(*) c
        from public.professional_post_views where viewed_at>=v_start group by 1
      ) w on w.report_day=d.report_day::date
    ),
    'sections',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'section',section,'visits',visits,'sessions',sessions,'members',members
      ) order by visits desc),'[]'::jsonb)
      from (
        select section,count(*) visits,count(distinct session_id) sessions,
          count(distinct member_id) members
        from public.rch_site_section_visits
        where bucket_at>=v_start group by section order by visits desc limit 16
      ) s
    ),
    'membership_growth',(
      select coalesce(jsonb_agg(jsonb_build_object('role',role,'members',members) order by members desc),'[]'::jsonb)
      from (select role::text role,count(*) members from public.profiles
        where is_system_account is distinct from true and is_active is distinct from false
        group by role order by members desc limit 12) roles
    ),
    'top_content',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',id,'preview',preview,'views',views,'reactions',reactions,'comments',comments
      ) order by views desc,reactions desc),'[]'::jsonb)
      from (
        select p.id,left(coalesce(p.body,''),110) preview,
          count(distinct (pv.viewer_id,pv.view_day)) views,
          (select count(*) from public.reactions r where r.post_id=p.id and r.created_at>=v_start) reactions,
          (select count(*) from public.comments c where c.post_id=p.id and c.created_at>=v_start) comments
        from public.posts p
        join public.professional_post_views pv on pv.post_id=p.id and pv.viewed_at>=v_start
        where p.status::text='published'
        group by p.id,p.body
        order by views desc limit 10
      ) x
    )
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_rch_executive_analytics(integer) from public,anon,authenticated;
grant execute on function public.get_rch_executive_analytics(integer) to authenticated;
comment on function public.get_rch_executive_analytics(integer) is
  'Aggregated, MFA-protected RCH Command Center sitewide business, community and observable traffic analytics. No individual visitor records.';
commit;
begin;

-- Cosmetic preferences only. Clients cannot write earned status or balances.
create table public.rch_world_loadouts (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 banner text,
 reward_goal text references public.rch_rep_rewards(code) on delete set null,
 updated_at timestamptz not null default now()
);
alter table public.rch_world_loadouts enable row level security;
revoke all on public.rch_world_loadouts from public,anon,authenticated;
grant select on public.rch_world_loadouts to authenticated;
create policy world_loadout_owner on public.rch_world_loadouts for select to authenticated
 using(profile_id=(select auth.uid()));

create function public.set_rch_world_loadout(p_banner text,p_reward text)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();j jsonb;
begin
 if u is null then raise exception 'Sign in to customize your player'; end if;
 j:=public.get_rch_world_journey();
 if p_banner is not null and (p_banner not in ('first_battle','first_win','five_verified_games','three_arenas','ten_verified_wins','crown_defender')
   or not coalesce((j->'milestones'->>p_banner)::boolean,false)) then
   raise exception 'Earn this milestone before equipping its banner';
 end if;
 if p_reward is not null and not exists(select 1 from public.rch_rep_rewards where code=p_reward and available) then
   raise exception 'This reward is not currently available';
 end if;
 insert into public.rch_world_loadouts(profile_id,banner,reward_goal) values(u,p_banner,p_reward)
 on conflict(profile_id) do update set banner=excluded.banner,reward_goal=excluded.reward_goal,updated_at=now();
end $$;
revoke all on function public.set_rch_world_loadout(text,text) from public,anon,authenticated;
grant execute on function public.set_rch_world_loadout(text,text) to authenticated;

create function public.get_rch_world_expansion()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();w timestamptz;w_end timestamptz;receipts jsonb;arenas jsonb;mates int;courts int;crew_games int;loadout jsonb;j jsonb;
begin
 if u is null then raise exception 'Sign in to view your journey'; end if;
 w:=date_trunc('week',now() at time zone 'America/New_York') at time zone 'America/New_York';
 w_end:=(date_trunc('week',now() at time zone 'America/New_York')+interval '7 days') at time zone 'America/New_York';
 j:=public.get_rch_world_journey();
 -- Stable ordering attributes the one-time court XP to exactly one verified match.
 with history as (
 select m.*,p.side,r.location_slug,l.name court_name,
   row_number() over(partition by r.location_slug order by m.verified_at,m.id) court_visit,
   ((p.side='home' and m.home_score>m.away_score) or (p.side='away' and m.away_score>m.home_score)) won
 from public.run_ranked_matches m
 join public.run_ranked_match_players p on p.match_id=m.id and p.profile_id=u
 join public.runs r on r.id=m.run_id
 left join public.basketball_locations l on l.slug=r.location_slug
 where m.status='verified' and m.verified_at is not null
 ), recent as (select * from history order by verified_at desc,id desc limit 10)
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',m.id,'run_id',m.run_id,'court_slug',m.location_slug,'court_name',m.court_name,
 'verified_at',m.verified_at,'game_format',m.game_format,'won',m.won,
 'xp',120+case when m.won then 60 else 0 end+case when m.location_slug is not null and m.court_visit=1 then 25 else 0 end,
 'first_court',m.location_slug is not null and m.court_visit=1,
 'rep',coalesce((select sum(t.amount) from public.rch_rep_transactions t where t.profile_id=u and t.kind='earn'
   and t.source_key like 'run:'||m.id::text||':'||u::text||':%'),0),
 'badges',coalesce((select jsonb_agg(b.badge_code) from public.rch_run_badge_awards b where b.profile_id=u and b.earned_from_match_id=m.id),'[]'::jsonb),
 'territory', (select c.name from public.rch_court_takeovers t join public.commonwealth_crews c on c.id=t.winning_crew_id where t.resolved_match_id=m.id and t.status='resolved'),
 'crown', (select h.event_type from public.rch_court_master_history h where h.match_id=m.id and h.winner_id=u)
 ) order by m.verified_at desc,m.id desc),'[]'::jsonb) into receipts from recent m;

 select count(distinct r.location_slug)::int into courts
 from public.run_ranked_matches m join public.run_ranked_match_players p on p.match_id=m.id and p.profile_id=u
 join public.runs r on r.id=m.run_id where m.status='verified' and m.verified_at>=w and m.verified_at<w_end;
 select count(distinct teammate.profile_id)::int into mates
 from public.run_ranked_match_players p join public.run_ranked_matches m on m.id=p.match_id
 join public.run_ranked_match_players teammate on teammate.match_id=p.match_id and teammate.side=p.side and teammate.profile_id<>u
 where p.profile_id=u and m.status='verified' and m.verified_at>=w and m.verified_at<w_end;
 -- Crew mission uses actual resolved crew battles the player participated in.
 select count(distinct m.id)::int into crew_games
 from public.run_ranked_matches m join public.run_ranked_match_players p on p.match_id=m.id and p.profile_id=u
 join public.rch_court_takeovers t on t.resolved_match_id=m.id and t.status='resolved'
 where m.status='verified' and m.verified_at>=w and m.verified_at<w_end;
 select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) into arenas from (
 select r.location_slug court_slug,max(l.name) court_name,count(*) games,
 count(*) filter(where (p.side='home' and m.home_score>m.away_score) or (p.side='away' and m.away_score>m.home_score)) wins
 from public.run_ranked_matches m join public.run_ranked_match_players p on p.match_id=m.id and p.profile_id=u
 join public.runs r on r.id=m.run_id join public.basketball_locations l on l.slug=r.location_slug
 where m.status='verified' and m.verified_at is not null group by r.location_slug order by max(m.verified_at) desc limit 50
 ) a;
 select jsonb_build_object('banner',case when coalesce((j->'milestones'->>l.banner)::boolean,false) then l.banner end,'reward_goal',l.reward_goal)
 into loadout from public.rch_world_loadouts l where profile_id=u;
 return jsonb_build_object('receipts',receipts,'arenas',arenas,'weekly_courts',courts,'weekly_teammates',mates,'weekly_crew_games',crew_games,
 'loadout',coalesce(loadout,'{}'::jsonb),'wallet',coalesce((select balance from public.rch_rep_wallets where profile_id=u),0),
 'rewards',coalesce((select jsonb_agg(jsonb_build_object('code',code,'title',title,'price',price,'delivery',delivery) order by price,code) from public.rch_rep_rewards where available),'[]'::jsonb));
end $$;
revoke all on function public.get_rch_world_expansion() from public,anon,authenticated;
grant execute on function public.get_rch_world_expansion() to authenticated;
commit;

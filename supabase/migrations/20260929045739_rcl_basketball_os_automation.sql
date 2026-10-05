begin;

create or replace view public.teammate_history with (security_invoker=true) as
select distinct
  p1.profile_id as profile_id,
  p2.profile_id as teammate_profile_id,
  p1.id as player_id,
  p2.id as teammate_player_id,
  ts.team_id,
  ts.season_id,
  t.name as team_name,
  s.name as season_name
from public.rosters r1
join public.rosters r2 on r2.team_season_id=r1.team_season_id and r2.player_id<>r1.player_id
join public.players p1 on p1.id=r1.player_id
join public.players p2 on p2.id=r2.player_id
join public.team_seasons ts on ts.id=r1.team_season_id
join public.teams t on t.id=ts.team_id
join public.seasons s on s.id=ts.season_id
where p1.profile_id is not null and p2.profile_id is not null;

grant select on public.teammate_history to authenticated;

create or replace function public.capture_completed_season_reputation()
returns trigger language plpgsql security definer set search_path=public as $$
declare season_start timestamptz; season_end timestamptz;
begin
  if new.status::text <> 'completed' or old.status::text='completed' then return new; end if;
  season_start := new.start_date::timestamptz;
  season_end := (coalesce(new.end_date,new.start_date) + 1)::timestamptz;
  delete from public.season_reputation_snapshots where season_id=new.id;
  insert into public.season_reputation_snapshots(season_id,profile_id,total_xp,level,hooper_xp,community_xp,creator_xp,coach_xp,reliability_xp,final_rank,captured_at)
  select new.id, ranked.profile_id, ranked.total_xp, public.level_for_xp(ranked.total_xp), ranked.hooper_xp,ranked.community_xp,ranked.creator_xp,ranked.coach_xp,ranked.reliability_xp,
         dense_rank() over(order by ranked.total_xp desc,ranked.profile_id)::integer,now()
  from (
    select p.id as profile_id,
      coalesce(sum(x.amount),0)::integer as total_xp,
      coalesce(sum(x.amount) filter(where x.rep_dimension='hooper'),0)::integer as hooper_xp,
      coalesce(sum(x.amount) filter(where x.rep_dimension='community'),0)::integer as community_xp,
      coalesce(sum(x.amount) filter(where x.rep_dimension='creator'),0)::integer as creator_xp,
      coalesce(sum(x.amount) filter(where x.rep_dimension='coach'),0)::integer as coach_xp,
      coalesce(sum(x.amount) filter(where x.rep_dimension='reliability'),0)::integer as reliability_xp
    from public.profiles p
    join public.xp_transactions x on x.profile_id=p.id and x.created_at>=season_start and x.created_at<season_end
    group by p.id
  ) ranked where ranked.total_xp>0;
  return new;
end $$;

drop trigger if exists capture_season_reputation_on_complete on public.seasons;
create trigger capture_season_reputation_on_complete after update of status on public.seasons for each row execute function public.capture_completed_season_reputation();

create or replace function public.issue_special_player_cards()
returns trigger language plpgsql security definer set search_path=public as $$
declare stat record; base_rating integer; double_count integer; edition_name text; card_title text;
begin
  if new.status::text <> 'completed' or old.status::text='completed' then return new; end if;
  for stat in select * from public.player_game_stats where game_id=new.id loop
    select least(99,greatest(0,round(coalesce(iq.rcl_rating,50))))::integer into base_rating from public.players p left join public.player_iq_profiles iq on iq.player_id=p.id where p.id=stat.player_id;
    base_rating := coalesce(base_rating,50);
    double_count := (case when stat.points>=10 then 1 else 0 end)+(case when stat.rebounds>=10 then 1 else 0 end)+(case when stat.assists>=10 then 1 else 0 end)+(case when stat.steals>=10 then 1 else 0 end)+(case when stat.blocks>=10 then 1 else 0 end);
    if stat.points>=40 then
      edition_name := '40-point-'||new.id::text; card_title := '40 Point Club';
      insert into public.player_cards(player_id,season_id,edition,title,overall_rating,card_payload)
      values(stat.player_id,new.season_id,edition_name,card_title,least(99,base_rating+5),jsonb_build_object('game_id',new.id,'points',stat.points,'rebounds',stat.rebounds,'assists',stat.assists,'steals',stat.steals,'blocks',stat.blocks))
      on conflict(player_id,season_id,edition) do update set overall_rating=excluded.overall_rating,card_payload=excluded.card_payload;
    end if;
    if double_count>=3 then
      edition_name := 'triple-double-'||new.id::text; card_title := 'Triple-Double';
      insert into public.player_cards(player_id,season_id,edition,title,overall_rating,card_payload)
      values(stat.player_id,new.season_id,edition_name,card_title,least(99,base_rating+6),jsonb_build_object('game_id',new.id,'points',stat.points,'rebounds',stat.rebounds,'assists',stat.assists,'steals',stat.steals,'blocks',stat.blocks))
      on conflict(player_id,season_id,edition) do update set overall_rating=excluded.overall_rating,card_payload=excluded.card_payload;
    elsif double_count=2 then
      edition_name := 'double-double-'||new.id::text; card_title := 'Double-Double';
      insert into public.player_cards(player_id,season_id,edition,title,overall_rating,card_payload)
      values(stat.player_id,new.season_id,edition_name,card_title,least(99,base_rating+3),jsonb_build_object('game_id',new.id,'points',stat.points,'rebounds',stat.rebounds,'assists',stat.assists,'steals',stat.steals,'blocks',stat.blocks))
      on conflict(player_id,season_id,edition) do update set overall_rating=excluded.overall_rating,card_payload=excluded.card_payload;
    end if;
    if stat.plus_minus>=15 and stat.points>=25 then
      edition_name := 'game-breaker-'||new.id::text; card_title := 'Game Breaker';
      insert into public.player_cards(player_id,season_id,edition,title,overall_rating,card_payload)
      values(stat.player_id,new.season_id,edition_name,card_title,least(99,base_rating+4),jsonb_build_object('game_id',new.id,'points',stat.points,'plus_minus',stat.plus_minus))
      on conflict(player_id,season_id,edition) do update set overall_rating=excluded.overall_rating,card_payload=excluded.card_payload;
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists issue_special_player_cards_on_game_complete on public.games;
create trigger issue_special_player_cards_on_game_complete after update of status on public.games for each row execute function public.issue_special_player_cards();

create or replace function public.create_game_story_draft()
returns trigger language plpgsql security definer set search_path=public as $$
declare home_name text; away_name text; winner_name text; loser_name text; winner_score integer; loser_score integer; leader record; leader_name text; leader_copy text;
begin
  if new.status::text <> 'completed' or old.status::text='completed' then return new; end if;
  select name into home_name from public.teams where id=new.home_team_id; select name into away_name from public.teams where id=new.away_team_id;
  if new.home_score >= new.away_score then winner_name:=home_name; loser_name:=away_name; winner_score:=new.home_score; loser_score:=new.away_score; else winner_name:=away_name; loser_name:=home_name; winner_score:=new.away_score; loser_score:=new.home_score; end if;
  select s.*,p.first_name,p.last_name into leader from public.player_game_stats s join public.players p on p.id=s.player_id where s.game_id=new.id order by s.points desc,s.assists desc,s.rebounds desc limit 1;
  if found then leader_name:=trim(coalesce(leader.first_name,'')||' '||coalesce(leader.last_name,'')); leader_copy:=leader_name||' led the game with '||leader.points||' points, '||leader.rebounds||' rebounds and '||leader.assists||' assists.'; else leader_copy:='Official player leaders can be added when the scorebook is finalized.'; end if;
  insert into public.game_story_drafts(game_id,headline,summary,story_body,metadata)
  values(new.id,winner_name||' defeats '||loser_name||', '||winner_score||'–'||loser_score,winner_name||' earned an official Rich City League win over '||loser_name||' by a final score of '||winner_score||'–'||loser_score||'. '||leader_copy,'Final: '||winner_name||' '||winner_score||', '||loser_name||' '||loser_score||'. '||leader_copy||' RCL staff can add the turning point, quotes and additional context before publication.',jsonb_build_object('home_score',new.home_score,'away_score',new.away_score,'leader_player_id',leader.player_id,'generated_from','official_scorebook'))
  on conflict (game_id) do update set headline=excluded.headline,summary=excluded.summary,story_body=excluded.story_body,metadata=excluded.metadata,updated_at=now() where public.game_story_drafts.status='draft';
  return new;
end $$;

revoke execute on function public.capture_completed_season_reputation() from public,anon,authenticated;
revoke execute on function public.issue_special_player_cards() from public,anon,authenticated;

commit;
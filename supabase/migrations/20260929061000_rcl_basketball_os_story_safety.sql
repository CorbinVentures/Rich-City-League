begin;
create or replace function public.create_game_story_draft()
returns trigger language plpgsql security definer set search_path=public as $$
declare home_name text; away_name text; winner_name text; loser_name text; winner_score integer; loser_score integer; leader record; leader_id uuid; leader_name text; leader_copy text;
begin
  if new.status::text <> 'completed' or old.status::text='completed' then return new; end if;
  select name into home_name from public.teams where id=new.home_team_id;
  select name into away_name from public.teams where id=new.away_team_id;
  if new.home_score >= new.away_score then winner_name:=home_name; loser_name:=away_name; winner_score:=new.home_score; loser_score:=new.away_score; else winner_name:=away_name; loser_name:=home_name; winner_score:=new.away_score; loser_score:=new.home_score; end if;
  select s.*,p.first_name,p.last_name into leader from public.player_game_stats s join public.players p on p.id=s.player_id where s.game_id=new.id order by s.points desc,s.assists desc,s.rebounds desc limit 1;
  if found then leader_id:=leader.player_id; leader_name:=trim(coalesce(leader.first_name,'')||' '||coalesce(leader.last_name,'')); leader_copy:=leader_name||' led the game with '||leader.points||' points, '||leader.rebounds||' rebounds and '||leader.assists||' assists.'; else leader_id:=null; leader_copy:='Official player leaders can be added when the scorebook is finalized.'; end if;
  insert into public.game_story_drafts(game_id,headline,summary,story_body,metadata)
  values(new.id,winner_name||' defeats '||loser_name||', '||winner_score||'–'||loser_score,winner_name||' earned an official Rich City League win over '||loser_name||' by a final score of '||winner_score||'–'||loser_score||'. '||leader_copy,'Final: '||winner_name||' '||winner_score||', '||loser_name||' '||loser_score||'. '||leader_copy||' RCL staff can add the turning point, quotes and additional context before publication.',jsonb_build_object('home_score',new.home_score,'away_score',new.away_score,'leader_player_id',leader_id,'generated_from','official_scorebook'))
  on conflict (game_id) do update set headline=excluded.headline,summary=excluded.summary,story_body=excluded.story_body,metadata=excluded.metadata,updated_at=now() where public.game_story_drafts.status='draft';
  return new;
end $$;
commit;

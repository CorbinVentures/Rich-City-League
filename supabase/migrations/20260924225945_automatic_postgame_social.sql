begin;

-- Completed Game IQ scorebooks become transparent official social events.
-- This trigger runs after the game row is finalized, when rebuilt player stats
-- and final scores already exist. It no-ops until @RCLGameDay is configured.
create or replace function public.announce_completed_game()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  bot_id uuid;
  home_name text;
  away_name text;
  winner_name text;
  top_name text;
  top_points integer;
  top_rebounds integer;
  top_assists integer;
  post_body text;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;

  select id into bot_id
  from public.profiles
  where is_system_account=true and system_account_key='rcl-gameday' and is_active=true
  limit 1;
  if bot_id is null then return new; end if;

  select name into home_name from public.teams where id=new.home_team_id;
  select name into away_name from public.teams where id=new.away_team_id;
  if home_name is null or away_name is null then return new; end if;

  winner_name := case
    when new.home_score > new.away_score then home_name
    when new.away_score > new.home_score then away_name
    else null
  end;

  select coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),'RCL Player'),
         pgs.points,pgs.rebounds,pgs.assists
  into top_name,top_points,top_rebounds,top_assists
  from public.player_game_stats pgs
  left join public.public_players p on p.id=pgs.player_id
  where pgs.game_id=new.id
  order by pgs.points desc,pgs.assists desc,pgs.rebounds desc,pgs.player_id
  limit 1;

  post_body := '🏀 FINAL\n\n'||away_name||' '||new.away_score||' — '||home_name||' '||new.home_score;
  if winner_name is not null then
    post_body := post_body||'\n\n'||winner_name||' gets the win.';
  else
    post_body := post_body||'\n\nGame ends tied.';
  end if;
  if top_name is not null then
    post_body := post_body||'\n\n🔥 Top performer: '||top_name||' — '||
      coalesce(top_points,0)||' PTS · '||coalesce(top_rebounds,0)||' REB · '||coalesce(top_assists,0)||' AST';
  end if;
  post_body := post_body||'\n\nOfficial stats: /games/'||new.id||'\n\n#RCLGameDay #RichCityLeague';

  insert into public.posts(author_id,body,media_urls,status,is_automated,automation_type,automation_source_id)
  values(bot_id,post_body,'[]'::jsonb,'published',true,'game_final',new.id)
  on conflict (automation_type,automation_source_id)
    where is_automated=true and automation_type is not null and automation_source_id is not null
  do update set body=excluded.body;

  return new;
end
$$;

drop trigger if exists announce_completed_game_after_update on public.games;
create trigger announce_completed_game_after_update
after update of status on public.games
for each row
when (new.status='completed' and old.status is distinct from new.status)
execute function public.announce_completed_game();

revoke execute on function public.announce_completed_game() from public,anon,authenticated;

commit;

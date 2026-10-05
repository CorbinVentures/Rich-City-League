begin;

create or replace function public.validate_pickem_selection()
returns trigger language plpgsql set search_path=public as $$
declare target_game public.games%rowtype;
begin
  select * into target_game from public.games where id=new.game_id;
  if not found then raise exception 'Game not found'; end if;
  if target_game.status::text <> 'scheduled' or target_game.scheduled_at <= now() then
    raise exception 'Picks are locked for this game';
  end if;
  if new.selected_team_id not in (target_game.home_team_id,target_game.away_team_id) then
    raise exception 'Selected team is not playing in this game';
  end if;
  return new;
end $$;

drop trigger if exists validate_pickem_selection_before_write on public.pickem_picks;
create trigger validate_pickem_selection_before_write
before insert or update of selected_team_id,predicted_home_score,predicted_away_score on public.pickem_picks
for each row execute function public.validate_pickem_selection();

create or replace function public.score_pickem_game()
returns trigger language plpgsql security definer set search_path=public as $$
declare pick_row record; winning_team uuid; earned integer; already_awarded boolean;
begin
  if new.status::text <> 'completed' or old.status::text='completed' then return new; end if;
  if new.home_score = new.away_score then return new; end if;
  winning_team := case when new.home_score > new.away_score then new.home_team_id else new.away_team_id end;

  for pick_row in select * from public.pickem_picks where game_id=new.id for update loop
    earned := 0;
    if pick_row.selected_team_id=winning_team then earned := earned + 20; end if;
    if pick_row.predicted_home_score is not null and pick_row.predicted_away_score is not null then
      if (pick_row.predicted_home_score-pick_row.predicted_away_score)=(new.home_score-new.away_score) then earned := earned + 10; end if;
      if pick_row.predicted_home_score=new.home_score and pick_row.predicted_away_score=new.away_score then earned := earned + 15; end if;
    end if;

    update public.pickem_picks set points_earned=earned,scored_at=now(),updated_at=now() where id=pick_row.id;

    if earned > 0 then
      select exists(select 1 from public.xp_transactions where profile_id=pick_row.profile_id and source_type='pickem_score' and source_id=pick_row.id) into already_awarded;
      if not already_awarded then
        insert into public.user_levels(profile_id) values(pick_row.profile_id) on conflict do nothing;
        insert into public.xp_transactions(profile_id,amount,reason,source_type,source_id,rep_dimension)
        values(pick_row.profile_id,earned,'pickem_result','pickem_score',pick_row.id,'community');
        update public.user_levels set xp=xp+earned,level=public.level_for_xp(xp+earned),updated_at=now() where profile_id=pick_row.profile_id;
        insert into public.notifications(recipient_id,type,title,body,link)
        values(pick_row.profile_id,'rep_milestone','Pick’em result',
          '+'||earned||' REP from your '||coalesce((select t.name from public.teams t where t.id=pick_row.selected_team_id),'RCL')||' pick.',
          '/pickem');
      end if;
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists score_pickem_on_game_complete on public.games;
create trigger score_pickem_on_game_complete after update of status on public.games
for each row execute function public.score_pickem_game();

revoke execute on function public.validate_pickem_selection() from public,anon,authenticated;
revoke execute on function public.score_pickem_game() from public,anon,authenticated;

commit;
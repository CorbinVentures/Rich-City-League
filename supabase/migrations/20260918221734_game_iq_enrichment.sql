-- RCL GAME IQ v1.1: enrich deterministic projections with explicit defensive/assist events.
create or replace function public.enrich_player_game_stat()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.player_game_stats p
  set assists = p.assists + coalesce((select count(*) from public.game_events e where e.game_id=new.game_id and e.player_id=new.player_id and e.event_type='assist' and e.voided_at is null),0),
      steals = p.steals + coalesce((select count(*) from public.game_events e where e.game_id=new.game_id and e.player_id=new.player_id and e.event_type='turnover' and e.voided_at is null and coalesce((e.metadata->>'steal')::boolean,false)),0),
      blocks = p.blocks + coalesce((select count(*) from public.game_events e where e.game_id=new.game_id and e.player_id=new.player_id and e.event_type='shot_missed' and e.voided_at is null and coalesce((e.metadata->>'blocked')::boolean,false)),0)
  where p.id=new.id;
  return new;
end;
$$;

drop trigger if exists enrich_player_game_stat on public.player_game_stats;
create trigger enrich_player_game_stat
after insert on public.player_game_stats
for each row execute procedure public.enrich_player_game_stat();

create or replace function public.finalize_game_scorebook(target_game_id uuid)
returns public.games
language plpgsql security definer set search_path = ''
as $$
declare result public.games;
begin
  if not public.can_manage_game(target_game_id) then raise exception 'You are not authorized to finalize this game'; end if;
  perform public.rebuild_game_stats(target_game_id);
  update public.games
  set status='completed',
      scorebook_status='final',
      updated_at=now()
  where id=target_game_id
  returning * into result;
  return result;
end;
$$;
revoke execute on function public.finalize_game_scorebook(uuid) from public, anon;
grant execute on function public.finalize_game_scorebook(uuid) to authenticated;

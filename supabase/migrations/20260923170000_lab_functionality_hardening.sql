-- Repair Lab proof identity mapping and make progression server authoritative.
create or replace function public.refresh_lab_proof(target_profile uuid)
returns void language plpgsql security definer set search_path=public as $$
declare shooting numeric; games integer; target_player uuid; baseline integer;
begin
 if auth.uid() is distinct from target_profile then raise exception 'not authorized'; end if;
 select id into target_player from public.players where profile_id=target_profile and is_active=true order by created_at desc limit 1;
 if target_player is null then return; end if;
 select score into baseline from public.lab_assessments where profile_id=target_profile and category='scoring' order by assessed_at desc limit 1;
 select avg(case when field_goals_attempted>0 then field_goals_made::numeric/field_goals_attempted*100 end),count(*) into shooting,games from public.player_game_stats where player_id=target_player;
 if games>0 then insert into public.lab_proof_snapshots(profile_id,category,lab_score,game_metric,game_value,games_sampled) values(target_profile,'scoring',baseline,'FG%',round(shooting,1),games); end if;
end $$;
create or replace function public.complete_lab_session(target_session uuid)
returns public.lab_sessions language plpgsql security definer set search_path=public as $$
declare s public.lab_sessions; e public.lab_program_enrollments; done integer;
begin
 select * into s from public.lab_sessions where id=target_session and profile_id=auth.uid() for update;
 if s.id is null then raise exception 'session not found'; end if;
 if s.status='completed' then return s; end if;
 update public.lab_sessions set status='completed',completed_at=now() where id=s.id returning * into s;
 select * into e from public.lab_program_enrollments where profile_id=auth.uid() and status='active' order by started_at desc limit 1 for update;
 if e.id is not null then done:=least(e.total_sessions,e.completed_sessions+1); update public.lab_program_enrollments set completed_sessions=done,status=case when done>=e.total_sessions then 'completed' else 'active' end,completed_at=case when done>=e.total_sessions then now() else null end where id=e.id; end if;
 return s;
end $$;
grant execute on function public.complete_lab_session(uuid) to authenticated;

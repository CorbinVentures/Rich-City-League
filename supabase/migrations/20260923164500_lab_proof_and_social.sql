-- Safe Lab proof and Social sharing.
create or replace function public.refresh_lab_proof(target_profile uuid)
returns void language plpgsql security definer set search_path=public as $$
declare shooting numeric; games integer;
begin
 if auth.uid() is distinct from target_profile then raise exception 'not authorized'; end if;
 select avg(case when fga>0 then fgm::numeric/fga*100 end),count(*) into shooting,games from public.player_game_stats where player_id=target_profile;
 if games>0 then
  insert into public.lab_proof_snapshots(profile_id,category,lab_score,game_metric,game_value,games_sampled)
  select target_profile,'scoring',(select score from public.lab_assessments where profile_id=target_profile and category='scoring' order by assessed_at desc limit 1),'FG%',round(shooting,1),games;
 end if;
end $$;
grant execute on function public.refresh_lab_proof(uuid) to authenticated;
create or replace function public.share_lab_achievement(achievement_title text, achievement_body text)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 if char_length(trim(achievement_title))<1 or char_length(achievement_title)>120 or char_length(achievement_body)>1000 then raise exception 'invalid achievement'; end if;
 insert into public.posts(author_id,body,status) values(auth.uid(),'🧪 '||trim(achievement_title)||E'\n'||trim(achievement_body),'published') returning id into new_id;
 return new_id;
end $$;
grant execute on function public.share_lab_achievement(text,text) to authenticated;

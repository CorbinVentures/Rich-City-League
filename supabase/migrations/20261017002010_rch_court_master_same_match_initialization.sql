begin;
-- VOLATILE evaluation is required inside an AFTER UPDATE trigger to observe
-- the match that just became verified during the current statement. A STABLE
-- leaderboard function would read the earlier command snapshot instead.
create or replace function public.rch_eligible_court_master(p_court text,p_division text)
returns uuid language sql volatile security definer set search_path='' as $$
 with games as (
   select mp.profile_id,m.run_id,
     case when mp.side='home' then m.home_score>m.away_score
          else m.away_score>m.home_score end as won
   from public.run_ranked_match_players mp
   join public.run_ranked_matches m on m.id=mp.match_id
   join public.runs r on r.id=m.run_id
   where m.status='verified' and m.game_format=p_division
     and r.location_slug=p_court and r.run_type='competitive'
     and r.status<>'cancelled'
 ), contender as (
   select g.profile_id,count(*) as played,
     count(*) filter(where g.won) as victories,
     count(distinct g.run_id) as sessions
   from games g group by g.profile_id
 )
 select p.id from contender c join public.profiles p on p.id=c.profile_id
 where c.played>=3 and c.sessions>=2 and p.is_active
   and not coalesce(p.is_system_account,false)
   and coalesce(p.profile_visibility,'public') not in ('private','only_me')
 order by c.victories::numeric/nullif(c.played,0) desc,
   c.victories desc,c.played desc,p.id
 limit 1
$$;

create or replace function public.rch_record_court_master_result()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_court text;v_initial uuid;v_holder uuid;
 c public.rch_court_master_challenges%rowtype;v_winner uuid;
begin
 if new.status<>'verified' or old.status='verified' or new.game_format not in ('1v1','2v2','3v3')
 then return new; end if;
 select r.location_slug into v_court from public.runs r where r.id=new.run_id;
 if v_court is null then return new; end if;
 -- A court crown is first established only by historical verified on-court results.
 select public.rch_eligible_court_master(v_court,new.game_format) into v_initial;
 if v_initial is not null then
  insert into public.rch_court_master_titles(court_slug,division,holder_id,awarded_by_match)
   values(v_court,new.game_format,v_initial,new.id) on conflict do nothing;
 end if;
 select * into c from public.rch_court_master_challenges x where x.run_id=new.run_id
   and x.court_slug=v_court and x.division=new.game_format and x.status='accepted'
   and x.accepted_at<=new.submitted_at
   and ((x.challenger_id=any(new.home_roster) and x.defender_id=any(new.away_roster))
     or (x.challenger_id=any(new.away_roster) and x.defender_id=any(new.home_roster)))
   order by x.requested_at limit 1 for update;
 if c.id is null then return new; end if;
 select t.holder_id into v_holder from public.rch_court_master_titles t
  where t.court_slug=v_court and t.division=new.game_format for update;
 if v_holder is distinct from c.defender_id then raise exception 'Title changed before this duel'; end if;
 v_winner:=case
  when new.home_score>new.away_score then
    case when c.challenger_id=any(new.home_roster) then c.challenger_id else c.defender_id end
  else
    case when c.challenger_id=any(new.away_roster) then c.challenger_id else c.defender_id end
 end;
 update public.rch_court_master_titles set
   holder_id=v_winner,
   since_at=case when v_winner=v_holder then since_at else now() end,
   last_defended_at=case when v_winner=v_holder then now() else null end,
   defenses=case when v_winner=v_holder then defenses+1 else 0 end,
   awarded_by_match=new.id
 where court_slug=v_court and division=new.game_format;
 update public.rch_court_master_challenges set status='resolved',winner_id=v_winner,
   resolved_match_id=new.id,resolved_at=now() where id=c.id;
 insert into public.rch_court_master_history
   (court_slug,division,match_id,former_holder_id,winner_id,event_type)
 values(v_court,new.game_format,new.id,v_holder,v_winner,
   case when v_winner=v_holder then 'title_defense' else 'title_takeover' end);
 return new;
end $$;

revoke all on function public.rch_eligible_court_master(text,text)
 from public,anon,authenticated;
-- The helper is privileged and usable only from the verified-match trigger.
commit;
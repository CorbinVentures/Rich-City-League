'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaCalendarDays,FaRankingStar} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import type {Game,Standing,Team} from '@/types/database';

type LeagueGame=Pick<Game,'id'|'home_team_id'|'away_team_id'|'scheduled_at'|'status'|'home_score'|'away_score'>;
type LeagueStanding=Pick<Standing,'team_id'|'wins'|'losses'|'rank'>;
type LeagueTeam=Pick<Team,'id'|'name'|'slug'>;
type Snapshot={games:LeagueGame[];standings:LeagueStanding[];teams:LeagueTeam[];seasonName:string};

export function LeaguePublicHub(){
 const db=useMemo(()=>getSupabaseClient(),[]);
 const [state,setState]=useState<Snapshot>({games:[],standings:[],teams:[],seasonName:''});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState(false);
 useEffect(()=>{
  let active=true;
  async function load(){
   if(!db){if(active){setLoading(false);setError(true);}return;}
   try{
    const league=await db.from('leagues').select('id').eq('slug','rich-city-league').eq('is_active',true).maybeSingle();
    if(league.error)throw league.error;
    if(!league.data){if(active)setLoading(false);return;}
    const [seasons,teamResult]=await Promise.all([
      db.from('seasons').select('id,name,status').eq('league_id',league.data.id).in('status',['active','registration','completed']).order('start_date',{ascending:false}).limit(5),
      db.from('teams').select('id,name,slug').eq('league_id',league.data.id).eq('is_active',true).order('name').limit(32),
    ]);
    if(seasons.error||teamResult.error)throw new Error('Unable to retrieve public league schedule');
    const latest=(seasons.data??[]).find(s=>s.status==='active')??(seasons.data??[]).find(s=>s.status==='registration')??seasons.data?.[0];
    const [games,standings]=latest?await Promise.all([
      db.from('games').select('id,home_team_id,away_team_id,scheduled_at,status,home_score,away_score').eq('season_id',latest.id).order('scheduled_at',{ascending:false}).limit(80),
      db.from('standings').select('team_id,wins,losses,rank').eq('season_id',latest.id).order('rank',{ascending:true}).limit(12),
    ]):[{data:[] as LeagueGame[],error:null},{data:[] as LeagueStanding[],error:null}];
    if(games.error||standings.error)throw new Error('Unable to retrieve public league results');
    if(active)setState({games:(games.data??[]) as LeagueGame[],standings:(standings.data??[]) as LeagueStanding[],teams:(teamResult.data??[]) as LeagueTeam[],seasonName:latest?.name??''});
   }catch{if(active)setError(true);}
   finally{if(active)setLoading(false);}
  }
  void load();
  return()=>{active=false;};
 },[db]);
 const teamNames=new Map(state.teams.map(team=>[team.id,team.name]));
 const byDate=[...state.games].sort((a,b)=>new Date(a.scheduled_at).getTime()-new Date(b.scheduled_at).getTime());
 const nextGame=byDate.find(game=>game.status==='scheduled' && new Date(game.scheduled_at).getTime()>=Date.now());
 const lastFinal=[...state.games].filter(game=>game.status==='completed').sort((a,b)=>new Date(b.scheduled_at).getTime()-new Date(a.scheduled_at).getTime())[0];
 const featured=nextGame??lastFinal;
 const name=(id:string)=>teamNames.get(id)??'Team pending';
 return <section className="rch-league-public-hub" aria-label="Rich City League game day">
  <div className="rch-league-section-heading"><div><p>THE LEAGUE</p><h2>Game day</h2></div>{state.seasonName&&<span>{state.seasonName}</span>}</div>
  {error?<p role="status" className="rch-league-feedback">Live league data is temporarily unavailable. The schedule and standings pages remain accessible.</p>:null}
  {loading?<p role="status" className="rch-league-feedback">Loading league schedule…</p>:
   <div className="rch-league-score-grid">
    <article className="rch-league-feature-game">
     <div className="rch-league-label"><FaCalendarDays aria-hidden="true"/> {nextGame?'NEXT GAME':lastFinal?'LATEST RESULT':'LEAGUE SCHEDULE'}</div>
     {featured?<><div className="rch-league-versus">
       <strong>{name(featured.away_team_id)}</strong>
       <span>{nextGame?'VS':`${featured.away_score} – ${featured.home_score}`}</span>
       <strong>{name(featured.home_team_id)}</strong>
      </div><p>{new Date(featured.scheduled_at).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}</p>
      <Link href={`/games/${featured.id}`}>Game center <FaArrowRight aria-hidden="true"/></Link></>:
      <><h3>Season updates coming soon</h3><p>Official matchups will appear here once they are published.</p><Link href="/schedule">View schedule <FaArrowRight aria-hidden="true"/></Link></>}
    </article>
    <article className="rch-league-standings">
     <div className="rch-league-label"><FaRankingStar aria-hidden="true"/> STANDINGS</div>
     {state.standings.length?<div className="rch-league-table">
      {state.standings.slice(0,5).map((entry,index)=><div key={entry.team_id}>
        <span>{entry.rank??index+1}</span><strong>{name(entry.team_id)}</strong><span>{entry.wins}–{entry.losses}</span>
      </div>)}
     </div>:<p className="rch-league-feedback">Official standings will appear after league results are recorded.</p>}
     <Link href="/standings">Full standings <FaArrowRight aria-hidden="true"/></Link>
    </article>
   </div>}
  <nav className="rch-league-section-links" aria-label="Rich City League sections">
   <Link href="/schedule">Schedule</Link><Link href="/teams">Teams</Link><Link href="/players">Players</Link>
   <Link href="/standings">Standings</Link><Link href="/stats">Stats</Link><Link href="/draft">Draft</Link>
  </nav>
 </section>;
}

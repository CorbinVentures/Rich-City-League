'use client';

import Link from 'next/link';
import Image from 'next/image';
import {useEffect,useMemo,useState} from 'react';
import type {CSSProperties} from 'react';
import {FaArrowRight,FaCalendarDays,FaRankingStar,FaPlay,FaUsers} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {RCL_PRO_SEASON} from '@/lib/rcl-pro-season';
import {getTeamTheme} from '@/lib/team-themes';
import type {Game,Standing,Team} from '@/types/database';
import styles from './LeaguePublicHub.module.css';

type LeagueGame=Pick<Game,'id'|'home_team_id'|'away_team_id'|'scheduled_at'|'status'|'home_score'|'away_score'>;
type LeagueStanding=Pick<Standing,'team_id'|'wins'|'losses'|'rank'>;
type LeagueTeam=Pick<Team,'id'|'name'|'slug'|'logo_url'|'primary_color'|'secondary_color'>;
export type LeaguePublicSnapshot={games:LeagueGame[];standings:LeagueStanding[];teams:LeagueTeam[];seasonName:string};
type Snapshot=LeaguePublicSnapshot;
const EMPTY:Snapshot={games:[],standings:[],teams:[],seasonName:''};

function dateLabel(value:string, includeTime=false){
 return new Date(value).toLocaleString('en-US',includeTime
  ?{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}
  :{month:'short',day:'numeric',year:'numeric'});
}

export function LeaguePublicHub({initialSnapshot}:{initialSnapshot?:LeaguePublicSnapshot}){
 const db=useMemo(()=>getSupabaseClient(),[]);
 const [state,setState]=useState<Snapshot>(initialSnapshot??EMPTY);
 const [loading,setLoading]=useState(!initialSnapshot);
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
     db.from('seasons').select('id,name,status,start_date').eq('league_id',league.data.id).gte('start_date',RCL_PRO_SEASON.startMonth+'-01').in('status',['active','registration','completed']).order('start_date',{ascending:false}).limit(5),
     db.from('teams').select('id,name,slug,logo_url,primary_color,secondary_color').eq('league_id',league.data.id).eq('is_active',true).order('name').limit(12),
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
 const teamMap=new Map(state.teams.map(team=>[team.id,team]));
 const byDate=[...state.games].sort((a,b)=>new Date(a.scheduled_at).getTime()-new Date(b.scheduled_at).getTime());
 const nextGame=byDate.find(game=>game.status==='scheduled'&&new Date(game.scheduled_at).getTime()>=Date.now());
 const lastFinal=[...state.games].filter(game=>game.status==='completed').sort((a,b)=>new Date(b.scheduled_at).getTime()-new Date(a.scheduled_at).getTime())[0];
 const featured=nextGame??lastFinal;
 const name=(id:string)=>teamMap.get(id)?.name??'Team pending';
 const now=Date.now();
 const liveGames=state.games.filter(game=>game.status==='live').sort((a,b)=>new Date(a.scheduled_at).getTime()-new Date(b.scheduled_at).getTime());
 const recentFinals=state.games.filter(game=>game.status==='completed').sort((a,b)=>new Date(b.scheduled_at).getTime()-new Date(a.scheduled_at).getTime()).slice(0,2);
 const upcomingGames=byDate.filter(game=>game.status==='scheduled'&&new Date(game.scheduled_at).getTime()>=now).slice(0,3);
 const scoreRail=[...liveGames,...recentFinals,...upcomingGames].slice(0,6);
 const statusLabel=(game:LeagueGame)=>game.status==='live'?'LIVE':game.status==='completed'?'FINAL':'UP NEXT';
 const teamTheme=(id:string)=>{const team=teamMap.get(id);return getTeamTheme(team?.slug??'',team?.primary_color,team?.secondary_color);};
 return <section className={styles.home} aria-label="Rich City League">
  <section className={styles.hero}>
   <div className={styles.heroGlow} aria-hidden="true"/><div className={styles.heroCourt} aria-hidden="true"/>
   <div className={styles.heroTop}><span>RICH CITY LEAGUE</span><span>VIRGINIA · EST. 2011</span></div>
   <div className={styles.heroCopy}>
    <p className={styles.eyebrow}>A league built on the stories behind the game</p>
    <h1>Every city has a court.<br/><em>Every court has a story.</em></h1>
    <p className={styles.intro}>Twelve teams. One Virginia stage. Follow the matchups, the moments, and the people who make Rich City League feel like home.</p>
    <div className={styles.actions}><Link className={styles.primaryAction} href="/schedule">Explore the schedule <FaArrowRight/></Link><Link className={styles.secondaryAction} href="#franchises">Meet the teams</Link></div>
   </div>
   <div className={styles.heroStamp} aria-hidden="true"><span>RCL</span><small>RICHMOND<br/>VIRGINIA</small></div>
   <div className={styles.heroBottom}><span>THE LEAGUE EXPERIENCE</span><span>{RCL_PRO_SEASON.startLabel} SEASON</span></div>
  </section>

  <section className={styles.scoreboard} aria-label="Rich City League scoreboard">
   <div className={styles.scoreboardHead}>
    <div><p className={styles.eyebrow}>Around the league</p><h2>Scores &amp; schedule</h2></div>
    <Link href="/schedule">View full schedule <FaArrowRight/></Link>
   </div>
   {scoreRail.length?<div className={styles.scoreRail}>
    {scoreRail.map(game=>{
     const live=game.status==='live';const final=game.status==='completed';
     const away=teamMap.get(game.away_team_id);const home=teamMap.get(game.home_team_id);
     return <Link href={'/games/'+game.id} key={game.id} className={styles.scoreCard} data-state={live?'live':final?'final':'upcoming'}>
      <div className={styles.scoreCardTop}><span>{statusLabel(game)}</span><time>{dateLabel(game.scheduled_at)}</time></div>
      <div className={styles.scoreTeam}>
       <span className={styles.scoreLogo} style={{'--score-accent':teamTheme(game.away_team_id).accent} as CSSProperties}>{away?.logo_url?<Image src={away.logo_url} alt="" width={34} height={34} sizes="34px"/>:<b>{(away?.name??'T').slice(0,1)}</b>}</span>
       <strong>{name(game.away_team_id)}</strong>{final||live?<b className={styles.scoreValue}>{game.away_score}</b>:null}
      </div>
      <div className={styles.scoreTeam}>
       <span className={styles.scoreLogo} style={{'--score-accent':teamTheme(game.home_team_id).accent} as CSSProperties}>{home?.logo_url?<Image src={home.logo_url} alt="" width={34} height={34} sizes="34px"/>:<b>{(home?.name??'T').slice(0,1)}</b>}</span>
       <strong>{name(game.home_team_id)}</strong>{final||live?<b className={styles.scoreValue}>{game.home_score}</b>:null}
      </div>
      <span className={styles.scoreCardLink}>{live?'Follow live':final?'Game recap':dateLabel(game.scheduled_at,true)} <FaArrowRight/></span>
     </Link>;
    })}
   </div>:<div className={styles.scoreRailEmpty}><span className={styles.emptyPulse} aria-hidden="true"/><div><small>SEASON OPENER</small><strong>{RCL_PRO_SEASON.startLabel}</strong><p>Official matchups and tipoff details will appear here as they are confirmed.</p></div><Link href="/schedule">Season calendar <FaArrowRight/></Link></div>}
  </section>

  <section className={styles.editorialBlock}>
   <div className={styles.sectionHead}><div><p className={styles.eyebrow}>Go deeper</p><h2>More from the league</h2></div></div>
   <nav className={styles.editorialNav} aria-label="League destinations">
   <Link href="/schedule"><span className={styles.navIcon}><FaCalendarDays/></span><span><small>PLAN YOUR SEASON</small><strong>Schedule</strong></span><FaArrowRight className={styles.arrow}/></Link>
   <Link href="/league/highlights"><span className={styles.navIcon}><FaPlay/></span><span><small>THE MOMENTS THAT STAY</small><strong>Highlights</strong></span><FaArrowRight className={styles.arrow}/></Link>
   <Link href="/league/community"><span className={styles.navIcon}><FaUsers/></span><span><small>MORE THAN GAME NIGHT</small><strong>Community</strong></span><FaArrowRight className={styles.arrow}/></Link>
   </nav>
  </section>

  <section className={styles.gameSection} aria-labelledby="game-day-title">
   <div className={styles.sectionHead}><div><p className={styles.eyebrow}>The season, in motion</p><h2 id="game-day-title">Game day</h2></div><Link href="/schedule">Full schedule <FaArrowRight/></Link></div>
   {error&&<p role="status" className={styles.feedback}>League information is temporarily unavailable. The schedule remains accessible.</p>}
   {loading?<p role="status" className={styles.feedback}>Loading league schedule…</p>:
    <div className={styles.scoreGrid}>
     <article className={styles.featureGame}>
      <div className={styles.cardLabel}><FaCalendarDays/> {nextGame?'NEXT GAME':lastFinal?'LATEST RESULT':'SEASON UPDATE'}</div>
      {featured?<><div className={styles.versus}><strong>{name(featured.away_team_id)}</strong><span>{nextGame?'VS':String(featured.away_score)+' – '+String(featured.home_score)}</span><strong>{name(featured.home_team_id)}</strong></div><p className={styles.date}>{dateLabel(featured.scheduled_at,true)}</p><Link href={'/games/'+featured.id} className={styles.cardLink}>Enter game center <FaArrowRight/></Link></>:
       <><h3>Next chapter loading.</h3><p>The professional season is planned for {RCL_PRO_SEASON.startLabel}. Confirmed matchups and tipoff details will appear here.</p><Link href="/schedule" className={styles.cardLink}>View season calendar <FaArrowRight/></Link></>}
     </article>
     <article className={styles.standings}>
      <div className={styles.cardLabel}><FaRankingStar/> LEAGUE PICTURE</div>
      <h3>Where the teams stand</h3>
      {state.standings.length?<div className={styles.standingRows}>{state.standings.slice(0,5).map((entry,index)=><div key={entry.team_id}><span>{entry.rank??index+1}</span><strong>{name(entry.team_id)}</strong><span>{entry.wins}–{entry.losses}</span></div>)}</div>:<p className={styles.feedback}>Standings will take shape when official season games begin.</p>}
      <Link href="/standings" className={styles.cardLink}>View all standings <FaArrowRight/></Link>
     </article>
    </div>}
  </section>

  <section id="franchises" className={styles.teamsSection} aria-labelledby="teams-title">
   <div className={styles.sectionHead}><div><p className={styles.eyebrow}>Twelve homes. One league.</p><h2 id="teams-title">Meet the franchises</h2></div><Link href="/teams">Team directory <FaArrowRight/></Link></div>
   <p className={styles.sectionIntro}>Step into each team’s world: its colors, its people, its schedule, and the story it brings to the league.</p>
   {state.teams.length? <div className={styles.teamGrid}>{state.teams.slice(0,12).map((team,index)=>{
    const theme=getTeamTheme(team.slug,team.primary_color,team.secondary_color);
    return <Link href={'/teams/'+team.slug} key={team.id} className={styles.teamCard} style={{'--team-accent':theme.accent,'--team-secondary':theme.secondary,'--team-surface':theme.surface,'--team-atmosphere':theme.atmosphere} as CSSProperties}>
     <span className={styles.teamIndex}>{String(index+1).padStart(2,'0')} / 12</span>
     {team.logo_url?<img className={styles.teamLogo} src={team.logo_url} alt="" loading="lazy"/>:<span className={styles.teamMonogram}>{team.name.split(/\s+/).map(part=>part[0]).slice(0,2).join('')}</span>}
     <span className={styles.teamName}>{team.name}</span><span className={styles.teamVisit}>Explore team <FaArrowRight/></span>
    </Link>;
   })}</div>:<p className={styles.feedback}>Team homes are being prepared.</p>}
  </section>
 </section>;
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { LeagueSetupWorkbench } from '@/components/league/LeagueSetupWorkbench';
import { LeagueOperationsWorkbench } from '@/components/league/LeagueOperationsWorkbench';
import { CommandScheduleGenerator } from '@/components/command/CommandScheduleGenerator';
import { FaArrowUpRightFromSquare, FaBasketball, FaCalendarDays, FaRotate, FaUserGroup, FaUsers, FaClipboardList } from 'react-icons/fa6';

type Row = Record<string, any>;
const dateTime = (value?:string|null) => value ? new Date(value).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'}) : '—';

export function CommandLeagueManagement() {
 const db=useMemo(()=>getSupabaseClient() as any,[]);
 const [workspace,setWorkspace]=useState<'overview'|'setup'|'operations'|'schedule'>('overview');
 const [teams,setTeams]=useState<Row[]>([]);
 const [seasons,setSeasons]=useState<Row[]>([]);
 const [teamSeasons,setTeamSeasons]=useState<Row[]>([]);
 const [rosters,setRosters]=useState<Row[]>([]);
 const [games,setGames]=useState<Row[]>([]);
 const [venues,setVenues]=useState<Row[]>([]);
 const [registrations,setRegistrations]=useState<Row[]>([]);
 const [teamCoaches,setTeamCoaches]=useState<Row[]|null>(null);
 const [loading,setLoading]=useState(true);
 const loaded=useRef(false);
 const [refreshing,setRefreshing]=useState(false);
 const [error,setError]=useState('');

 const load = useCallback(async () => {
  if(!db){setError('RCH data connection is unavailable.');setLoading(false);return;}
  if(loaded.current)setRefreshing(true);else setLoading(true);
  setError('');
  try{
   const [teamQ,seasonQ,teamSeasonQ,rosterQ,gameQ,venueQ,registrationQ,coachQ]=await Promise.all([
    db.from('teams').select('id,name,city,is_active').eq('is_active',true).order('name').limit(250),
    db.from('seasons').select('id,name,start_date,end_date,status,registration_open').order('start_date',{ascending:false}).limit(80),
    db.from('team_seasons').select('id,team_id,season_id,division_id').limit(500),
    db.from('rosters').select('id,team_season_id,player_id,joined_at,left_at').is('left_at',null).limit(1000),
    db.from('games').select('id,season_id,home_team_id,away_team_id,venue_id,scheduled_at,status,home_score,away_score').order('scheduled_at',{ascending:true}).limit(500),
    db.from('venues').select('id,name,city').limit(250),
    db.from('registrations').select('id,status').limit(1000),
    db.from('team_coaches').select('id,team_id').limit(500),
   ]);
   const failed=[teamQ,seasonQ,teamSeasonQ,rosterQ,gameQ,venueQ,registrationQ].find(result=>result.error);
   if(failed?.error)throw new Error(failed.error.message);
   setTeams(teamQ.data??[]);setSeasons(seasonQ.data??[]);setTeamSeasons(teamSeasonQ.data??[]);
   setRosters(rosterQ.data??[]);setGames(gameQ.data??[]);setVenues(venueQ.data??[]);
   setRegistrations(registrationQ.data??[]);setTeamCoaches(coachQ.error?null:coachQ.data??[]);
  }catch(e){setError(e instanceof Error?e.message:'League records could not be loaded.');}
  finally{loaded.current=true;setLoading(false);setRefreshing(false);}
 },[db]);

 useEffect(()=>{void load();},[load]);

 const activeRosterCount=rosters.length;
 const upcomingGames=games.filter(g=>new Date(g.scheduled_at).getTime()>=Date.now()&&!['completed','final','finished','cancelled'].includes(String(g.status).toLowerCase()));
 const teamName=(id:string)=>teams.find(t=>t.id===id)?.name||'Team TBD';
 const rosterCount=(teamSeasonId:string)=>rosters.filter(r=>r.team_season_id===teamSeasonId).length;
 const teamSeasonCount=(teamId:string)=>teamSeasons.filter(ts=>ts.team_id===teamId).length;
 const venueName=(id:string|null)=>venues.find(v=>v.id===id)?.name||'Venue TBD';
 const nextGames=upcomingGames.slice(0,8);
 const activeRegistrations=registrations.filter(r=>!['cancelled','withdrawn','rejected'].includes(String(r.status||'').toLowerCase())).length;
 const today=new Date().toISOString().slice(0,10);
 const readinessSeason=seasons.find(s=>['active','in_progress','ongoing'].includes(String(s.status||'').toLowerCase()))
  ||seasons.filter(s=>s.start_date&&s.start_date>=today).sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date)))[0]
  ||seasons[0];
 const readinessTeamSeasons=teamSeasons.filter(ts=>ts.season_id===readinessSeason?.id);
 const readinessTeamSeasonIds=new Set(readinessTeamSeasons.map(ts=>ts.id));
 const readinessSeasonRosters=rosters.filter(r=>readinessTeamSeasonIds.has(r.team_season_id));
 const rosteredTeamSeasons=new Set(readinessSeasonRosters.map(r=>r.team_season_id));
 const readinessGames=games.filter(g=>g.season_id===readinessSeason?.id);
 const gamesBeyondSeasonEnd=readinessSeason?.end_date?readinessGames.filter(g=>String(g.scheduled_at||'').slice(0,10)>readinessSeason.end_date).length:0;
 const gamesWithoutVenue=readinessGames.filter(g=>!g.venue_id).length;
 const teamIdsInSeason=new Set(readinessTeamSeasons.map(ts=>ts.team_id));
 const coachedTeamIds=new Set((teamCoaches??[]).map(row=>row.team_id));
 const teamsWithoutCoach=[...teamIdsInSeason].filter(id=>!coachedTeamIds.has(id)).length;
 const registrationState=String(readinessSeason?.status||'').toLowerCase()==='registration'
  ?(readinessSeason?.registration_open===true?'ready':'action')
  :(readinessSeason?.registration_open===true?'ready':'unknown');
 const readiness=[
  {label:'Season setup',state:readinessSeason?.start_date&&readinessSeason?.end_date?'ready':'action',detail:readinessSeason?readinessSeason.name+' · '+(readinessSeason.start_date||'start TBD')+' to '+(readinessSeason.end_date||'end TBD'):'Create the RCH season and set its dates.',panel:'setup' as const},
  {label:'Team assignments',state:readinessTeamSeasons.length?'ready':'action',detail:readinessTeamSeasons.length?readinessTeamSeasons.length+' team assignments in this season.':'Assign RCH teams to the season.',panel:'setup' as const},
  {label:'Registration window',state:registrationState,detail:!readinessSeason?'Choose a season to review registration.':String(readinessSeason.status||'').toLowerCase()==='registration'?(readinessSeason.registration_open?'Registration is open.':'Season status is Registration, but the registration flag is closed.'):(readinessSeason.registration_open?'Registration is open.':'Not currently open for registration.'),panel:'setup' as const},
  {label:'Player rosters',state:readinessTeamSeasons.length&&rosteredTeamSeasons.size===readinessTeamSeasons.length?'ready':'action',detail:readinessTeamSeasons.length?readinessSeasonRosters.length+' active players across '+rosteredTeamSeasons.size+' of '+readinessTeamSeasons.length+' assigned teams.':'Assign teams before building rosters.',panel:'operations' as const},
  {label:'Coach coverage',state:teamCoaches===null?'unknown':teamsWithoutCoach===0&&teamIdsInSeason.size>0?'ready':'action',detail:teamCoaches===null?'Coach assignments could not be confirmed.':teamIdsInSeason.size?teamsWithoutCoach+' of '+teamIdsInSeason.size+' assigned teams have no linked coach.':'Assign teams to review coach coverage.',panel:'setup' as const},
  {label:'Game schedule',state:readinessGames.length&&gamesBeyondSeasonEnd===0&&gamesWithoutVenue===0?'ready':readinessGames.length?'warning':'action',detail:!readinessGames.length?'Generate the season schedule in Command Center.':gamesBeyondSeasonEnd?gamesBeyondSeasonEnd+' scheduled games fall after the season end date.':gamesWithoutVenue?gamesWithoutVenue+' scheduled games need a venue.':readinessGames.length+' games scheduled with venues inside the season window.',panel:gamesBeyondSeasonEnd||gamesWithoutVenue?'schedule':'operations' as const},
 ];
 const readinessAttention=readiness.filter(item=>item.state!=='ready').length;

 const tools=[
  {title:'League setup',description:'Build seasons, divisions, teams, team assignments, and game schedules in RCH.',panel:'setup' as const,icon:<FaCalendarDays/>},
  {title:'League operations',description:'Run tryouts, drafts, requests, discipline, and roster decisions.',panel:'operations' as const,icon:<FaClipboardList/>},
  {title:'Teams, rosters & game stats',description:'Manage native RCH rosters, game records, score updates, and player stats.',panel:'operations' as const,icon:<FaUsers/>},
  {title:'Schedule generator',description:'Generate and review regular-season, playoff, and tournament schedules.',panel:'schedule' as const,icon:<FaCalendarDays/>},
 ];

 return <div className="space-y-6">
  <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/20 p-2" role="tablist" aria-label="League management workspaces">
   {[['overview','Overview'],['setup','League setup'],['operations','Game & roster operations'],['schedule','Schedule generator']].map(([key,label])=><button key={key} type="button" role="tab" aria-selected={workspace===key} onClick={()=>setWorkspace(key as 'overview'|'setup'|'operations'|'schedule')} className={'rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition '+(workspace===key?'bg-blue-500/20 text-blue-100':'text-white/45 hover:bg-white/[.05] hover:text-white')}>{label}</button>)}
  </div>
  {workspace==='schedule'?<CommandScheduleGenerator/>:workspace==='setup'?<LeagueSetupWorkbench/>:workspace==='operations'?<LeagueOperationsWorkbench/>:<>
  <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_90%_0%,rgba(59,130,246,.20),transparent_28rem),linear-gradient(145deg,#0d1726,#080c13)] p-5 sm:p-7">
   <div className="flex flex-wrap items-start justify-between gap-5">
    <div className="max-w-3xl">
     <p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-300">LEAGUE CONTROL · RCH COMMAND</p>
     <h2 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">Run the league here.</h2>
     <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Command Center is the staff hub for Rich City League. RCH owns the league records and workflows: seasons, teams, registrations, rosters, schedules, results, and game operations.</p>
    </div>
    <button type="button" onClick={()=>void load()} disabled={refreshing||loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white/70 hover:bg-white/[.08] disabled:opacity-50"><FaRotate className={refreshing?'animate-spin':''}/> {refreshing?'Refreshing':'Refresh league data'}</button>
   </div>
   <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {[
     {label:'ACTIVE TEAMS',value:teams.length,detail:'RCH-owned team records',icon:<FaBasketball/>},
     {label:'SEASONS',value:seasons.length,detail:'RCH season records',icon:<FaCalendarDays/>},
     {label:'ACTIVE ROSTER',value:activeRosterCount,detail:teamSeasons.filter(ts=>rosterCount(ts.id)>0).length+' team seasons with players',icon:<FaUserGroup/>},
     {label:'UPCOMING GAMES',value:upcomingGames.length,detail:activeRegistrations+' active registration records',icon:<FaCalendarDays/>},
    ].map(card=><div key={card.label} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between text-[10px] font-black tracking-[.15em] text-white/40"><span>{card.label}</span><span className="text-blue-300">{card.icon}</span></div><strong className="mt-3 block font-display text-3xl font-black text-white">{loading?'—':card.value}</strong><small className="mt-1 block text-xs text-white/40">{card.detail}</small></div>)}
   </div>
  </section>

  <section className="rounded-2xl border border-amber-300/15 bg-[linear-gradient(145deg,rgba(251,191,36,.06),rgba(255,255,255,.02))] p-5 sm:p-6">
   <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-200/80">LEAGUE READINESS</p><h3 className="mt-2 font-display text-2xl font-black uppercase">{readinessSeason?.name||'Season readiness'}</h3><p className="mt-2 text-xs text-white/45">Live operational checks from RCH records. Resolve open items here before game operations.</p></div><span className="rounded-full border border-amber-200/15 bg-amber-200/[.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-100">{loading?'Checking…':readinessAttention+' items need attention'}</span></div>
   <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {readiness.map(item=><div key={item.label} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between gap-2"><strong className="text-xs font-black uppercase tracking-wider text-white/80">{item.label}</strong><span className={'rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider '+(item.state==='ready'?'bg-emerald-300/10 text-emerald-200':item.state==='unknown'?'bg-white/10 text-white/50':item.state==='warning'?'bg-red-300/10 text-red-200':'bg-amber-300/10 text-amber-100')}>{item.state==='ready'?'Ready':item.state==='unknown'?'Check':item.state==='warning'?'Fix':'Action needed'}</span></div><p className="mt-2 min-h-10 text-xs leading-5 text-white/45">{item.detail}</p><button type="button" onClick={()=>setWorkspace(item.panel)} className="mt-3 text-[9px] font-black uppercase tracking-wider text-blue-200 hover:text-white">Open {item.panel==='setup'?'setup':item.panel==='operations'?'operations':'schedule'} <FaArrowUpRightFromSquare className="ml-1 inline"/></button></div>)}
   </div>
  </section>

  {error&&<div role="alert" className="rounded-xl border border-red-300/20 bg-red-300/[.06] px-4 py-3 text-sm text-red-100/80">League records did not load: {error}</div>}

  <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
   <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">NATIVE RCH WORKFLOWS</p><h3 className="mt-2 font-display text-2xl font-black uppercase">League management tools</h3><p className="mt-2 max-w-2xl text-xs leading-5 text-white/45">Open the first-party league workflows. Each tool operates on RCH records and remains protected by the platform’s current role permissions.</p></div>
   <div className="mt-5 grid gap-3 lg:grid-cols-3">
    {tools.map(tool=><button key={tool.title} type="button" onClick={()=>setWorkspace(tool.panel)} className="group rounded-xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-blue-300/30 hover:bg-blue-300/[.04]"><div className="flex items-center justify-between text-blue-300"><span>{tool.icon}</span><FaArrowUpRightFromSquare className="text-xs opacity-50 transition group-hover:opacity-100"/></div><h4 className="mt-4 font-display text-lg font-black uppercase">{tool.title}</h4><p className="mt-2 text-xs leading-5 text-white/45">{tool.description}</p><span className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-blue-200">Open workspace <FaArrowUpRightFromSquare/></span></button>)}
   </div>
  </section>

  <div className="grid gap-6 xl:grid-cols-2">
   <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
    <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">SEASON PLANNING</p><h3 className="mt-2 font-display text-xl font-black uppercase">RCH seasons</h3></div><span className="text-[10px] font-black uppercase tracking-wider text-white/35">{seasons.length} TOTAL</span></div>
    <div className="mt-4 space-y-2">
     {seasons.slice(0,8).map(season=><div key={season.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-3"><div><strong className="text-sm">{season.name}</strong><small className="mt-1 block text-[10px] text-white/35">{season.start_date||'Start TBD'} – {season.end_date||'End TBD'}</small></div><span className="rounded-full bg-white/[.06] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white/55">{season.status||'planned'}</span></div>)}
     {!seasons.length&&!loading&&<p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-white/40">No seasons have been created in RCH yet.</p>}
    </div>
   </section>

   <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
    <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">SCHEDULE DESK</p><h3 className="mt-2 font-display text-xl font-black uppercase">Upcoming games</h3></div><span className="text-[10px] font-black uppercase tracking-wider text-white/35">{nextGames.length} SHOWN</span></div>
    <div className="mt-4 space-y-2">
     {nextGames.length?nextGames.map(game=><div key={game.id} className="rounded-lg border border-white/5 bg-black/20 px-3 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{teamName(game.home_team_id)} <span className="text-white/30">vs</span> {teamName(game.away_team_id)}</strong><span className="text-[9px] font-black uppercase tracking-wider text-blue-200">{String(game.status||'scheduled').toUpperCase()}</span></div><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/40"><span>{dateTime(game.scheduled_at)}</span><span>{venueName(game.venue_id)}</span></div></div>):<p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-white/40">No future game records yet. Use league setup and operations to build the RCH schedule.</p>}
   </div>
   </section>
  </div>

  <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
   <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">TEAM & ROSTER DESK</p><h3 className="mt-2 font-display text-xl font-black uppercase">RCH teams</h3><p className="mt-2 text-xs text-white/45">Team assignments and active rosters are counted from RCH season records.</p></div><button type="button" onClick={()=>setWorkspace('setup')} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-white">Manage teams and seasons <FaArrowUpRightFromSquare className="ml-1 inline"/></button></div>
   <div className="mt-4 overflow-x-auto"><table className="min-w-[540px] w-full text-left text-xs"><thead className="text-[9px] font-black uppercase tracking-[.15em] text-white/35"><tr><th className="pb-2">TEAM</th><th className="pb-2">CITY</th><th className="pb-2">SEASONS</th><th className="pb-2">ACTIVE PLAYERS</th></tr></thead><tbody>{teams.map(team=>{const links=teamSeasons.filter(ts=>ts.team_id===team.id);const linkIds=new Set(links.map(ts=>ts.id));const playersInTeam=rosters.filter(r=>linkIds.has(r.team_season_id)).length;return <tr key={team.id} className="border-t border-white/5"><td className="py-3 font-semibold text-white/80">{team.name}</td><td className="py-3 text-white/45">{team.city||'—'}</td><td className="py-3 text-white/45">{teamSeasonCount(team.id)}</td><td className="py-3 text-white/45">{playersInTeam}</td></tr>})}</tbody></table>{!teams.length&&!loading&&<p className="mt-3 text-sm text-white/40">No active RCH teams found.</p>}</div>
  </section>
  </>}
 </div>;
}

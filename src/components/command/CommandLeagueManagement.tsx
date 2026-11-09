'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowUpRightFromSquare, FaBasketball, FaCalendarDays, FaPeopleGroup, FaRotate, FaUserGroup } from 'react-icons/fa6';

type Row = Record<string, any>;
type SyncRow = {resource:string;records_synced:number;status:string;last_synced_at:string|null;last_error:string|null};
const dateTime = (value?:string|null) => value ? new Date(value).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'}) : '—';

export function CommandLeagueManagement() {
 const db=useMemo(()=>getSupabaseClient() as any,[]);
 const [teams,setTeams]=useState<Row[]>([]);
 const [seasons,setSeasons]=useState<Row[]>([]);
 const [teamSeasons,setTeamSeasons]=useState<Row[]>([]);
 const [rosters,setRosters]=useState<Row[]>([]);
 const [coaches,setCoaches]=useState<Row[]>([]);
 const [games,setGames]=useState<Row[]>([]);
 const [venues,setVenues]=useState<Row[]>([]);
 const [programs,setPrograms]=useState<Row[]>([]);
 const [syncState,setSyncState]=useState<SyncRow[]>([]);
 const [loading,setLoading]=useState(true);
 const loaded=useRef(false);
 const [refreshing,setRefreshing]=useState(false);
 const [configured,setConfigured]=useState(false);
 const [publicConfigured,setPublicConfigured]=useState(false);
 const [syncing,setSyncing]=useState('');
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');

 const load = useCallback(async () => {
  if(!db){setError('RCH data connection is unavailable.');setLoading(false);return;}
  if(loaded.current)setRefreshing(true);else setLoading(true);
  setError('');
  try{
   const [teamQ,seasonQ,teamSeasonQ,rosterQ,coachQ,gameQ,venueQ,programQ]=await Promise.all([
    db.from('teams').select('id,name,city,is_active,leagueapps_team_id').eq('is_active',true).order('name').limit(250),
    db.from('seasons').select('id,name,start_date,end_date,status,registration_open,leagueapps_program_id').order('start_date',{ascending:false}).limit(80),
    db.from('team_seasons').select('id,team_id,season_id,division_id').limit(500),
    db.from('rosters').select('id,team_season_id,player_id,joined_at,left_at').is('left_at',null).limit(1000),
    db.from('team_coaches').select('id,team_id,profile_id,title').limit(500),
    db.from('games').select('id,season_id,home_team_id,away_team_id,venue_id,scheduled_at,status,home_score,away_score,leagueapps_game_id').order('scheduled_at',{ascending:true}).limit(500),
    db.from('venues').select('id,name,city').limit(250),
    db.from('leagueapps_program_scope').select('program_id,program_name,scope,enabled,updated_at').order('program_name').limit(100),
   ]);
   const failed=[teamQ,seasonQ,teamSeasonQ,rosterQ,coachQ,gameQ,venueQ,programQ].find(result=>result.error);
   if(failed?.error)throw new Error(failed.error.message);
   setTeams(teamQ.data??[]);setSeasons(seasonQ.data??[]);setTeamSeasons(teamSeasonQ.data??[]);
   setRosters(rosterQ.data??[]);setCoaches(coachQ.data??[]);setGames(gameQ.data??[]);
   setVenues(venueQ.data??[]);setPrograms(programQ.data??[]);
  }catch(e){setError(e instanceof Error?e.message:'League records could not be loaded.');}
  finally{loaded.current=true;setLoading(false);setRefreshing(false);}
 },[db]);

 const loadSync = useCallback(async () => {
  const client=db;
  if(!client)return;
  try{
   const {data,error:sessionError}=await client.auth.getSession();
   if(sessionError)throw sessionError;
   const token=data.session?.access_token;
   if(!token)throw new Error('Sign in again to inspect LeagueApps sync.');
   const response=await fetch('/api/admin/leagueapps?action=status',{cache:'no-store',headers:{Authorization:'Bearer '+token}});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||'LeagueApps sync status is unavailable.');
   setConfigured(Boolean(result.configured?.configured));
   setPublicConfigured(Boolean(result.publicConfigured?.configured));
   setSyncState(result.state??[]);
  }catch(e){
   setConfigured(false);setPublicConfigured(false);
   setNotice(e instanceof Error?e.message:'LeagueApps connection status is unavailable.');
  }
 },[db]);

 useEffect(()=>{void load();void loadSync();},[load,loadSync]);

 async function runSync(resource:'members-2'|'registrations-2'|'competition'){
  setSyncing(resource);setNotice('');
  try{
   const {data,error:sessionError}=await db.auth.getSession();
   if(sessionError)throw sessionError;
   const token=data.session?.access_token;
   if(!token)throw new Error('Sign in again before syncing LeagueApps.');
   const isCompetition=resource==='competition';
   const response=await fetch(isCompetition?'/api/admin/leagueapps?action=sync-competition':'/api/admin/leagueapps?action=sync&resource='+resource,{
    method:'GET',cache:'no-store',headers:{Authorization:'Bearer '+token}
   });
   const result=await response.json();
   if(!response.ok&&!(isCompetition&&response.status===207))throw new Error(result.error||'LeagueApps sync failed.');
   setNotice(isCompetition
    ? `Competition sync finished: ${result.teamsSeen??0} teams, ${result.gamesUpserted??0} games, ${result.locations??0} locations.`
    : `${resource==='members-2'?'Members':'Registrations'} synced: ${result.recordsSynced??0} record(s).`);
   await Promise.all([load(),loadSync()]);
  }catch(e){setNotice(e instanceof Error?e.message:'LeagueApps sync failed.');}
  finally{setSyncing('');}
 }

 const activeRosterCount=rosters.length;
 const upcomingGames=games.filter(g=>new Date(g.scheduled_at).getTime()>=Date.now()&&!['completed','final','finished','cancelled'].includes(String(g.status).toLowerCase()));
 const teamName=(id:string)=>teams.find(t=>t.id===id)?.name||'Unassigned team';
 const seasonFor=(id:string)=>teamSeasons.find(t=>t.id===id);
 const rosterCount=(teamSeasonId:string)=>rosters.filter(r=>r.team_season_id===teamSeasonId).length;
 const teamSeasonCount=(teamId:string)=>teamSeasons.filter(ts=>ts.team_id===teamId).length;
 const venueName=(id:string|null)=>venues.find(v=>v.id===id)?.name||'Venue TBD';
 const statusFor=(resource:string)=>syncState.find(row=>row.resource===resource);
 const syncCards=[
  {resource:'members-2',label:'MEMBERS',enabled:configured},
  {resource:'registrations-2',label:'REGISTRATIONS',enabled:configured},
  {resource:'competition',label:'TEAMS, SCHEDULE & RESULTS',enabled:publicConfigured},
 ];
 const nextGames=upcomingGames.slice(0,8);
 const activePrograms=programs.filter(p=>p.enabled);

 return <div className="space-y-6">
  <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_90%_0%,rgba(59,130,246,.20),transparent_28rem),linear-gradient(145deg,#0d1726,#080c13)] p-5 sm:p-7">
   <div className="flex flex-wrap items-start justify-between gap-5">
    <div className="max-w-3xl">
     <p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-300">LEAGUE CONTROL · RCH COMMAND</p>
     <h2 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">One league desk.</h2>
     <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Manage RCH league records and monitor LeagueApps imports from one staff workspace. LeagueApps registration and payment records stay synchronized through the approved bridge; RCH uses the shared records for rosters, schedules, games and community-facing operations.</p>
    </div>
    <button type="button" onClick={()=>void Promise.all([load(),loadSync()])} disabled={refreshing||loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white/70 hover:bg-white/[.08] disabled:opacity-50"><FaRotate className={refreshing?'animate-spin':''}/> {refreshing?'Refreshing':'Refresh league data'}</button>
   </div>
   <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {[
     {label:'ACTIVE TEAMS',value:teams.length,detail:'RCH league teams',icon:<FaBasketball/>},
     {label:'SEASONS',value:seasons.length,detail:activePrograms.length+' LeagueApps programs in scope',icon:<FaCalendarDays/>},
     {label:'ROSTER ASSIGNMENTS',value:activeRosterCount,detail:teamSeasons.filter(ts=>rosterCount(ts.id)>0).length+' team seasons with players',icon:<FaUserGroup/>},
     {label:'UPCOMING GAMES',value:upcomingGames.length,detail:'RCH game records',icon:<FaCalendarDays/>},
    ].map(card=><div key={card.label} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between text-[10px] font-black tracking-[.15em] text-white/40"><span>{card.label}</span><span className="text-blue-300">{card.icon}</span></div><strong className="mt-3 block font-display text-3xl font-black text-white">{loading?'—':card.value}</strong><small className="mt-1 block text-xs text-white/40">{card.detail}</small></div>)}
   </div>
  </section>

  {notice&&<div role="status" className="rounded-xl border border-blue-300/20 bg-blue-300/[.06] px-4 py-3 text-sm text-blue-100/80">{notice}</div>}
  {error&&<div role="alert" className="rounded-xl border border-red-300/20 bg-red-300/[.06] px-4 py-3 text-sm text-red-100/80">League records did not load: {error}</div>}

  <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
   <div className="flex flex-wrap items-end justify-between gap-4">
    <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">DATA BRIDGE</p><h3 className="mt-2 font-display text-2xl font-black uppercase">LeagueApps sync</h3><p className="mt-2 max-w-2xl text-xs leading-5 text-white/45">Import member and registration updates, then bring approved teams, schedules and locations into the RCH game system. A sync refreshes records; it does not publish a league announcement.</p></div>
    <Link href="/admin/leagueapps#leagueapps-sync" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-300 hover:text-white">Integration details <FaArrowUpRightFromSquare/></Link>
   </div>
   <div className="mt-5 grid gap-3 lg:grid-cols-3">
    {syncCards.map(card=>{
     const row=statusFor(card.resource);const busy=syncing===card.resource;
     return <div key={card.resource} className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[.15em] text-white/40">{card.label}</p><span className={'rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider '+(row?.status==='ok'?'bg-emerald-400/10 text-emerald-300':'bg-white/[.06] text-white/40')}>{row?.status||'not synced'}</span></div>
      <strong className="mt-3 block font-display text-2xl font-black">{row?.records_synced??0}</strong>
      <small className="mt-1 block text-[11px] text-white/40">{row?.last_synced_at?'Last sync '+dateTime(row.last_synced_at):'No successful sync recorded'}</small>
      {row?.last_error&&<p className="mt-2 text-xs text-red-300/75">{row.last_error}</p>}
      <button type="button" disabled={!card.enabled||Boolean(syncing)} onClick={()=>void runSync(card.resource as 'members-2'|'registrations-2'|'competition')} className="mt-4 w-full rounded-lg bg-blue-500/15 px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-blue-200 hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-35">{busy?'Syncing…':card.enabled?'Sync now':'Connection not configured'}</button>
     </div>
    })}
   </div>
   {!configured&&!publicConfigured&&<p className="mt-4 text-xs text-white/35">LeagueApps credentials are not currently available to this Command Center session.</p>}
  </section>

  <div className="grid gap-6 xl:grid-cols-2">
   <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
    <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">SEASON PLANNING</p><h3 className="mt-2 font-display text-xl font-black uppercase">League programs</h3></div><span className="text-[10px] font-black uppercase tracking-wider text-white/35">{activePrograms.length} IN SYNC SCOPE</span></div>
    <div className="mt-4 space-y-2">
     {activePrograms.length?activePrograms.map((program:any)=><div key={program.program_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-3"><div><strong className="text-sm">{program.program_name}</strong><small className="mt-1 block text-[10px] text-white/35">LeagueApps program {program.program_id} · {program.scope}</small></div><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">{program.enabled?'SYNC ENABLED':'PAUSED'}</span></div>):<p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-white/40">No LeagueApps programs are approved for competition sync yet.</p>}
    </div>
   </section>

   <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
    <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">SCHEDULE DESK</p><h3 className="mt-2 font-display text-xl font-black uppercase">Upcoming games</h3></div><span className="text-[10px] font-black uppercase tracking-wider text-white/35">{nextGames.length} SHOWN</span></div>
    <div className="mt-4 space-y-2">
     {nextGames.length?nextGames.map(game=><div key={game.id} className="rounded-lg border border-white/5 bg-black/20 px-3 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{teamName(game.home_team_id)} <span className="text-white/30">vs</span> {teamName(game.away_team_id)}</strong><span className="text-[9px] font-black uppercase tracking-wider text-blue-200">{game.leagueapps_game_id?'LEAGUEAPPS SYNC':'RCH RECORD'}</span></div><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/40"><span>{dateTime(game.scheduled_at)}</span><span>{venueName(game.venue_id)}</span><span>{String(game.status||'scheduled').toUpperCase()}</span></div></div>):<p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-white/40">No future game records yet. Once LeagueApps competition sync runs, imported games will appear here.</p>}
    </div>
   </section>
  </div>

  <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
   <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">TEAM & ROSTER DESK</p><h3 className="mt-2 font-display text-xl font-black uppercase">RCH teams</h3><p className="mt-2 text-xs text-white/45">Rosters are maintained in RCH team-season records; sync and registration totals remain visible above.</p></div><div className="flex flex-wrap gap-2"><Link href="/admin/operations" className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-white">Roster operations <FaArrowUpRightFromSquare className="ml-1 inline"/></Link><a href="https://manager.leagueapps.com/console/sites/2294" target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-white">Open LeagueApps <FaArrowUpRightFromSquare className="ml-1 inline"/></a></div></div>
   <div className="mt-4 overflow-x-auto"><table className="min-w-[620px] w-full text-left text-xs"><thead className="text-[9px] font-black uppercase tracking-[.15em] text-white/35"><tr><th className="pb-2">TEAM</th><th className="pb-2">CITY</th><th className="pb-2">SEASONS</th><th className="pb-2">PLAYERS</th><th className="pb-2">SOURCE ID</th></tr></thead><tbody>{teams.map(team=>{const links=teamSeasons.filter(ts=>ts.team_id===team.id);const linkIds=new Set(links.map(ts=>ts.id));const playersInTeam=rosters.filter(r=>linkIds.has(r.team_season_id)).length;return <tr key={team.id} className="border-t border-white/5"><td className="py-3 font-semibold text-white/80">{team.name}</td><td className="py-3 text-white/45">{team.city||'—'}</td><td className="py-3 text-white/45">{teamSeasonCount(team.id)}</td><td className="py-3 text-white/45">{playersInTeam}</td><td className="py-3 text-white/35">{team.leagueapps_team_id||'RCH native'}</td></tr>})}</tbody></table>{!teams.length&&!loading&&<p className="mt-3 text-sm text-white/40">No active RCH teams found.</p>}</div>
  </section>
 </div>;
}

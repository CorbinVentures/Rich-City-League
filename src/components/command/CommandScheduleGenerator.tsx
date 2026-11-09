'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { FaCalendarDays, FaCircleCheck, FaTriangleExclamation, FaWandMagicSparkles } from 'react-icons/fa6';

type Row = Record<string, any>;
type Format = 'regular'|'playoffs'|'tournament';
type TournamentMode = 'pool-play'|'single-elimination';
type TeamSeasonRow = { team_id:string;season_id:string;division_id:string|null;seed:number|null };
type Fixture = { homeTeamId:string;awayTeamId:string;divisionId:string|null;round:number;roundLabel:string };
type PreviewGame = Fixture & { scheduledAt:string;venueId:string|null;notes:string };
const NONE='__none__';

function localDatePlus(date:string,days:number) {
 const d=new Date(date+'T12:00:00');
 d.setDate(d.getDate()+days);
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function timeToMinutes(time:string) { const [h,m]=time.split(':').map(Number);return h*60+m; }
function toLocalIso(date:string,minutes:number) {
 const d=new Date(date+'T00:00:00');
 d.setMinutes(minutes);
 return d.toISOString();
}
function fromLocalIso(value:string) {
 return new Date(value).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'});
}
function newId() {
 return typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2);
}
function roundRobin(ids:string[],cycles:number,divisionId:string|null):Fixture[] {
 if(ids.length<2)return [];
 const fixtures:Fixture[]=[];
 for(let cycle=0;cycle<cycles;cycle++){
  const rotation:(string|null)[]=[...ids];
  if(rotation.length%2)rotation.push(null);
  const roundCount=rotation.length-1;
  for(let r=0;r<roundCount;r++){
   for(let i=0;i<rotation.length/2;i++){
    const first=rotation[i],second=rotation[rotation.length-1-i];
    if(!first||!second)continue;
    const swap=(r+i+cycle)%2===1;
    fixtures.push({
     homeTeamId:swap?second:first,awayTeamId:swap?first:second,divisionId:divisionId,
     round:cycle*roundCount+r+1,roundLabel:'Regular season · Cycle '+(cycle+1)+' · Round '+(r+1)
    });
   }
   const last=rotation.pop()!;
   rotation.splice(1,0,last);
  }
 }
 return fixtures;
}
function bracketOpening(ids:string[],divisionId:string|null,label:string):{fixtures:Fixture[];byeCount:number} {
 if(ids.length<2)return {fixtures:[],byeCount:0};
 const bracketSize=2**Math.ceil(Math.log2(ids.length));
 const gameCount=ids.length-bracketSize/2;
 const entrants=ids.slice(ids.length-gameCount*2);
 const fixtures:Fixture[]=[];
 for(let i=0;i<gameCount;i++){
  fixtures.push({
   homeTeamId:entrants[i],awayTeamId:entrants[entrants.length-1-i],divisionId:divisionId,round:1,
   roundLabel:label+' · Opening round'
  });
 }
 return {fixtures:fixtures,byeCount:ids.length-gameCount*2};
}

export function CommandScheduleGenerator() {
 const db=useMemo(()=>getSupabaseClient() as any,[]);
 const [seasons,setSeasons]=useState<Row[]>([]);
 const [teams,setTeams]=useState<Row[]>([]);
 const [divisions,setDivisions]=useState<Row[]>([]);
 const [teamSeasons,setTeamSeasons]=useState<TeamSeasonRow[]>([]);
 const [venues,setVenues]=useState<Row[]>([]);
 const [seasonId,setSeasonId]=useState('');
 const [divisionId,setDivisionId]=useState('all');
 const [format,setFormat]=useState<Format>('regular');
 const [tournamentMode,setTournamentMode]=useState<TournamentMode>('single-elimination');
 const [selectedTeamIds,setSelectedTeamIds]=useState<string[]>([]);
 const [entrantCount,setEntrantCount]=useState(8);
 const [cycles,setCycles]=useState(1);
 const [poolSize,setPoolSize]=useState(4);
 const [tournamentName,setTournamentName]=useState('');
 const [startDate,setStartDate]=useState(()=>localDatePlus((()=>{const d=new Date();d.setDate(d.getDate()+7);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');})(),0));
 const [startTime,setStartTime]=useState('10:00');
 const [daysBetweenRounds,setDaysBetweenRounds]=useState(7);
 const [slotMinutes,setSlotMinutes]=useState(100);
 const [venueId,setVenueId]=useState('');
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [preview,setPreview]=useState<PreviewGame[]>([]);
 const [previewRunId,setPreviewRunId]=useState('');
 const [conflicts,setConflicts]=useState<string[]>([]);
 const [byes,setByes]=useState(0);
 const [generatedTitle,setGeneratedTitle]=useState('');

 const load=useCallback(async()=>{
  if(!db){setError('RCH data connection is unavailable.');setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const [seasonQ,teamQ,divisionQ,teamSeasonQ,venueQ]=await Promise.all([
    db.from('seasons').select('id,name,status').order('start_date',{ascending:false}).limit(100),
    db.from('teams').select('id,name,short_name,is_active').eq('is_active',true).order('name').limit(500),
    db.from('divisions').select('id,season_id,name').order('name').limit(250),
    db.from('team_seasons').select('team_id,season_id,division_id,seed').limit(1000),
    db.from('venues').select('id,name,city').order('name').limit(250)
   ]);
   const failed=[seasonQ,teamQ,divisionQ,teamSeasonQ,venueQ].find(x=>x.error);
   if(failed?.error)throw new Error(failed.error.message);
   const nextSeasons=seasonQ.data??[];
   setSeasons(nextSeasons);setTeams(teamQ.data??[]);setDivisions(divisionQ.data??[]);
   setTeamSeasons(teamSeasonQ.data??[]);setVenues(venueQ.data??[]);
   setSeasonId(current=>current||nextSeasons[0]?.id||'');
  }catch(e){setError(e instanceof Error?e.message:'League records could not be loaded.');}
  finally{setLoading(false);}
 },[db]);

 useEffect(()=>{void load();},[load]);
 useEffect(()=>{setDivisionId(format==='regular'?'all':(divisions.find(d=>d.season_id===seasonId)?.id||NONE));setPreview([]);setConflicts([]);},[seasonId,format,divisions]);
 const seasonDivisions=useMemo(()=>divisions.filter(d=>d.season_id===seasonId),[divisions,seasonId]);
 const candidateLinks=useMemo(()=>teamSeasons.filter(ts=>ts.season_id===seasonId&&(divisionId==='all'||(divisionId===NONE?ts.division_id===null:ts.division_id===divisionId))).map(ts=>({link:ts,team:teams.find(t=>t.id===ts.team_id)})).filter((x):x is {link:TeamSeasonRow;team:Row}=>Boolean(x.team)).sort((a,b)=>(a.link.seed??999)-(b.link.seed??999)||a.team.name.localeCompare(b.team.name)),[teamSeasons,seasonId,divisionId,teams]);
 const candidateKey=candidateLinks.map(x=>x.team.id).join('|');
 const availableEntrantCount=Math.min(32,candidateLinks.length);
 useEffect(()=>{setSelectedTeamIds(candidateLinks.map(x=>x.team.id));setPreview([]);setConflicts([]);},[candidateKey,candidateLinks]);
 useEffect(()=>{if(entrantCount>availableEntrantCount)setEntrantCount(Math.max(2,availableEntrantCount));},[availableEntrantCount,entrantCount]);
 const orderedSelected=selectedTeamIds.filter((id,index,all)=>all.indexOf(id)===index&&candidateLinks.some(x=>x.team.id===id));
 const chosenForBracket=orderedSelected.slice(0,entrantCount);
 const eligibleTeamLabel=(id:string)=>teams.find(t=>t.id===id)?.name||'Unknown team';

 function toggleTeam(id:string) {
  setSelectedTeamIds(items=>items.includes(id)?items.filter(x=>x!==id):[...items,id]);
  setPreview([]);setConflicts([]);
 }
 function moveSeed(index:number,direction:-1|1) {
  setSelectedTeamIds(items=>{const selected=items.filter(id=>candidateLinks.some(x=>x.team.id===id));const next=index+direction;if(next<0||next>=selected.length)return items;const copy=[...selected];[copy[index],copy[next]]=[copy[next],copy[index]];return copy;});
  setPreview([]);setConflicts([]);
 }
 function setLeagueFormat(next:Format) {
  setFormat(next);
  setDivisionId(next==='regular'?'all':(seasonDivisions[0]?.id||NONE));
  setDaysBetweenRounds(next==='tournament'?1:7);
  setPreview([]);setConflicts([]);setNotice('');
 }

 function makeFixtures():{fixtures:Fixture[];byeCount:number;title:string} {
  const seasonName=seasons.find(s=>s.id===seasonId)?.name||'RCH season';
  if(format==='regular'){
   const groups=new Map<string,{divisionId:string|null;teamIds:string[]}>();
   for(const item of candidateLinks){
    const key=item.link.division_id||NONE;
    const group=groups.get(key)||{divisionId:item.link.division_id,teamIds:[]};
    if(!group.teamIds.includes(item.team.id))group.teamIds.push(item.team.id);
    groups.set(key,group);
   }
   return {fixtures:[...groups.values()].flatMap(g=>roundRobin(g.teamIds,cycles,g.divisionId)),byeCount:0,title:'Regular season · '+seasonName};
  }
  if(format==='playoffs'){
   const result=bracketOpening(chosenForBracket,divisionId===NONE?null:divisionId,'Playoffs');
   return {...result,title:'Playoffs · '+seasonName};
  }
  const title='Tournament · '+(tournamentName.trim()||seasonName);
  if(tournamentMode==='pool-play'){
   const poolCount=Math.ceil(orderedSelected.length/poolSize);
   const baseSize=Math.floor(orderedSelected.length/poolCount);
   const remainder=orderedSelected.length%poolCount;
   let offset=0;
   const fixtures:Fixture[]=[];
   for(let i=0;i<poolCount;i++){
    const count=baseSize+(i<remainder?1:0);
    const groupIds=orderedSelected.slice(offset,offset+count);
    offset+=count;
    const poolName='Pool '+String.fromCharCode(65+i);
    fixtures.push(...roundRobin(groupIds,1,divisionId===NONE?null:divisionId).map(f=>({...f,roundLabel:'Tournament · '+poolName+' · Round '+f.round})));
   }
   return {fixtures:fixtures,byeCount:0,title:title};
  }
  const result=bracketOpening(orderedSelected,divisionId===NONE?null:divisionId,tournamentName.trim()||'Tournament');
  return {...result,title:title};
 }

 async function generatePreview() {
  setError('');setNotice('');setPreview([]);setConflicts([]);setByes(0);setBusy(true);
  try{
   if(!seasonId)throw new Error('Select a season first.');
   if(!startDate||!startTime)throw new Error('Set a start date and tipoff time.');
   if(format!=='regular'&&orderedSelected.length<2)throw new Error('Select at least two teams.');
   if(format==='playoffs'&&(chosenForBracket.length<2||chosenForBracket.length<entrantCount))throw new Error('Choose at least '+entrantCount+' playoff teams or reduce the seed count.');
   if(format==='tournament'&&orderedSelected.length>32)throw new Error('A tournament run supports up to 32 entrants. Split a larger field into more than one event.');
   if(format==='tournament'&&tournamentMode==='pool-play'&&orderedSelected.length<2)throw new Error('Pool play needs at least two teams.');
   const result=makeFixtures();
   if(!result.fixtures.length)throw new Error('There are not enough RCH teams assigned to this season/division to make a schedule.');
   if(result.fixtures.length>250)throw new Error('This run would create more than 250 games. Generate one division or a smaller block at a time.');
   const sorted=[...result.fixtures].sort((a,b)=>a.round-b.round||String(a.divisionId||'').localeCompare(String(b.divisionId||'')));
   const counts=new Map<number,number>();
   const runId=newId();
   const proposed=sorted.map(f=>{
    const slot=counts.get(f.round)||0;counts.set(f.round,slot+1);
    const date=localDatePlus(startDate,(f.round-1)*daysBetweenRounds);
    const minute=timeToMinutes(startTime)+slot*slotMinutes;
    if(minute<0||minute>1439)throw new Error('A round has more games than fit in one day at the selected time interval. Choose a later start time, shorter interval, or one division at a time.');
    return {...f,scheduledAt:toLocalIso(date,minute),venueId:venueId||null,notes:f.roundLabel+' · RCH schedule generator '+runId};
   });
   const {data:existingData,error:existingError}=await db.from('games').select('id,home_team_id,away_team_id,venue_id,scheduled_at,status').eq('season_id',seasonId).limit(5000);
   if(existingError)throw new Error(existingError.message);
   const existing=existingData??[];
   const messages:string[]=[];
   for(const item of proposed){
    const start=new Date(item.scheduledAt).getTime();
    for(const game of existing){
     if(String(game.status||'').toLowerCase()==='cancelled')continue;
     const sameDay=new Date(game.scheduled_at).toDateString()===new Date(item.scheduledAt).toDateString();
     const sameTeam=game.home_team_id===item.homeTeamId||game.home_team_id===item.awayTeamId||game.away_team_id===item.homeTeamId||game.away_team_id===item.awayTeamId;
     const gap=Math.abs(new Date(game.scheduled_at).getTime()-start);
     const sameVenue=Boolean(item.venueId)&&game.venue_id===item.venueId&&gap<slotMinutes*60000;
     if(sameTeam&&sameDay)messages.push(eligibleTeamLabel(game.home_team_id)+' / '+eligibleTeamLabel(game.away_team_id)+' already has a game on '+fromLocalIso(game.scheduled_at));
     if(sameVenue)messages.push('Venue already has a game near '+fromLocalIso(item.scheduledAt));
    }
   }
   const seenTeamDay=new Set<string>();
   for(const item of proposed){
    for(const id of [item.homeTeamId,item.awayTeamId]){
     const key=id+':'+new Date(item.scheduledAt).toDateString();
     if(seenTeamDay.has(key))messages.push(eligibleTeamLabel(id)+' has more than one generated game on the same day.');
     seenTeamDay.add(key);
    }
   }
   const unique=[...new Set(messages)].slice(0,15);
   setPreview(proposed);setPreviewRunId(runId);setConflicts(unique);setByes(result.byeCount);setGeneratedTitle(result.title);
   setNotice(unique.length?'Preview generated with scheduling conflicts to resolve.':'Preview generated. Review matchups, then save them to RCH.');
  }catch(e){setError(e instanceof Error?e.message:'Could not generate the schedule preview.');}
  finally{setBusy(false);}
 }

 async function saveSchedule() {
  if(!preview.length||!previewRunId)return;
  if(conflicts.length){setError('Resolve the listed conflicts before saving this schedule.');return;}
  setSaving(true);setError('');setNotice('');
  try{
   const {data:userData,error:userError}=await db.auth.getUser();
   if(userError)throw userError;
   const userId=userData.user?.id;
   if(!userId)throw new Error('Your RCH session is unavailable. Sign in again.');
   const {data:prior,error:priorError}=await db.from('games').select('id').ilike('notes','%RCH schedule generator '+previewRunId+'%').limit(1);
   if(priorError)throw new Error(priorError.message);
   if(prior?.length)throw new Error('This schedule run already has saved games. Refresh the schedule before generating another one.');
   const rows=preview.map(item=>({
    season_id:seasonId,division_id:item.divisionId,home_team_id:item.homeTeamId,away_team_id:item.awayTeamId,
    venue_id:item.venueId,scheduled_at:item.scheduledAt,status:'scheduled',notes:item.notes,created_by:userId
   }));
   const {data:saved,error:saveError}=await db.from('games').insert(rows).select('id');
   if(saveError)throw new Error(saveError.message);
   setPreview([]);setConflicts([]);
   setNotice((saved?.length??rows.length)+' game(s) saved to the RCH schedule.');
  }catch(e){setError(e instanceof Error?e.message:'Schedule could not be saved.');}
  finally{setSaving(false);}
 }

 const currentMode=format==='playoffs'?'Single elimination':format==='regular'?'Round robin':tournamentMode==='pool-play'?'Tournament pool play':'Tournament single elimination';
 const canGenerate=!loading&&!busy&&Boolean(seasonId);
 const input='mt-1 w-full rounded-lg border border-white/10 bg-[#070b12] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-300/50';
 const label='block text-[10px] font-black uppercase tracking-[.13em] text-white/45';

 return <div className="space-y-5">
  <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_90%_0%,rgba(59,130,246,.17),transparent_28rem),linear-gradient(145deg,#0d1726,#080c13)] p-5 sm:p-7">
   <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">RCH-NATIVE SCHEDULING</p>
   <h2 className="mt-2 font-display text-3xl font-black uppercase">Schedule generator</h2>
   <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">Build a regular-season rotation, seeded playoff opening round, or tournament schedule from RCH teams. Review and resolve conflicts before anything is written to the league schedule.</p>
  </section>
  {error&&<div role="alert" className="rounded-xl border border-red-300/20 bg-red-300/[.06] px-4 py-3 text-sm text-red-100/80">{error}</div>}
  {notice&&<div role="status" className={'rounded-xl border px-4 py-3 text-sm '+(conflicts.length?'border-amber-300/20 bg-amber-300/[.06] text-amber-100/80':'border-blue-300/20 bg-blue-300/[.06] text-blue-100/80')}>{notice}</div>}
  {loading?<div className="rounded-xl border border-white/10 bg-white/[.03] p-6 text-sm text-white/45">Loading RCH seasons, teams, divisions, and venues…</div>:
   !seasons.length?<div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/45">Create a season and assign teams in the League Setup tab before generating a schedule.</div>:
   <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,.85fr)]">
    <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
     <h3 className="font-display text-xl font-black uppercase">Generator settings</h3>
     <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className={label}>Schedule type<select className={input} value={format} onChange={e=>setLeagueFormat(e.target.value as Format)}><option value="regular">Regular season</option><option value="playoffs">Playoffs</option><option value="tournament">Tournament</option></select></label>
      <label className={label}>Season<select className={input} value={seasonId} onChange={e=>{setSeasonId(e.target.value);setDivisionId('all');setPreview([]);setConflicts([]);}}><option value="">Select season</option>{seasons.map(s=><option key={s.id} value={s.id}>{s.name} · {s.status}</option>)}</select></label>
      <label className={label}>Division<select className={input} value={divisionId} onChange={e=>{setDivisionId(e.target.value);setPreview([]);setConflicts([]);}}>{format==='regular'&&<option value="all">All divisions (scheduled separately)</option>}<option value={NONE}>Unassigned teams</option>{seasonDivisions.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      {format==='regular'&&<label className={label}>Round robin cycles<select className={input} value={cycles} onChange={e=>{setCycles(Number(e.target.value));setPreview([]);setConflicts([]);}}>{[1,2,3,4].map(n=><option key={n} value={n}>{n} {n===1?'cycle':'cycles'} per team</option>)}</select></label>}
      {format==='tournament'&&<><label className={label}>Tournament name<input className={input} value={tournamentName} onChange={e=>{setTournamentName(e.target.value);setPreview([]);setConflicts([]);}} placeholder="Virginia Summer Classic"/></label><label className={label}>Tournament format<select className={input} value={tournamentMode} onChange={e=>{setTournamentMode(e.target.value as TournamentMode);setPreview([]);setConflicts([]);}}><option value="single-elimination">Single elimination</option><option value="pool-play">Pool play</option></select></label>{tournamentMode==='pool-play'&&<label className={label}>Teams per pool<select className={input} value={poolSize} onChange={e=>{setPoolSize(Number(e.target.value));setPreview([]);setConflicts([]);}}>{[3,4,5,6,7,8].map(n=><option key={n} value={n}>{n} per pool</option>)}</select></label>}</>}
      {format!=='regular'&&<div className="sm:col-span-2 rounded-xl border border-white/5 bg-black/20 p-3">
       <div className="flex flex-wrap items-center justify-between gap-3"><div><p className={label}>Entrants & seed order</p><p className="mt-1 text-[10px] text-white/35">Use arrows to set seeds. Bracket generation uses this order.</p></div>{format==='playoffs'&&<label className="text-[10px] font-black uppercase text-white/45">Playoff field<select className="ml-2 rounded-lg border border-white/10 bg-[#070b12] px-2 py-2 text-white" value={entrantCount} onChange={e=>{setEntrantCount(Number(e.target.value));setPreview([]);setConflicts([]);}}>{Array.from({length:Math.max(0,availableEntrantCount-1)},(_,i)=>i+2).map(n=><option key={n} value={n}>Top {n}</option>)}</select></label>}</div>
       <div className="mt-3 space-y-1">{candidateLinks.map((item,index)=>{const id=item.team.id;const included=selectedTeamIds.includes(id);const orderIndex=orderedSelected.indexOf(id);return <div key={id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/[.03]"><input type="checkbox" aria-label={'Include '+item.team.name} checked={included} onChange={()=>toggleTeam(id)} className="accent-blue-400"/><span className={'flex-1 text-xs '+(included?'text-white/80':'text-white/30')}>{item.team.name}</span>{item.link.seed&&<span className="text-[9px] text-white/30">saved seed {item.link.seed}</span>}{included&&<span className="text-[9px] font-black uppercase tracking-wider text-blue-200">#{orderIndex+1}</span>}<button type="button" aria-label={'Move '+item.team.name+' up in seed order'} onClick={()=>moveSeed(orderIndex,-1)} disabled={!included||orderIndex<=0} className="rounded px-2 py-1 text-xs text-white/40 disabled:opacity-20">↑</button><button type="button" aria-label={'Move '+item.team.name+' down in seed order'} onClick={()=>moveSeed(orderIndex,1)} disabled={!included||orderIndex<0||orderIndex>=orderedSelected.length-1} className="rounded px-2 py-1 text-xs text-white/40 disabled:opacity-20">↓</button></div>})}
       {!candidateLinks.length&&<p className="text-xs text-amber-200/70">No RCH teams are assigned to this season/division yet.</p>}</div>
      </div>}
      <label className={label}>First game date<input type="date" className={input} value={startDate} onChange={e=>{setStartDate(e.target.value);setPreview([]);setConflicts([]);}}/></label>
      <label className={label}>First tipoff<input type="time" className={input} value={startTime} onChange={e=>{setStartTime(e.target.value);setPreview([]);setConflicts([]);}}/></label>
      <label className={label}>Days between rounds<input type="number" min="1" max="30" className={input} value={daysBetweenRounds} onChange={e=>{setDaysBetweenRounds(Math.max(1,Number(e.target.value)));setPreview([]);setConflicts([]);}}/></label>
      <label className={label}>Time between games (minutes)<input type="number" min="60" max="300" step="5" className={input} value={slotMinutes} onChange={e=>{setSlotMinutes(Math.max(60,Number(e.target.value)));setPreview([]);setConflicts([]);}}/><span className="mt-1 block text-[9px] font-normal normal-case tracking-normal text-white/30">Includes game time and changeover.</span></label>
      <label className={label}>Venue (optional)<select className={input} value={venueId} onChange={e=>{setVenueId(e.target.value);setPreview([]);setConflicts([]);}}><option value="">Venue TBD</option>{venues.map(v=><option key={v.id} value={v.id}>{v.name}{v.city?' · '+v.city:''}</option>)}</select></label>
     </div>
     <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={()=>void generatePreview()} disabled={!canGenerate} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-400 disabled:opacity-50"><FaWandMagicSparkles/>{busy?'Generating…':'Generate preview'}</button><button type="button" onClick={()=>{setPreview([]);setConflicts([]);setError('');setNotice('');}} disabled={!preview.length||saving} className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-wider text-white/55 disabled:opacity-30">Clear preview</button></div>
    </section>
    <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
     <div className="flex items-center gap-3"><FaCalendarDays className="text-blue-300"/><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">PREVIEW · {currentMode.toUpperCase()}</p><h3 className="font-display text-xl font-black uppercase">{preview.length?generatedTitle:'No schedule generated'}</h3></div></div>
     {preview.length>0&&<><div className="mt-4 flex flex-wrap gap-2 text-[10px] text-white/45"><span className="rounded-full bg-white/[.06] px-2 py-1">{preview.length} games</span><span className="rounded-full bg-white/[.06] px-2 py-1">{new Set(preview.map(g=>new Date(g.scheduledAt).toDateString())).size} event dates</span>{byes>0&&<span className="rounded-full bg-blue-300/10 px-2 py-1 text-blue-200">{byes} seeded bye(s)</span>}</div>
      <div className="mt-4 max-h-[560px] space-y-2 overflow-y-auto">{preview.map((g,i)=><div key={i} className="rounded-lg border border-white/5 bg-black/20 px-3 py-3"><div className="flex items-center justify-between gap-3"><span className="text-[9px] font-black uppercase tracking-wider text-blue-200">{g.roundLabel}</span><span className="text-[9px] text-white/35">{g.venueId?venues.find(v=>v.id===g.venueId)?.name:'Venue TBD'}</span></div><strong className="mt-1 block text-sm">{eligibleTeamLabel(g.homeTeamId)} <span className="text-white/30">vs</span> {eligibleTeamLabel(g.awayTeamId)}</strong><small className="mt-1 block text-[10px] text-white/40">{fromLocalIso(g.scheduledAt)}</small></div>)}</div>
      {conflicts.length>0&&<div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[.05] p-3"><p className="flex items-center gap-2 text-xs font-bold text-amber-100"><FaTriangleExclamation/>Conflicts found</p><ul className="mt-2 space-y-1 text-[10px] text-amber-100/65">{conflicts.map((c,i)=><li key={i}>• {c}</li>)}</ul></div>}
      {(format==='playoffs'||(format==='tournament'&&tournamentMode==='single-elimination'))&&byes>0&&<p className="mt-3 rounded-lg border border-blue-300/15 bg-blue-300/[.04] p-3 text-[10px] leading-5 text-blue-100/65">The top {byes} seed(s) receive a bye. The generator creates only matchups with known teams; generate the next round after results are entered.</p>}
      {(format==='playoffs'||(format==='tournament'&&tournamentMode==='single-elimination'))&&<p className="mt-3 rounded-lg border border-white/5 bg-black/20 p-3 text-[10px] leading-5 text-white/40">The opening round is scheduled now. Later bracket games are generated after results identify the advancing teams.</p>}{format==='tournament'&&tournamentMode==='pool-play'&&<p className="mt-3 rounded-lg border border-white/5 bg-black/20 p-3 text-[10px] leading-5 text-white/40">This creates round-robin games within balanced pools. After results are recorded, select the qualifiers in the Playoffs generator to create the elimination bracket.</p>}
      <button type="button" onClick={()=>void saveSchedule()} disabled={saving||conflicts.length>0||!preview.length} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-3 text-xs font-black uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-35"><FaCircleCheck/>{saving?'Saving…':'Save generated games to RCH'}</button>
     </>}
     {!preview.length&&<p className="mt-4 text-sm leading-6 text-white/40">Configure a schedule and generate a preview. Games are saved only when you select the save action.</p>}
    </section>
   </div>}
 </div>;
}

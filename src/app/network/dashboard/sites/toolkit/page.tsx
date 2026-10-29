'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import QRCode from 'react-qr-code';
import {Container} from '@/components/Container';
import {useAuth} from '@/hooks/useAuth';
import {EMPTY_BUDGET,TOOLKIT_FREE_LIMITS,generateRoundRobin,parseToolkitTeams,
  parseToolkitGames,calculateToolkitBudget,buildGameDayPack,
  type ToolkitTeam,type ToolkitPlayer,type ToolkitGame,type ToolkitBudget,
  type ToolkitForm} from '@/lib/rch-sites-free-toolkit';

type Org={id:string;name:string;eligible:boolean;member_role:string};
type Registration={id:string;name:string;email:string;created_at:string};
type Project={teams:ToolkitTeam[];games:ToolkitGame[];budget:ToolkitBudget;form:ToolkitForm;schedule_public:boolean;revision:number};
type Result={project:Project;registrations:Registration[];publicSlug:string|null;organizationName:string;error?:string};
const blank:Project={teams:[],games:[],budget:{...EMPTY_BUDGET},form:{title:'Basketball Registration',open:false},schedule_public:false,revision:0};
const tabNames=['Schedule','Rosters','Registration','Game Day','Budget'] as const;
type Tab=typeof tabNames[number];
const input='min-h-11 w-full rounded-xl border border-white/20 bg-[#141923] px-3 py-2 text-white';
const btn='min-h-11 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50';
const money=(c:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100);
const freshId=()=>typeof crypto!=='undefined'&&'randomUUID'in crypto?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2);
function exportCsv(filename:string,headers:string[],rows:string[][]){
  const quoted=(v:string)=>'"'+v.replace(/^([=+@-])/,"'$1").replace(/"/g,'""')+'"';
  const csv=[headers,...rows].map(row=>row.map(quoted).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
export default function BasketballToolkitPage(){
  const {user,loading:authLoading}=useAuth();
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [organizationId,setOrg]=useState('');
  const [data,setData]=useState<Project>(blank);
  const [registrations,setRegistrations]=useState<Registration[]>([]);
  const [slug,setSlug]=useState<string|null>(null);
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [scheduleDirty,setScheduleDirty]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [tab,setTab]=useState<Tab>('Schedule');
  const [newTeam,setNewTeam]=useState('');
  const [rosterTeam,setRosterTeam]=useState('');
  const [playerName,setPlayerName]=useState('');
  const [playerNumber,setPlayerNumber]=useState('');
  const [startDate,setStartDate]=useState('2026-11-03');
  const [time,setTime]=useState('18:30');
  const [day,setDay]=useState<number[]>([2,4]);
  const [gamesPerDay,setGamesPerDay]=useState(2);
  const [gameDate,setGameDate]=useState('');
  const teamName=(id:string)=>data.teams.find(t=>t.id===id)?.name||'Unknown team';
  useEffect(()=>{
    if(authLoading||!user)return;
    let active=true;
    void fetch('/api/rch-sites',{cache:'no-store'}).then(async r=>{
      if(!r.ok)throw Error('Unable to load your organizations.');
      const json=await r.json();
      if(!active)return;
      const allowed:Org[]=(json.organizations||[]).filter((o:Org)=>
        o.eligible&&['owner','manager'].includes(o.member_role));
      setOrgs(allowed);
      const requested=new URLSearchParams(location.search).get('organizationId');
      setOrg(allowed.find(o=>o.id===requested)?.id||allowed[0]?.id||'');
      if(!allowed.length)setLoaded(true);
    }).catch(e=>{if(active){setError(String(e));setLoaded(true);}});
    return()=>{active=false;};
  },[authLoading,user]);
  useEffect(()=>{
    if(!organizationId)return;
    const controller=new AbortController();
    setLoaded(false);setError('');setMessage('');setScheduleDirty(false);setData(blank);setRegistrations([]);setSlug(null);
    void fetch('/api/rch-sites/toolkit?organizationId='+encodeURIComponent(organizationId),
      {signal:controller.signal,cache:'no-store'}).then(async r=>{
      const body=await r.json() as Result;
      if(!r.ok)throw Error(body.error||'Toolkit is unavailable.');
      if(controller.signal.aborted)return;
      setData(body.project);setRegistrations(body.registrations);setSlug(body.publicSlug);
      setRosterTeam(body.project.teams[0]?.id||'');
      setGameDate(body.project.games[0]?.date||'');
    }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Toolkit unavailable.');})
      .finally(()=>{if(!controller.signal.aborted)setLoaded(true);});
    return()=>controller.abort();
  },[organizationId]);
  const save=async(action:string,value:unknown)=>{
    if(busy||!organizationId)return;
    setBusy(true);setError('');setMessage('');
    try{
      const response=await fetch('/api/rch-sites/toolkit',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({organizationId,action,value,revision:data.revision}),
      });
      const body=await response.json() as {error?:string;revision?:number};
      if(!response.ok||typeof body.revision!=='number')throw Error(body.error||'Save failed');
      const key=action==='saveTeams'?'teams':action==='saveGames'?'games':
        action==='saveForm'?'form':'budget';
      setData(current=>action==='publishSchedule'||action==='unpublishSchedule'
        ?{...current,schedule_public:action==='publishSchedule',revision:body.revision!}
        :{...current,[key]:value,schedule_public:action==='saveGames'?false:current.schedule_public,revision:body.revision!});
      if(action==='saveGames')setScheduleDirty(false);
      setMessage('Saved successfully.');
    }catch(e){setError(e instanceof Error?e.message:'Unable to save.');}
    finally{setBusy(false);}
  };
  const addTeam=()=>{
    try{
      const teams=parseToolkitTeams([...data.teams,{id:freshId(),name:newTeam,players:[]}]);
      void save('saveTeams',teams);
      setNewTeam('');
    }catch(e){setError(e instanceof Error?e.message:'Unable to add team');}
  };
  const addPlayer=()=>{
    try{
      const teams=parseToolkitTeams(data.teams.map(t=>t.id===rosterTeam
        ?{...t,players:[...t.players,{id:freshId(),name:playerName,number:playerNumber}]}:t));
      void save('saveTeams',teams);setPlayerName('');setPlayerNumber('');
    }catch(e){setError(e instanceof Error?e.message:'Unable to add player');}
  };
  const generate=()=>{
    try{
      const games=generateRoundRobin({teams:data.teams,startDate,weekdays:day,tipoff:time,
        gamesPerDay,slotMinutes:60,court:'Main Court'});
      void save('saveGames',games);setGameDate(games[0]?.date||'');
    }catch(e){setError(e instanceof Error?e.message:'Unable to generate schedule');}
  };
  const packet=useMemo(()=>gameDate?buildGameDayPack(data.teams,data.games,gameDate):[],
    [data.teams,data.games,gameDate]);
  const totals=useMemo(()=>calculateToolkitBudget(data.budget),[data.budget]);
  const publicRegistration=slug?locationOrigin()+'/sites/'+slug+'/toolkit-register':'';
  const currentTeam=data.teams.find(t=>t.id===rosterTeam);
  return <main className="min-h-screen bg-[#090b11] pb-24 text-white">
    <style>{'@media print{body *{visibility:hidden!important}#rch-print-pack,#rch-print-pack *{visibility:visible!important}#rch-print-pack{position:absolute!important;left:0;top:0;width:100%;color:black!important;background:white!important;padding:20px!important}#rch-print-pack *{color:black!important}}'}</style>
    <Container maxWidth="xl" className="py-8 sm:py-12">
      <Link href={'/network/dashboard/sites/overview'+(organizationId?'?organizationId='+encodeURIComponent(organizationId):'')}
        className="text-sm text-sky-300">← Organization HQ</Link>
      <h1 className="mt-6 text-3xl font-black">Basketball Toolkit</h1>
      <p className="mt-2 text-sm text-white/60">Real tools for basketball organizers. Basic schedules, rosters, registration, packets and budgets are free.</p>
      {!authLoading&&!user?<Link className="mt-5 inline-block text-rose-300" href="/auth/sign-in">Sign in to continue</Link>:null}
      {orgs.length>0&&<label className="mt-5 block max-w-lg text-sm">Organization
        <select aria-label="Choose organization" className={input+' mt-2'} value={organizationId}
          disabled={busy} onChange={e=>setOrg(e.target.value)}>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
      </label>}
      {error&&<p role="alert" className="mt-4 rounded-xl border border-red-500/40 p-3 text-sm text-red-200">{error}</p>}
      {message&&<p role="status" className="mt-4 rounded-xl border border-emerald-500/40 p-3 text-sm text-emerald-200">{message}</p>}
      {!loaded&&user&&<p className="mt-6 text-white/60">Loading toolkit…</p>}
      {loaded&&user&&!orgs.length&&<p className="mt-6">Claim and verify an organization to use this toolkit.</p>}
      {loaded&&orgs.length>0&&!error.startsWith('The basketball toolkit is not released')&&<>
        <div className="mt-7 flex flex-wrap gap-2" role="tablist" aria-label="Toolkit sections">
          {tabNames.map(name=><button key={name} role="tab" aria-selected={tab===name}
            className={'min-h-11 rounded-xl border px-4 text-sm font-semibold '+(tab===name?'bg-rose-600 border-rose-600':'border-white/20')}
            onClick={()=>{setTab(name);setError('');setMessage('');}}>{name}</button>)}
        </div>
        {tab==='Rosters'&&<section className="mt-6 space-y-5">
          <h2 className="text-xl font-bold">Roster Builder</h2>
          <p className="text-sm text-white/60">Add up to 8 team names and manage one full roster of 20 players on Free. For now use adult player names only.</p>
          <div className="flex flex-wrap gap-2"><input className={input+' max-w-sm'} value={newTeam}
            onChange={e=>setNewTeam(e.target.value)} placeholder="Team name" aria-label="New team name"/>
            <button className={btn} disabled={busy||data.teams.length>=8} onClick={addTeam}>Add team</button></div>
          <div className="space-y-2">{data.teams.map(t=><div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/15 p-3">
            <span>{t.name} <span className="text-xs text-white/50">({t.players.length} players)</span></span>
            <button className="min-h-11 text-sm text-rose-300" disabled={busy}
              onClick={()=>{const teams=data.teams.filter(x=>x.id!==t.id);
                if(data.games.some(g=>g.homeId===t.id||g.awayId===t.id)){
                  setError('Clear the saved schedule before removing a scheduled team.');return;
                }
                void save('saveTeams',teams);if(rosterTeam===t.id)setRosterTeam(teams[0]?.id||'');}}>Remove</button>
          </div>)}</div>
          {!!data.teams.length&&<div className="rounded-xl border border-white/15 p-4">
            <label className="block text-sm">Manage a team roster<select className={input+' mt-2'} value={rosterTeam}
              onChange={e=>setRosterTeam(e.target.value)}>{data.teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <div className="mt-3 flex flex-wrap gap-2">
              <input className={input+' max-w-xs'} value={playerName} onChange={e=>setPlayerName(e.target.value)}
                placeholder="Adult player name" aria-label="Adult player name"/>
              <input className={input+' max-w-24'} value={playerNumber} onChange={e=>setPlayerNumber(e.target.value)}
                placeholder="#" aria-label="Jersey number"/>
              <button className={btn} onClick={addPlayer} disabled={busy||!rosterTeam}>Add player</button>
            </div>
            {currentTeam?.players.map(p=><div className="flex items-center justify-between border-b border-white/10 py-3" key={p.id}>
              <span>#{p.number||'—'} {p.name}</span>
              <button disabled={busy} className="min-h-11 text-sm text-rose-300"
                onClick={()=>void save('saveTeams',data.teams.map(t=>t.id===rosterTeam
                  ?{...t,players:t.players.filter(x=>x.id!==p.id)}:t))}>Remove</button>
            </div>)}
            <button className="mt-4 min-h-11 text-sky-300" onClick={()=>exportCsv('roster.csv',['Name','Jersey'],
              (currentTeam?.players||[]).map(p=>[p.name,p.number]))}>Export roster CSV</button>
          </div>}
        </section>}
        {tab==='Schedule'&&<section className="mt-6 space-y-4">
          <h2 className="text-xl font-bold">Schedule Studio</h2>
          <p className="text-sm text-white/60">One full round-robin, published and exportable without upgrading. Create team names in Rosters first.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">First game date<input className={input+' mt-2'} type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label>
            <label className="text-sm">First tipoff (ET)<input className={input+' mt-2'} type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>
            <label className="text-sm">Games per day<select className={input+' mt-2'} value={gamesPerDay} onChange={e=>setGamesPerDay(Number(e.target.value))}>
              {[1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
            <div><p className="text-sm">Game days</p><div className="mt-2 flex flex-wrap gap-3">{[['Tue',2],['Thu',4],['Sat',6],['Sun',0]].map(([name,value])=>
              <label key={name} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={day.includes(Number(value))}
                onChange={e=>setDay(d=>e.target.checked?[...d,Number(value)]:d.filter(x=>x!==Number(value)))}/>{name}</label>)}</div></div>
          </div>
          <button className={btn} disabled={busy||data.teams.length<2} onClick={generate}>Generate balanced schedule</button>
          <p className="text-xs text-white/50">Regenerating replaces this one schedule. Times are shown in Eastern Time. Review the schedule before sharing.</p>
          {!!data.games.length&&<>
            <div className="space-y-2">{data.games.map(game=><div key={game.id}
              className="grid items-center gap-2 rounded-xl border border-white/15 p-3 sm:grid-cols-[1fr_150px_115px]">
              <span className="text-sm font-semibold">{teamName(game.homeId)} vs {teamName(game.awayId)}</span>
              <input aria-label={'Date for '+game.id} type="date" className={input} value={game.date}
                onChange={e=>{setScheduleDirty(true);setData(p=>({...p,games:p.games.map(g=>g.id===game.id?{...g,date:e.target.value}:g)}));}}/>
              <input aria-label={'Time for '+game.id} type="time" className={input} value={game.time}
                onChange={e=>{setScheduleDirty(true);setData(p=>({...p,games:p.games.map(g=>g.id===game.id?{...g,time:e.target.value}:g)}));}}/>
            </div>)}</div>
            <button className={btn} disabled={busy} onClick={()=>{
              try{void save('saveGames',parseToolkitGames(data.games,data.teams));}
              catch(e){setError(e instanceof Error?e.message:'Schedule conflict');}
            }}>Save schedule changes</button>
            {slug&&<button className="ml-3 min-h-11 text-sky-300" onClick={()=>void save(data.schedule_public?'unpublishSchedule':'publishSchedule',null)}
              disabled={busy||scheduleDirty}>
              {data.schedule_public?'Unpublish schedule':'Publish schedule'}</button>}
            {slug&&data.schedule_public&&<a className="ml-3 inline-flex min-h-11 items-center text-sky-300"
              href={'/sites/'+slug+'/toolkit-schedule'} target="_blank" rel="noopener noreferrer">View public schedule</a>}
            <button className="ml-3 min-h-11 text-sky-300" onClick={()=>exportCsv('basketball-schedule.csv',
              ['Date (ET)','Time (ET)','Home','Away','Court'],
              data.games.map(g=>[g.date,g.time,teamName(g.homeId),teamName(g.awayId),g.court]))}>Export CSV</button>
          </>}
        </section>}
        {tab==='Registration'&&<section className="mt-6 max-w-2xl space-y-4">
          <h2 className="text-xl font-bold">Registration + QR</h2>
          <p className="text-sm text-white/60">Free adult-interest registration with name and email. Payments and athlete eligibility are separate.</p>
          <label className="block text-sm">Registration title<input className={input+' mt-2'} value={data.form.title}
            maxLength={80} onChange={e=>setData(s=>({...s,form:{...s.form,title:e.target.value}}))}/></label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={data.form.open}
            onChange={e=>setData(s=>({...s,form:{...s.form,open:e.target.checked}}))}/>Accept registrations</label>
          <button className={btn} disabled={busy} onClick={()=>void save('saveForm',data.form)}>Save registration settings</button>
          {slug&&<div className="rounded-xl border border-white/15 p-4">
            <p className="text-sm font-semibold">Public registration URL</p>
            <a className="mt-2 block break-all text-sm text-sky-300" href={publicRegistration}>{publicRegistration}</a>
            <div className="mt-4 inline-block rounded-xl bg-white p-3"><QRCode value={publicRegistration} size={140}/></div>
            <p className="mt-2 text-xs text-white/50">Scan or print this QR code. Registration opens only after you save an enabled form.</p>
          </div>}
          {!slug&&<p className="text-sm text-amber-200">Publish your organization&apos;s website to enable the public registration URL.</p>}
          <div className="space-y-2"><h3 className="font-semibold">Recent registrations ({registrations.length} shown)</h3>
            {registrations.map(r=><div key={r.id} className="rounded-xl border border-white/15 p-3 text-sm">
              <span>{r.name}</span><span className="ml-3 text-white/50">{r.email}</span>
            </div>)}
            <button className="min-h-11 text-sky-300" onClick={()=>exportCsv('registrations.csv',
              ['Name','Email','Submitted'],registrations.map(r=>[r.name,r.email,r.created_at]))}>Export registrations CSV</button>
          </div>
        </section>}
        {tab==='Game Day'&&<section className="mt-6 space-y-4">
          <h2 className="text-xl font-bold">Game Day Pack</h2>
          <label className="block max-w-xs text-sm">Choose game date<input className={input+' mt-2'} type="date" value={gameDate}
            onChange={e=>setGameDate(e.target.value)}/></label>
          <div id="rch-print-pack" className="rounded-xl border border-white/15 bg-white/5 p-5">
            <h3 className="text-xl font-bold">Game Day — {gameDate||'Select a date'}</h3>
            <p className="mt-1 text-sm">All games in Eastern Time</p>
            {packet.length===0&&<p className="mt-4 text-sm">No games on the selected day.</p>}
            {packet.map((game,i)=><div key={i} className="mt-5 border-t border-current/20 pt-3">
              <p className="font-bold">{game.time} · {game.court}</p>
              <p>{game.home} vs {game.away}</p>
              <p className="mt-2 text-sm">Score: ______ — ______</p>
              <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                {[game.homePlayers,game.awayPlayers].map((players,index)=><div key={index}>
                  {players.map((p:ToolkitPlayer)=><p key={p.id}>#{p.number} {p.name}</p>)}
                </div>)}
              </div>
            </div>)}
          </div>
          <button className={btn} disabled={!packet.length} onClick={()=>window.print()}>Print / Save as PDF</button>
        </section>}
        {tab==='Budget'&&<section className="mt-6 space-y-4">
          <h2 className="text-xl font-bold">Basketball Budget Calculator</h2>
          <p className="text-sm text-white/60">Estimate costs and break-even registration. These are projections, not verified revenue.</p>
          <div className="grid gap-3 sm:grid-cols-2">{([
            ['gymHours','Gym hours','units'],['gymRateCents','Gym rate per hour','dollars'],
            ['games','Games','units'],['refsPerGame','Referees per game','units'],
            ['refereeFeeCents','Fee per referee','dollars'],['uniforms','Uniforms','units'],
            ['uniformCostCents','Uniform cost each','dollars'],['otherCents','Other expenses','dollars'],
            ['teams','Paying teams','units'],['entryFeeCents','Entry fee per team','dollars'],
          ] as const).map(([key,label,kind])=><label className="text-sm" key={key}>{label}
            <input type="number" min="0" step={kind==='dollars'?'0.01':'1'} className={input+' mt-2'}
              value={kind==='dollars'?(data.budget[key]/100).toFixed(2):data.budget[key]}
              onChange={e=>{
                const amount=Number(e.target.value);
                if(!Number.isFinite(amount)||amount<0)return;
                const value=kind==='dollars'?Math.round(amount*100):Math.floor(amount);
                setData(s=>({...s,budget:{...s.budget,[key]:value}}));
              }}/>
          </label>)}</div>
          <div className="grid gap-3 rounded-xl border border-white/15 p-4 sm:grid-cols-3">
            <div><p className="text-xs text-white/60">Projected cost</p><p className="text-xl font-bold">{money(totals.cost)}</p></div>
            <div><p className="text-xs text-white/60">Projected revenue</p><p className="text-xl font-bold">{money(totals.revenue)}</p></div>
            <div><p className="text-xs text-white/60">Projected surplus / shortfall</p><p className="text-xl font-bold">{money(totals.profit)}</p></div>
          </div>
          <p className="text-sm text-white/70">Break-even teams: {totals.breakEvenTeams??'Set an entry fee to calculate'}</p>
          <button className={btn} disabled={busy} onClick={()=>void save('saveBudget',data.budget)}>Save budget</button>
          <button className="ml-3 min-h-11 text-sky-300" onClick={()=>exportCsv('basketball-budget.csv',
            ['Category','Amount USD'],[['Gym',money(totals.gym)],['Referees',money(totals.refs)],
              ['Uniforms',money(totals.uniforms)],['Other',money(data.budget.otherCents)],
              ['Total Cost',money(totals.cost)],['Revenue',money(totals.revenue)],
              ['Profit',money(totals.profit)]])}>Export CSV</button>
        </section>}
      </>}
    </Container>
  </main>;
}
function locationOrigin(){return typeof window==='undefined'?'https://richcityhoops.com':window.location.origin;}

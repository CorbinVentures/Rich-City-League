'use client';

import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Container} from '@/components/Container';
import {useAuth} from '@/hooks/useAuth';
import {FaArrowLeft,FaArrowRight,FaBasketball,FaCalendarDays,FaCheck,FaPlus,FaUsers} from 'react-icons/fa6';

type Org={id:string;name:string;eligible:boolean;member_role:string};
type Program={id:string;name:string;kind:string;capacity:number;status:string};
type Registration={id:string;program_id:string;profile_id:string;status:string};
type Session={id:string;program_id:string;coach_profile_id:string;starts_at:string;ends_at:string;status:string};
type Coach={profile_id:string;member_role:string;name:string};
type Data={available:boolean;reason?:string;tier?:string;programs:Program[];registrations:Registration[];
  sessions:Session[];coaches:Coach[];names:Record<string,string>;slug?:string|null};
const empty:Data={available:false,programs:[],registrations:[],sessions:[],coaches:[],names:{}};
const field='mt-1.5 min-h-11 w-full rounded-xl border border-white/20 bg-[#141923] px-3 py-2 text-sm text-white';
const card='rounded-2xl border border-white/15 bg-white/[.04] p-5';
function readable(iso:string){const d=new Date(iso);return Number.isFinite(d.getTime())?d.toLocaleString():'Invalid time';}
export default function AmateurProgramsPage(){
  const {user,loading:authLoading}=useAuth();
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [organizationId,setOrganizationId]=useState('');
  const [data,setData]=useState<Data>(empty);
  const [loading,setLoading]=useState(true);
  const [loadedFor,setLoadedFor]=useState('');
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [name,setName]=useState('');
  const [kind,setKind]=useState('training');
  const [capacity,setCapacity]=useState(12);
  const [programId,setProgramId]=useState('');
  const [coachId,setCoachId]=useState('');
  const [startAt,setStartAt]=useState('');
  const [minutes,setMinutes]=useState(60);
  const req=useRef(0);
  const activeOrg=useRef('');
  const load=useCallback(async(id:string)=>{
    const token=++req.current;
    const response=await fetch('/api/rch-sites/amateur?organizationId='+encodeURIComponent(id),{cache:'no-store'});
    const json=await response.json().catch(()=>({}));
    if(token!==req.current||activeOrg.current!==id)return;
    if(!response.ok)throw Error(json.error||'Unable to open basketball programs.');
    const payload=json as Data;
    setData(payload);
    setProgramId(previous=>payload.programs.some(p=>p.id===previous&&p.status==='open')?previous:
      payload.programs.find(p=>p.status==='open')?.id||'');
    setCoachId(previous=>payload.coaches.some(c=>c.profile_id===previous)?previous:payload.coaches[0]?.profile_id||'');
  },[]);
  useEffect(()=>{
    if(authLoading)return;
    if(!user){setLoading(false);return;}
    let alive=true;
    setLoading(true);setError('');setOrgs([]);setOrganizationId('');setData(empty);
    void fetch('/api/rch-sites',{cache:'no-store'}).then(async r=>{
      const json=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(json.error||'Unable to load organizations.');
      if(!alive)return;
      const allowed:Org[]=(json.organizations??[]).filter((org:Org)=>org.eligible&&['owner','manager'].includes(org.member_role));
      setLoadedFor(user.id);
      setOrgs(allowed);
      const requested=new URLSearchParams(window.location.search).get('organizationId');
      setOrganizationId(allowed.find(o=>o.id===requested)?.id||allowed[0]?.id||'');
    }).catch(e=>{if(alive){setLoadedFor(user.id);setError(e instanceof Error?e.message:'Unable to load organizations.');}})
      .finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[authLoading,user]);
  useEffect(()=>{
    activeOrg.current=organizationId;
    req.current++;
    setData(empty);setProgramId('');setCoachId('');setError('');setNotice('');
    if(!organizationId)return;
    void load(organizationId).catch(e=>{
      if(activeOrg.current===organizationId)setError(e instanceof Error?e.message:'Unable to load program records.');
    });
  },[organizationId,load]);
  async function act(action:'createProgram'|'closeProgram'|'createSession'|'cancelSession',id?:string){
    if(!organizationId||busy)return;
    const forOrg=organizationId;
    setBusy(action);setError('');setNotice('');
    const payload:Record<string,unknown>={action,organizationId};
    if(action==='createProgram')Object.assign(payload,{name,kind,capacity});
    if(action==='closeProgram')payload.programId=id;
    if(action==='cancelSession')payload.sessionId=id;
    if(action==='createSession'){
      if(!startAt||!Number.isFinite(new Date(startAt).getTime())){
        setError('Select a valid session date and time.');setBusy('');return;
      }
      Object.assign(payload,{programId,coachProfileId:coachId,startsAt:new Date(startAt).toISOString(),durationMinutes:minutes});
    }
    try{
      const response=await fetch('/api/rch-sites/amateur',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),
      });
      const json=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(json.error||'Unable to update program.');
      if(activeOrg.current!==forOrg)return;
      if(action==='createProgram')setName('');
      if(action==='createSession')setStartAt('');
      setNotice('Basketball program updated.');
      await load(forOrg);
    }catch(e){if(activeOrg.current===forOrg)setError(e instanceof Error?e.message:'Unable to update program.');}
    finally{setBusy('');}
  }
  const active=data.programs.filter(p=>p.status==='open');
  const chosen=active.find(p=>p.id===programId);
  const registered=(p:Program)=>data.registrations.filter(r=>r.program_id===p.id&&r.status==='registered');
  if(authLoading||loading||Boolean(user&&loadedFor!==user.id))return <Shell><p role="status">Opening basketball programs…</p></Shell>;
  if(!user)return <Shell>
    <h1 className="text-3xl font-black">Sign in to manage your programs.</h1>
    <Link className="mt-5 inline-flex rounded-xl bg-rose-600 px-5 py-3 font-bold" href="/auth/sign-in?next=/network/dashboard/sites/programs">Sign in</Link>
  </Shell>;
  return <Shell>
    <Link href={'/network/dashboard/sites/overview'+(organizationId?'?organizationId='+encodeURIComponent(organizationId):'')}
      className="inline-flex min-h-11 items-center gap-2 text-sm text-white/60"><FaArrowLeft/> Organization HQ</Link>
    <p className="mt-6 text-xs font-black uppercase tracking-widest text-rose-300">RCH Sites · Amateur operations</p>
    <h1 className="mt-2 text-3xl font-black sm:text-4xl">Basketball programs</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">Manage adult training groups, team rosters, tryouts, and coaching sessions. No youth registrations or customer payments are collected here.</p>
    {!orgs.length?<p className={card+' mt-6'}>You need a verified basketball organization and owner/manager access.</p>:<>
      <label className="mt-6 block max-w-md text-sm font-bold">Your organization
        <select className={field} value={organizationId} onChange={e=>setOrganizationId(e.target.value)}>
          {orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
      {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-400/30 p-4 text-rose-200">{error}</p>}
      {notice&&<p role="status" className="mt-5 rounded-xl border border-emerald-400/30 p-4 text-emerald-200">{notice}</p>}
      {!data.available?<div className={card+' mt-6'}>
        <h2 className="text-lg font-black">Basketball operations pilot</h2>
        <p className="mt-2 text-sm leading-6 text-white/60">{data.reason==='pilot'
          ?'Adult programs are being staged and are not enabled for organizations yet.'
          :data.reason==='subscription'?'An active Amateur or Professional website subscription is required.'
          :'The program service is not enabled or its database upgrade is pending.'}</p>
        <Link href={'/network/dashboard/sites/billing?organizationId='+encodeURIComponent(organizationId)}
          className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-sky-300">Website plan <FaArrowRight/></Link>
      </div>:<>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className={card}><FaBasketball className="text-rose-300"/><p className="mt-2 text-3xl font-black">{active.length}</p><p className="text-xs text-white/60">Open programs</p></div>
          <div className={card}><FaUsers className="text-rose-300"/><p className="mt-2 text-3xl font-black">{new Set(data.registrations.filter(r=>r.status==='registered').map(r=>r.profile_id)).size}</p><p className="text-xs text-white/60">Registered adults</p></div>
          <div className={card}><FaCalendarDays className="text-rose-300"/><p className="mt-2 text-3xl font-black">{data.sessions.filter(s=>s.status==='scheduled').length}</p><p className="text-xs text-white/60">Upcoming sessions</p></div>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className={card}>
            <h2 className="flex items-center gap-2 text-lg font-black"><FaPlus/> Create a program</h2>
            <label className="mt-5 block text-xs font-bold">Program name
              <input className={field} maxLength={90} value={name} onChange={e=>setName(e.target.value)} placeholder="Thursday shooting clinic"/>
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-bold">Type
                <select className={field} value={kind} onChange={e=>setKind(e.target.value)}>
                  <option value="training">Training</option><option value="team">Team</option>
                  <option value="tryout">Tryout</option><option value="camp">Camp</option>
                </select>
              </label>
              <label className="text-xs font-bold">Adult capacity
                <input className={field} type="number" min={1} max={100} value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/>
              </label>
            </div>
            <button type="button" disabled={Boolean(busy)||name.trim().length<3}
              onClick={()=>void act('createProgram')}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-black disabled:opacity-40">
              <FaPlus/> Create program
            </button>
          </section>
          <section className={card}>
            <h2 className="flex items-center gap-2 text-lg font-black"><FaCalendarDays/> Schedule a session</h2>
            <label className="mt-5 block text-xs font-bold">Program
              <select className={field} value={programId} onChange={e=>setProgramId(e.target.value)}>
                {active.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-xs font-bold">Coach or staff member
              <select className={field} value={coachId} onChange={e=>setCoachId(e.target.value)}>
                {data.coaches.map(c=><option key={c.profile_id} value={c.profile_id}>{c.name} · {c.member_role}</option>)}
              </select>
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-bold">Start (your local time)
                <input className={field} type="datetime-local" value={startAt} onChange={e=>setStartAt(e.target.value)}/>
              </label>
              <label className="text-xs font-bold">Duration
                <select className={field} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}>
                  {[30,45,60,90,120,180,240].map(v=><option key={v} value={v}>{v} minutes</option>)}
                </select>
              </label>
            </div>
            <p className="mt-3 text-xs text-white/55">Coaches cannot be double-booked. All registered adults are eligible to attend program sessions.</p>
            <button disabled={!chosen||!coachId||!startAt||Boolean(busy)} onClick={()=>void act('createSession')}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-black disabled:opacity-40">
              <FaPlus/> Add session
            </button>
          </section>
        </div>
        {data.slug&&<Link href={'/sites/'+encodeURIComponent(data.slug)+'/programs'}
          className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl border border-sky-300/40 px-4 text-sm font-bold text-sky-300">
          View adult registration page <FaArrowRight/>
        </Link>}
        <section className="mt-6 space-y-3" aria-label="Program rosters">
          <h2 className="text-xl font-black">Programs & adult rosters</h2>
          {data.programs.length===0&&<p className="text-sm text-white/55">Create a training group, team or tryout to get started.</p>}
          {data.programs.map(p=>{
            const roster=registered(p);
            return <article key={p.id} className={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-bold uppercase text-sky-300">{p.kind}</p>
                  <h3 className="mt-1 text-lg font-black">{p.name}</h3>
                  <p className="mt-1 text-xs text-white/55">{roster.length}/{p.capacity} adults · {p.status}</p></div>
                {p.status==='open'&&<button disabled={Boolean(busy)} onClick={()=>void act('closeProgram',p.id)}
                  className="min-h-11 rounded-lg border border-white/25 px-3 text-xs font-bold">Close registration</button>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {roster.length?roster.map(r=><span key={r.id} className="rounded-full border border-white/15 px-3 py-1.5 text-xs">
                  <FaCheck className="mr-1 inline text-emerald-300"/>{data.names[r.profile_id]||'RCH member'}
                </span>):<p className="text-xs text-white/50">No adult registrations yet.</p>}
              </div>
              <div className="mt-4 space-y-2">
                {data.sessions.filter(s=>s.program_id===p.id&&s.status==='scheduled').map(s=>
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2">
                    <div className="text-xs">{readable(s.starts_at)}
                      <span className="ml-2 text-white/50">Coach: {data.coaches.find(c=>c.profile_id===s.coach_profile_id)?.name||'Staff'}</span></div>
                    <button disabled={Boolean(busy)} onClick={()=>void act('cancelSession',s.id)}
                      className="min-h-10 text-xs text-rose-300 underline">Cancel</button>
                  </div>)}
              </div>
            </article>;
          })}
        </section>
      </>}
    </>}
  </Shell>;
}
function Shell({children}:{children:React.ReactNode}){
  return <main className="min-h-screen bg-[#090b11] pb-24 text-white">
    <Container maxWidth="xl" className="py-9 sm:py-14">{children}</Container>
  </main>;
}

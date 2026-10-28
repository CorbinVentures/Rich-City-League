'use client';

import Link from 'next/link';
import {useMemo,useState} from 'react';
import {Container} from '@/components/Container';
import {FaArrowLeft,FaArrowRight,FaBasketball,FaCalendarDays,FaCircleCheck,FaGlobe,
  FaPlus,FaRotate,FaShieldHalved,FaUsers} from 'react-icons/fa6';
import {
  RCH_DEMO_ORGANIZATION,RCH_DEMO_PROGRAMS,RCH_DEMO_SESSIONS,RCH_DEMO_COACHES,
  demoProgramLabel,type DemoProgram,type DemoProgramKind,type DemoSession,
} from '@/lib/rch-sites-demo';

type View='hq'|'website';
type Pane='overview'|'programs'|'calendar';
const card='rounded-2xl border border-white/15 bg-white/[.045] p-5';
const field='mt-2 min-h-11 w-full rounded-xl border border-white/20 bg-[#111d2a] px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400';
const seedPrograms=()=>RCH_DEMO_PROGRAMS.map(p=>({...p,participants:[...p.participants]}));
const seedSessions=()=>RCH_DEMO_SESSIONS.map(s=>({...s}));
const kinds:DemoProgramKind[]=['training','team','tryout','camp'];
const weekdays=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const timeSlots=['9:00 AM – 10:00 AM','10:00 AM – 12:00 PM','5:00 PM – 6:00 PM','6:00 PM – 7:00 PM','7:00 PM – 8:30 PM'];
const total=(programs:DemoProgram[])=>new Set(programs.flatMap(p=>p.participants)).size;

export function RchSitesDemoClient(){
  const [view,setView]=useState<View>('hq');
  const [pane,setPane]=useState<Pane>('overview');
  const [programs,setPrograms]=useState<DemoProgram[]>(seedPrograms);
  const [sessions,setSessions]=useState<DemoSession[]>(seedSessions);
  const [programName,setProgramName]=useState('');
  const [programKind,setProgramKind]=useState<DemoProgramKind>('training');
  const [programCapacity,setProgramCapacity]=useState(12);
  const [sessionProgram,setSessionProgram]=useState('skills');
  const [sessionCoach,setSessionCoach]=useState<string>(RCH_DEMO_COACHES[0]);
  const [sessionDay,setSessionDay]=useState('Friday');
  const [sessionTime,setSessionTime]=useState(timeSlots[3]);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [nextId,setNextId]=useState(1);
  const allParticipants=useMemo(()=>total(programs),[programs]);

  function reset(){
    setPrograms(seedPrograms());setSessions(seedSessions());setNextId(1);
    setProgramName('');setError('');setNotice('Example data restored. No live records were changed.');
  }
  function addProgram(){
    const name=programName.trim();
    if(name.length<3||name.length>90||!Number.isInteger(programCapacity)||
      programCapacity<1||programCapacity>100){
      setError('Enter a program name (3–90 characters) and a capacity of 1–100.');
      return;
    }
    if(programs.length>=10){setError('The demo shows up to 10 example programs. Reset to start over.');return;}
    const id='sample-program-'+nextId;
    setPrograms(previous=>[...previous,{id,name,kind:programKind,capacity:programCapacity,participants:[]}]);
    setNextId(n=>n+1);setProgramName('');setSessionProgram(id);
    setError('');setNotice('Example program added locally. Nothing was published or billed.');
  }
  function registerDemo(id:string){
    const program=programs.find(p=>p.id===id);
    if(!program||program.participants.length>=program.capacity){
      setError('This example program is at capacity. Choose another.');
      return;
    }
    const player='Example Adult '+nextId;
    setPrograms(previous=>previous.map(p=>p.id===id?
      {...p,participants:[...p.participants,player]}:p));
    setNextId(n=>n+1);setError('');
    setNotice('Simulated an adult registration for '+program.name+'. No real participant was registered.');
  }
  function addSession(){
    if(!programs.some(p=>p.id===sessionProgram)){setError('Choose an example program.');return;}
    if(sessions.some(s=>s.coach===sessionCoach&&s.day===sessionDay&&s.time===sessionTime)){
      setError('That sample coach already has a session in this time slot. Choose another.');return;
    }
    setSessions(previous=>[...previous,{
      id:'sample-session-'+nextId,programId:sessionProgram,coach:sessionCoach,
      day:sessionDay,time:sessionTime,court:'Training Court',
    }]);
    setNextId(n=>n+1);setError('');
    setNotice('Example session added locally. No calendars or messages were updated.');
  }
  function showPane(next:Pane){setView('hq');setPane(next);setError('');setNotice('');}
  const demoBanner=<div className="border-b border-amber-300/30 bg-[#352910] px-4 py-3 text-center text-xs font-bold leading-5 text-amber-100">
    DEMO ONLY · Fictional organization and participants · Changes stay in this browser view and reset on refresh · No purchases or real signups
  </div>;
  return <main className="min-h-screen bg-[#050b13] pb-24 text-white">
    {demoBanner}
    <Container maxWidth="xl" className="pt-8 sm:pt-12">
      <Link href="/website-creator" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-white/65">
        <FaArrowLeft aria-hidden="true"/> Website Creator
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-400/15 font-display text-xl font-black text-sky-200">
            {RCH_DEMO_ORGANIZATION.initials}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[.17em] text-sky-300">RCH Sites · Interactive example</p>
            <h1 className="mt-1 font-display text-3xl font-black uppercase leading-tight sm:text-4xl">{RCH_DEMO_ORGANIZATION.name}</h1>
            <p className="mt-2 text-sm text-white/60">{RCH_DEMO_ORGANIZATION.location} · Amateur plan example</p>
          </div>
        </div>
        <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-bold text-white/80">
          <FaRotate aria-hidden="true"/> Reset sample
        </button>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65">
        Explore how an independent adult basketball organization could use its website and private management tools. This is a product walkthrough, not an approved organization, a paid subscription, or an active registration service.
      </p>
      <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl border border-white/15 bg-white/[.04] p-1.5" role="group" aria-label="Example organization view">
        <button type="button" aria-pressed={view==='hq'} onClick={()=>setView('hq')}
          className={'min-h-12 rounded-xl text-sm font-black '+(view==='hq'?'bg-sky-400 text-[#071522]':'text-white/70')}>
          <FaUsers aria-hidden="true" className="mr-2 inline"/> Organization HQ
        </button>
        <button type="button" aria-pressed={view==='website'} onClick={()=>setView('website')}
          className={'min-h-12 rounded-xl text-sm font-black '+(view==='website'?'bg-sky-400 text-[#071522]':'text-white/70')}>
          <FaGlobe aria-hidden="true" className="mr-2 inline"/> Public website
        </button>
      </div>
      {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-400/40 bg-rose-950/25 px-4 py-3 text-sm text-rose-100">{error}</p>}
      {notice&&<p role="status" className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">{notice}</p>}

      {view==='hq'?<div className="mt-6">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Example Organization HQ sections">
          {([
            ['overview','Overview'],['programs','Adult programs & rosters'],['calendar','Coach calendar'],
          ] as const).map(([id,title])=>
            <button key={id} type="button" aria-pressed={pane===id} onClick={()=>showPane(id)}
              className={'min-h-11 rounded-xl border px-4 text-xs font-bold '+(pane===id?
                'border-sky-300 bg-sky-400/15 text-sky-200':'border-white/20 text-white/65')}>
              {title}
            </button>)}
        </div>
        {pane==='overview'&&<>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat icon={<FaBasketball/>} label="Active sample programs" value={String(programs.length)}/>
            <Stat icon={<FaUsers/>} label="Fictional adult participants" value={String(allParticipants)}/>
            <Stat icon={<FaCalendarDays/>} label="Sample group sessions" value={String(sessions.length)}/>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <section className={card}>
              <h2 className="text-lg font-black">Your next steps</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">See the roster and practice calendar the organization manager would use.</p>
              <button onClick={()=>showPane('programs')} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-sky-300">
                Open programs <FaArrowRight aria-hidden="true"/>
              </button>
            </section>
            <section className={card}>
              <h2 className="flex items-center gap-2 text-lg font-black"><FaShieldHalved className="text-sky-300"/> Separate by design</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">In real operations, rosters are private, registration is adult-only, and Stripe billing is checked on the server. This fictional demo has no backend write access.</p>
              <button onClick={()=>setView('website')} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-sky-300">
                Preview public site <FaArrowRight aria-hidden="true"/>
              </button>
            </section>
          </div>
        </>}
        {pane==='programs'&&<div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <section className={card+' self-start'}>
            <h2 className="text-lg font-black">Add an example program</h2>
            <p className="mt-2 text-xs leading-5 text-white/55">Try creating a fictional training group, team, camp or tryout. No real website content is created.</p>
            <label className="mt-5 block text-xs font-bold">Program name
              <input className={field} maxLength={90} value={programName} placeholder="Thursday 3v3 Clinic" onChange={e=>setProgramName(e.target.value)}/>
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-bold">Type
                <select className={field} value={programKind} onChange={e=>setProgramKind(e.target.value as DemoProgramKind)}>
                  {kinds.map(k=><option key={k} value={k}>{demoProgramLabel(k)}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold">Max adults
                <input className={field} min={1} max={100} type="number" value={programCapacity} onChange={e=>setProgramCapacity(Number(e.target.value))}/>
              </label>
            </div>
            <button type="button" onClick={addProgram}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 text-sm font-black text-[#071522]">
              <FaPlus aria-hidden="true"/> Add example program
            </button>
          </section>
          <section className="space-y-3" aria-label="Sample programs">
            <h2 className="text-lg font-black">Adult programs & sample rosters</h2>
            {programs.map(p=><article key={p.id} className={card}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-sky-300">{demoProgramLabel(p.kind)}</p>
                  <h3 className="mt-1 text-lg font-black">{p.name}</h3>
                  <p className="mt-1 text-xs text-white/55">{p.participants.length}/{p.capacity} fictional adults</p>
                </div>
                <button type="button" onClick={()=>registerDemo(p.id)} disabled={p.participants.length>=p.capacity}
                  className="min-h-11 self-start rounded-xl border border-sky-400/45 px-3 text-xs font-black text-sky-200 disabled:opacity-40">
                  <FaPlus aria-hidden="true" className="mr-1 inline"/> Simulate registration
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2" aria-label={'Fictional roster for '+p.name}>
                {p.participants.length?p.participants.map((name,index)=>
                  <span key={index} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75">
                    <FaCircleCheck aria-hidden="true" className="mr-1 inline text-emerald-300"/>{name}
                  </span>):<p className="text-xs text-white/50">No example participants yet.</p>}
              </div>
            </article>)}
          </section>
        </div>}
        {pane==='calendar'&&<div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className={card}>
            <h2 className="text-lg font-black">Schedule a sample group workout</h2>
            <p className="mt-2 text-xs text-white/55">This is a simulated weekly schedule; no real notifications are sent.</p>
            <label className="mt-5 block text-xs font-bold">Program
              <select value={sessionProgram} className={field} onChange={e=>setSessionProgram(e.target.value)}>
                {programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-xs font-bold">Coach
              <select value={sessionCoach} className={field} onChange={e=>setSessionCoach(e.target.value)}>
                {RCH_DEMO_COACHES.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-bold">Day
                <select value={sessionDay} className={field} onChange={e=>setSessionDay(e.target.value)}>
                  {weekdays.map(n=><option key={n}>{n}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold">Time
                <select value={sessionTime} className={field} onChange={e=>setSessionTime(e.target.value)}>
                  {timeSlots.map(n=><option key={n}>{n}</option>)}
                </select>
              </label>
            </div>
            <button type="button" onClick={addSession} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-400 px-5 text-sm font-black text-[#071522]">
              <FaPlus aria-hidden="true"/> Add demo session
            </button>
          </section>
          <section className={card}>
            <h2 className="text-lg font-black">Upcoming example sessions</h2>
            <div className="mt-5 space-y-3">
              {sessions.map(s=><div key={s.id} className="rounded-xl border border-white/15 bg-black/15 px-4 py-3">
                <p className="text-sm font-black">{programs.find(p=>p.id===s.programId)?.name||'Group session'}</p>
                <p className="mt-2 text-xs text-sky-200">{s.day} · {s.time}</p>
                <p className="mt-1 text-xs text-white/55">{s.coach} · {s.court}</p>
              </div>)}
            </div>
          </section>
        </div>}
      </div>:<div className="mt-6 overflow-hidden rounded-3xl border border-white/15">
        <section className="bg-[radial-gradient(ellipse_at_85%_20%,rgba(56,189,248,.20),transparent_55%),linear-gradient(145deg,#102c42,#070e18_80%)] px-6 py-12 sm:px-12 sm:py-16">
          <p className="text-xs font-black uppercase tracking-[.2em] text-sky-300">Sample public basketball website</p>
          <h2 className="mt-5 max-w-3xl font-display text-4xl font-black uppercase leading-tight sm:text-6xl">Build skills.<br/><span className="text-sky-300">Find your game.</span></h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/70">Adult basketball training, open tryouts, and development programs — presented in a fictional organization website created with RCH Sites.</p>
          <button type="button" onClick={()=>showPane('programs')} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-400 px-5 text-sm font-black text-[#071522]">
            View sample programs <FaArrowRight aria-hidden="true"/>
          </button>
        </section>
        <section className="bg-[#0a1420] px-6 py-8 sm:px-12">
          <h3 className="font-display text-2xl font-black uppercase">Basketball programs</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {programs.slice(0,6).map(p=><article key={p.id} className="rounded-xl border border-white/15 p-4">
              <p className="text-xs font-black uppercase text-sky-300">{demoProgramLabel(p.kind)}</p>
              <h4 className="mt-2 text-lg font-black">{p.name}</h4>
              <p className="mt-3 text-xs text-white/55">Adult participants: {p.participants.length}/{p.capacity}</p>
              <button type="button" onClick={()=>registerDemo(p.id)} disabled={p.participants.length>=p.capacity}
                className="mt-4 min-h-11 text-xs font-bold text-sky-300 underline disabled:opacity-40">Simulate adult registration</button>
            </article>)}
          </div>
          <p className="mt-6 text-xs text-white/45">Public visitors on a real site would sign in and be checked for adult eligibility. This demo does not collect or store participant information.</p>
        </section>
      </div>}
      <div className="mt-9 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sky-400/30 bg-sky-400/[.07] p-5">
        <div><h2 className="text-lg font-black">Ready to build a real basketball website?</h2>
          <p className="mt-1 text-xs leading-5 text-white/55">Get Started uses the actual approval and website subscription process.</p></div>
        <Link href="/website-creator/start" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#071522]">
          Get Started <FaArrowRight aria-hidden="true"/>
        </Link>
      </div>
    </Container>
  </main>;
}
function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){
  return <section className={card}><span className="text-sky-300">{icon}</span>
    <p className="mt-3 text-3xl font-black tabular-nums">{value}</p>
    <p className="mt-1 text-xs text-white/60">{label}</p>
  </section>;
}

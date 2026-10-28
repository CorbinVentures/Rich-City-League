'use client';
import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import {Container} from '@/components/Container';
import {useAuth} from '@/hooks/useAuth';
import {FaArrowLeft,FaBasketball,FaCalendarDays,FaCheck} from 'react-icons/fa6';

type Program={id:string;name:string;kind:string;capacity:number};
type Session={program_id:string;starts_at:string;ends_at:string};
type Listing={available:boolean;reason?:string;programs:Program[];sessions:Session[];myProgramIds?:string[];myPrograms?:Array<{id:string;name:string}>};
function formatDate(value:string){return new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});}
export default function AdultBasketballRegistration(){
  const params=useParams<{slug:string}>();
  const slug=params.slug;
  const {user,loading:authLoading}=useAuth();
  const [data,setData]=useState<Listing>({available:false,programs:[],sessions:[]});
  const [loading,setLoading]=useState(true);
  const [loadedIdentity,setLoadedIdentity]=useState('');
  const identity=slug+'|'+(user?.id||'guest');
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const load=useCallback(async()=>{
    const r=await fetch('/api/rch-sites/amateur?slug='+encodeURIComponent(slug),{cache:'no-store'});
    const json=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(json.error||'Could not load adult programs.');
    setData(json as Listing);
  },[slug]);
  useEffect(()=>{
    if(authLoading)return;
    let active=true;
    setLoading(true);setData({available:false,programs:[],sessions:[]});setError('');
    void fetch('/api/rch-sites/amateur?slug='+encodeURIComponent(slug),{cache:'no-store'})
      .then(async r=>{const json=await r.json().catch(()=>({}));
        if(!r.ok)throw Error(json.error||'Could not load adult programs.');
        if(active){setData(json as Listing);setLoadedIdentity(identity);}
      }).catch(e=>{if(active){setLoadedIdentity(identity);setError(e instanceof Error?e.message:'Unable to load programs.');}})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[slug,authLoading,user?.id,identity]);
  async function act(programId:string,action:'register'|'withdraw'){
    if(busy)return;
    setBusy(programId);setError('');setMessage('');
    try{
      const response=await fetch('/api/rch-sites/amateur',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action,slug,programId}),
      });
      const json=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(json.error||'Unable to update your registration.');
      setMessage(action==='register'?'You are registered for this adult basketball program.':'Your registration was withdrawn.');
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to update registration.');}
    finally{setBusy('');}
  }
  const closedRegistrations=(data.myPrograms??[]).filter(p=>!data.programs.some(open=>open.id===p.id));
  return <main className="min-h-screen bg-[#090b11] pb-28 text-white">
    <Container maxWidth="lg" className="py-10 sm:py-16">
      <Link href={'/sites/'+encodeURIComponent(slug)} className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-white/60">
        <FaArrowLeft/> Organization website
      </Link>
      <p className="mt-7 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rose-300"><FaBasketball/> RCH Sites</p>
      <h1 className="mt-2 text-3xl font-black sm:text-5xl">Adult basketball programs</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">Register with your RCH account for an independently operated basketball training group, team, camp or tryout. Participants must be at least 18.</p>
      {(authLoading||loading||loadedIdentity!==identity)&&<p role="status" className="mt-6">Opening basketball programs…</p>}
      {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-400/30 p-4 text-sm text-rose-200">{error}</p>}
      {message&&<p role="status" className="mt-5 rounded-xl border border-emerald-400/30 p-4 text-sm text-emerald-200">{message}</p>}
      {!authLoading&&!loading&&loadedIdentity===identity&&(!data.available||data.programs.length===0)&&
        <p className="mt-6 rounded-2xl border border-white/15 p-5 text-sm text-white/65">
          {data.available?'This organization has no open adult programs right now.':'This organization is not currently accepting online program registrations.'}
        </p>}
      {!authLoading&&!loading&&loadedIdentity===identity&&closedRegistrations.length>0&&
        <section className="mt-6 rounded-2xl border border-sky-300/30 p-5" aria-label="Your existing adult registrations">
          <h2 className="text-lg font-black">Your existing registrations</h2>
          <p className="mt-2 text-xs text-white/60">You can withdraw even if this organization has stopped accepting new registrations.</p>
          <div className="mt-4 grid gap-2">
            {closedRegistrations.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 px-3 py-2">
              <span className="text-sm font-semibold">{p.name}</span>
              <button type="button" disabled={Boolean(busy)} onClick={()=>void act(p.id,'withdraw')}
                className="min-h-11 rounded-lg border border-white/25 px-4 text-xs font-bold disabled:opacity-40">Withdraw</button>
            </div>)}
          </div>
        </section>}
      {!authLoading&&!loading&&loadedIdentity===identity&&data.available&&<section className="mt-7 grid gap-3">
        {data.programs.map(p=>{
          const enrolled=(data.myProgramIds??[]).includes(p.id);
          return <article key={p.id} className="rounded-2xl border border-white/15 bg-white/[.04] p-5">
            <p className="text-xs font-bold uppercase text-sky-300">{p.kind}</p>
            <h2 className="mt-1 text-xl font-black">{p.name}</h2>
            <p className="mt-2 text-xs text-white/50">Adult program · Capacity {p.capacity}</p>
            {data.sessions.filter(s=>s.program_id===p.id).slice(0,3).map(s=>
              <p key={s.starts_at} className="mt-2 flex items-center gap-2 text-xs text-white/65">
                <FaCalendarDays/>{formatDate(s.starts_at)}
              </p>)}
            {user?
              <button type="button" disabled={Boolean(busy)} onClick={()=>void act(p.id,enrolled?'withdraw':'register')}
                className={'mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl px-5 text-sm font-bold disabled:opacity-40 '+(enrolled?'border border-white/30':'bg-rose-600')}>
                {enrolled?<><FaCheck/> Registered · Withdraw</>:'Register for this program'}
              </button>:
              <Link href={'/auth/sign-in?next='+encodeURIComponent('/sites/'+slug+'/programs')}
                className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-rose-600 px-5 text-sm font-bold">Sign in to register</Link>}
          </article>;
        })}
      </section>}
      <p className="mt-8 text-xs leading-5 text-white/45">Registration is free and does not confirm a PayPal payment. Program information is managed by the independent organization. No youth enrollment is available through this form.</p>
    </Container>
  </main>;
}

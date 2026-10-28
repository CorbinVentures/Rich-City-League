'use client';

import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {Container} from '@/components/Container';
import {useAuth} from '@/hooks/useAuth';
import {FaArrowLeft,FaCalendarDays,FaCircleCheck,FaClock,FaPlus,FaXmark} from 'react-icons/fa6';

type Org={id:string;name:string;eligible:boolean;member_role:string};
type Service={id:string;name:string;description:string;duration_minutes:number;status:string};
type Slot={id:string;service_id:string;starts_at:string;ends_at:string;status:string;booked:boolean};
type PlanSummary={tier:string;billingStatus:string;quotaEnforced:boolean;limits:{services:number;upcomingSlots:number;confirmedBookingsMonthly:number}|null;
  usage:{services:number;upcomingSlots:number;confirmedBookingsMonthly:number}};
const field='mt-2 w-full min-h-11 rounded-xl border border-white/15 bg-[#141822] px-3 py-2.5 text-sm text-white focus:border-rose-400 focus:outline-none';
function localDate(value:string){return new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
export default function AppointmentsManager(){
  const {user,loading:authLoading}=useAuth();
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [selected,setSelected]=useState('');
  const [services,setServices]=useState<Service[]>([]);
  const [slots,setSlots]=useState<Slot[]>([]);
  const [websitePlan,setWebsitePlan]=useState<PlanSummary|null>(null);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState({name:'',description:'',duration:60,serviceId:'',startsAt:''});
  const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'Your local time';
  const loadOrgs=useCallback(async()=>{
    const response=await fetch('/api/rch-sites',{cache:'no-store'});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(body.error||'Could not load your organizations.');
    const valid=(body.organizations??[]).filter((o:Org)=>o.eligible&&['owner','manager'].includes(o.member_role));
    setOrgs(valid);
    setSelected(s=>s||valid[0]?.id||'');
  },[]);
  const loadSchedule=useCallback(async(orgId:string)=>{
    const response=await fetch('/api/rch-sites/appointments?organizationId='+encodeURIComponent(orgId),{cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.error||'Could not load appointments.');
    setServices(data.services||[]);
    setSlots(data.slots||[]);
    setWebsitePlan(data.websitePlan??null);
  },[]);
  useEffect(()=>{
    if(authLoading)return;
    if(!user){setLoading(false);return;}
    void loadOrgs().catch(e=>setError(e instanceof Error?e.message:'Unable to load organizations.'))
      .finally(()=>setLoading(false));
  },[authLoading,user,loadOrgs]);
  useEffect(()=>{
    if(!selected){setServices([]);setSlots([]);setWebsitePlan(null);return;}
    void loadSchedule(selected).catch(e=>setError(e instanceof Error?e.message:'Unable to load appointments.'));
  },[selected,loadSchedule]);
  const act=async(action:'createService'|'createSlot'|'closeSlot',slotId?:string)=>{
    if(!selected||busy)return;
    setBusy(action);setError('');setMessage('');
    try{
      const payload:Record<string,unknown>={action,organizationId:selected};
      if(action==='createService'){
        payload.name=form.name;payload.description=form.description;payload.durationMinutes=form.duration;
      }
      if(action==='createSlot'){
        const date=new Date(form.startsAt);
        if(!form.startsAt||!Number.isFinite(date.getTime()))throw Error('Choose a valid local appointment date and time.');
        payload.serviceId=form.serviceId||services.find(s=>s.status==='active')?.id;
        payload.startsAt=date.toISOString();
      }
      if(action==='closeSlot')payload.slotId=slotId;
      const response=await fetch('/api/rch-sites/appointments',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(body.error||'Unable to update appointments.');
      setMessage(action==='createService'?'Service created. Add some appointment times.':
        action==='createSlot'?'New appointment added.':'Unbooked time closed.');
      if(action==='createService')setForm(f=>({...f,name:'',description:''}));
      if(action==='createSlot')setForm(f=>({...f,startsAt:''}));
      await loadSchedule(selected);
    }catch(e){setError(e instanceof Error?e.message:'Unable to save appointment.');}
    finally{setBusy('');}
  };
  if(authLoading||loading)return <Shell><p role="status" className="text-white/70">Opening appointments…</p></Shell>;
  if(!user)return <Shell><h1 className="text-3xl font-black">Sign in to manage your schedule.</h1>
    <Link className="mt-5 inline-flex rounded-xl bg-rose-600 px-5 py-3 font-bold" href="/auth/sign-in?next=/network/dashboard/sites/appointments">Sign in</Link></Shell>;
  return <Shell>
    <Link href="/network/dashboard/sites" className="inline-flex items-center gap-2 text-sm text-white/60"><FaArrowLeft/> Website Studio</Link>
    <p className="mt-7 text-xs font-black uppercase tracking-widest text-rose-400">RCH Sites · Calendar</p>
    <h1 className="mt-2 text-4xl font-black">Bookings made simple.</h1>
    <p className="mt-3 max-w-xl text-sm leading-7 text-white/65">Create a free service. Add session times. Clients book the available slots through your published website. Payments are not enabled yet.</p>
    {!orgs.length&&<div className="mt-8 rounded-2xl border border-white/20 p-5 text-sm">You need an approved basketball organization and owner/manager access to manage bookings. <Link href="/organizations" className="underline">Find your organization</Link>.</div>}
    {!!orgs.length&&<>
      {websitePlan?.limits&&<div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-white/75">
        <p className="font-black text-white">Website plan: {websitePlan.tier.charAt(0).toUpperCase()+websitePlan.tier.slice(1)}</p>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <span>Active services {websitePlan.usage.services}/{websitePlan.limits.services}</span>
          <span>Upcoming slots {websitePlan.usage.upcomingSlots}/{websitePlan.limits.upcomingSlots}</span>
          <span>Bookings this month {websitePlan.usage.confirmedBookingsMonthly}/{websitePlan.limits.confirmedBookingsMonthly}</span>
        </div>
        <p className="mt-2 text-xs text-white/50">{websitePlan.quotaEnforced
          ?'Website plan quotas are active. Paid plan enrollment is not available yet.'
          :'Proposed plan limits shown for reference. Existing booking limits remain in effect during the pilot.'}</p>
      </div>}
      <label className="mt-7 block max-w-md text-xs font-bold">Manage organization
        <select className={field} value={selected} onChange={e=>{setSelected(e.target.value);setMessage('');setError('');}}>
          {orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
      {message&&<p role="status" className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-900/10 p-4 text-sm text-emerald-200">{message}</p>}
      {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-500/30 bg-rose-900/10 p-4 text-sm text-rose-200">{error}</p>}
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/15 bg-white/5 p-5">
          <div className="flex items-center gap-2"><FaPlus className="text-rose-400"/><h2 className="text-xl font-black">1 · Your service</h2></div>
          <label className="mt-5 block text-xs font-bold">Name
            <input className={field} value={form.name} maxLength={90} placeholder="Private basketball training" onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
          </label>
          <label className="mt-4 block text-xs font-bold">Description (optional)
            <textarea className={field+' min-h-20'} value={form.description} maxLength={500} placeholder="Skills, fitness, shooting…" onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
          </label>
          <label className="mt-4 block text-xs font-bold">Session length
            <select className={field} value={form.duration} onChange={e=>setForm(f=>({...f,duration:Number(e.target.value)}))}>
              {[30,45,60,90,120].map(v=><option value={v} key={v}>{v} minutes</option>)}
            </select>
          </label>
          <button type="button" disabled={Boolean(busy)||form.name.trim().length<3} onClick={()=>void act('createService')}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-black disabled:opacity-40"><FaPlus/> Add service</button>
          <div className="mt-5 flex flex-wrap gap-2">
            {services.map(s=><span key={s.id} className="rounded-full border border-white/20 px-3 py-1.5 text-xs">{s.name} · {s.duration_minutes}m</span>)}
          </div>
        </section>
        <section className="rounded-2xl border border-white/15 bg-white/5 p-5">
          <div className="flex items-center gap-2"><FaCalendarDays className="text-rose-400"/><h2 className="text-xl font-black">2 · Available times</h2></div>
          <label className="mt-5 block text-xs font-bold">Session type
            <select className={field} value={form.serviceId&&services.some(s=>s.id===form.serviceId)?form.serviceId:services[0]?.id||''}
              onChange={e=>setForm(f=>({...f,serviceId:e.target.value}))} disabled={!services.length}>
              {services.filter(s=>s.status==='active').map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="mt-4 block text-xs font-bold">Date & time
            <input type="datetime-local" className={field} value={form.startsAt} onChange={e=>setForm(f=>({...f,startsAt:e.target.value}))}/>
          </label>
          <p className="mt-2 text-xs text-white/50">Entered in your device time zone: {timezone}. Add times at least 2 hours ahead.</p>
          <button type="button" disabled={Boolean(busy)||!services.length||!form.startsAt}
            onClick={()=>void act('createSlot')} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-black disabled:opacity-40">
            <FaPlus/> Add time
          </button>
          <p className="mt-4 text-xs text-white/55">RCH automatically blocks overlapping session times. Only one client can reserve each slot.</p>
        </section>
      </div>
      <section className="mt-7 rounded-2xl border border-white/15 bg-white/5 p-5">
        <div className="flex items-center gap-2"><FaClock className="text-rose-400"/><h2 className="text-xl font-black">Upcoming times</h2></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {!slots.length&&<p className="text-sm text-white/60">No upcoming appointment times. Add your first session above.</p>}
          {slots.map(slot=>{
            const service=services.find(s=>s.id===slot.service_id);
            return <article key={slot.id} className="rounded-xl border border-white/15 p-4">
              <b className="text-sm">{service?.name||'Session'}</b>
              <p className="mt-2 text-sm text-white/75">{localDate(slot.starts_at)}</p>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                <span className={slot.booked?'text-amber-200':'text-emerald-300'}>{slot.booked?<><FaCircleCheck className="mr-1 inline"/> Booked</>:slot.status==='closed'?'Closed':'Available'}</span>
                {!slot.booked&&slot.status==='open'&&<button type="button" disabled={Boolean(busy)}
                  onClick={()=>void act('closeSlot',slot.id)} className="inline-flex items-center gap-1 underline disabled:opacity-40"><FaXmark/> Close</button>}
              </div>
            </article>;
          })}
        </div>
      </section>
    </>}
  </Shell>;
}
function Shell({children}:{children:React.ReactNode}){
  return <main className="min-h-screen bg-[#0b0c10] pb-28 text-white"><Container maxWidth="xl" className="py-8 sm:py-12">{children}</Container></main>;
}

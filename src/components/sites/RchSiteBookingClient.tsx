'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {FaArrowLeft,FaCalendarCheck,FaCalendarDays,FaCheck,FaClock,FaLock,FaXmark} from 'react-icons/fa6';

type Service={id:string;name:string;description:string;duration_minutes:number;price_cents:number};
type Slot={id:string;service_id:string;starts_at:string;ends_at:string};
type Booking={id:string;slot_id:string;service_id:string;status:string;booked_at:string};
type Catalog={organizationId:string;services:Service[];slots:Slot[];myBookings:Booking[];error?:string};

function when(value:string){return new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));}
export function RchSiteBookingClient({slug}:{slug:string}){
  const {user,loading:authLoading}=useAuth();
  const [catalog,setCatalog]=useState<Catalog>({organizationId:'',services:[],slots:[],myBookings:[]});
  const [selected,setSelected]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const attempts=useRef<Map<string,string>>(new Map());
  const load=useCallback(async()=>{
    const response=await fetch('/api/rch-sites/appointments?slug='+encodeURIComponent(slug),{cache:'no-store'});
    const json=await response.json() as Catalog;
    if(!response.ok)throw Error(json.error||'Unable to load available appointments.');
    setCatalog({organizationId:json.organizationId,services:json.services??[],slots:json.slots??[],myBookings:json.myBookings??[]});
    setSelected(s=>s||json.services?.[0]?.id||'');
  },[slug]);
  useEffect(()=>{setLoading(true);void load().catch(e=>setError(e instanceof Error?e.message:'Unable to load bookings.')).finally(()=>setLoading(false));},[load,user?.id]);
  const slots=useMemo(()=>catalog.slots.filter(s=>s.service_id===selected),[catalog.slots,selected]);
  const selectedService=catalog.services.find(s=>s.id===selected);
  const act=async(action:'book'|'cancelBooking',id:string)=>{
    if(busy||!user)return;
    setBusy(id);setError('');setMessage('');
    try{
      let payload:Record<string,unknown>;
      if(action==='book'){
        let key=attempts.current.get(id);
        if(!key){key=crypto.randomUUID();attempts.current.set(id,key);}
        payload={action,slotId:id,idempotencyKey:key};
      }else payload={action,bookingId:id};
      const response=await fetch('/api/rch-sites/appointments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(body.error||'Unable to confirm your request.');
      setMessage(action==='book'?'Your appointment is confirmed. Save the date!':'Your appointment has been cancelled.');
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to update appointment.');await load().catch(()=>{});}
    finally{setBusy('');}
  };
  return <main className="min-h-svh bg-[#0b0d12] px-4 pb-16 pt-7 text-white sm:px-7">
    <div className="mx-auto max-w-3xl">
      <Link href={'/sites/'+slug} className="inline-flex min-h-11 items-center gap-2 text-sm text-white/60"><FaArrowLeft/> Back to website</Link>
      <div className="mt-6 flex items-center gap-2 text-rose-400"><FaCalendarDays/><span className="text-xs font-black uppercase tracking-widest">RCH Sites booking</span></div>
      <h1 className="mt-3 text-4xl font-black sm:text-5xl">Book a session.</h1>
      <p className="mt-3 text-sm leading-7 text-white/65">Choose an available time and confirm your free reservation. Payment collection is not active yet.</p>
      {loading&&<p role="status" className="mt-8 text-sm text-white/60">Loading appointment times…</p>}
      {error&&<div role="alert" className="mt-6 rounded-xl border border-rose-400/30 bg-rose-900/10 p-4 text-sm text-rose-200">{error}</div>}
      {message&&<div role="status" className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-900/10 p-4 text-sm text-emerald-200"><FaCheck/>{message}</div>}
      {!loading&&<>
        {catalog.services.length===0?<div className="mt-8 rounded-2xl border border-white/15 p-6 text-sm text-white/70">This organization has not published any available sessions yet.</div>:<>
          <label className="mt-8 block max-w-xl text-xs font-bold">Choose your session
            <select className="mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#191b25] px-4 text-base text-white"
              value={catalog.services.some(s=>s.id===selected)?selected:catalog.services[0]?.id}
              onChange={e=>setSelected(e.target.value)}>
              {catalog.services.map(s=><option key={s.id} value={s.id}>{s.name} · {s.duration_minutes} min · Free</option>)}
            </select>
          </label>
          {selectedService?.description&&<p className="mt-3 max-w-xl text-sm leading-6 text-white/65">{selectedService.description}</p>}
          {authLoading?<p role="status" className="mt-5 text-sm text-white/50">Checking your RCH account…</p>:!user?
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/25 p-4">
              <span className="inline-flex items-center gap-2 text-sm text-white/70"><FaLock/> Sign in to reserve your appointment.</span>
              <Link href={'/auth/sign-in?next='+encodeURIComponent('/sites/'+slug+'/book')}
                className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-black">Sign in / Join Free</Link>
            </div>:null}
          <h2 className="mt-8 text-xl font-black">Available times</h2>
          <p className="mt-2 text-xs text-white/50">Times shown in your device time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {!slots.length&&<p className="text-sm text-white/60">No open slots for this service. Check back for upcoming sessions.</p>}
            {slots.map(slot=><div key={slot.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/[.035] p-4">
              <div><b className="text-sm">{when(slot.starts_at)}</b><p className="mt-1 text-xs text-white/50">{selectedService?.duration_minutes||60} minutes</p></div>
              <button type="button" disabled={!user||Boolean(busy)||authLoading} onClick={()=>void act('book',slot.id)}
                className="min-h-11 shrink-0 rounded-xl bg-rose-600 px-4 text-sm font-black disabled:opacity-40">{busy===slot.id?'Booking…':'Book free'}</button>
            </div>)}
          </div>
        </>}
        {catalog.myBookings.length>0&&<>
          <h2 className="mt-10 flex items-center gap-2 text-xl font-black"><FaCalendarCheck className="text-emerald-400"/> My reservations</h2>
          <div className="mt-4 space-y-3">
            {catalog.myBookings.filter(b=>b.status==='confirmed').map(b=><div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 p-4">
              <div><span className="text-sm font-bold">{catalog.services.find(s=>s.id===b.service_id)?.name||'Reserved session'}</span>
                <p className="mt-1 text-xs text-emerald-300">Confirmed · Reservation #{b.id.slice(0,8)}</p></div>
              <button type="button" disabled={Boolean(busy)} onClick={()=>void act('cancelBooking',b.id)}
                className="inline-flex min-h-11 items-center gap-2 text-xs text-rose-300 underline disabled:opacity-40"><FaXmark/> Cancel</button>
            </div>)}
          </div>
          <p className="mt-3 inline-flex items-start gap-2 text-xs leading-6 text-white/55"><FaClock className="mt-1 shrink-0"/> Online cancellations close two hours before the appointment. Contact your organizer for late changes.</p>
        </>}
      </>}
      <div className="mt-12 border-t border-white/15 pt-6 text-xs text-white/50"><Link href="/" className="font-bold">Powered by Rich City Hoops</Link></div>
    </div>
  </main>;
}

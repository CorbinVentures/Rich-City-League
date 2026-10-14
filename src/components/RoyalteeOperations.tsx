'use client';

import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {getSupabaseClient} from '@/lib/supabase';
import {FaCalendarDays,FaCircleCheck,FaClipboardList,FaCoins,FaPen,FaPlus,FaUsers} from 'react-icons/fa6';

type EventRow={
 id:string;title:string;description:string;event_type:string;starts_at:string;
 ends_at:string|null;location:string;status:'draft'|'published'|'cancelled';
 registration_fee_cents:number;registration_open:boolean;capacity:number|null
};
type Registration={
 id:string;profile_id:string;display_name:string|null;username:string|null;
 status:'registered'|'checked_in'|'cancelled';payment_status:'unpaid'|'paid'|'waived';
 fee_cents_snapshot:number;checked_in_at:string|null;created_at:string
};
type Editor={
 id:string|null;title:string;description:string;event_type:string;starts_at:string;
 ends_at:string;location:string;status:EventRow['status'];
 fee:string;registration_open:boolean;capacity:string
};
const blank=():Editor=>({
 id:null,title:'',description:'',event_type:'performance',starts_at:'',ends_at:'',
 location:'',status:'draft',fee:'0.00',registration_open:false,capacity:''
});
const field='mt-2 min-h-11 w-full rounded-xl border border-[#406c8c] bg-[#061526] px-3 py-2 text-sm text-white outline-none focus:border-[#ffae79]';
const currency=(cents:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
const dateInput=(iso:string|null)=>iso?new Date(new Date(iso).getTime()-new Date(iso).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
const kinds=[['tryout','Adult tryout'],['rehearsal','Rehearsal'],['game_day','RCL game day'],['performance','Performance'],['community','Community appearance']];

export function RoyalteeOperations(){
 const db=useMemo(()=>getSupabaseClient() as any,[]);
 const [events,setEvents]=useState<EventRow[]>([]);
 const [editor,setEditor]=useState<Editor>(blank);
 const [selected,setSelected]=useState<string|null>(null);
 const [registrations,setRegistrations]=useState<Registration[]>([]);
 const [loading,setLoading]=useState(true);
 const [rosterLoading,setRosterLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');

 const loadEvents=useCallback(async()=>{
  if(!db)return;
  const {data,error}=await db.from('rcl_royaltee_events')
   .select('id,title,description,event_type,starts_at,ends_at,location,status,registration_fee_cents,registration_open,capacity')
   .order('starts_at',{ascending:false}).limit(150);
  if(error)setError(error.message||'Could not load Royaltee events.');
  else setEvents((data||[]) as EventRow[]);
  setLoading(false);
 },[db]);
 const loadRoster=useCallback(async(eventId:string)=>{
  if(!db)return;
  setRosterLoading(true);
  const {data,error}=await db.rpc('get_royaltee_event_registration_roster',{p_event_id:eventId});
  if(error){setError(error.message||'Could not load registrations.');setRegistrations([]);}
  else setRegistrations((data||[]) as Registration[]);
  setRosterLoading(false);
 },[db]);
 useEffect(()=>{void loadEvents();},[loadEvents]);
 useEffect(()=>{if(selected)void loadRoster(selected);else setRegistrations([]);},[selected,loadRoster]);

 function editEvent(item:EventRow){
  setEditor({id:item.id,title:item.title,description:item.description,event_type:item.event_type,
   starts_at:dateInput(item.starts_at),ends_at:dateInput(item.ends_at),location:item.location,
   status:item.status,fee:(item.registration_fee_cents/100).toFixed(2),
   registration_open:item.registration_open,capacity:item.capacity?.toString()||''});
  setSelected(item.id);setError('');setMessage('');
 }
 async function save(event:FormEvent){
  event.preventDefault();if(busy||!db)return;
  const fee=Number(editor.fee),capacity=editor.capacity.trim()?Number(editor.capacity):null;
  const start=new Date(editor.starts_at),end=editor.ends_at?new Date(editor.ends_at):null;
  if(!Number.isFinite(fee)||fee<0||fee>10000||Math.abs(Math.round(fee*100)-fee*100)>0.000001){
    setError('Enter a fee between $0 and $10,000, with no more than two decimal places.');return;
  }
  if(Number.isNaN(start.getTime())||(end&&(Number.isNaN(end.getTime())||end<start))){
    setError('Enter valid start and end dates.');return;
  }
  if(capacity!==null&&(!Number.isInteger(capacity)||capacity<1)){setError('Capacity must be a positive whole number.');return;}
  setBusy(true);setError('');setMessage('');
  const values={title:editor.title.trim(),description:editor.description.trim(),event_type:editor.event_type,
   starts_at:start.toISOString(),ends_at:end?end.toISOString():null,
   location:editor.location.trim(),status:editor.status,min_age:18,
   registration_fee_cents:Math.round(fee*100),registration_open:editor.registration_open,
   capacity,updated_at:new Date().toISOString()};
  const res=editor.id
   ?await db.from('rcl_royaltee_events').update(values).eq('id',editor.id).select('id').single()
   :await db.from('rcl_royaltee_events').insert(values).select('id').single();
  if(res.error)setError(res.error.message||'Could not save the event.');
  else{
   setMessage(editor.id?'Event changes saved.':'Adult event created.');
   const id=res.data?.id as string;
   await loadEvents();
   if(id){setSelected(id);if(!editor.id)setEditor(blank());}
  }
  setBusy(false);
 }
 async function changeRegistration(r:Registration,patch:Partial<Registration>){
  if(!db||busy||!selected)return;
  setBusy(true);setError('');setMessage('');
  const changes:any={...patch,updated_at:new Date().toISOString()};
  if(patch.status==='checked_in')changes.checked_in_at=new Date().toISOString();
  if(patch.status==='registered')changes.checked_in_at=null;
  const {error,data}=await db.from('rcl_royaltee_event_registrations').update(changes).eq('id',r.id).select('id').single();
  if(error||!data)setError(error?.message||'Registration could not be updated.');
  else{setMessage('Registration updated.');await loadRoster(selected);}
  setBusy(false);
 }
 const active=registrations.filter(r=>r.status!=='cancelled');
 const paid=active.filter(r=>r.payment_status==='paid'||r.payment_status==='waived');
 return <section className="rounded-2xl border border-[#31658e] bg-[#0a2137] p-5 sm:p-7" id="royaltee-operations">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div><p className="text-xs font-black uppercase tracking-[.17em] text-[#ffac70]">03 / Royaltee operations</p>
    <h2 className="mt-2 text-2xl font-black">Events, fees &amp; registrations</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b7d2e7]">Your private control center for adult-only Royaltee events. Prices are displayed to registrants; payment status is recorded manually. No online card charge is performed here.</p></div>
   <button type="button" onClick={()=>{setEditor(blank());setError('');setMessage('');}} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#ff9959] px-4 text-sm font-black text-[#1b130b]"><FaPlus/> New event</button>
  </div>
  {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/50 bg-red-950/40 p-4 text-sm text-red-100">{error}</p>}
  {message&&<p role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-950/30 p-4 text-sm text-emerald-100"><FaCircleCheck/>{message}</p>}

  <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,1.15fr)]">
   <div>
    <div className="flex items-center gap-2 text-sm font-black"><FaCalendarDays className="text-[#ffac70]"/> Adult events</div>
    <div className="mt-4 max-h-[600px] space-y-3 overflow-y-auto pr-1">
     {loading?<p className="text-sm text-[#b6cfe1]">Loading Royaltee events…</p>:
      !events.length?<p className="rounded-xl border border-dashed border-[#366487] p-5 text-sm text-[#b6cfe1]">No adult events yet. Create one to begin accepting registrations.</p>:
      events.map(item=><article key={item.id} className={'rounded-xl border p-4 '+(selected===item.id?'border-[#ffa46a] bg-[#122e45]':'border-[#366487] bg-[#061827]')}>
       <div className="flex justify-between gap-3"><div><h3 className="font-black">{item.title}</h3><p className="mt-1 text-xs text-[#b7d2e7]">{new Date(item.starts_at).toLocaleString()} · {item.status}</p></div>
        <span className="shrink-0 text-sm font-black text-[#ffbf87]">{currency(item.registration_fee_cents)}</span></div>
       <p className="mt-2 text-xs text-[#b1cbdf]">{item.registration_open?'Registration open':'Registration closed'} · {item.capacity===null?'No capacity limit':item.capacity+' spots'}</p>
       <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={()=>editEvent(item)} className="inline-flex items-center gap-2 rounded-lg border border-[#87b9d9] px-3 py-2 text-xs font-black"><FaPen/> Edit</button>
        <button type="button" onClick={()=>{setSelected(item.id);void loadRoster(item.id);}} className="inline-flex items-center gap-2 rounded-lg bg-[#254c69] px-3 py-2 text-xs font-black"><FaUsers/> Registrations</button>
       </div>
      </article>)}
    </div>
   </div>
   <form onSubmit={save} className="rounded-xl border border-[#406888] bg-[#061827] p-5">
    <p className="text-xs font-black uppercase tracking-wider text-[#ffac70]">{editor.id?'Edit existing event':'Create an event'}</p>
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
     <label className="text-xs font-bold text-[#c2d9e8] sm:col-span-2">Event title<input className={field} required minLength={3} maxLength={160} value={editor.title} onChange={e=>setEditor({...editor,title:e.target.value})}/></label>
     <label className="text-xs font-bold text-[#c2d9e8]">Event type<select className={field} value={editor.event_type} onChange={e=>setEditor({...editor,event_type:e.target.value})}>{kinds.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
     <label className="text-xs font-bold text-[#c2d9e8]">Visibility<select className={field} value={editor.status} onChange={e=>setEditor({...editor,status:e.target.value as Editor['status']})}><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></label>
     <label className="text-xs font-bold text-[#c2d9e8]">Start date &amp; time<input className={field} required type="datetime-local" value={editor.starts_at} onChange={e=>setEditor({...editor,starts_at:e.target.value})}/></label>
     <label className="text-xs font-bold text-[#c2d9e8]">End date &amp; time<input className={field} type="datetime-local" value={editor.ends_at} onChange={e=>setEditor({...editor,ends_at:e.target.value})}/></label>
     <label className="text-xs font-bold text-[#c2d9e8] sm:col-span-2">Location<input className={field} maxLength={180} value={editor.location} onChange={e=>setEditor({...editor,location:e.target.value})}/></label>
     <label className="text-xs font-bold text-[#c2d9e8]">Registration fee (USD)<input className={field} type="number" min="0" max="10000" step="0.01" required value={editor.fee} onChange={e=>setEditor({...editor,fee:e.target.value})}/></label>
     <label className="text-xs font-bold text-[#c2d9e8]">Capacity (optional)<input className={field} type="number" min="1" step="1" placeholder="Unlimited" value={editor.capacity} onChange={e=>setEditor({...editor,capacity:e.target.value})}/></label>
     <label className="flex items-center gap-3 rounded-xl border border-[#355b7b] p-4 text-sm font-bold sm:col-span-2"><input type="checkbox" className="h-5 w-5 accent-[#ff9d61]" checked={editor.registration_open} onChange={e=>setEditor({...editor,registration_open:e.target.checked})}/> Accept event registrations</label>
     <label className="text-xs font-bold text-[#c2d9e8] sm:col-span-2">Description<textarea className={field+' min-h-24'} maxLength={1500} value={editor.description} onChange={e=>setEditor({...editor,description:e.target.value})}/></label>
    </div>
    <p className="mt-4 text-xs leading-5 text-[#9ec2db]">All Royaltee events on RCH must be adult-only (18+). Changing the price affects new signups; existing registrants retain the fee quoted when they joined.</p>
    <button disabled={busy} className="mt-5 min-h-11 w-full rounded-xl bg-[#ff9959] px-5 text-sm font-black text-[#1d110a] disabled:opacity-50">{busy?'Saving…':editor.id?'Save event changes':'Create adult event'}</button>
   </form>
  </div>
  <div className="mt-8 rounded-xl border border-[#386788] bg-[#061827] p-5">
   <div className="flex flex-wrap justify-between gap-4">
    <div><p className="text-xs font-black uppercase tracking-wider text-[#ffac70]">Private registration roster</p><h3 className="mt-2 text-xl font-black">Attendees &amp; payment tracking</h3></div>
    {selected&&<Link href="/league/royaltee#events" className="text-xs font-bold text-[#9cd7ff]">View public calendar →</Link>}
   </div>
   {!selected?<p className="mt-4 text-sm text-[#b7d1e3]">Select an event’s Registrations button to see attendees and track check-in and payments.</p>:
    rosterLoading?<p className="mt-4 text-sm text-[#b7d1e3]">Loading registrations…</p>:
    <>
     <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg bg-[#12324b] p-4"><FaClipboardList className="text-[#a8d9ff]"/><p className="mt-2 text-2xl font-black">{active.length}</p><p className="text-xs text-[#b8d5e7]">Active registrations</p></div>
      <div className="rounded-lg bg-[#12324b] p-4"><FaUsers className="text-[#a8d9ff]"/><p className="mt-2 text-2xl font-black">{active.filter(r=>r.status==='checked_in').length}</p><p className="text-xs text-[#b8d5e7]">Checked in</p></div>
      <div className="rounded-lg bg-[#12324b] p-4"><FaCoins className="text-[#a8d9ff]"/><p className="mt-2 text-2xl font-black">{paid.length}/{active.length}</p><p className="text-xs text-[#b8d5e7]">Paid or waived</p></div>
     </div>
     {!registrations.length?<p className="mt-5 rounded-lg border border-dashed border-[#446986] p-4 text-sm text-[#bbd8e8]">No registrations for this event yet.</p>:
      <div className="mt-5 space-y-3">{registrations.map(r=><article key={r.id} className="grid gap-3 rounded-xl border border-[#365d7e] p-4 md:grid-cols-[minmax(0,1fr)_150px_150px]">
       <div><Link href={'/social/profile/'+r.profile_id} className="font-black text-[#d3ecff] hover:underline">{r.display_name||r.username||'RCH adult member'}</Link><p className="mt-1 text-xs text-[#abc9dd]">Registered {new Date(r.created_at).toLocaleDateString()} · Fee {currency(r.fee_cents_snapshot)}</p></div>
       <label className="text-xs font-bold text-[#abc9dd]">Attendance<select aria-label="Attendance" disabled={busy||r.status==='cancelled'} className={field} value={r.status} onChange={e=>void changeRegistration(r,{status:e.target.value as Registration['status']})}><option value="registered">Registered</option><option value="checked_in">Checked in</option><option value="cancelled">Cancelled</option></select></label>
       <label className="text-xs font-bold text-[#abc9dd]">Payment record<select aria-label="Payment record" disabled={busy} className={field} value={r.payment_status} onChange={e=>void changeRegistration(r,{payment_status:e.target.value as Registration['payment_status']})}><option value="unpaid">Unpaid</option><option value="paid">Paid (manual)</option><option value="waived">Waived</option></select></label>
      </article>)}</div>}
    </>}
  </div>
 </section>;
}

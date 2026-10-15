'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';

type EventSignup={
 id:string;registration_fee_cents:number;registration_open:boolean;capacity:number|null
};
type Registration={id:string;status:'registered'|'checked_in'|'cancelled';payment_status:string;fee_cents_snapshot:number};
const dollars=(cents:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);

export function RoyalteeEventRegistration({event}:{event:EventSignup}){
 const {user,loading:authLoading}=useAuth();
 const db=useMemo(()=>getSupabaseClient() as any,[]);
 const [registration,setRegistration]=useState<Registration|null>(null);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [note,setNote]=useState('');

 useEffect(()=>{
  setRegistration(null);setLoading(true);setError('');setNote('');
  if(authLoading)return;
  if(!user||!db){setRegistration(null);setLoading(false);return;}
  let active=true;
  void db.from('rcl_royaltee_event_registrations').select('id,status,payment_status,fee_cents_snapshot')
   .eq('event_id',event.id).eq('profile_id',user.id).maybeSingle()
   .then(({data,error:queryError}:any)=>{
    if(!active)return;
    setRegistration(queryError?null:data);
    if(queryError)setError('Could not verify your event registration.');
    setLoading(false);
   });
  return ()=>{active=false};
 },[authLoading,user,db,event.id]);

 async function run(action:'register'|'withdraw'){
  if(!db||busy)return;
  setBusy(true);setError('');setNote('');
  const {error:rpcError}=await db.rpc(action==='register'?'register_royaltee_event':'withdraw_royaltee_event',{p_event_id:event.id});
  if(rpcError)setError(rpcError.message||'Could not change registration.');
  else {
   const {data,error:queryError}=await db.from('rcl_royaltee_event_registrations')
    .select('id,status,payment_status,fee_cents_snapshot').eq('event_id',event.id).eq('profile_id',user!.id).maybeSingle();
   if(queryError)setError('Saved, but could not refresh the registration record.');
   else {setRegistration(data);setNote(action==='register'?'Registration recorded. Royaltee will coordinate any fee collection directly.':'Registration withdrawn.');}
  }
  setBusy(false);
 }
 const active=registration&&['registered','checked_in'].includes(registration.status);
 return <div className="mt-4 rounded-xl border border-[#527494] bg-[#071b2c] p-4">
  <p className="text-xs font-black uppercase tracking-wide text-[#ffb686]">{event.registration_fee_cents?dollars(event.registration_fee_cents)+' registration fee':'Free registration'}</p>
  <p className="mt-1 text-xs leading-5 text-[#bed6e7]">Age 18+ only · {event.capacity?'Limited to '+event.capacity+' registrants':'Open capacity'} · No payment is collected on this site.</p>
  {error&&<p role="alert" className="mt-2 text-xs text-[#ffc1bb]">{error}</p>}
  {note&&<p role="status" className="mt-2 text-xs text-[#b8f5dc]">{note}</p>}
  {authLoading||loading?<p className="mt-3 text-xs text-[#aaccdf]">Checking registration…</p>:
   active?<div className="mt-3 flex flex-wrap items-center gap-3"><span className="text-xs font-black text-[#b2f2de]">{registration!.status==='checked_in'?'Checked in':'You are registered'} · {registration!.fee_cents_snapshot===0?'No fee required':registration!.payment_status==='unpaid'?'Payment not marked received':registration!.payment_status==='waived'?'Fee waived':'Paid'}</span>
    {registration!.status==='registered'&&<button type="button" disabled={busy} onClick={()=>void run('withdraw')} className="rounded-lg border border-[#b68b83] px-3 py-2 text-xs font-black text-white disabled:opacity-50">Withdraw</button>}
   </div>:
   !event.registration_open?<p className="mt-3 text-xs font-bold text-[#cbd9e9]">Registration is currently closed.</p>:
   !user?<Link className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-[#ff9452] px-4 text-xs font-black text-[#1b120a]" href={'/auth/sign-in?next=/league/royaltee%23events'}>Sign in to register</Link>:
   <button type="button" disabled={busy} onClick={()=>void run('register')} className="mt-3 min-h-10 rounded-lg bg-[#ff9452] px-4 text-xs font-black text-[#1b120a] disabled:opacity-50">{busy?'Registering…':'Register for this event'}</button>}
 </div>;
}

'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';
import {FaArrowRight,FaCircleCheck} from 'react-icons/fa6';

type Props={eventId:string;feeCents:number;registrationOpen:boolean};
export function RoyalteeEventRegistration({eventId,feeCents,registrationOpen}:Props){
 const {user,loading}=useAuth();
 const db=useMemo(()=>getSupabaseClient() as any,[]);
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState('');
 const [error,setError]=useState('');
 const fee=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(feeCents/100);
 if(!registrationOpen)return null;
 const signUp=async()=>{
  if(busy||!db||!user)return;
  setBusy(true);setError('');
  try{
   const {error:submitError}=await db.rpc('register_royaltee_event',{p_event_id:eventId});
   if(submitError)throw submitError;
   setResult('Registration confirmed. The coach will contact you with next steps.');
  }catch(reason){setError(reason instanceof Error?reason.message:'Unable to register.');}
  finally{setBusy(false);}
 };
 return <div className="mt-4 rounded-lg border border-[#326d9a] bg-[#091e33] p-3">
  <p className="text-xs font-black text-[#f0f8ff]">Adult registration · {fee}{feeCents>0?' fee payable to Royaltee':' free'}</p>
  <p className="mt-1 text-[11px] leading-5 text-[#c4daec]">18+ RCH members only. No payment is collected on this site.</p>
  {result?<p role="status" className="mt-3 flex items-center gap-2 text-xs font-bold text-[#83f3d5]"><FaCircleCheck/>{result}</p>
  :loading?<p className="mt-3 text-xs text-[#b4d9f4]">Checking membership…</p>
  :user?<button type="button" disabled={busy} onClick={()=>void signUp()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#ff9d58] px-4 text-xs font-black text-[#130b05] disabled:opacity-50">{busy?'Registering…':'Register for this event'} <FaArrowRight/></button>
  :<Link href={'/auth/sign-in?next='+encodeURIComponent('/league/royaltee#events')} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#ff9d58] px-4 text-xs font-black text-[#130b05]">Sign in to register <FaArrowRight/></Link>}
  {error&&<p role="alert" className="mt-3 text-xs text-[#ffbaba]">{error}</p>}
 </div>;
}

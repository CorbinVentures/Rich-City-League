'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {FaShieldHalved} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';

export function RunVerifiedSignal({runId}:{runId:string}){
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [verified,setVerified]=useState(false);
 useEffect(()=>{
  if(!db||!runId)return;
  let alive=true;
  void db.rpc('rch_is_verified_run',{p_run:runId})
   .then(({data,error}:{data:boolean|null;error:{message:string}|null})=>{
    if(alive)setVerified(!error && data===true);
   });
  return()=>{alive=false;};
 },[db,runId]);
 if(!verified)return null;
 return <section aria-label="Official RCH Verified Run designation" className="mt-6 rounded-2xl border border-emerald-400/40 bg-[#102e32] p-4 text-white">
  <div className="flex flex-wrap items-center gap-2">
   <FaShieldHalved className="text-emerald-300"/>
   <strong className="text-sm font-black uppercase text-emerald-200">RCH Verified Run</strong>
   <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase text-emerald-100">Organizer reviewed</span>
  </div>
  <p className="mt-2 text-xs leading-5 text-[#bad7d4]">RCH staff reviewed the organizer, court source, event preparation and officiating requirements where applicable. This does not guarantee player safety or verify future match results. <Link href="/runs/hosts" className="font-black text-[#a6f0e1] underline">About RCH standards</Link></p>
 </section>;
}

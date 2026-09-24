'use client';
import { useEffect,useMemo,useState } from 'react';
import { usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

type Status={is_minor:boolean;limit_minutes:number;used_seconds:number;remaining_seconds:number;allowed:boolean};
const SOCIAL_PREFIXES=['/social','/communities','/messages','/runs'];
export function MinorSocialUsageGuard(){
 const pathname=usePathname(); const supabase=useMemo(()=>getSupabaseClient(),[]); const [status,setStatus]=useState<Status|null>(null);
 const social=SOCIAL_PREFIXES.some(p=>pathname===p||pathname.startsWith(p+'/'));
 useEffect(()=>{if(!social||!supabase)return;let alive=true;
  const tick=async(delta=0)=>{const fn=delta?'rcl_record_social_usage':'rcl_social_usage_status';const args=delta?{delta_seconds:delta}:undefined;
   const {data}=await (supabase as any).rpc(fn,args); if(alive&&data?.[0])setStatus(data[0] as Status);};
  void tick(); const id=window.setInterval(()=>{if(document.visibilityState==='visible')void tick(30)},30000);
  return()=>{alive=false;window.clearInterval(id)};
 },[social,supabase]);
 if(!social||!status?.is_minor||status.allowed)return null;
 return <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/95 p-6 text-white"><div className="max-w-md rounded-3xl border border-rcl-gold/30 bg-[#0b1018] p-7 text-center"><p className="text-xs font-black tracking-[.2em] text-rcl-orange">DAILY SOCIAL LIMIT</p><h2 className="mt-3 font-display text-3xl font-black">You’ve reached today’s RCL Social limit.</h2><p className="mt-3 text-sm text-white/60">Social features will be available again tomorrow. A verified parent or legal guardian can change the daily limit through RCL’s parental-consent process.</p><a href="/dashboard" className="mt-6 inline-block rounded-xl bg-rcl-gold px-5 py-3 font-bold text-black">Return to RCL</a></div></div>;
}
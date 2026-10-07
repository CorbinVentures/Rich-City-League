'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaArrowRight, FaShareNodes } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';

type Stats = {
  code:string;
  qualified_referrals:number;
  rep_earned:number;
  next_milestone:number|null;
  next_milestone_name:string|null;
  next_milestone_remaining:number;
};

export function ReferralCard(){
  const [stats,setStats]=useState<Stats|null>(null);
  const [copied,setCopied]=useState(false);

  useEffect(()=>{void(async()=>{
    const supabase=getSupabaseClient();if(!supabase)return;
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    const {data:code}=await (supabase.rpc as any)('ensure_referral_code',{target_profile:user.id});
    if(!code)return;
    const {data}=await (supabase.rpc as any)('referral_stats',{target_profile:user.id});
    const row=Array.isArray(data)?data[0]:data;
    setStats({
      code:String(row?.code??code),
      qualified_referrals:Number(row?.qualified_referrals??0),
      rep_earned:Number(row?.rep_earned??0),
      next_milestone:row?.next_milestone==null?null:Number(row.next_milestone),
      next_milestone_name:row?.next_milestone_name??null,
      next_milestone_remaining:Number(row?.next_milestone_remaining??0),
    });
  })();},[]);

  if(!stats)return null;
  const invite=typeof window==='undefined'?'':window.location.origin+'/join/'+encodeURIComponent(stats.code);
  const share=async()=>{
    if(navigator.share){await navigator.share({title:'Join me on Rich City Hoops',text:'Join the RCH basketball community with me. Every real member helps build the city.',url:invite});return;}
    await navigator.clipboard.writeText(invite);setCopied(true);window.setTimeout(()=>setCopied(false),1600);
  };
  const progress=stats.next_milestone?Math.min(100,Math.round((stats.qualified_referrals/stats.next_milestone)*100)):100;

  return <section className="mt-5 rounded-2xl border border-[#D9E4EF] bg-white p-5 text-[#0F2547] shadow-[0_10px_30px_rgba(15,37,71,.06)]">
    <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">Build the City</p><h2 className="mt-1 font-display text-xl font-black uppercase">Invite + Earn</h2><p className="mt-2 text-xs leading-5 text-[#60738D]">Every qualified invite earns 200 REP. Milestones unlock bonus REP, exclusive badges and RCL+ access.</p></div><div className="rounded-xl border border-[#D9E4EF] bg-[#F7FAFD] px-3 py-2 text-center"><b className="block text-xl">{stats.qualified_referrals}</b><small className="text-[9px] font-black uppercase tracking-wider text-[#71839A]">Recruited</small></div></div>
    <div className="mt-4 flex items-center gap-2"><div className="min-w-0 flex-1 truncate rounded-xl border border-[#D9E4EF] bg-[#F7FAFD] px-3 py-3 text-xs text-[#60738D]">{invite}</div><button type="button" onClick={()=>void share()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-blue px-4 text-xs font-black uppercase text-white"><FaShareNodes/>{copied?'Copied':'Invite'}</button></div>
    {stats.next_milestone&&<><div className="mt-4 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wider"><span className="text-[#71839A]">Next: {stats.next_milestone_name}</span><span>{stats.qualified_referrals}/{stats.next_milestone}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E7EEF6]"><i className="block h-full rounded-full bg-rcl-orange" style={{width:progress+'%'}}/></div></>}
    <div className="mt-4 flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-wider text-[#71839A]">{stats.rep_earned.toLocaleString()} REP earned from referrals</p><Link href="/referrals" className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rcl-blue">Open hub <FaArrowRight/></Link></div>
  </section>;
}

'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

type Stats = { code: string; qualified_referrals: number; rep_earned: number };

export function ReferralCard() {
  const [stats,setStats]=useState<Stats|null>(null);
  const [copied,setCopied]=useState(false);

  useEffect(()=>{ void (async()=>{
    const supabase=getSupabaseClient(); if(!supabase) return;
    const { data:{ user } }=await supabase.auth.getUser(); if(!user) return;
    const { data: code }=await (supabase.rpc as any)('ensure_referral_code',{ target_profile:user.id });
    if(!code) return;
    const { data }=await (supabase.rpc as any)('referral_stats',{ target_profile:user.id });
    const row=Array.isArray(data)?data[0]:data;
    setStats({code:String(row?.code??code),qualified_referrals:Number(row?.qualified_referrals??0),rep_earned:Number(row?.rep_earned??0)});
  })();},[]);

  if(!stats) return null;
  const invite=typeof window==='undefined'?'':`${window.location.origin}/auth/sign-up?invite=${encodeURIComponent(stats.code)}`;
  const share=async()=>{ if(navigator.share){await navigator.share({title:'Join me on Rich City League',text:'Build your RCL profile, REP and badges with me.',url:invite}); return;} await navigator.clipboard.writeText(invite); setCopied(true); window.setTimeout(()=>setCopied(false),1600); };

  return <section className="mt-5 rounded-2xl border border-rcl-gold/25 bg-gradient-to-br from-rcl-gold/10 to-sky-500/5 p-5">
    <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-rcl-gold">Grow the City</p><h2 className="mt-1 font-display text-xl font-black uppercase">Invite Your Hoopers</h2><p className="mt-2 text-xs leading-5 text-white/45">Each qualified signup earns you 200 REP. Referral milestones unlock exclusive community badges.</p></div><div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center"><b className="block text-xl">{stats.qualified_referrals}</b><small className="text-[8px] uppercase text-white/35">Recruited</small></div></div>
    <div className="mt-4 flex items-center gap-2"><div className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-xs text-white/60">{invite}</div><button type="button" onClick={()=>void share()} className="rounded-xl bg-rcl-gold px-4 py-3 text-xs font-black uppercase text-black">{copied?'Copied':'Invite'}</button></div>
    <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-white/30">+{stats.rep_earned} REP earned from referrals</p>
  </section>;
}

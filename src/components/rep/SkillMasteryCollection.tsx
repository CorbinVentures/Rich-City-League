'use client';

import {useEffect,useMemo,useState} from 'react';
import {FaBasketball,FaBullseye,FaChartLine,FaCrown,FaDumbbell,FaHandshake,FaMedal,FaShieldHalved} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';

type Mastery = {
 badge_code:string;badge_name:string;discipline:string;description:string;
 qualifying_games:number;verified_games:number;tier:string;tier_index:number;
 next_target:number;progress_percent:number;
};
const ladder=[
 {label:'Bronze',at:1,color:'#ba8158'},
 {label:'Silver',at:3,color:'#b0c7da'},
 {label:'Gold',at:8,color:'#f1c46d'},
 {label:'Elite',at:16,color:'#a98cff'},
 {label:'Legend',at:30,color:'#f79d81'},
] as const;
const marks:Record<string,typeof FaBasketball>={
 certified_bucket:FaBullseye,
 winning_scorer:FaBasketball,
 glass_cleaner:FaDumbbell,
 floor_general:FaHandshake,
 double_double:FaCrown,
};
const shades:Record<string,{ink:string;edge:string;glow:string}>={
 locked:{ink:'#74879a',edge:'#3b536b',glow:'#102537'},
 bronze:{ink:'#efd0ae',edge:'#aa6d42',glow:'#42271e'},
 silver:{ink:'#e0f0fb',edge:'#93b1c6',glow:'#24435a'},
 gold:{ink:'#ffedb0',edge:'#dca84c',glow:'#59401f'},
 elite:{ink:'#eed7ff',edge:'#aa83f2',glow:'#49336f'},
 legend:{ink:'#ffe8d5',edge:'#f09b73',glow:'#72372c'},
};

export default function SkillMasteryCollection({profileId}:{profileId?:string}){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const target=profileId||user?.id;
 const [masteries,setMasteries]=useState<Mastery[]>([]);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState('');
 const [expanded,setExpanded]=useState<string|null>(null);
 useEffect(()=>{
  if(!db||!target){setMasteries([]);setBusy(false);return;}
  let current=true;
  setBusy(true);setError('');
  void db.rpc('get_rch_skill_mastery',{p_profile:target})
   .then(({data,error:failure}:{data:Mastery[]|null,error:{message:string}|null})=>{
     if(!current)return;
     if(failure){setError('Verified skill progression is temporarily unavailable.');setMasteries([]);}
     else setMasteries(data||[]);
     setBusy(false);
   });
  return()=>{current=false;};
 },[db,target]);
 if(!target)return null;
 return <section aria-label="Real-world skill badge mastery" className="mt-7 rounded-3xl border border-[#42658a] bg-[linear-gradient(150deg,#0b2540,#071825)] p-4 text-white sm:p-6">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div>
    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.19em] text-[#a1d7ff]"><FaMedal/> Your game. Your proof.</p>
    <h2 className="mt-2 font-display text-2xl font-black uppercase sm:text-3xl">Skill Mastery</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b4d1e5]">Real-life basketball badges. Bronze to Legend is earned from independently reviewed box scores—not check-ins, likes, REP purchases, or unverified claims.</p>
   </div>
   <span className="rounded-full border border-[#5e7992] px-3 py-2 text-[10px] font-black uppercase text-[#cce7f7]">5 mastery tiers</span>
  </div>
  <div className="mt-5 flex flex-wrap gap-2" aria-label="Qualification thresholds">
   {ladder.map(t=><span key={t.label} className="rounded-lg border border-[#42607a] bg-[#102d47] px-2.5 py-2 text-[10px] font-bold" style={{color:t.color}}>{t.label} · {t.at} games</span>)}
  </div>
  {busy&&<p role="status" className="mt-5 text-sm text-[#bfd7e7]">Loading verified skill records…</p>}
  {error&&<p role="alert" className="mt-5 text-sm text-amber-200">{error}</p>}
  {!busy&&!error&&!masteries.length&&<p className="mt-5 text-sm text-[#b9cee0]">No public mastery records to display. Private collections remain private.</p>}
  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
   {masteries.map(b=>{
    const Icon=marks[b.badge_code]||FaShieldHalved;
    const style=shades[b.tier]||shades.locked;
    const achieved=b.tier_index>0;
    const isOpen=expanded===b.badge_code;
    return <article key={b.badge_code} className="rounded-2xl border border-[#345a7c] bg-[#0a2036] p-4">
      <div className="flex items-center gap-3">
       <div className="relative grid h-[78px] w-[78px] shrink-0 place-items-center rounded-2xl border-[3px]"
        style={{borderColor:style.edge,background:'radial-gradient(circle at 33% 22%,'+style.edge+','+style.glow+' 65%,#0a1826)',boxShadow:'inset 0 0 0 3px #061521,0 8px 18px #0008'}}>
        <Icon aria-hidden="true" className="text-3xl" style={{color:style.ink}}/>
        <span className="absolute -bottom-2 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase"
         style={{borderColor:style.edge,color:style.ink,background:'#091927'}}>{achieved?b.tier:'Locked'}</span>
       </div>
       <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#91bedd]">{b.discipline}</p>
        <h3 className="mt-1 font-display text-lg font-black leading-tight">{b.badge_name}</h3>
        <p className="mt-1 text-xs text-[#b8d2e5]">{b.qualifying_games} qualifying {b.qualifying_games===1?'game':'games'}</p>
       </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-2 text-xs">
       <span className="font-bold text-[#cde2f4]">{achieved?b.tier.toUpperCase():'UNLOCK BRONZE'}</span>
       <span className="text-[#9dbcd3]">{b.tier==='legend'?'Mastered':b.qualifying_games+' / '+b.next_target}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#31506b]" role="progressbar" aria-label={b.badge_name+' progress toward next tier'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,Math.max(0,b.progress_percent))}>
       <div className="h-full rounded-full transition-all" style={{width:Math.min(100,Math.max(0,b.progress_percent))+'%',background:style.edge}}/>
      </div>
      <button type="button" onClick={()=>setExpanded(isOpen?null:b.badge_code)} aria-expanded={isOpen} className="mt-4 min-h-11 w-full rounded-xl border border-[#416a8d] px-3 text-left text-xs font-bold text-[#bbdffc]">
       {isOpen?'Hide unlock requirements':'How to earn and upgrade'} <FaChartLine className="ml-1 inline"/>
      </button>
      {isOpen&&<div className="mt-3 rounded-xl bg-[#102c46] p-3 text-xs leading-5 text-[#d0e3f0]">
        <p>{b.description}</p>
        <p className="mt-2">Earn each tier at 1, 3, 8, 16, and 30 distinct verified competitive Runs meeting this badge requirement.</p>
        <p className="mt-2 text-[#a8cbe4]">Verified games on record: {b.verified_games}. Each Run counts only once. Results require independent review, completed events, and authentic box scores.</p>
       </div>}
    </article>;
   })}
  </div>
  <p className="mt-5 text-xs leading-5 text-[#8fb1cb]">Only trackable skills appear here. Shooting efficiency, steals, blocks, and defensive containment will receive mastery badges only after those stats can be independently measured and verified.</p>
 </section>;
}

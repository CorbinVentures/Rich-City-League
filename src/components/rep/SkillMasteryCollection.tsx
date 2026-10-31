'use client';

import {useEffect,useMemo,useState} from 'react';
import {FaBasketball,FaBullseye,FaChartLine,FaCrown,FaDumbbell,FaHandshake,FaMedal,FaShieldHalved} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';

type Mastery={
 badge_code:string;badge_name:string;discipline:string;description:string;
 qualifying_games:number;verified_games:number;tier:string;tier_index:number;
 next_target:number;progress_percent:number;
 qualifying_sessions?:number;next_sessions?:number;rule_version?:number;
};
const tiers=[
 {name:'Bronze',matches:3,sessions:2,edge:'#bc8462'},
 {name:'Silver',matches:8,sessions:4,edge:'#a7bdcb'},
 {name:'Gold',matches:20,sessions:8,edge:'#f0c76b'},
 {name:'Hall of Fame',matches:40,sessions:12,edge:'#bc9bff'},
 {name:'Legend',matches:75,sessions:20,edge:'#ffac88'},
] as const;
const palettes:Record<string,{edge:string,glow:string}>={
 locked:{edge:'#657e97',glow:'#182e43'},
 bronze:{edge:'#bc8462',glow:'#4a2b24'},
 silver:{edge:'#a7bdcb',glow:'#233c55'},
 gold:{edge:'#f0c76b',glow:'#634a22'},
 hall_of_fame:{edge:'#bc9bff',glow:'#4b2c76'},
 legend:{edge:'#ffac88',glow:'#663629'},
};
const iconFor:Record<string,typeof FaBasketball>={
 certified_bucket:FaBullseye,winning_scorer:FaBasketball,glass_cleaner:FaDumbbell,
 floor_general:FaHandshake,double_double:FaCrown,sniper:FaBullseye,
 ball_hawk:FaShieldHalved,rim_protector:FaShieldHalved,two_way_threat:FaCrown,
};
const pretty=(s:string)=>s==='hall_of_fame'?'Hall of Fame':s[0].toUpperCase()+s.slice(1).replaceAll('_',' ');
const measure=(n:number,max:number)=>Math.round(Math.min(100,Math.max(0,n)/Math.max(1,max)*100));

export default function SkillMasteryCollection({profileId}:{profileId?:string}){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const target=profileId||user?.id;
 const [badges,setBadges]=useState<Mastery[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [selected,setSelected]=useState('All');
 const [expanded,setExpanded]=useState<string|null>(null);
 useEffect(()=>{
  if(!db||!target){setBadges([]);setLoading(false);return;}
  let active=true;
  setLoading(true);setError('');
  void db.rpc('get_rch_skill_mastery',{p_profile:target})
   .then(({data,error:failure}:{data:Mastery[]|null,error:{message:string}|null})=>{
    if(!active)return;
    if(failure){setError('Verified skill progression is temporarily unavailable.');setBadges([]);}
    else setBadges(data||[]);
    setLoading(false);
   });
  return()=>{active=false;};
 },[db,target]);
 if(!target)return null;
 const disciplines=['All',...new Set(badges.map(b=>b.discipline))];
 const visible=selected==='All'?badges:badges.filter(b=>b.discipline===selected);
 const achieved=badges.filter(b=>b.tier_index>0).length;
 return <section aria-label="RCH MyPLAYER verified basketball skill mastery" className="mt-7 overflow-hidden rounded-3xl border border-[#456d95] bg-[radial-gradient(circle_at_top_right,#173a59,#071726_70%)] p-4 text-white sm:p-6">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div>
    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-[#9bd4fc]"><FaMedal/> MyPLAYER · Skill Engine V2</p>
    <h2 className="mt-2 font-display text-2xl font-black uppercase sm:text-3xl">Your game. Your proof.</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#bdd4e6]">Badges are earned from independently reviewed, match-specific box scores—not attendance, game count, XP, REP purchases or social activity. Play style determines the path.</p>
   </div>
   <div className="flex items-center gap-3 rounded-xl border border-[#3a6284] bg-[#0c263d] px-4 py-3">
    <FaChartLine className="text-[#f1c978]" aria-hidden="true"/>
    <div><p className="text-lg font-black">{achieved}<span className="text-sm text-[#9bb4c8]">/{badges.length}</span></p><p className="text-[10px] uppercase tracking-wider text-[#a7c7df]">Skills earned</p></div>
   </div>
  </div>
  <div className="mt-5 flex flex-wrap gap-2" aria-label="Skill mastery thresholds">
   {tiers.map(t=><span key={t.name} className="rounded-lg border border-[#385673] bg-[#102b42] px-3 py-2 text-[10px] font-bold" style={{color:t.edge}}>{t.name} · {t.matches} matches / {t.sessions} Runs</span>)}
  </div>
  {badges.length>0&&<div className="mt-5 flex flex-wrap gap-2" aria-label="Filter basketball disciplines">
    {disciplines.map(d=><button type="button" key={d} onClick={()=>setSelected(d)} aria-pressed={selected===d}
     className={'min-h-10 rounded-xl border px-3 text-xs font-bold '+(selected===d?'border-[#f0c77f] bg-[#554221] text-[#fff0d0]':'border-[#43607a] bg-[#0c273e] text-[#b9d6ed]')}>{d}</button>)}
  </div>}
  {loading&&<p className="mt-5 text-sm text-[#c3d9eb]" role="status">Loading verified match evidence…</p>}
  {error&&<p className="mt-5 text-sm text-amber-200" role="alert">{error}</p>}
  {!loading&&!error&&!badges.length&&<p className="mt-5 text-sm text-[#b6cce0]">No available mastery records. A completed, independently verified game is required to establish skill progress.</p>}
  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
   {visible.map(b=>{
    const Icon=iconFor[b.badge_code]||FaShieldHalved;
    const style=palettes[b.tier]||palettes.locked;
    const full=b.tier_index>=5;
    const sessions=Number(b.qualifying_sessions||0);
    const sessionTarget=Number(b.next_sessions||2);
    const progress=full?100:Math.min(measure(b.qualifying_games,b.next_target),measure(sessions,sessionTarget));
    const open=expanded===b.badge_code;
    return <article key={b.badge_code} className="rounded-2xl border border-[#365e7d] bg-[#091f33] p-4">
     <div className="flex items-center gap-3">
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-2"
       style={{borderColor:style.edge,background:'radial-gradient(circle at 30% 20%,'+style.glow+',#091725)'}}>
       <Icon className="text-3xl" style={{color:style.edge}} aria-hidden="true"/>
      </div>
      <div className="min-w-0">
       <p className="text-[10px] font-black uppercase tracking-[.15em] text-[#8ebfdc]">{b.discipline}</p>
       <h3 className="mt-1 font-display text-lg font-black">{b.badge_name}</h3>
       <p className="mt-1 text-xs font-bold" style={{color:style.edge}}>{pretty(b.tier)}</p>
      </div>
     </div>
     <div className="mt-5 flex items-center justify-between text-xs font-bold">
      <span className="text-[#cbe4f5]">{full?'Skill mastered':'Next upgrade'}</span>
      <span className="text-[#f1d2a2]">{full?'MAX':progress+'%'}</span>
     </div>
     <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#2c475f]" role="progressbar" aria-label={b.badge_name+' next tier progress'} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all" style={{width:progress+'%',background:style.edge}}/>
     </div>
     <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
      <div className="rounded-lg bg-[#112d44] p-2"><strong>{b.qualifying_games} / {full?75:b.next_target}</strong><p className="mt-1 text-[10px] text-[#a8bfd5]">Qualifying matches</p></div>
      <div className="rounded-lg bg-[#112d44] p-2"><strong>{sessions} / {full?20:sessionTarget}</strong><p className="mt-1 text-[10px] text-[#a8bfd5]">Separate Run sessions</p></div>
     </div>
     <button type="button" onClick={()=>setExpanded(open?null:b.badge_code)} aria-expanded={open}
      className="mt-4 min-h-11 w-full rounded-xl border border-[#456b8b] px-3 text-left text-xs font-bold text-[#b9e2fa]">
      {open?'Hide requirements':'How to earn & upgrade'} <FaChartLine className="ml-1 inline"/>
     </button>
     {open&&<div className="mt-3 rounded-xl bg-[#122e45] p-3 text-xs leading-5 text-[#c2d9e9]">
      <p>{b.description}</p>
      <p className="mt-2">Verified match receipts: {b.verified_games}. Qualifying games: {b.qualifying_games}. Each match counts once and every threshold must be supported by actual recorded statistics.</p>
      <p className="mt-2">Different courts, games and match formats earn their own evidence. Independent staff review and completed events are mandatory. Rule version {b.rule_version||2}.</p>
     </div>}
    </article>;
   })}
  </div>
  <p className="mt-5 text-xs leading-5 text-[#93b7d1]">Unrecorded metrics do not qualify. Badges never change official competitive rating or team selection automatically. One-time location, participation and championship medals live separately in your collectible vault.</p>
 </section>;
}
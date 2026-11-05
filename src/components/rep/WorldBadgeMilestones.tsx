'use client';

import {useEffect,useMemo,useState} from 'react';
import {FaBasketball,FaCheck,FaCrown,FaLocationDot,FaShieldHalved,FaTrophy} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';

type Journey={
 signed_in:boolean;
 verified_games:number;
 verified_wins:number;
 verified_courts:number;
 master_title_defenses:number;
 milestones:Record<string,boolean>;
};
type Milestone={key:string;name:string;description:string;icon:typeof FaBasketball;current:(j:Journey)=>number;target:number};
const milestones:Milestone[]=[
 {key:'first_battle',name:'First Battle',description:'Complete your first independently verified competitive game.',icon:FaBasketball,current:j=>j.verified_games,target:1},
 {key:'first_win',name:'Breakthrough',description:'Record your first confirmed victory.',icon:FaTrophy,current:j=>j.verified_wins,target:1},
 {key:'five_verified_games',name:'Park Veteran',description:'Complete five verified competitive games.',icon:FaShieldHalved,current:j=>j.verified_games,target:5},
 {key:'three_arenas',name:'Court Explorer',description:'Play verified games at three different courts.',icon:FaLocationDot,current:j=>j.verified_courts,target:3},
 {key:'ten_verified_wins',name:'Victory Collector',description:'Record ten independently verified wins.',icon:FaTrophy,current:j=>j.verified_wins,target:10},
 {key:'crown_defender',name:'Crown Defender',description:'Successfully defend a verified Court Master title.',icon:FaCrown,current:j=>j.master_title_defenses,target:1},
];

export function WorldBadgeMilestones({profileId}:{profileId?:string}){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [journey,setJourney]=useState<Journey|null>(null);
 const [loading,setLoading]=useState(true);
 const owner=Boolean(user?.id&&(!profileId||user.id===profileId));

 useEffect(()=>{
  if(!db||!owner){setJourney(null);setLoading(false);return;}
  let active=true;
  setLoading(true);
  void db.rpc('get_rch_world_journey').then(({data,error}:{data:Journey|null;error:unknown})=>{
   if(!active)return;
   setJourney(!error&&data?.signed_in?data:null);
   setLoading(false);
  });
  return()=>{active=false;};
 },[db,owner]);

 if(!owner)return null;
 const unlocked=journey?milestones.filter(m=>journey.milestones[m.key]).length:0;
 return <section id="rch-world-badges" aria-label="Verified Runs World achievements" className="mt-8 overflow-hidden rounded-3xl border border-[#425d89] bg-[radial-gradient(circle_at_top_right,#25234b,#081827_68%)] p-4 text-white sm:p-6">
  <div className="flex flex-wrap items-end justify-between gap-4">
   <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#c5b4ff]">Runs World · verified legacy</p>
    <h2 className="mt-2 font-display text-2xl font-black uppercase sm:text-3xl">World Milestones</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c3c9df]">Permanent achievements earned through verified games, wins, courts and title defenses.</p>
   </div>
   <strong className="rounded-xl border border-[#625790] bg-[#161b34] px-4 py-3 text-sm">{loading?'Syncing…':journey?unlocked+'/'+milestones.length+' unlocked':'Progress unavailable'}</strong>
  </div>
  {loading&&<p role="status" className="mt-5 text-sm text-[#c3c9df]">Loading verified World milestones…</p>}
  {!loading&&journey&&<div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
   {milestones.map(item=>{
    const earned=Boolean(journey.milestones[item.key]);
    const current=Math.min(item.target,Math.max(0,item.current(journey)));
    const pct=Math.round(current/item.target*100);
    const Icon=item.icon;
    return <article key={item.key} className={'rounded-2xl border p-4 '+(earned?'border-[#c4adff] bg-[#171b36]':'border-[#3a4d6e] bg-[#0b2033]')}>
     <div className="flex items-start gap-3">
      <div className={'grid h-12 w-12 shrink-0 place-items-center rounded-xl border '+(earned?'border-[#c4adff] bg-[#6f58b7]/30 text-[#e7ddff]':'border-[#46536d] bg-[#121c2c] text-[#8392ac]')}><Icon aria-hidden="true"/></div>
      <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="font-display text-lg font-black">{item.name}</h3>{earned&&<FaCheck className="shrink-0 text-[#c4adff]" aria-label="Unlocked"/>}</div>
       <p className="mt-1 text-xs leading-5 text-[#b8c5d7]">{item.description}</p>
      </div>
     </div>
     <div className="mt-4 flex justify-between text-[10px] font-black uppercase tracking-wide text-[#c8d4e2]"><span>{earned?'Unlocked':'Progress'}</span><span>{current} / {item.target}</span></div>
     <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#293a51]" role="progressbar" aria-label={item.name+' progress'} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span className={'block h-full rounded-full '+(earned?'bg-[#c4adff]':'bg-[#799ac1]')} style={{width:pct+'%'}}/></div>
    </article>;
   })}
  </div>}
  {!loading&&!journey&&<p role="status" className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-[#bbc8d7]">Verified World milestone progress is temporarily unavailable.</p>}
  <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-[#9cacc5]"><FaShieldHalved className="mt-0.5 shrink-0"/> Court scouting is a personal map save; it never counts as a physical visit or unlocks a court achievement. REP, XP and purchases do not upgrade these milestones.</p>
 </section>;
}

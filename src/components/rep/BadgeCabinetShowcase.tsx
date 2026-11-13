'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaAward,FaBasketball,FaCheck,FaCrown,FaLocationDot,FaPlus,FaShieldHalved,FaTrash,FaTrophy} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';
import {getSybBadgeConcept,SYB_AWARDABLE_BADGE_CODES} from '@/lib/syb-badges';
import {BadgeMedallion} from '@/components/BadgeMedallion';

type PlaceAward={id:string;badge_code:string;place_label:string};
type Blueprint={code:string;display_name:string;description:string;tier:string};
type Pin={badge_kind:'skill'|'world'|'location'|'achievement'|'run';badge_key:string;slot:number};
type Option={kind:Pin['badge_kind'];key:string;name:string;detail:string;tier?:string;category:string};
type Skill={badge_code:string;badge_name:string;description:string;tier:string;tier_index:number};
type Journey={signed_in:boolean;milestones:Record<string,boolean>};
const worldCatalog=[
 {key:'first_battle',name:'First Battle',detail:'First verified competitive game'},
 {key:'first_win',name:'Breakthrough',detail:'First verified victory'},
 {key:'five_verified_games',name:'Park Veteran',detail:'Five verified games'},
 {key:'three_arenas',name:'Court Explorer',detail:'Verified games at three courts'},
 {key:'ten_verified_wins',name:'Victory Collector',detail:'Ten verified wins'},
 {key:'crown_defender',name:'Crown Defender',detail:'Defended a Court Master title'},
];
const joinBadge=(row:any)=>Array.isArray(row.badge)?row.badge[0]:row.badge;
const runBadgeVisual=(code:string)=>{
 const badge=getSybBadgeConcept(code);
 return badge?.awardable?{brand:'syb' as const,code:badge.code,mark:badge.mark,name:badge.name,icon:badge.icon,tier:'gold'}:null;
};

export function BadgeCabinetShowcase({profileId,awards,blueprints}:{profileId?:string;awards:PlaceAward[];blueprints:Blueprint[]}){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const target=profileId||user?.id;
 const owner=Boolean(user?.id&&target===user.id);
 const [pins,setPins]=useState<Pin[]>([]);
 const [options,setOptions]=useState<Option[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<string|null>(null);
 const [message,setMessage]=useState('');

 const load=useCallback(async()=>{
  if(!db||!target){setPins([]);setOptions([]);setLoading(false);return;}
  setLoading(true);
  const [pinResult,skillResult,fanResult,coachResult,playerResult,runAwardsResult]=await Promise.all([
   db.from('rch_badge_cabinet_pins').select('badge_kind,badge_key,slot').eq('profile_id',target).order('slot'),
   db.rpc('get_rch_skill_mastery',{p_profile:target}),
   db.from('fan_badges').select('badge_id,earned_at,badge:badges(name,description,tier,category)').eq('profile_id',target).order('earned_at',{ascending:false}).limit(80),
   db.from('coach_badges').select('badge_id,earned_at,badge:badges(name,description,tier,category)').eq('profile_id',target).order('earned_at',{ascending:false}).limit(80),
   db.from('players').select('id').eq('profile_id',target).eq('is_active',true).maybeSingle(),
   owner?db.from('rch_run_badge_awards').select('badge_code,awarded_at').eq('profile_id',target).in('badge_code',SYB_AWARDABLE_BADGE_CODES).order('awarded_at',{ascending:false}):Promise.resolve({data:[]}),
  ]);
  const next:Option[]=[];
  const blueprintsByCode=new Map(blueprints.map(b=>[b.code,b]));
  for(const award of awards){
   const badge=blueprintsByCode.get(award.badge_code);
   if(badge)next.push({kind:'location',key:award.id,name:badge.display_name,detail:award.place_label,tier:badge.tier,category:'Court'});
  }
  for(const row of ((skillResult.data||[]) as Skill[])){
   if(row.tier_index>0)next.push({kind:'skill',key:row.badge_code,name:row.badge_name,detail:row.description,tier:row.tier,category:'Skill'});
  }
  for(const row of ((runAwardsResult.data||[]) as {badge_code:string}[])){
   const badge=getSybBadgeConcept(row.badge_code);
   if(badge?.awardable)next.push({kind:'run',key:badge.code,name:badge.name,detail:badge.requirement,tier:badge.tier,category:'SYB Circuit'});
  }
  const achievementRows:any[]=[...(fanResult.data||[]),...(coachResult.data||[])];
  const playerId=playerResult.data?.id;
  if(playerId){
   const {data}=await db.from('player_badges').select('badge_id,earned_at,badge:badges(name,description,tier,category)').eq('player_id',playerId).order('earned_at',{ascending:false}).limit(80);
   achievementRows.push(...(data||[]));
  }
  const seenAchievements=new Set<string>();
  for(const row of achievementRows){
   const badge=joinBadge(row);
   if(!badge||!row.badge_id||seenAchievements.has(row.badge_id))continue;
   seenAchievements.add(row.badge_id);
   next.push({kind:'achievement',key:row.badge_id,name:badge.name||'RCH Achievement',detail:badge.description||'Earned RCH community achievement',tier:badge.tier||undefined,category:badge.category||'Community'});
  }
  if(owner){
   const {data}=await db.rpc('get_rch_world_journey');
   const journey=data as Journey|null;
   if(journey?.signed_in)for(const item of worldCatalog){
    if(journey.milestones[item.key])next.push({kind:'world',key:item.key,name:item.name,detail:item.detail,tier:'Verified',category:'World'});
   }
  }
  const deduped=[...new Map(next.map(item=>[item.kind+':'+item.key,item])).values()];
  setPins((pinResult.data||[]) as Pin[]);
  setOptions(deduped);
  setLoading(false);
 },[db,target,owner,awards,blueprints]);

 useEffect(()=>{void load();},[load]);
 const changePin=async(option:Option,pinned:boolean)=>{
  if(!db||!owner||busy)return;
  setMessage('');
  const identity=option.kind+':'+option.key;
  setBusy(identity);
  const nextSlot=pinned?null:([1,2,3,4,5] as const).find(slot=>!pins.some(pin=>pin.slot===slot));
  if(!pinned&&!nextSlot){setMessage('All five featured slots are filled. Remove a badge before adding another.');setBusy(null);return;}
  const {error}=await db.rpc('rch_set_badge_cabinet_pin',{
   p_badge_kind:option.kind,p_badge_key:option.key,p_slot:nextSlot,p_pinned:!pinned,
  });
  if(error)setMessage(error.message||'Unable to update your featured badges.');
  else await load();
  setBusy(null);
 };
 const optionFor=(pin:Pin):Option|undefined=>{
  const existing=options.find(item=>item.kind===pin.badge_kind&&item.key===pin.badge_key);
  if(existing)return existing;
  if(pin.badge_kind==='world'){
   const milestone=worldCatalog.find(item=>item.key===pin.badge_key);
   if(milestone)return {kind:'world',key:milestone.key,name:milestone.name,detail:milestone.detail,tier:'Verified',category:'World'};
  }
  if(pin.badge_kind==='run'){
   const badge=getSybBadgeConcept(pin.badge_key);
   if(badge?.awardable)return {kind:'run',key:badge.code,name:badge.name,detail:badge.requirement,tier:badge.tier,category:'SYB Circuit'};
  }
  return undefined;
 };
 const badgeIcon=(kind:Pin['badge_kind'])=>kind==='skill'?FaBasketball:kind==='world'?FaCrown:kind==='location'?FaLocationDot:kind==='run'?FaBasketball:FaAward;

 return <section aria-label="Featured mixed-type badge showcase" className="mt-7 rounded-3xl border border-[#9a7b49] bg-[radial-gradient(circle_at_top_right,#342c20,#0b1826_65%)] p-4 text-white sm:p-6">
  <div className="flex flex-wrap items-end justify-between gap-3">
   <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f2d39a]">MyPLAYER · Featured legacy</p>
    <h2 className="mt-2 font-display text-2xl font-black uppercase">Show Your Five</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d7c9ad]">Feature any mix of earned skill, World, court, event or community badges on your profile.</p>
   </div>
   <strong className="rounded-xl border border-[#806a46] bg-[#211e1a] px-4 py-3 text-sm">{pins.length}/5 featured</strong>
  </div>
  {message&&<p role="status" className="mt-4 rounded-xl border border-amber-300/30 bg-amber-950/20 p-3 text-xs text-amber-100">{message}</p>}
  {loading&&<p role="status" className="mt-4 text-sm text-[#d7c9ad]">Loading your verified badge collection…</p>}
  {!loading&&<div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
   {[1,2,3,4,5].map(slot=>{
    const pin=pins.find(item=>item.slot===slot);
    const option=pin?optionFor(pin):undefined;
    const Icon=pin?badgeIcon(pin.badge_kind):FaPlus;
    const medal=pin?.badge_kind==='run'?runBadgeVisual(pin.badge_key):null;
    return <article key={slot} className="rounded-2xl border border-[#806a46]/70 bg-[#0d1b28] p-3 text-center">
     <div className="mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-full border-2 border-[#d6b56d] bg-[radial-gradient(circle_at_30%_20%,#78633b,#1b2027_65%)] text-2xl text-[#ffe7a9]">{medal?<BadgeMedallion badge={medal} size="xs"/>:<Icon aria-hidden="true"/>}</div>
     <p className="mt-3 text-[9px] font-black uppercase tracking-[.15em] text-[#d6b56d]">{pin?(option?.category||pin.badge_kind):'Legacy slot '+slot}</p>
     <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-black">{pin?(option?.name||pin.badge_key.replaceAll('_',' ')):'Open slot'}</h3>
     <p className="mt-1 line-clamp-2 min-h-8 text-[10px] leading-4 text-[#a7b6c5]">{option?.detail|| (pin?'Earned badge on this profile':'Choose a badge below to feature it.')}</p>
     {pin&&option?.tier&&<span className="mt-2 inline-block rounded-full border border-[#b69a64]/40 px-2 py-1 text-[9px] font-black uppercase text-[#f0d49a]">{option.tier}</span>}
     {owner&&pin&&option&&<button type="button" disabled={busy!==null} onClick={()=>void changePin(option,true)} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#765d3a] px-3 text-[10px] font-black uppercase text-[#f0d49a] disabled:opacity-50"><FaTrash/> Remove</button>}
    </article>;
   })}
  </div>}
  {owner&&!loading&&<div className="mt-6 border-t border-white/10 pt-5">
   <h3 className="text-xs font-black uppercase tracking-[.16em] text-[#f2d39a]">Earned badges you can feature</h3>
   {!options.length?<p className="mt-3 text-sm text-[#b5c1cc]">Earn a verified badge and it will appear here.</p>:
    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
     {options.map(option=>{
      const pinned=pins.some(pin=>pin.badge_kind===option.kind&&pin.badge_key===option.key);
      const Icon=badgeIcon(option.kind);
      const medal=option.kind==='run'?runBadgeVisual(option.key):null;
      return <article key={option.kind+':'+option.key} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
       <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#806a46] text-[#f2d39a]">{medal?<BadgeMedallion badge={medal} size="xs"/>:<Icon aria-hidden="true"/>}</div>
       <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-wide text-[#b6c6d5]">{option.category}{option.tier?' · '+option.tier:''}</p><strong className="block truncate text-xs">{option.name}</strong><small className="block truncate text-[10px] text-[#aab7c4]">{option.detail}</small></div>
       <button type="button" disabled={busy!==null||pinned||pins.length>=5} onClick={()=>void changePin(option,false)} aria-label={'Pin to Top Five: '+option.name} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#a27d3a] text-[#f2d39a] disabled:cursor-not-allowed disabled:opacity-40">{pinned?<FaCheck/>:<FaPlus/>}</button>
      </article>;
     })}
    </div>}
  </div>}
  <p className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-[#95a8ba]"><FaShieldHalved className="mt-0.5 shrink-0"/> RCH verifies every pin against an earned record. A featured slot never creates or changes an award.</p>
 </section>;
}

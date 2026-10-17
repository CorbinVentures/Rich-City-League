'use client';

import Link from 'next/link';
import SkillMasteryCollection from './SkillMasteryCollection';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaBasketball,FaBolt,FaCrown,FaGem,FaLocationDot,FaRoute,FaShieldHalved,FaTicket,FaTrophy,FaUsers,FaVideo} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';

type Blueprint={code:string;display_name:string;description:string;tier:string;audience:string;visual_key:string;award_rule:string};
type Award={id:string;badge_code:string;court_slug:string|null;scope_key:string;place_label:string;locality:string;source_kind:string;earned_at:string};
const tierLabel:Record<string,string>={bronze:'Bronze',silver:'Silver',gold:'Gold',elite:'Elite',platinum:'Platinum',diamond:'Diamond'};
const icons:Record<string,typeof FaTrophy>={
 'court-score-engraved':FaBasketball,'court-medal':FaLocationDot,'location-crown':FaCrown,
 'virginia-route':FaRoute,'crew-shield':FaShieldHalved,'fan-ticket':FaTicket,
 'cheer-crown':FaGem,'creator-lens':FaVideo,'virginia-crown':FaCrown
};
const theme:Record<string,{light:string;mid:string;dark:string}>={
 bronze:{light:'#eec59c',mid:'#ab7046',dark:'#38241c'},
 silver:{light:'#edf9ff',mid:'#a6b9cc',dark:'#283f59'},
 gold:{light:'#fff2bc',mid:'#e2ac45',dark:'#573d19'},
 elite:{light:'#f2e1ff',mid:'#a489f1',dark:'#38265c'},
 platinum:{light:'#b9f5ff',mid:'#69b0d8',dark:'#183c60'},
 diamond:{light:'#e5ffff',mid:'#78cce2',dark:'#244377'}
};

/** Original, resolution-independent collectible medallion art, with a stable
 * court identity engraved on each award rather than a generic icon. */
export function PlaceBadgeMedal({badge,place,earned=false,compact=false}:{
 badge:Blueprint;place?:string;earned?:boolean;compact?:boolean;
}){
 const t=theme[badge.tier]||theme.bronze;
 const Icon=icons[badge.visual_key]||FaTrophy;
 const map=badge.visual_key==='virginia-crown'||badge.visual_key==='virginia-route';
 const shutout=badge.visual_key==='court-score-engraved';
 const textPlace=(place||'VIRGINIA').toUpperCase();
 return <div role="img" aria-label={badge.display_name+(place?' earned at '+place:'')+', '+badge.tier+' medallion'}
  className={'relative mx-auto aspect-square shrink-0 select-none '+(compact?'w-28':'w-36 sm:w-44')+(earned?'':' opacity-80 grayscale-[.3]')}
  style={{filter:'drop-shadow(0 9px 16px #000a)'}}>
   <div className="absolute inset-1 rounded-full" style={{background:'repeating-conic-gradient(from 15deg,'+t.light+' 0deg 4deg,'+t.dark+' 4deg 7deg,'+t.mid+' 7deg 11deg)',boxShadow:'0 5px 0 '+t.dark+',0 12px 20px #0008'}}/>
   <div className="absolute inset-[9%] rounded-full border-[3px]" style={{borderColor:t.light,background:'conic-gradient(from 25deg,'+t.mid+','+t.light+','+t.dark+','+t.light+','+t.mid+')',boxShadow:'inset 0 0 0 5px '+t.dark+',0 0 0 2px #ffffff50'}}/>
   <div className="absolute inset-[17%] overflow-hidden rounded-full border-2 text-center" style={{borderColor:t.light,background:'radial-gradient(ellipse at 30% 20%,#ffffff32,transparent 50%),linear-gradient(140deg,'+t.dark+',#0b182b 65%,'+t.dark+')',boxShadow:'inset 0 0 14px #000b'}}>
     <span className="absolute inset-x-0 top-[7%] text-[8px] font-black tracking-[.23em]" style={{color:t.light}}>RCH • {tierLabel[badge.tier]}</span>
     <div className="absolute inset-x-0 top-[23%] flex h-[47%] items-center justify-center">
      {map?<div className="relative h-full w-full">
        {/* Virginia outline from MIT-licensed coryetzkorn/state-svg-defs, based on the original ProPublica state icon. */}
        <svg viewBox="0 0 92 80" role="presentation" className="h-full w-full" aria-hidden="true">
          <path d="M81.84 51.36l-0.4 0.16 0.32 0.32h0.080v-0.48zM82.72 43.2l0.080-0.24v-0.72l-0.56 0.96h0.48zM83.6 41.2l0.32-0.72 0.16-0.080-0.56 0.64zM86.24 34.64l0.56-1.36-2.64 0.24-0.96 1.28 0.72 0.8-1.2 0.4-0.16 1.6-1.12 0.88-0.8 3.68 0.64 2.16 0.56-0.96 0.32 0.56 0.56-3.44 0.88-0.64-0.4-0.16 0.4-0.56 0.48 0.72 0.56-0.48zM87.2 34.8l0.8-1.92-1.52 2.16h0.4zM62.080 19.6l-4.64-3.52-0.8 3.52-4.32 4.56-1.28-0.72-2.88 5.36-2.16-0.72-0.24-1.2-1.12-0.48-1.52 4.16-4.88 7.2 0.56 0.8-0.72 1.36-1.6 1.12-0.72-0.56-2.16 0.96-1.12-0.4-0.24 1.12-3.52 0.8-1.44-1.12-2.16 1.52-3.44-2.16-0.24-2.080-3.76 3.040-3.44 1.76-2.080 2.88-2 0.4-0.72 1.2-5.44 1.52 35.68 2.16h20.64l20.32-0.24-0.16-0.56 0.8 0.56v-2.4l1.28 2.4-1.52-4.64-3.28-0.4 0.16 1.2-0.8-0.4-1.52 0.4 0.56-1.2-1.84-1.12-0.24-1.76-0.64 0.4-2.32-0.96-0.56-0.72-0.56 0.32-1.92-0.4 0.16-0.56 2.080 0.8 0.32-0.56 0.72 1.12 0.8-1.12 1.28 1.68 0.88-0.4 2.4 2.96 1.040-0.4 0.4-1.12-0.64-0.080 0.24-0.48-0.8-1.040-1.52-0.4-2.72-3.040 0.16-0.24 3.36 3.28 0.88-0.32-0.72-0.48 0.32-1.52 1.44 1.6 0.16-2.32-1.52-0.24 0.96-0.56-2.4-0.8-4.16-5.44-1.92-0.96 0.72-0.16 1.2 0.96 4.4 5.44 0.4-0.64 1.6 0.8-0.4-2.72 0.96 0.4v-1.12l-2.8-1.36-0.72-1.6-1.36 0.080-2.080-0.8-1.2-1.36 0.56-0.24-0.24-0.72-3.2 0.72 0.72-0.32-0.88-0.8 0.56 0.4 0.72-2.96 0.64 0.080 0.16-0.8 0.96-0.56v-1.92l-2.16-1.84-2.24-0.96 0.48-1.2-1.12-1.040-1.68-0.24z" fill={t.mid} stroke={t.light} strokeWidth="1.1" strokeLinejoin="round"/>
          {badge.visual_key==='virginia-crown'
            ?<path d="M39 18 L39 9 L48 13 L54 3 L61 13 L69 8 L68 18 Z" fill={t.light} stroke={t.dark} strokeWidth=".75"/>
            :<path d="M17 51 Q31 36 43 42 T73 49" fill="none" stroke={t.light} strokeWidth="1.7" strokeDasharray="3 2"/>}
        </svg>
       </div>:<Icon aria-hidden="true" className="h-[65%] w-[65%]" style={{color:t.light,filter:'drop-shadow(0 2px 2px #0009)'}}/>}
     </div>
     <strong className="absolute inset-x-[3%] bottom-[20%] truncate text-[10px] font-black tracking-[.1em]" style={{color:t.light}}>{shutout?'21 – 0':badge.visual_key==='location-crown'?'KING OF COURT':badge.visual_key==='virginia-crown'?'KING OF VA':badge.visual_key==='virginia-route'?'ROAD WARRIOR':'RCH LEGACY'}</strong>
     <div className="absolute inset-x-0 bottom-[6%] truncate px-3 text-[8px] font-black tracking-wide text-white/75">{textPlace}</div>
   </div>
   <div className="pointer-events-none absolute inset-[14%] rounded-full bg-[linear-gradient(130deg,#ffffff4d,transparent_30%,transparent_65%,#ffffff14)]"/>
  </div>;
}

export default function PlaceBadgeVault({profileId}:{profileId?:string}){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [blueprints,setBlueprints]=useState<Blueprint[]>([]);
 const [awards,setAwards]=useState<Award[]>([]);
 const [view,setView]=useState<'earned'|'catalog'>('earned');
 const [crewAwards,setCrewAwards]=useState<{badge_code:string;place_label:string;locality:string;court_slug:string;crew_id:string}[]>([]);
 const [loaded,setLoaded]=useState(false);
 const [pins,setPins]=useState<Array<{award_id:string;slot:number}>>([]);
 const [pinBusy,setPinBusy]=useState<string|null>(null);
 const [pinError,setPinError]=useState('');
 const target=profileId||user?.id;
 const load=useCallback(async()=>{
  if(!db)return;
  const {data:catalog}=await db.from('rch_badge_blueprints').select('code,display_name,description,tier,audience,visual_key,award_rule').eq('available',true);
  setBlueprints((catalog??[]) as Blueprint[]);
  if(target){
   const {data:mine}=await db.from('rch_place_badge_awards').select('id,badge_code,court_slug,scope_key,place_label,locality,source_kind,earned_at').eq('profile_id',target).order('earned_at',{ascending:false}).limit(120);
   setAwards((mine??[]) as Award[]);
   const {data:pinRows}=await db.from('rch_badge_showcase_pins').select('award_id,slot').eq('profile_id',target).order('slot').limit(5);
   setPins((pinRows??[]) as Array<{award_id:string;slot:number}>);
   const {data:teams}=await db.from('commonwealth_crew_members').select('crew_id').eq('profile_id',target).limit(20);
   const ids=(teams??[]).map((x:{crew_id:string})=>x.crew_id);
   if(ids.length){
    const {data:c}=await db.from('rch_crew_badge_awards').select('badge_code,place_label,locality,court_slug,crew_id').in('crew_id',ids).limit(60);
    setCrewAwards(c??[]);
   }else setCrewAwards([]);
  } else {setAwards([]);setCrewAwards([]);setPins([]);}
  setLoaded(true);
 },[db,target]);
 useEffect(()=>{void load();},[load]);
 const byCode=new Map(blueprints.map(b=>[b.code,b]));
 const owner=Boolean(user?.id&&target===user.id);
 const togglePin=async(awardId:string)=>{
  if(!db||!owner||pinBusy)return;
  setPinError('');setPinBusy(awardId);
  const pinned=pins.some(p=>p.award_id===awardId);
  const slot=([1,2,3,4,5] as const).find(n=>!pins.some(p=>p.slot===n));
  if(!pinned&&!slot){setPinError('Your showcase already has five medals. Unpin one to add another.');setPinBusy(null);return;}
  const request=pinned
   ?db.from('rch_badge_showcase_pins').delete().eq('profile_id',target).eq('award_id',awardId)
   :db.from('rch_badge_showcase_pins').insert({profile_id:target,award_id:awardId,slot});
  const {error:failure}=await request;
  if(failure)setPinError(failure.message);
  else await load();
  setPinBusy(null);
 };
 return <section aria-label="RCH geographic achievements" className="mt-9">
  <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/15 pb-4">
   <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#a1d7ff]">Location authenticated • Original collectible artwork</p>
    <h2 className="mt-2 font-display text-2xl font-black uppercase sm:text-3xl">The Trophy Case</h2>
    <p className="mt-2 max-w-2xl text-sm text-[#9fc0d9]">Each medal remembers where you earned it, from Rockwood Park to the entire Commonwealth. Individual honors cannot be purchased with REP.</p>
   </div>
   <Link href="/rep" className="flex min-h-11 items-center gap-2 rounded-xl border border-[#6a91b4] px-4 text-xs font-black text-[#b8dfff]"><FaBolt/> Open REP Exchange</Link>
  </div>
  {pinError&&<p role="alert" className="mt-4 rounded-lg border border-amber-500/40 p-3 text-xs text-amber-200">{pinError}</p>}
  {pins.length>0&&<div className="mt-5 rounded-2xl border border-[#9e8056] bg-[#172b3e] p-4">
   <h3 className="text-xs font-black uppercase tracking-[.15em] text-[#ffdd98]">Featured Legacy · Top Five</h3>
   <div className="mt-3 flex flex-wrap gap-2">{pins.map(p=>{const a=awards.find(a=>a.id===p.award_id);const b=a?byCode.get(a.badge_code):null;return a&&b?<span key={p.award_id} className="rounded-xl border border-[#826e4a] bg-[#0d2135] px-3 py-2 text-xs font-bold text-[#e5d5aa]">{p.slot}. {b.display_name} · {a.place_label}</span>:null;})}</div>
  </div>}
  {owner&&<p className="mt-3 text-[11px] text-[#a5c3db]">Pin up to five verified location medals to your public profile ({pins.length}/5).</p>}
  <div className="mt-4 flex flex-wrap gap-2">
   <button onClick={()=>setView('earned')} className={'min-h-10 rounded-xl px-4 text-sm font-bold '+(view==='earned'?'bg-[#256b9c] text-white':'border border-[#3e637e] text-[#a9cce4]')}>Earned medals ({awards.length})</button>
   <button onClick={()=>setView('catalog')} className={'min-h-10 rounded-xl px-4 text-sm font-bold '+(view==='catalog'?'bg-[#256b9c] text-white':'border border-[#3e637e] text-[#a9cce4]')}>Unlock Collection ({blueprints.length})</button>
  </div>
  {!loaded&&<p className="mt-4 text-sm text-[#adc7d9]">Loading verified medals…</p>}
  {view==='earned'&&<div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
    {awards.map(a=>{const b=byCode.get(a.badge_code);return b?<article key={a.id} className="rounded-2xl border border-[#45698b] bg-[linear-gradient(150deg,#173251,#0a1c31)] p-3 text-center">
      <PlaceBadgeMedal badge={b} place={a.place_label} earned/>
      <p className="mt-3 text-[10px] font-black uppercase text-[#ffe1a5]">{b.tier} • Verified</p>
      <h3 className="mt-1 text-sm font-black">{b.display_name}</h3>
      <p className="mt-1 text-[11px] text-[#b4d2e7]"><FaLocationDot className="mr-1 inline"/>{a.place_label}</p>
      <p className="mt-2 text-[10px] text-[#879eb8]">{new Date(a.earned_at).toLocaleDateString()}</p>
      {owner&&<button type="button" disabled={pinBusy!==null} onClick={()=>void togglePin(a.id)} className="mt-3 min-h-10 rounded-lg border border-[#587d9a] px-3 text-[11px] font-black text-[#e3d39b] disabled:opacity-50" aria-label={(pins.some(p=>p.award_id===a.id)?'Unpin ':'Pin ')+b.display_name+' from '+a.place_label}>{pins.some(p=>p.award_id===a.id)?'Unpin from Top Five':'Pin to Top Five'}</button>}
     </article>:null;})}
     {!awards.length&&<div className="col-span-full rounded-2xl border border-dashed border-[#45698b] p-7 text-center text-[#adc6d9]">
      <FaTrophy className="mx-auto mb-3 text-3xl"/><strong>Collect your first verified court medal.</strong>
      <p className="mt-2 text-xs">Ranked game wins, authentic court crowns, and staff-certified attendance unlock location-specific rewards.</p>
     </div>}
   </div>}
  {view==='catalog'&&<div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{blueprints.map(b=>{
   const earned=awards.some(a=>a.badge_code===b.code);
   return <article key={b.code} className="rounded-2xl border border-white/10 bg-[#0c2438] p-3 text-center">
     <PlaceBadgeMedal badge={b} earned={earned} place={b.code==='shutout_21'?'ROCKWOOD PARK':'VIRGINIA'}/>
     <p className="mt-3 text-[10px] font-bold uppercase text-[#eaca88]">{b.tier} · {b.audience}</p>
     <h3 className="mt-1 text-sm font-black">{b.display_name}</h3>
     <p className="mt-2 text-xs leading-5 text-[#a8c6db]">{b.description}</p>
     <p className="mt-3 text-[10px] font-black uppercase text-[#b5dfff]">{earned?'Unlocked':'Locked · Earn to unlock'}</p>
    </article>;
  })}</div>}
  {crewAwards.length>0&&<div className="mt-7 rounded-2xl border border-[#866d47] p-5">
    <h3 className="flex items-center gap-2 text-sm font-black uppercase text-[#edd4a1]"><FaUsers/> Your Crew Territory Medals</h3>
    <div className="mt-3 flex flex-wrap gap-2">{crewAwards.map((c,i)=><span key={c.crew_id+':'+c.court_slug+':'+i} className="rounded-full border border-[#90754d] bg-[#282c35] px-3 py-2 text-xs">Territory Taker · {c.place_label}</span>)}</div>
   </div>}
  <SkillMasteryCollection profileId={target}/>
 </section>;
}

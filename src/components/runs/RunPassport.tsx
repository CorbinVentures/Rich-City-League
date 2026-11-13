'use client';

import {useEffect,useMemo,useState} from 'react';
import {FaChartLine,FaMedal,FaShareNodes,FaTrophy} from 'react-icons/fa6';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';
import SkillMasteryCollection from '@/components/rep/SkillMasteryCollection';
import {BadgeMedallion} from '@/components/BadgeMedallion';
import {getSybBadgeConcept} from '@/lib/syb-badges';

type Rating={game_format:string;rating:number;games:number;wins:number;losses:number;provisional:boolean};
type Result={id:string;game_format:string;verified_at:string;court_name:string;rating_before:number;rating_after:number;won:boolean};
type Passport={ratings:Rating[];run_rep:number;verified_games:number;badges:string[];last_results:Result[];open_appeals:number};
const empty:Passport={ratings:[],run_rep:0,verified_games:0,badges:[],last_results:[],open_appeals:0};
const legacyBadgeNames:Record<string,string>={first_win:'First Win',run_veteran:'Run Veteran',court_defender:'Court Defender',takeover_artist:'Takeover Artist'};
function badgeLabel(code:string){return legacyBadgeNames[code]||code.split('_').map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ');}

export function RunPassport(){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [data,setData]=useState<Passport>(empty);
 const [expanded,setExpanded]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [shareStatus,setShareStatus]=useState('');
 useEffect(()=>{
  if(!db||!user?.id){setData(empty);return;}
  let active=true;
  setLoading(true);
  void db.rpc('get_rch_run_passport').then(({data:result,error:failure}:{data:Passport|null,error:{message:string}|null})=>{
    if(!active)return;
    if(failure)setError('Run Passport is temporarily unavailable.');
    else {setData(result??empty);setError('');}
    setLoading(false);
  });
  return()=>{active=false;};
 },[db,user?.id]);
 async function shareMyPassport(){
  if(loading||error||!user)return;
  const text=`My RCH Run Passport: ${data.verified_games} verified games, ${data.run_rep} Run REP, ${data.badges.length} earned badges. Real games build the story. #RCHRuns`;
  try{
   if(navigator.share)await navigator.share({title:'My RCH Run Passport',text,url:window.location.origin+'/runs'});
   else {await navigator.clipboard.writeText(text+' '+window.location.origin+'/runs');setShareStatus('Passport summary copied');}
  }catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setShareStatus('Sharing unavailable. Try again.');}
 }
 if(!user)return null;
 const ladder=['1v1','2v2','3v3','4v4','5v5'];
 return <section aria-label="Your basketball Run Passport" className="my-6 overflow-hidden rounded-3xl border border-[#666666] bg-[linear-gradient(135deg,#282828,#151515)] p-5 text-white sm:p-7">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.16em] text-[#c9c9c9]"><FaMedal/> Personal Basketball Identity</p>
    <h2 className="mt-2 font-display text-2xl font-black uppercase sm:text-3xl">Your Run Passport</h2>
    <p className="mt-2 text-sm text-[#c0c0c0]">Your basketball identity: verified games, competitive Rank, earned badges and spendable REP. Social XP is separate.</p></div>
   <div className="rch-run-passport-actions">
    <button type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded} className="min-h-11 rounded-xl border border-[#7d7d7d] px-4 text-xs font-black">{expanded?'Hide Passport':'View Passport'}</button>
    <button type="button" disabled={loading||Boolean(error)} onClick={()=>void shareMyPassport()} className="min-h-11 rounded-xl border border-[#7d7d7d] px-4 text-xs font-black disabled:opacity-50"><FaShareNodes className="mr-1 inline" aria-hidden="true"/> Share my stats</button>
   </div>
  </div>
  {error&&<p role="status" className="mt-4 text-xs text-gray-200">{error}</p>}
  {shareStatus&&<p role="status" className="mt-3 text-xs text-[#c2c2c2]">{shareStatus}</p>}
  {loading&&<p className="mt-3 text-xs text-[#c4c4c4]">Loading verified history…</p>}
  {!loading&&<div className="mt-5 grid grid-cols-3 gap-2">
   {[['Run REP',data.run_rep],['Verified games',data.verified_games],['Earned badges',data.badges.length]].map(([label,value])=><div key={label} className="rounded-xl border border-[#636363] bg-[#222222] p-3">
     <span className="block text-xl font-black">{value}</span><span className="text-[11px] text-[#c2c2c2]">{label}</span>
   </div>)}
  </div>}
  {expanded&&<div className="mt-6">
    <h3 className="flex items-center gap-2 text-sm font-black uppercase"><FaChartLine/> Skill Ratings by Format</h3>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
     {ladder.map(f=>{
      const r=data.ratings.find(x=>x.game_format===f);
      return <div key={f} className="rounded-xl border border-[#5f5f5f] bg-[#1d1d1d] p-3">
       <span className="text-xs font-black text-[#d2d2d2]">{f}</span>
       <p className="mt-1 text-2xl font-black">{r?.rating??'—'}</p>
       <p className="mt-1 text-[11px] text-[#bbbbbb]">{r? r.wins+' W · '+r.losses+' L':'No ranked games yet'}</p>
       {r?.provisional&&<span className="text-[10px] font-bold text-[#d0d0d0]">Provisional · under 5 games</span>}
      </div>;
     })}
    </div>
    <h3 className="mt-6 flex items-center gap-2 text-sm font-black uppercase"><FaTrophy/> Recent Verified Performances</h3>
    {data.last_results.length?<div className="mt-3 space-y-2">{data.last_results.map(r=><div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#5f5f5f] bg-[#1d1d1d] p-3 text-xs">
      <div><span className={'font-black '+(r.won?'text-gray-300':'text-[#dedede]')}>{r.won?'WIN':'LOSS'} · {r.game_format}</span><span className="ml-2 text-[#c5c5c5]">{r.court_name} · {new Date(r.verified_at).toLocaleDateString()}</span></div>
      <span className="font-black">{r.rating_before} → {r.rating_after}</span>
    </div>)}</div>:<p className="mt-3 rounded-xl border border-dashed border-[#5f5f5f] p-4 text-xs text-[#bdbdbd]">Your first independently verified game will appear here.</p>}
    {data.badges.length>0&&<div className="mt-5">
     <h3 className="text-sm font-black uppercase tracking-wide">Earned Run badges</h3>
     <div className="mt-3 flex flex-wrap gap-2">{data.badges.map(code=>{
      const badge=getSybBadgeConcept(code);
      return badge?.awardable?<article key={code} className="flex min-w-[190px] items-center gap-2 rounded-xl border border-[#4e4e4e]/35 bg-[#0e0e0e] px-2 py-1.5">
       <BadgeMedallion badge={{brand:'syb',code:badge.code,mark:badge.mark,name:badge.name,icon:badge.icon,tier:'gold'}} size="xs"/>
       <span><small className="block text-[9px] font-black uppercase tracking-[.12em] text-[#999999]">SYB 1v1 Circuit</small><strong className="text-xs">{badge.name}</strong></span>
      </article>:<span key={code} className="rounded-full border border-[#838383] bg-[#444444]/40 px-3 py-1.5 text-xs font-bold text-[#e5e5e5]">{badgeLabel(code)}</span>;
     })}</div>
    </div>}
    {data.open_appeals>0&&<p className="mt-4 text-xs font-bold text-[#d5d5d5]">{data.open_appeals} integrity review(s) in progress</p>}
    <p className="mt-4 text-[11px] leading-5 text-[#b6b6b6]">Only you can view this detailed Passport. Public Run rankings continue to respect your profile privacy settings.</p>
    <SkillMasteryCollection />
    <p className="mt-4 text-xs text-[#bdbdbd]">Skill ratings change only after independent opponent verification, not RSVPs or highlights. Start with a real hosted game.</p>
   </div>}
 </section>;
}

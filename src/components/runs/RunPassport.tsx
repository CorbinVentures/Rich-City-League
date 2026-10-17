'use client';

import {useEffect,useMemo,useState} from 'react';
import {FaChartLine,FaMedal,FaTrophy} from 'react-icons/fa6';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';
import SkillMasteryCollection from '@/components/rep/SkillMasteryCollection';

type Rating={game_format:string;rating:number;games:number;wins:number;losses:number;provisional:boolean};
type Result={id:string;game_format:string;verified_at:string;court_name:string;rating_before:number;rating_after:number;won:boolean};
type Passport={ratings:Rating[];run_rep:number;verified_games:number;badges:string[];last_results:Result[];open_appeals:number};
const empty:Passport={ratings:[],run_rep:0,verified_games:0,badges:[],last_results:[],open_appeals:0};

export function RunPassport(){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [data,setData]=useState<Passport>(empty);
 const [expanded,setExpanded]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
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
 if(!user)return null;
 const ladder=['1v1','2v2','3v3','4v4','5v5'];
 return <section aria-label="Your basketball Run Passport" className="my-6 overflow-hidden rounded-3xl border border-[#426c97] bg-[linear-gradient(135deg,#102c4d,#061727)] p-5 text-white sm:p-7">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.16em] text-[#93d4ff]"><FaMedal/> Personal Basketball Identity</p>
    <h2 className="mt-2 font-display text-2xl font-black uppercase sm:text-3xl">Your Run Passport</h2>
    <p className="mt-2 text-sm text-[#a7c4df]">Every verified game builds your basketball history, skill rating and badges — separate from your social reputation.</p></div>
   <button type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded} className="min-h-11 rounded-xl border border-[#5784aa] px-4 text-xs font-black">{expanded?'Hide Passport':'View Passport'}</button>
  </div>
  {error&&<p role="status" className="mt-4 text-xs text-amber-200">{error}</p>}
  {loading&&<p className="mt-3 text-xs text-[#aac9e2]">Loading verified history…</p>}
  {!loading&&<div className="mt-5 grid grid-cols-3 gap-2">
   {[['Run REP',data.run_rep],['Verified games',data.verified_games],['Earned badges',data.badges.length]].map(([label,value])=><div key={label} className="rounded-xl border border-[#42688c] bg-[#0b263d] p-3">
     <span className="block text-xl font-black">{value}</span><span className="text-[11px] text-[#a7c7e5]">{label}</span>
   </div>)}
  </div>}
  {expanded&&<div className="mt-6">
    <h3 className="flex items-center gap-2 text-sm font-black uppercase"><FaChartLine/> Skill Ratings by Format</h3>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
     {ladder.map(f=>{
      const r=data.ratings.find(x=>x.game_format===f);
      return <div key={f} className="rounded-xl border border-[#416486] bg-[#082135] p-3">
       <span className="text-xs font-black text-[#aad9ff]">{f}</span>
       <p className="mt-1 text-2xl font-black">{r?.rating??'—'}</p>
       <p className="mt-1 text-[11px] text-[#a5bfd8]">{r? r.wins+' W · '+r.losses+' L':'No ranked games yet'}</p>
       {r?.provisional&&<span className="text-[10px] font-bold text-[#f0ce87]">Provisional · under 5 games</span>}
      </div>;
     })}
    </div>
    <h3 className="mt-6 flex items-center gap-2 text-sm font-black uppercase"><FaTrophy/> Recent Verified Performances</h3>
    {data.last_results.length?<div className="mt-3 space-y-2">{data.last_results.map(r=><div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#416486] bg-[#082135] p-3 text-xs">
      <div><span className={'font-black '+(r.won?'text-emerald-300':'text-[#d5dfeb]')}>{r.won?'WIN':'LOSS'} · {r.game_format}</span><span className="ml-2 text-[#b0c9dc]">{r.court_name} · {new Date(r.verified_at).toLocaleDateString()}</span></div>
      <span className="font-black">{r.rating_before} → {r.rating_after}</span>
    </div>)}</div>:<p className="mt-3 rounded-xl border border-dashed border-[#416486] p-4 text-xs text-[#a7c1d9]">Your first independently verified game will appear here.</p>}
    {data.badges.length>0&&<div className="mt-5 flex flex-wrap gap-2">{data.badges.map(b=><span key={b} className="rounded-full border border-[#9f8055] bg-[#564222]/40 px-3 py-1.5 text-xs font-bold text-[#ffe3aa]">{b.replaceAll('_',' ')}</span>)}</div>}
    {data.open_appeals>0&&<p className="mt-4 text-xs font-bold text-[#f2d1a6]">{data.open_appeals} integrity review(s) in progress</p>}
    <p className="mt-4 text-[11px] leading-5 text-[#99bbd7]">Only you can view this detailed Passport. Public Run rankings continue to respect your profile privacy settings.</p>
    <SkillMasteryCollection />
   </div>}
 </section>;
}

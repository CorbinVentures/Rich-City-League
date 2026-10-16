'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {FaPeopleGroup,FaShieldHalved} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';

type Format='2v2'|'3v3'|'4v4'|'5v5';
type Leader={competitor_id:string;competitor_name:string;city:string;logo_path:string|null;games:number;wins:number;losses:number;qualifying_points:number;seed:number};
export function CrewPowerBoard(){
 const db=useMemo(()=>getSupabaseClient() as any,[]);
 const [format,setFormat]=useState<Format>('3v3');
 const [list,setList]=useState<Leader[]>([]);
 const [error,setError]=useState(false);
 const [busy,setBusy]=useState(true);
 useEffect(()=>{
  if(!db){setError(true);setBusy(false);return;}
  let active=true;setBusy(true);
  void (async()=>{
   const {data,error:failure}=await db.rpc('get_rch_circuit_standings',{p_cycle:0,p_format:format,p_limit:30});
   if(!active)return;setList((data||[]) as Leader[]);setError(Boolean(failure));setBusy(false);
  })();return()=>{active=false;};
 },[db,format]);
 return <section aria-label="Crew independent power rankings" className="my-7 rounded-3xl border border-[#2f5d83] bg-[#0b1c2d] p-5 text-white sm:p-7">
   <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#87c8f1]"><FaPeopleGroup/> Crews · Statewide Rankings</p>
   <h2 className="mt-2 font-display text-3xl font-black uppercase">Your Crew. Your Record.</h2>
   <p className="mt-2 text-sm text-[#b5d0e4]">Independent year-round crew standings, ranked by verified crew-vs-crew results. These are not the Commonwealth Cup seeds or the rankings of any individual court.</p>
   <div className="mt-4 grid grid-cols-4 gap-2" role="group" aria-label="Crew divisions">
    {(['2v2','3v3','4v4','5v5'] as const).map(f=><button key={f} type="button" aria-pressed={format===f} onClick={()=>setFormat(f)} className={'min-h-11 rounded-lg text-xs font-black '+(format===f?'bg-[#227ec8]':'border border-[#4b6882] text-[#b4d1e8]')}>{f}</button>)}
   </div>
   <div className="mt-4 space-y-2">{busy?<p className="text-sm">Loading verified crew games…</p>:error?<p className="text-sm text-[#eec89a]">Live crew ranks are temporarily unavailable.</p>:list.length?list.slice(0,15).map((c,i)=><div key={c.competitor_id} className="flex items-center justify-between gap-3 rounded-xl border border-[#2e506c] p-3 text-xs"><span className="min-w-0 truncate"><b className="mr-2 text-[#f2d393]">#{i+1}</b>{c.competitor_name} <span className="text-[#95b6ce]">· {c.city||'Virginia'}</span></span><span className="shrink-0">{c.wins}–{c.losses} <span className="ml-2 text-[#f2d393]">{c.qualifying_points} PTS</span></span></div>):<p className="rounded-lg border border-[#30516b] p-4 text-sm text-[#9abbd2]">No verified crew results yet. Form a crew, register for a Run, and confirm games.</p>}</div>
   <p className="mt-4 flex items-center gap-2 text-xs text-[#a4c8df]"><FaShieldHalved/> Court territory is decided locally; the elite Cup is a separate championship. <Link href="/commonwealth" className="font-bold underline">Explore the Commonwealth Cup</Link></p>
 </section>;
}

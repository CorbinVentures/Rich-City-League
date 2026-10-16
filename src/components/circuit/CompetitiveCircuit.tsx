'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { FaArrowRight,FaBasketball,FaCalendarDays,FaCrown,FaPeopleGroup,FaShieldHalved,FaTrophy } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { getCircuitClock } from '@/lib/circuit-calendar';

type Division='1v1'|'2v2'|'3v3'|'4v4'|'5v5';
const divisions:Division[]=['1v1','2v2','3v3','4v4','5v5'];
type Row={
  competitor_id:string;competitor_name:string;city:string;logo_path:string|null;
  games:number;wins:number;losses:number;qualifying_points:number;
  run_sessions:number;eligible:boolean;seed:number
};
type Title={cycle_year:number;division:Division;winner_profile_id:string|null;winner_crew_id:string|null};
type Variant='runs'|'crews'|'cup';

const phaseLabels={
  open:'OPEN RUNS · PRESEASON',
  qualifying:'QUALIFIERS LIVE · NOV 1 – DEC 20',
  review:'RESULTS REVIEW · CUP FIELD FORMING',
  cup:'COMMONWEALTH CUP · JANUARY 1'
};

export function CompetitiveCircuit({variant='cup'}:{variant?:Variant}){
  const clock=useMemo(()=>getCircuitClock(),[]);
  const [division,setDivision]=useState<Division>(variant==='runs'?'1v1':'3v3');
  const [rows,setRows]=useState<Row[]>([]);
  const [champion,setChampion]=useState<Title|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const db=useMemo(()=>getSupabaseClient() as any,[]);

  useEffect(()=>{
    let alive=true;
    if(!db){setError(true);setLoading(false);return;}
    setLoading(true);setError(false);
    const load=async()=>{
      const [standingResult,titleResult]=await Promise.all([
        db.rpc('get_rch_circuit_standings',{p_cycle:clock.cycle,p_format:division,p_limit:50}),
        db.from('rch_cup_titles').select('cycle_year,division,winner_profile_id,winner_crew_id')
          .eq('cycle_year',clock.cycle).eq('division',division).maybeSingle()
      ]);
      if(!alive)return;
      setRows(standingResult.error?[]:(standingResult.data||[]) as Row[]);
      setChampion(titleResult.error?null:(titleResult.data||null) as Title|null);
      setError(Boolean(standingResult.error));
      setLoading(false);
    };
    void load();
    return ()=>{alive=false;};
  },[clock.cycle,db,division]);

  const field=rows.filter(r=>r.eligible).slice(0,16);
  const winner=champion&&rows.find(r=>r.competitor_id===(division==='1v1'?champion.winner_profile_id:champion.winner_crew_id));
  const heading=variant==='runs'?'Every Run Builds a Legacy':
    variant==='crews'?'Crew Power Rankings':'The Road to the Commonwealth Cup';
  return <section aria-label="RCH Competitive Circuit" className="my-7 overflow-hidden rounded-[28px] border border-[#3776ac] bg-[radial-gradient(ellipse_at_86%_0%,#174a77,#071a30_52%,#050d1b)] text-white shadow-[0_25px_60px_rgba(2,9,24,.32)]">
    <div className="border-b border-[#31557a] p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#407ba7] bg-[#1c4b72]/50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#8fd3ff]"><FaBasketball/> {phaseLabels[clock.phase]}</span>
        <span className="text-xs font-black uppercase tracking-wider text-[#f8d799]">Road to January 1, {clock.cupYear}</span>
      </div>
      <h2 className="mt-4 max-w-4xl font-display text-3xl font-black uppercase tracking-tight sm:text-5xl">{heading}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#b9d5ed]">Open and partnered competitive Runs feed verified player rankings. Registered crews compete on their own division-specific ladder. The top eligible competitors build the Commonwealth Cup field—no bought REP, imaginary games or self-declared victories.</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-[#2e557d] bg-[#061626]/75 p-4"><FaCalendarDays className="mb-2 text-[#8fc8ff]"/><strong className="block text-sm">Nov 1 – Dec 20</strong><span className="text-[11px] text-[#a8c5e0]">Verified qualification games</span></div>
        <div className="rounded-xl border border-[#2e557d] bg-[#061626]/75 p-4"><FaShieldHalved className="mb-2 text-[#8fc8ff]"/><strong className="block text-sm">Dec 21 – Dec 31</strong><span className="text-[11px] text-[#a8c5e0]">Review, seed and lock the field</span></div>
        <div className="rounded-xl border border-[#7c693e] bg-[#392b19]/55 p-4"><FaTrophy className="mb-2 text-[#f8d799]"/><strong className="block text-sm">January 1, {clock.cupYear}</strong><span className="text-[11px] text-[#e3cfa5]">Five championship divisions</span></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/runs" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#2188e8] px-4 py-3 text-xs font-black text-white">Find a Run <FaArrowRight/></Link>
        <Link href="/crews" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#477aa8] px-4 py-3 text-xs font-black text-[#c8e4ff]"><FaPeopleGroup/> Build your crew</Link>
        {variant!=='cup'&&<Link href="/commonwealth" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b59661]/70 px-4 py-3 text-xs font-black text-[#ffe2a1]"><FaTrophy/> Cup HQ</Link>}
      </div>
    </div>
    <div className="p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#86c8fb]">CIRCUIT SEASON {clock.cycle}</p><h3 className="mt-1 text-xl font-black uppercase">Division standings</h3></div>
        {champion&&<div className="rounded-lg border border-[#c7aa6e] bg-[#4b361a] px-3 py-2 text-xs font-black text-[#ffe19f]"><FaCrown className="mr-2 inline"/> {winner?winner.competitor_name:'Verified title awarded'}</div>}
      </div>
      <div className="mt-4 grid grid-cols-5 gap-1.5 rounded-xl bg-[#020d1b] p-1.5" role="group" aria-label="Commonwealth Cup divisions">
        {divisions.map(value=><button key={value} type="button" aria-pressed={division===value} onClick={()=>setDivision(value)}
          className={'min-h-11 rounded-lg px-1 text-xs font-black sm:text-base '+(division===value?'bg-[#2388ee] text-white':'text-[#9fbcd8] hover:bg-[#153e64]')}>{value}</button>)}
      </div>
      <p className="mt-3 text-xs leading-5 text-[#a7c3de]">{division==='1v1'?'Individual championship: verified player-versus-player results.':'Crew championship: only full, registered crew lineups against other registered crews count.'} Three verified games across at least two separate Run sessions are required; crews must also play at least two different opponents.</p>
      <div className="mt-5 overflow-hidden rounded-2xl border border-[#2f5577]">
        <div className="grid grid-cols-[2rem_minmax(0,1fr)_3.5rem_3.5rem] gap-2 bg-[#163958] px-3 py-3 text-[10px] font-black uppercase tracking-wider text-[#bcd9f1] sm:grid-cols-[2.5rem_minmax(0,1fr)_5rem_5rem]">
          <span>Seed</span><span>{division==='1v1'?'Player':'Crew'}</span><span className="text-right">W–L</span><span className="text-right">PTS</span>
        </div>
        {loading?<p className="p-6 text-sm text-[#b3ccdf]">Loading verified competition standings…</p>:
        error?<p role="status" className="p-6 text-sm text-[#ffdc9d]">Live standings are unavailable. Results are not simulated; check back after competition services are restored.</p>:
        rows.length?rows.slice(0,12).map(row=><div key={row.competitor_id} className="grid grid-cols-[2rem_minmax(0,1fr)_3.5rem_3.5rem] items-center gap-2 border-t border-[#244664] px-3 py-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_5rem_5rem]">
          <span className="text-sm font-black text-[#ffdb8e]">{row.eligible?row.seed:'—'}</span>
          <div className="min-w-0"><p className="truncate text-sm font-black">{row.competitor_name}</p><span className="text-[10px] text-[#9fbdd7]">{row.city||'Virginia'} · {row.run_sessions} sessions · {row.eligible?'Cup eligible':'Provisional'}</span></div>
          <strong className="text-right text-xs text-[#d7e7f3]">{row.wins}–{row.losses}</strong>
          <strong className="text-right text-sm text-[#ffdc94]">{row.qualifying_points}</strong>
        </div>):<p className="p-6 text-sm text-[#b3ccdf]">No verified {division} qualifying games yet. The leaderboard opens when real results are confirmed during the November 1–December 20 window.</p>}
      </div>
      <div className="mt-5 rounded-xl border border-[#2b4e70] bg-[#071827] p-4">
        <div className="flex flex-wrap justify-between gap-2"><h4 className="font-black uppercase text-[#f0d39a]">Commonwealth Cup field</h4><span className="text-[10px] font-black uppercase tracking-wider text-[#a5c6e3]">{field.length} / 16 provisional eligible spots</span></div>
        <p className="mt-2 text-xs leading-5 text-[#aac3dd]">The top 16 eligible competitors in each division are the proposed Cup field. Seeds are provisional until verification closes and officials confirm the bracket, court and event logistics. No entry or championship is guaranteed from rank alone.</p>
        {field.length>0&&<p className="mt-3 text-xs font-bold text-[#d9ebf8]">{field.slice(0,5).map(r=>r.competitor_name).join(' · ')}</p>}
      </div>
      <p className="mt-4 text-xs leading-5 text-[#9ab6d1]">League standings, social REP and ordinary pickup stats remain separate. Sponsored Runs do not buy a ranking boost; only opponent-confirmed competitive games qualify.</p>
    </div>
  </section>;
}

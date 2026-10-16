'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaChartLine, FaCrown, FaShieldHalved, FaTrophy } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const formats=['1v1','2v2','3v3','4v4','5v5'] as const;
type Format=(typeof formats)[number];
type LadderRow={
  profile_id:string;player_name:string;avatar_url:string|null;city:string;game_format:string;
  rating:number;games:number;wins:number;losses:number;provisional:boolean
};

export function RunRankedLadder(){
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const {user}=useAuth();
  const [format,setFormat]=useState<Format>('5v5');
  const [scope,setScope]=useState<'city'|'state'>('state');
  const [city,setCity]=useState('Richmond');
  const [rows,setRows]=useState<LadderRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [unavailable,setUnavailable]=useState(false);

  useEffect(()=>{
    if(!db){setLoading(false);setUnavailable(true);return;}
    let cancelled=false;
    setLoading(true);
    const run=async()=>{
      const {data,error}=await db.rpc('get_ranked_run_ladder',{
        p_format:format,p_scope:scope,p_city:city.trim()||'Richmond',p_limit:25
      });
      if(cancelled)return;
      setRows(error?[]:(data??[]) as LadderRow[]);
      setUnavailable(Boolean(error));
      setLoading(false);
    };
    void run();
    return ()=>{cancelled=true;};
  },[db,format,scope,city]);

  const you=rows.findIndex(row=>row.profile_id===user?.id);
  return <section aria-labelledby="rch-ranked-heading" className="mt-5 overflow-hidden rounded-[24px] border border-[#3676b9] bg-[radial-gradient(ellipse_at_80%_0%,#16487a,#07182b_55%,#06111f)] text-white shadow-[0_18px_50px_rgba(2,20,44,.35)]">
    <div className="border-b border-[#285482] px-4 pb-5 pt-6 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-[#85c5ff]"><FaCrown/> RCH Competitive Circuit · Season Zero</p>
          <h2 id="rch-ranked-heading" className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">The <span className="text-[#5caeff]">Ranked Arena</span></h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c0d8f1]">Your ranking is built on verified wins against real opponents. Separate ladders for every format. Bigger upsets move the needle. Unverified results earn nothing.</p></div>
        <Link href="/commonwealth" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#247ceb] px-4 text-xs font-black text-white shadow-lg hover:bg-[#348df8]"><FaTrophy/> Commonwealth Cup <FaArrowRight/></Link>
      </div>
      <div className="mt-5 grid grid-cols-5 gap-1.5 rounded-xl border border-[#35618b] bg-[#041324] p-1.5" role="group" aria-label="Choose competitive format">
        {formats.map(value=><button key={value} type="button" aria-pressed={format===value}
          onClick={()=>setFormat(value)}
          className={'min-h-11 rounded-lg px-1 text-xs font-black transition sm:text-sm '+(format===value?'bg-[#2185ef] text-white shadow-[0_3px_15px_rgba(33,133,239,.3)]':'text-[#a9c2dc] hover:bg-white/10 hover:text-white')}>
          {value}</button>)}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[11px] font-bold text-[#accae7]"><FaShieldHalved className="text-emerald-300"/> Opponent-confirmed games only</span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[#31547c] bg-[#081f37] p-1" role="group" aria-label="Ranked leaderboard region">
            {(['state','city'] as const).map(value=><button type="button" key={value} aria-pressed={scope===value} onClick={()=>setScope(value)} className={'min-h-9 rounded-md px-3 text-xs font-bold '+(scope===value?'bg-[#3e83ce] text-white':'text-[#b4cce5]')}>{value==='state'?'Virginia':'My city'}</button>)}
          </div>
          {scope==='city'&&<input aria-label="Leaderboard city" maxLength={40} value={city} onChange={e=>setCity(e.target.value)} className="min-h-10 w-28 rounded-lg border border-[#31547c] bg-[#071827] px-3 text-xs text-white" placeholder="Richmond"/>}
        </div>
      </div>
    </div>
    <div className="px-4 py-5 sm:px-7">
      {you>=0&&<p className="mb-3 rounded-xl border border-[#3e92d3]/50 bg-[#1a558a]/30 px-3 py-2 text-xs font-bold text-[#d5eaff]">Your place on this board: #{you+1} · {rows[you].rating} rating {rows[you].provisional?'· Provisional':''}</p>}
      {loading?<p className="py-8 text-center text-sm text-[#c2d4e7]">Loading verified rankings…</p>:
        unavailable?<p className="rounded-xl border border-[#a98548] bg-[#3b2b16]/50 p-4 text-sm text-[#ffdfa7]">Ranked competition is being activated. No sample or unverified competitors will appear on the official ladder.</p>:
        rows.length?<ol className="space-y-2" aria-label={format+' ranked basketball players'}>{rows.map((row,index)=><li key={row.profile_id} className={'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 sm:gap-4 '+(index===0?'border-[#d7ad5f]/50 bg-[#765020]/25':'border-[#284869] bg-[#0a2035]/80')}>
          <span className={'w-8 text-center font-black '+(index===0?'text-2xl text-[#ffda83]':'text-lg text-[#9fc7ec]')}>{index+1}</span>
          <div className="min-w-0"><p className="truncate text-sm font-black text-white">{row.player_name}</p><p className="mt-1 text-[11px] text-[#b2cce5]">{row.city} · {row.wins}–{row.losses} · {row.games} confirmed {row.games===1?'game':'games'}</p></div>
          <div className="text-right"><p className="flex items-center justify-end gap-1 font-black text-[#fff1c9]"><FaChartLine className="text-xs"/>{row.rating}</p><p className={'mt-1 text-[10px] font-bold uppercase '+(row.provisional?'text-[#eec58a]':'text-[#8ce7c3]')}>{row.provisional?'Provisional':'Established'}</p></div>
        </li>)}</ol>:
        <div className="rounded-xl border border-dashed border-[#396390] px-5 py-7 text-center"><FaTrophy className="mx-auto text-3xl text-[#84bcff]"/><h3 className="mt-2 font-black text-white">The {format} throne is unclaimed.</h3><p className="mt-2 text-sm text-[#b4cbe2]">Be among the first to earn a real ranking with a completed, opponent-confirmed run.</p><Link href="/runs?create=1" className="mt-4 inline-flex rounded-lg bg-[#247ceb] px-4 py-3 text-xs font-black text-white">Host a competitive run</Link></div>
      }
      <div className="mt-4 grid gap-2 text-xs leading-5 text-[#a5c2df] sm:grid-cols-2"><p>Ratings start at 1000. Opponent strength and victory determine movement, not likes or REP.</p><p>First five confirmed games are provisional. Standings favor established players when skill ratings are close.</p></div>
    </div>
  </section>;
}

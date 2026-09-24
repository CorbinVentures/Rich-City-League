'use client';

import { useState } from 'react';
import { FaShareNodes } from 'react-icons/fa6';

type PerformanceShareCardProps = {
  playerName: string;
  teamName?: string | null;
  opponentName?: string | null;
  points: number;
  rebounds: number;
  assists: number;
  steals?: number;
  blocks?: number;
  gameUrl?: string;
};

export function PerformanceShareCard({ playerName,teamName,opponentName,points,rebounds,assists,steals=0,blocks=0,gameUrl }:PerformanceShareCardProps){
  const [copied,setCopied]=useState(false);
  const url=typeof window!=='undefined'?(gameUrl ? new URL(gameUrl,window.location.origin).toString() : window.location.href):'https://richcityhoops.com';
  const line=`${points} PTS · ${rebounds} REB · ${assists} AST${steals? ` · ${steals} STL`:''}${blocks? ` · ${blocks} BLK`:''}`;
  const text=`${playerName} — ${line} on Rich City League.`;
  async function share(){try{if(navigator.share){await navigator.share({title:`${playerName} | RCL Game Performance`,text,url});return;}await navigator.clipboard.writeText(`${text} ${url}`);setCopied(true);window.setTimeout(()=>setCopied(false),1800);}catch{}}
  return <article className="overflow-hidden rounded-3xl border border-rcl-gold/25 bg-[radial-gradient(circle_at_90%_10%,rgba(255,107,26,.18),transparent_35%),linear-gradient(135deg,#101820,#05080d)]">
    <div className="p-6 sm:p-7"><div className="flex items-center justify-between gap-4"><span className="text-[9px] font-black uppercase tracking-[.26em] text-rcl-gold">Official RCL Game Stats</span><span className="text-3xl">🏀</span></div>
    <p className="mt-7 text-[10px] font-black uppercase tracking-[.18em] text-white/35">Game Performance</p><h3 className="mt-1 font-display text-3xl font-black uppercase">{playerName}</h3>
    {(teamName||opponentName)&&<p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/40">{teamName||'RCL'}{opponentName?` vs ${opponentName}`:''}</p>}
    <div className="mt-6 grid grid-cols-3 gap-2">{[[points,'PTS'],[rebounds,'REB'],[assists,'AST']].map(([value,label])=><span key={label} className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center"><b className="block font-display text-3xl font-black text-rcl-gold">{value}</b><small className="text-[9px] font-black tracking-widest text-white/35">{label}</small></span>)}</div>
    {(steals>0||blocks>0)&&<p className="mt-4 text-center text-xs font-black uppercase tracking-wider text-white/50">{steals>0&&`${steals} STL`}{steals>0&&blocks>0?' · ':''}{blocks>0&&`${blocks} BLK`}</p>}
    <p className="mt-6 border-t border-white/10 pt-4 text-[9px] font-black uppercase tracking-[.18em] text-rcl-gold">richcityhoops.com</p></div>
    <button type="button" onClick={share} className="flex w-full items-center justify-center gap-2 border-t border-white/10 bg-white/[.04] px-5 py-4 text-[10px] font-black uppercase tracking-[.16em] transition hover:bg-rcl-gold hover:text-black"><FaShareNodes />{copied?'Share link copied':'Share performance'}</button>
  </article>;
}

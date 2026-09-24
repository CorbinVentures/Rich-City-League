'use client';

import { useState } from 'react';
import { FaShareNodes } from 'react-icons/fa6';

type Props={rank:number;teamName:string;wins:number;losses:number;ties?:number;pointsFor:number;pointsAgainst:number;streak?:string|null;teamUrl?:string};
export function TeamStandingShareCard({rank,teamName,wins,losses,ties=0,pointsFor,pointsAgainst,streak,teamUrl}:Props){
 const [copied,setCopied]=useState(false); const games=wins+losses+ties; const pct=games?Math.round((wins/games)*100):0;
 const url=typeof window!=='undefined'?(teamUrl?new URL(teamUrl,window.location.origin).toString():window.location.href):'https://richcityhoops.com/leaderboards';
 const record=ties?`${wins}-${losses}-${ties}`:`${wins}-${losses}`; const text=`#${rank} ${teamName} — ${record} (${pct}%) in the official Rich City League standings.`;
 async function share(){try{if(navigator.share){await navigator.share({title:`${teamName} | RCL Standings`,text,url});return;}await navigator.clipboard.writeText(`${text} ${url}`);setCopied(true);window.setTimeout(()=>setCopied(false),1800);}catch{}}
 return <article className="overflow-hidden rounded-3xl border border-rcl-gold/25 bg-[radial-gradient(circle_at_85%_10%,rgba(255,107,26,.2),transparent_32%),linear-gradient(135deg,#101820,#05080d)]"><div className="p-6">
  <div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[.24em] text-rcl-gold">Official RCL Standings</span><b className="font-display text-4xl font-black text-rcl-gold">#{rank}</b></div>
  <p className="mt-6 text-[10px] font-black uppercase tracking-[.18em] text-white/35">{rank===1?'Top of the standings':'Season standings'}</p><h3 className="mt-1 font-display text-3xl font-black uppercase">{teamName}</h3>
  <div className="mt-6 grid grid-cols-3 gap-3"><Stat label="Record" value={record}/><Stat label="Win %" value={`${pct}%`}/><Stat label="Streak" value={streak??'—'}/></div>
  <div className="mt-3 grid grid-cols-2 gap-3"><Stat label="Points For" value={String(pointsFor)}/><Stat label="Points Against" value={String(pointsAgainst)}/></div>
  <p className="mt-6 border-t border-white/10 pt-4 text-[9px] font-black uppercase tracking-[.18em] text-rcl-gold">richcityhoops.com</p></div>
  <button type="button" onClick={share} className="flex w-full items-center justify-center gap-2 border-t border-white/10 bg-white/[.04] px-5 py-4 text-[10px] font-black uppercase tracking-[.16em] transition hover:bg-rcl-gold hover:text-black"><FaShareNodes />{copied?'Share link copied':'Share standings'}</button></article>
}
function Stat({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><b className="block font-display text-xl font-black text-white">{value}</b><span className="text-[8px] font-black uppercase tracking-[.14em] text-white/35">{label}</span></div>}

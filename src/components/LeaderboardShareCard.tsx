'use client';

import { useState } from 'react';
import { FaShareNodes } from 'react-icons/fa6';

type LeaderboardShareCardProps={rank:number;name:string;team?:string|null;metric:string;value:string;secondary?:string;href?:string};
export function LeaderboardShareCard({rank,name,team,metric,value,secondary,href}:LeaderboardShareCardProps){
 const [copied,setCopied]=useState(false);
 const url=typeof window!=='undefined'?(href?new URL(href,window.location.origin).toString():window.location.href):'https://richcityhoops.com/leaderboards';
 const text=`#${rank} ${name} — ${value} ${metric} on the official Rich City League leaderboard.`;
 async function share(){try{if(navigator.share){await navigator.share({title:`${name} | RCL Leaderboard`,text,url});return;}await navigator.clipboard.writeText(`${text} ${url}`);setCopied(true);window.setTimeout(()=>setCopied(false),1800);}catch{}}
 return <article className="overflow-hidden rounded-3xl border border-rcl-gold/25 bg-[radial-gradient(circle_at_85%_10%,rgba(255,107,26,.2),transparent_32%),linear-gradient(135deg,#101820,#05080d)]">
  <div className="p-6"><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[.24em] text-rcl-gold">Official RCL Leaderboard</span><b className="font-display text-4xl font-black text-rcl-gold">#{rank}</b></div>
  <p className="mt-6 text-[10px] font-black uppercase tracking-[.18em] text-white/35">{metric} Leader</p><h3 className="mt-1 font-display text-3xl font-black uppercase">{name}</h3>{team&&<p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/40">{team}</p>}
  <strong className="mt-6 block font-display text-5xl font-black text-rcl-gold">{value}</strong>{secondary&&<p className="mt-2 text-xs font-black uppercase tracking-wider text-white/45">{secondary}</p>}
  <p className="mt-6 border-t border-white/10 pt-4 text-[9px] font-black uppercase tracking-[.18em] text-rcl-gold">richcityhoops.com</p></div>
  <button type="button" onClick={share} className="flex w-full items-center justify-center gap-2 border-t border-white/10 bg-white/[.04] px-5 py-4 text-[10px] font-black uppercase tracking-[.16em] transition hover:bg-rcl-gold hover:text-black"><FaShareNodes />{copied?'Share link copied':'Share ranking'}</button>
 </article>;
}
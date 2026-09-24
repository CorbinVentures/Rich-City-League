'use client';

import { useState } from 'react';
import { FaShareNodes } from 'react-icons/fa6';

type GrowthShareCardProps = {
  memberName: string;
  memberUsername?: string | null;
  eyebrow: string;
  headline: string;
  value: string;
  detail: string;
  icon?: string;
};

export function GrowthShareCard({ memberName, memberUsername, eyebrow, headline, value, detail, icon='⚡' }: GrowthShareCardProps) {
  const [copied,setCopied]=useState(false);
  const url=typeof window!=='undefined'?window.location.href:'https://richcityhoops.com';
  const copy=`${memberName} — ${headline}: ${value} on Rich City League. ${detail}`;
  async function share(){
    try {
      if(navigator.share){ await navigator.share({title:`${headline} | Rich City League`,text:copy,url}); return; }
      await navigator.clipboard.writeText(`${copy} ${url}`); setCopied(true); window.setTimeout(()=>setCopied(false),1800);
    } catch {}
  }
  return <article className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#101820] via-[#081019] to-black">
    <div className="p-6">
      <div className="flex items-center justify-between gap-3"><span className="text-[9px] font-black uppercase tracking-[.24em] text-rcl-orange">{eyebrow}</span><span className="text-3xl">{icon}</span></div>
      <p className="mt-6 text-[10px] font-black uppercase tracking-[.2em] text-white/35">{headline}</p>
      <strong className="mt-1 block font-display text-5xl font-black uppercase text-white">{value}</strong>
      <p className="mt-3 text-sm leading-6 text-white/55">{detail}</p>
      <div className="mt-6 border-t border-white/10 pt-4"><b className="block text-sm">{memberName}</b><span className="text-[10px] text-white/35">{memberUsername?'@'+memberUsername+' · ':''}richcityhoops.com</span></div>
    </div>
    <button type="button" onClick={share} className="flex w-full items-center justify-center gap-2 border-t border-white/10 bg-white/[.04] px-5 py-4 text-[10px] font-black uppercase tracking-[.16em] transition hover:bg-rcl-orange hover:text-black"><FaShareNodes />{copied?'Share link copied':'Share milestone'}</button>
  </article>;
}

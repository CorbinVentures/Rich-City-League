'use client';

import Link from 'next/link';
import {FaArrowUpRightFromSquare, FaShareNodes} from 'react-icons/fa6';
import {crewInvitePath} from '@/lib/crew-invite-links';

type Props = {
 id: string;
 name: string;
 city: string;
 motto: string;
 homeCourt: string | null;
 logoUrl: string | null;
 onShare: () => void;
};

export function CrewInviteWidget({id,name,city,motto,homeCourt,logoUrl,onShare}: Props) {
 return <article aria-label={name + ' crew invitation widget'} className="relative mt-5 overflow-hidden rounded-2xl border border-[#6891ae] bg-[radial-gradient(ellipse_at_90%_0%,#265577_0%,transparent_55%),linear-gradient(140deg,#142e45,#091721_70%)] text-white shadow-[0_12px_35px_#0005]">
  <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full border-[16px] border-[#a9d9f5]/10"/>
  <div className="relative flex items-center justify-between gap-3 border-b border-[#8db4d0]/25 px-4 py-3">
   <span className="text-[10px] font-black tracking-[.18em] text-[#b6d7ed]">RCH CREWS · INVITATION</span>
   <span className="text-[9px] font-black tracking-widest text-[#b6d7ed]">RICH CITY HOOPS</span>
  </div>
  <div className="relative flex items-center gap-4 px-4 py-5">
   <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#7fb1d0] bg-[#0b1c2a]">
    {logoUrl?<img alt={name + ' logo'} src={logoUrl} className="h-full w-full object-contain p-1"/>:<span className="font-display text-2xl font-black uppercase">{name.slice(0, 2)}</span>}
   </span>
   <div className="min-w-0">
    <p className="text-[10px] font-black uppercase tracking-widest text-[#abd4ee]">Join the crew</p>
    <h3 className="mt-1 break-words font-display text-2xl font-black uppercase leading-tight">{name}</h3>
    <p className="mt-1 text-xs text-[#b8d5e6]">{city || 'Virginia'}{homeCourt ? ' · ' + homeCourt.replace(/-/g, ' ') : ''}</p>
   </div>
  </div>
  <p className="relative px-4 pb-5 text-sm text-[#cbddea]">{motto || 'Build your crew. Run your court. Earn your name.'}</p>
  <div className="relative grid grid-cols-2 gap-2 border-t border-[#8db4d0]/25 p-3">
   <button type="button" onClick={onShare} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#b1dcf5] px-3 text-xs font-black text-[#061726]"><FaShareNodes/> Share invite</button>
   <Link href={crewInvitePath(id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#608eae] px-3 text-center text-xs font-black text-white"><FaArrowUpRightFromSquare/> View card</Link>
  </div>
 </article>;
}

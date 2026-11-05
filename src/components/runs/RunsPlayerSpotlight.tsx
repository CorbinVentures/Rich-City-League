'use client';

import Link from 'next/link';
import {FaArrowRight,FaBasketball,FaCalendarDays,FaLocationDot} from 'react-icons/fa6';

const JOEL_PROFILE='/social/profile/81ac6ffd-2760-4bec-9b29-11b31e3ebb02';

function isNovemberSpotlightActive(){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return today.startsWith('2026-11-');
}

export function RunsPlayerSpotlight(){
 if(!isNovemberSpotlightActive())return null;
 return <section aria-labelledby="rch-november-spotlight-title" className="relative isolate overflow-hidden rounded-3xl border border-rcl-orange/30 bg-[#080c12] shadow-[0_24px_70px_rgba(0,0,0,.35)]">
  <div className="grid md:grid-cols-[minmax(0,.85fr)_1.15fr]">
   <div className="relative min-h-64 overflow-hidden bg-[#111821] md:min-h-[22rem]">
    <img src="/images/players/joel-november-spotlight.webp" alt="Joel with a basketball at a Richmond-area gym" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-[center_38%]"/>
    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10 md:bg-gradient-to-r md:from-transparent md:to-[#080c12]"/>
    <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/65 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-white">RCH Runs · 804</span>
   </div>
   <div className="flex flex-col justify-center p-5 sm:p-7 md:-ml-5 md:pl-0">
    <p className="text-[10px] font-black uppercase tracking-[.24em] text-rcl-orange">November Player of the Month</p>
    <h2 id="rch-november-spotlight-title" className="mt-2 font-display text-4xl font-black uppercase leading-none text-white sm:text-5xl">Joel</h2>
    <p className="mt-2 text-sm font-bold text-white/55">@ots_jae <span className="px-1 text-rcl-orange">·</span> Richmond 1v1 hooper</p>
    <p className="mt-4 max-w-xl text-sm leading-6 text-white/75">On the road to the 1v1 scene. Follow Joel’s month as he competes, keeps working, and connects with Richmond hoopers.</p>
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-white/75">
     <span className="inline-flex items-center gap-2"><FaCalendarDays className="text-rcl-orange"/> SYB · Saturday, Nov 7 · 9:30 AM</span>
     <span className="inline-flex items-center gap-2"><FaLocationDot className="text-rcl-orange"/> Lucks Field</span>
    </div>
    <div className="mt-6 flex flex-wrap gap-3">
     <Link href={JOEL_PROFILE} className="inline-flex items-center gap-2 rounded-full bg-rcl-orange px-5 py-3 text-xs font-black uppercase tracking-wide text-black transition hover:brightness-110">View Joel’s RCH profile <FaArrowRight/></Link>
     <Link href="/runs/partners/syb-hoop-richmond" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-white/10"><FaBasketball/> Visit SYB on RCH</Link>
    </div>
   </div>
  </div>
 </section>;
}

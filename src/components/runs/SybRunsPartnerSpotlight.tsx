import Link from 'next/link';
import {FaArrowRight,FaInstagram,FaShieldHalved} from 'react-icons/fa6';
import {SybBrandMark} from '@/components/runs/SybBrandMark';

export function SybRunsPartnerSpotlight(){
 return <section aria-labelledby="syb-runs-partner-heading" className="relative isolate mb-5 overflow-hidden rounded-2xl border border-[#651923] bg-[#0b090a] p-4 shadow-[0_18px_55px_rgba(245,31,49,.12)] sm:p-6">
  <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#f51f31]/15 blur-3xl"/>
  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
   <SybBrandMark className="h-20 w-20 shrink-0 rounded-2xl sm:h-24 sm:w-24"/>
   <div className="min-w-0 flex-1">
    <div className="flex flex-wrap items-center gap-2">
     <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f51f31]/60 bg-[#250d11] px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-[#ff9ca5]"><FaShieldHalved aria-hidden="true"/> Official RCH Runs partner</span>
     <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-[#d4c8ca]">SYB 1v1 circuit</span>
    </div>
    <h2 id="syb-runs-partner-heading" className="mt-3 text-xl font-black uppercase tracking-tight text-white sm:text-2xl">SYB’s 1v1 circuit has a home here.</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#d1c5c7]">Find SYB event listings, join through a free RCH profile, follow posted results, and share Run Tape highlights. Eligible SYB event activity earns 2× XP/REP.</p>
    <div className="mt-4 flex flex-wrap gap-2">
     <Link href="/runs/partners/syb-hoop-richmond" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#f51f31] px-4 py-3 text-sm font-black text-white transition hover:bg-[#d91426]">Open SYB circuit <FaArrowRight aria-hidden="true"/></Link>
     <a href="https://www.instagram.com/sybhoop/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#73313a] px-4 py-3 text-sm font-bold text-white transition hover:border-[#f51f31]"><FaInstagram aria-hidden="true"/> Follow @sybhoop</a>
    </div>
   </div>
  </div>
 </section>;
}

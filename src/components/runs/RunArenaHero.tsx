'use client';

import { FaArrowRight, FaBolt, FaDumbbell, FaPeopleGroup, FaPlus } from 'react-icons/fa6';

type Mode = 'competitive' | 'social' | 'training';

const modes: Array<{ id: Mode; label: string; tagline: string; icon: typeof FaBolt }> = [
  { id: 'competitive', label: 'Competitive', tagline: 'Track stats. Compete.', icon: FaBolt },
  { id: 'social', label: 'Social Meetup', tagline: 'Good runs. Good people.', icon: FaPeopleGroup },
  { id: 'training', label: 'Training', tagline: 'Train with hoopers.', icon: FaDumbbell },
];

export function RunArenaHero({ activeMode, onHost, onMode }: {
  activeMode: Mode | 'all';
  onHost: () => void;
  onMode: (mode: Mode) => void;
}) {
  return <>
    <header className="rch-arena-hero relative isolate overflow-hidden border-b border-[#204a7a]/70">
      <div className="rch-arena-lights pointer-events-none absolute inset-0" aria-hidden="true"/>
      <div className="rch-arena-skyline pointer-events-none absolute inset-x-0 bottom-[21%] h-[50%] opacity-50" aria-hidden="true"/>
      <svg className="rch-arena-hero-hoop pointer-events-none absolute right-[-20px] top-[20%] h-48 w-48 opacity-80 sm:right-[10%] sm:top-[12%] sm:h-64 sm:w-64" viewBox="0 0 230 220" fill="none" aria-hidden="true">
        <rect x="30" y="28" width="164" height="111" rx="3" fill="#0b2240" fillOpacity=".8" stroke="#4caaff" strokeWidth="6"/>
        <rect x="67" y="58" width="90" height="60" rx="2" stroke="#b2deff" strokeWidth="3"/>
        <path d="M74 115h85" stroke="#95d3ff" strokeWidth="3"/>
        <ellipse cx="114" cy="142" rx="34" ry="9" stroke="#ff8d5c" strokeWidth="6"/>
        <path d="M82 144 91 192 137 192 148 144M98 150 104 189M115 151 115 192M132 150 125 189M87 159 141 178M142 159 91 178" stroke="#d4ebff" strokeOpacity=".83" strokeWidth="2"/>
        <path d="M194 28V218" stroke="#295783" strokeWidth="7"/>
        <text x="94" y="91" fill="#8cc7ff" fontWeight="900" fontSize="21" fontStyle="italic">RCH</text>
      </svg>
      <div className="rch-arena-floor pointer-events-none absolute inset-x-0 bottom-0 h-[32%]" aria-hidden="true"/>
      <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-9 sm:px-8 sm:pb-12 sm:pt-12">
        <p className="text-xs font-black uppercase tracking-[.3em] text-[#8fcaff]">RCH <span className="text-[#328cff]">RUNS</span></p>
        <h1 className="rch-arena-headline mt-3 max-w-sm text-5xl font-black leading-[.93] tracking-tight text-white sm:text-7xl">Open<br/>Runs</h1>
        <p className="mt-4 max-w-[290px] text-sm font-medium leading-6 text-[#e0ecfb] sm:max-w-[390px] sm:text-base">Find pickup games, organize runs and meet hoopers across Virginia.</p>
        <button type="button" onClick={onHost}
          className="rch-arena-cta mt-5 inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#7ac8ff]/60 bg-gradient-to-r from-[#1676f7] to-[#33a8ff] px-7 text-sm font-black text-white shadow-[0_0_24px_rgba(38,154,255,.45)] transition hover:scale-[1.02] sm:min-h-14 sm:text-base">
          <FaPlus/> Host a Run <FaArrowRight/>
        </button>
      </div>
    </header>
    <section className="mx-auto grid max-w-7xl grid-cols-3 gap-2 px-4 pb-4 pt-4 sm:gap-4 sm:px-8 sm:pt-5" aria-label="Choose activity type">
      {modes.map(({id,label,tagline,icon:Icon})=><button type="button" key={id} aria-pressed={activeMode===id} onClick={()=>onMode(id)}
        className={'rch-arena-mode flex min-h-[116px] flex-col items-start justify-center rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 sm:min-h-28 sm:flex-row sm:items-center sm:gap-4 sm:p-5 '+
          (activeMode===id?'rch-arena-mode-active':'')}>
        <Icon className="mb-2 shrink-0 text-xl text-[#5db2ff] sm:mb-0 sm:text-3xl"/>
        <span><span className="block text-xs font-black leading-4 text-white sm:text-base">{label}</span>
          <span className="rch-arena-mode-tagline mt-1 block text-[10px] leading-[1.35] text-[#a4bcd8] sm:text-xs">{tagline}</span></span>
      </button>)}
    </section>
  </>;
}

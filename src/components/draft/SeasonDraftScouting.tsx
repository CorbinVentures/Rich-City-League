'use client';

import { FaArrowTrendUp, FaBasketball, FaBrain, FaCircleInfo, FaShieldHalved } from 'react-icons/fa6';
import { bestAvailable, bestFit, scoreDraftProspects, type DraftScout } from '@/lib/draft/scouting';

export function SeasonDraftScouting({
  teamName, prospects, rosterPositions, isCoach,
}: { teamName: string; prospects: DraftScout[]; rosterPositions: (string|null)[]; isCoach: boolean }) {
  const scored=scoreDraftProspects(prospects,rosterPositions);
  const bpa=bestAvailable(scored);
  const fit=bestFit(scored);
  const availableWithEvidence=scored.filter(item=>item.grade!==null);
  const positions=['PG','SG','SF','PF','C'];
  return <section aria-label="Draft scouting intelligence" className="mt-7 rounded-3xl border border-rcl-blue/20 bg-[linear-gradient(145deg,#0e1921,#080b11)] p-5 text-white sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue"><FaBrain/> RCH Front Office</p>
      <h2 className="mt-2 font-display text-3xl font-black uppercase">Draft Intelligence</h2>
      <p className="mt-2 text-xs leading-5 text-white/50">Official season roster fit for {teamName}. Recommendations are advisory; coaches make the picks.</p></div>
      <span className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-bold">{availableWithEvidence.length}/{scored.length} scouted prospects</span>
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <article className="rounded-2xl border border-white/10 bg-black/25 p-4">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rcl-orange"><FaArrowTrendUp/> Best Player Available</p>
        <h3 className="mt-3 text-lg font-extrabold">{bpa?.name??'Awaiting official evidence'}</h3>
        {bpa?<><p className="mt-1 text-xs text-white/60">{bpa.position??'Unlisted position'} · basketball evidence score {bpa.grade?.toFixed(1)}</p><p className="mt-2 text-[11px] text-white/40">{bpa.source==='official tryouts' ? bpa.tryoutEvaluations+' independent evaluator(s)' : bpa.games+' completed games'} · {bpa.sample} evidence · excludes popularity and age</p></>:<p className="mt-2 text-xs leading-5 text-white/40">No prospect has two independent tryout evaluations or three verified games with complete performance metrics.</p>}
      </article>
      <article className="rounded-2xl border border-rcl-blue/20 bg-rcl-blue/5 p-4">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rcl-blue"><FaShieldHalved/> Best Roster Fit</p>
        <h3 className="mt-3 text-lg font-extrabold">{fit?.name??'Build an evaluated pool'}</h3>
        {fit?<><p className="mt-1 text-xs text-white/60">{fit.position??'Unlisted position'} · fit index {fit.fitGrade?.toFixed(1)}</p><p className="mt-2 text-[11px] text-white/40">{fit.source==='official tryouts'?'Official tryout evaluation':'Verified game performance'} + a small position-needs adjustment. It does not guarantee performance.</p></>:<p className="mt-2 text-xs leading-5 text-white/40">At least two independent official tryout evaluations or three completed-game assessments are needed.</p>}
      </article>
    </div>
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-black uppercase tracking-wider">Season Roster Construction</p>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {positions.map(position=><div key={position} className="rounded-lg border border-white/10 bg-white/[.03] px-2 py-3 text-center"><p className="text-[10px] font-bold text-rcl-blue">{position}</p><p className="mt-2 text-xl font-black">{rosterPositions.filter(v=>v?.toUpperCase()===position).length}</p><p className="mt-1 text-[9px] text-white/40">rostered</p></div>)}
      </div>
      <p className="mt-3 text-[11px] text-white/50">Counts include official active season rosters and draft selections. Positions are scouting context, not compulsory lineup quotas.</p>
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <div className="flex gap-2 rounded-xl border border-white/10 p-3 text-xs leading-5 text-white/50"><FaBasketball className="mt-1 shrink-0"/><p>Values compare against available same-position prospects only when verified evidence exists. No speculative pick-availability odds are generated.</p></div>
      <div className="flex gap-2 rounded-xl border border-white/10 p-3 text-xs leading-5 text-white/50"><FaCircleInfo className="mt-1 shrink-0"/><p>{isCoach?'Coach view: insights support your decision, but you control the official pick.':'Community view: these public-performance insights do not expose private scouting notes.'}</p></div>
    </div>
  </section>;
}

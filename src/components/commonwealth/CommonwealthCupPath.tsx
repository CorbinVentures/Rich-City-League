'use client';

import Link from 'next/link';
import { FaArrowRight, FaCrown, FaFlagCheckered, FaGlobe, FaShieldHalved, FaTrophy } from 'react-icons/fa6';

export type CupGroupStanding={
  season_id:string;group_code:string;slot:number;crew_id:string;name:string;city:string;
  games:number;wins:number;losses:number;points:number;points_for:number;points_against:number
};
type Challenger={id:string;cup_stage?:string;cup_group?:string|null;challenger_id:string;defender_id:string;challenger_score:number|null;defender_score:number|null;status:string;scheduled_at:string};
type Crew={id:string;name:string;city:string};
type Standing={id:string;name:string;city:string;games:number;wins:number;losses:number;points:number;points_for:number;points_against:number};

const phases=[
  {number:'01',title:'The Qualifiers',detail:'Local crews build verified records at participating courts. Organization-led runs feed the basketball culture; only sanctioned Cup results feed qualification.'},
  {number:'02',title:'The Group Draw',detail:'RCH seeds qualifying crews into four-crew groups. Rival courts and hometown identities get their own group-stage stories.'},
  {number:'03',title:'The Knockouts',detail:'Round of 16, quarterfinals and semifinals. Each verified winner advances through the official bracket.'},
  {number:'04',title:'The Cup Final',detail:'One championship showdown. Broadcast coverage, player stories, hometown bragging rights and a permanent legacy.'}
];
const stageName:Record<string,string>={
  group:'Group stage',round_of_16:'Round of 16',quarterfinal:'Quarterfinal',semifinal:'Semifinal',final:'The Final'
};

export function CommonwealthCupPath({seasonStatus,qualifiers,groups,challenges,crews}:{
  seasonStatus:string;qualifiers:Standing[];groups:CupGroupStanding[];challenges:Challenger[];crews:Crew[];
}){
  const byId=new Map(crews.map(c=>[c.id,c]));
  const groupCodes=[...new Set(groups.map(g=>g.group_code))].sort();
  const fixtures=challenges.filter(c=>c.cup_stage&&c.cup_stage!=='qualifier');
  const final=fixtures.find(c=>c.cup_stage==='final'&&c.status==='verified'&&c.challenger_score!==null&&c.defender_score!==null);
  const winner=final?byId.get((final.challenger_score??0)>(final.defender_score??0)?final.challenger_id:final.defender_id):null;
  const contenders=qualifiers.filter(c=>c.games>=3).sort((a,b)=>{
    const pctA=a.wins/Math.max(1,a.games),pctB=b.wins/Math.max(1,b.games);
    return pctB-pctA||b.points-a.points||((b.points_for-b.points_against)-(a.points_for-a.points_against));
  }).slice(0,8);

  return <section className="mb-6 overflow-hidden rounded-3xl border border-[#38658f] bg-[radial-gradient(ellipse_at_top_right,#1c4c77,#07172b_58%,#05101f)] text-white shadow-[0_25px_60px_rgba(0,8,20,.3)]" aria-labelledby="rch-cup-path-heading">
    <div className="border-b border-[#37618c] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-[#8fcbff]"><FaGlobe/> RCH World Cup-Style Championship</p>
          <h2 id="rch-cup-path-heading" className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">The Road to <span className="text-[#f2cc81]">The Cup</span></h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c4d8ed]">Local dominance is only the beginning. Earn a place in the draw, survive the groups, and fight through the knockouts to become the Commonwealth champion.</p>
        </div>
        <div className="rounded-2xl border border-[#ae874e]/60 bg-[#45321a]/40 px-5 py-4 text-center">
          <FaTrophy className="mx-auto text-3xl text-[#f4d084]"/><p className="mt-2 text-[10px] font-black uppercase tracking-wider text-[#f2dba7]">{winner?'Verified champion':seasonStatus==='enrollment'?'Founding qualifiers':'Cup status'}</p>
          <p className="mt-1 max-w-40 text-sm font-black text-white">{winner?winner.name:seasonStatus==='enrollment'?'The trophy is unclaimed':'The race continues'}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Cup competition phases">
        {phases.map((phase,index)=><article key={phase.number} className={'rounded-xl border p-4 '+(index===0&&seasonStatus==='enrollment'?'border-[#3f9df1] bg-[#174b80]/55':'border-[#315b81] bg-[#0b2845]/65')}>
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-[#8dbceb]">STAGE {phase.number}</span>{index===3?<FaCrown className="text-[#f3cc80]"/>:<FaArrowRight className="text-[#5298d7]"/>}</div>
          <h3 className="mt-2 text-base font-black uppercase text-white">{phase.title}</h3><p className="mt-2 text-xs leading-5 text-[#bdd2e8]">{phase.detail}</p>
        </article>)}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs font-bold text-[#9ac5e9]"><FaShieldHalved/> Only independently verified results count. Stages activate when RCH officially seeds and schedules them.</p>
    </div>
    <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-2">
      <div>
        <div className="flex items-center justify-between"><h3 className="text-lg font-black uppercase text-white">Qualification Watch</h3><span className="text-[10px] font-black text-[#8cc8fa]">PROVISIONAL · NOT SEEDED</span></div>
        <p className="mt-1 text-xs leading-5 text-[#afc8e4]">Crew records after at least three staff-verified Cup challenges. Sorting favors win percentage, then points and differential; official qualification remains subject to Cup rules and RCH approval.</p>
        <div className="mt-3 space-y-2">{contenders.length?contenders.map((c,i)=><div key={c.id} className="flex items-center gap-3 rounded-xl border border-[#285075] bg-[#071d32] p-3">
          <span className="w-6 text-center text-lg font-black text-[#e9c37b]">{i+1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white">{c.name}</p><p className="text-xs text-[#a7c6e5]">{c.city} · {c.games} verified</p></div>
          <span className="text-xs font-black text-[#f5ddaa]">{c.wins}–{c.losses}</span>
        </div>):<p className="rounded-xl border border-dashed border-[#315b83] p-5 text-sm text-[#b8cfe6]">The qualifying table is waiting for crews with three verified Cup matches. No automatic seeds have been awarded.</p>}</div>
      </div>
      <div>
        <div className="flex items-center justify-between"><h3 className="text-lg font-black uppercase text-white">Official Group Draw</h3><span className="text-[10px] font-black text-[#8cc8fa]">{groupCodes.length} GROUPS SEEDED</span></div>
        <p className="mt-1 text-xs leading-5 text-[#afc8e4]">Each official group can hold four crews. Group points only come from separately verified group-stage fixtures.</p>
        <div className="mt-3 space-y-3">{groupCodes.length?groupCodes.map(code=><article key={code} className="rounded-xl border border-[#2e608c] bg-[#071d32] p-3">
          <div className="flex items-center justify-between"><h4 className="text-sm font-black text-[#f5d48f]">GROUP {code}</h4><span className="text-[10px] text-[#9fc5e6]">W–L · PTS</span></div>
          {[...groups].filter(g=>g.group_code===code).sort((a,b)=>b.points-a.points||((b.points_for-b.points_against)-(a.points_for-a.points_against))||a.slot-b.slot).map(g=><div key={g.crew_id} className="mt-2 flex items-center gap-2 border-t border-[#2b4663] pt-2 text-xs"><span className="min-w-0 flex-1 truncate font-bold text-white">{g.name}</span><span className="text-[#b5cce3]">{g.wins}–{g.losses}</span><strong className="w-5 text-right text-[#f3d191]">{g.points}</strong></div>)}
        </article>):<p className="rounded-xl border border-dashed border-[#315b83] p-5 text-sm text-[#b8cfe6]">The official draw has not taken place. Cup groups will appear here when RCH seeds real crews.</p>}</div>
      </div>
    </div>
    <div className="border-t border-[#305277] px-5 py-5 sm:px-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-lg font-black uppercase text-white"><FaFlagCheckered className="text-[#f7cd89]"/> The Official Fixture Board</h3><Link href="/runs" className="text-xs font-black text-[#9cd0ff]">Discover competitive runs <FaArrowRight className="inline"/></Link></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{fixtures.length?fixtures.slice(0,8).map(f=><article key={f.id} className="rounded-xl border border-[#32577b] bg-[#081e34] p-4">
        <p className="text-[10px] font-black uppercase tracking-wider text-[#f5d294]">{stageName[f.cup_stage||'']||f.cup_stage}{f.cup_group?' · Group '+f.cup_group:''}</p>
        <p className="mt-2 text-sm font-black text-white">{byId.get(f.challenger_id)?.name||'Crew'} <span className="text-[#7d98b3]">vs</span> {byId.get(f.defender_id)?.name||'Crew'}</p>
        <p className="mt-2 text-xs text-[#adcee9]">{f.status==='verified'?('Verified '+f.challenger_score+'–'+f.defender_score):f.status.toUpperCase()} · {new Date(f.scheduled_at).toLocaleDateString()}</p>
      </article>):<p className="sm:col-span-2 rounded-xl border border-dashed border-[#315b83] p-4 text-sm text-[#b8cfe6]">Sanctioned group and knockout fixtures will appear once the founding qualification process and official draw are ready.</p>}</div>
    </div>
  </section>;
}

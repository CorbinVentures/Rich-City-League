'use client';

import {lobbySnapshot} from '@/lib/runs-gameplay-readiness';
import {FaUsers} from 'react-icons/fa6';

type Props={format:string;registered:number;capacity:number;status:string;suggested:boolean;past:boolean};
export function RunLobbyReadiness(props:Props){
 const ready=lobbySnapshot(props);
 return <section aria-label="Game roster readiness" className="mt-5 rounded-xl border border-[#446b8a] bg-[#061b2b] p-4">
  <div className="flex flex-wrap items-start justify-between gap-2">
   <div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#9dcaf0]"><FaUsers aria-hidden="true"/> Player roster</p>
   <h3 className="mt-1 text-base font-black text-white">{ready.title}</h3></div>
   <span className="text-sm font-black text-[#c9e6fb]">{ready.registered} RSVP{ready.registered===1?'':'s'}{ready.target!==null?' / '+ready.target+' target':''}</span>
  </div>
  {ready.target!==null&&ready.state!=='suggestion'&&<div className="mt-3 h-2 overflow-hidden rounded-full bg-[#24435b]" role="progressbar" aria-label="Registered player roster target" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ready.percentage}>
   <div className="h-full rounded-full bg-[#7cb8e5]" style={{width:ready.percentage+'%'}}/>
  </div>}
  <p className="mt-2 text-xs leading-5 text-[#b5cfe1]">{ready.guidance}</p>
 </section>;
}

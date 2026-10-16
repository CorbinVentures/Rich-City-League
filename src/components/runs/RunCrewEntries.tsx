'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaBasketball, FaPeopleGroup } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';

type Entry={crew_id:string};
type Crew={id:string;name:string;city:string;logo_path:string|null};

export function RunCrewEntries({runId}:{runId:string}){
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const [crews,setCrews]=useState<Crew[]>([]);
  useEffect(()=>{
    if(!db||!runId)return;
    let active=true;
    const load=async()=>{
      const {data:entries}=await db.from('commonwealth_run_entries').select('crew_id').eq('run_id',runId);
      const ids=((entries||[]) as Entry[]).map(e=>e.crew_id);
      if(!ids.length){if(active)setCrews([]);return;}
      const {data}=await db.from('commonwealth_crews').select('id,name,city,logo_path').in('id',ids).limit(30);
      if(active)setCrews((data||[]) as Crew[]);
    };
    void load();
    return ()=>{active=false;};
  },[db,runId]);
  if(!crews.length)return null;
  return <section className="mt-6 rounded-3xl border border-[#336b95] bg-[#0d2740] p-5 sm:p-6">
    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#8ecaff]"><FaPeopleGroup/> Registered crews</p>
    <p className="mt-2 text-sm text-[#b6d7ed]">These crews have entered the Run. Players still RSVP individually and only verified Cup games affect competition standings.</p>
    <div className="mt-4 flex flex-wrap gap-3">{crews.map(crew=>{
      const logo=crew.logo_path?db.storage.from('rch-crew-logos').getPublicUrl(crew.logo_path).data.publicUrl:null;
      return <Link href={'/crews?crew='+crew.id} key={crew.id} className="flex min-w-48 items-center gap-3 rounded-xl border border-[#436e92] bg-[#0b1c30] p-3 hover:border-[#8cc7fa]"><span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#173b58]">{logo?<img src={logo} alt="" className="h-full w-full object-contain"/>:<FaBasketball/>}</span><span><strong className="block text-sm text-white">{crew.name}</strong><small className="text-xs text-[#a7c9e2]">{crew.city}</small></span></Link>;
    })}</div>
  </section>;
}

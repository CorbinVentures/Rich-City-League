'use client';
import {useEffect,useMemo,useState} from 'react';
import {FaGem} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';

export function RepProfileFrame({profileId}:{profileId:string}){
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [active,setActive]=useState(false);
 useEffect(()=>{
  if(!db||!profileId)return;
  let mounted=true;
  void db.rpc('rch_has_active_rep_frame',{p_profile:profileId})
   .then(({data,error}:{data:boolean|null;error:{message:string}|null})=>{
    if(mounted)setActive(!error&&data===true);
   });
  return()=>{mounted=false;};
 },[db,profileId]);
 if(!active)return null;
 return <span role="img" aria-label="Active Legendary REP Exchange profile frame" title="Legendary REP Exchange profile frame"
   className="pointer-events-none absolute -inset-2 z-10 rounded-full border-[5px] border-[#d7ae56] shadow-[0_0_0_2px_#172a42,0_0_18px_5px_#e9b95d90,inset_0_0_16px_#e9b95d60]">
   <span className="absolute -left-1 -top-1 grid h-7 w-7 place-items-center rounded-full border-2 border-[#f6dfa5] bg-[#132b46] text-[#ffe5a5] shadow-md"><FaGem/></span>
   <span className="absolute -right-3 -bottom-2 rotate-[-8deg] rounded border border-[#efdba2] bg-[#493522] px-2 py-1 text-[8px] font-black tracking-[.12em] text-[#fff2c1]">REP LEGEND</span>
 </span>;
}
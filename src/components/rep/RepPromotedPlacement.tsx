'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {FaArrowUpRightFromSquare,FaBolt} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';

type Promoted={order_id:string;post_id:string;author_id:string;post_body:string;author_name:string;reward_title:string;region:string};

export function RepPromotedPlacement(){
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [items,setItems]=useState<Promoted[]>([]);
 useEffect(()=>{
  if(!db)return;
  let alive=true;
  void db.rpc('rch_active_rep_promotions',{p_limit:2})
   .then(({data,error}:{data:Promoted[]|null,error:{message:string}|null})=>{
    if(alive&&!error)setItems(data??[]);
   });
  return()=>{alive=false;};
 },[db]);
 if(!items.length)return null;
 return <section aria-label="REP Exchange promoted community posts" className="my-4 rounded-2xl border border-[#547491] bg-[linear-gradient(130deg,#0e2941,#101e32)] p-4 text-white">
  <div className="flex items-center justify-between gap-3">
   <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#b8dfff]"><FaBolt/> REP Exchange • Promoted</p>
   <Link href="/rep" className="text-[11px] font-bold text-[#bedff6] underline">How it works</Link>
  </div>
  <div className="mt-3 grid gap-3">
   {items.map(p=><Link key={p.order_id} href={'/social?post='+encodeURIComponent(p.post_id)} className="block rounded-xl border border-[#466684] bg-[#082239] p-3 transition-colors hover:bg-[#143a58]">
      <p className="text-[11px] font-bold text-[#d1edff]">{p.author_name} <span className="font-normal text-[#a1c4dc]">· Sponsored with REP · {p.region.replaceAll('-',' ')}</span></p>
      <p className="mt-2 line-clamp-3 text-sm leading-6">{p.post_body||'Watch this member’s RCH post'}</p>
      <p className="mt-3 flex items-center gap-2 text-xs font-bold text-[#9bd1fb]">{p.reward_title} <FaArrowUpRightFromSquare/></p>
     </Link>)}
  </div>
 </section>;
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaCamera, FaUserGroup } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';

type Credit = {
  id: string; tagged_profile_id: string; tag_kind: 'player'|'creator';
};
type Member = {id:string;display_name:string|null;username:string|null};

/** Credits appear on a post only after a tagged member accepts. No rights are transferred. */
export function ConsentedPostCredits({ postId }: { postId: string }) {
  const db = useMemo(()=>getSupabaseClient(true) as any,[]);
  const [credits,setCredits]=useState<Array<Credit & {name:string}>>([]);

  useEffect(()=>{
    if(!db || !postId) return;
    let active=true;
    const load=async()=>{
      const {data,error}=await db.from('rch_post_tag_requests')
        .select('id,tagged_profile_id,tag_kind')
        .eq('post_id',postId).eq('status','accepted').limit(10);
      if(error || !data?.length) {if(active)setCredits([]);return;}
      const ids=Array.from(new Set((data as Credit[]).map(t=>t.tagged_profile_id)));
      const result=await db.from('profiles').select('id,display_name,username').in('id',ids);
      if(result.error) return;
      const people=new Map<string,string>(((result.data||[]) as Member[]).map(p=>[p.id,p.display_name||p.username||'RCH member']));
      if(active) setCredits((data as Credit[]).filter(t=>people.has(t.tagged_profile_id)).map(t=>({
        ...t,name:people.get(t.tagged_profile_id)!
      })));
    };
    void load().catch(()=>{if(active)setCredits([]);});
    return()=>{active=false;};
  },[db,postId]);

  if(!credits.length)return null;
  return <section aria-label="Approved player and creator tags" className="mt-2 rounded-lg border border-[#44484e] bg-[#141618] p-3 text-[#d0d1d4]">
    <p className="mb-2 text-xs font-bold uppercase tracking-wide">Approved credits</p>
    <div className="flex flex-wrap gap-2">
      {credits.map(c=><Link key={c.id} href={'/social/profile/'+c.tagged_profile_id}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#70747a] bg-[#202326] px-3 text-xs font-bold text-white">
        {c.tag_kind==='creator'?<FaCamera className="text-[#ff768c]" aria-hidden="true"/>:<FaUserGroup className="text-[#ff768c]" aria-hidden="true"/>}
        {c.name} <span className="text-[#d0d1d4]">{c.tag_kind==='creator'?'Creator':'Player'}</span>
      </Link>)}
    </div>
    <p className="mt-2 text-xs text-[#a6a8ad]">Member-approved credit, not official player verification or RCH TV licensing.</p>
  </section>;
}

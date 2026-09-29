'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaBasketball } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type Run={id:string;title:string;starts_at:string;status:string};
export function RunRoomLauncher(){
 const {user}=useAuth();const supabase=useMemo(()=>getSupabaseClient(true),[]);const db=supabase as any;const [run,setRun]=useState<Run|null>(null);
 useEffect(()=>{if(!db||!user){setRun(null);return;}void(async()=>{const {data:joined}=await db.from('run_players').select('run_id').eq('profile_id',user.id);const ids=(joined??[]).map((x:any)=>x.run_id);const since=new Date(Date.now()-8*60*60*1000).toISOString();let query=db.from('runs').select('id,title,starts_at,status').gte('starts_at',since).neq('status','cancelled').order('starts_at').limit(1);if(ids.length)query=query.or(`host_id.eq.${user.id},id.in.(${ids.join(',')})`);else query=query.eq('host_id',user.id);const {data}=await query;setRun((data?.[0]??null) as Run|null);})();},[db,user]);
 if(!run)return null;
 return <Link href={`/runs/${run.id}`} className="fixed bottom-24 right-4 z-40 flex max-w-[min(20rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl border border-rcl-orange/30 bg-[#071018]/95 px-4 py-3 shadow-2xl backdrop-blur transition hover:border-rcl-orange/60 sm:bottom-6"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rcl-orange/10 text-rcl-orange"><FaBasketball/></span><span className="min-w-0"><small className="block text-[9px] font-black uppercase tracking-wider text-rcl-orange">Your Run Room</small><strong className="block truncate text-xs text-white">{run.title}</strong></span><FaArrowRight className="shrink-0 text-rcl-orange"/></Link>;
}

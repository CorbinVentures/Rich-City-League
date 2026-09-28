'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaCheck, FaPeopleGroup, FaUserGroup, FaXmark } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type Step = { id:string; label:string; detail:string; href:string; complete:boolean };

type ActivationState = {
  identity:boolean;
  people:boolean;
  community:boolean;
  conversation:boolean;
};

const EMPTY:ActivationState={identity:false,people:false,community:false,conversation:false};
const DISMISS_MS=3*24*60*60*1000;

export function NetworkActivation(){
  const pathname=usePathname();
  const {user,loading:authLoading}=useAuth();
  const supabase=useMemo(()=>getSupabaseClient(),[]);
  const [state,setState]=useState<ActivationState>(EMPTY);
  const [loading,setLoading]=useState(true);
  const [dismissed,setDismissed]=useState(true);

  useEffect(()=>{
    if(pathname!=='/social'||!user){setLoading(false);return;}
    const key=`rcl-network-activation-dismissed:${user.id}`;
    const raw=window.localStorage.getItem(key);
    const timestamp=raw?Number(raw):0;
    setDismissed(Boolean(timestamp&&Date.now()-timestamp<DISMISS_MS));
  },[pathname,user?.id]);

  useEffect(()=>{
    if(pathname!=='/social'||authLoading||!user||!supabase){if(!authLoading)setLoading(false);return;}
    let cancelled=false;
    const load=async()=>{
      setLoading(true);
      const [profileResult,followResult,friendResult,communityResult,postResult]=await Promise.all([
        supabase.from('profiles').select('display_name,avatar_url,bio').eq('id',user.id).maybeSingle(),
        supabase.from('follows').select('*',{count:'exact',head:true}).eq('follower_id',user.id),
        supabase.from('friendships').select('*',{count:'exact',head:true}).eq('status','accepted').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
        supabase.from('community_members').select('*',{count:'exact',head:true}).eq('profile_id',user.id),
        supabase.from('posts').select('*',{count:'exact',head:true}).eq('author_id',user.id).eq('status','published'),
      ]);
      if(cancelled)return;
      const profile=profileResult.data as {display_name?:string|null;avatar_url?:string|null;bio?:string|null}|null;
      setState({
        identity:Boolean(profile?.display_name?.trim()&&profile?.avatar_url&&profile?.bio?.trim()),
        people:(followResult.count??0)>=2||(friendResult.count??0)>=1,
        community:(communityResult.count??0)>=1,
        conversation:(postResult.count??0)>=1,
      });
      setLoading(false);
    };
    void load();
    return()=>{cancelled=true;};
  },[pathname,authLoading,user?.id,supabase]);

  if(pathname!=='/social'||!user||loading||dismissed)return null;

  const steps:Step[]=[
    {id:'identity',label:'Build your identity',detail:'Add a photo and bio so the city knows who you are.',href:'/profile',complete:state.identity},
    {id:'people',label:'Find your people',detail:'Follow or connect with basketball people you know.',href:'/friends',complete:state.people},
    {id:'community',label:'Join a community',detail:'Choose a team, run or hoops conversation to belong to.',href:'/communities',complete:state.community},
    {id:'conversation',label:'Make your first post',detail:'Put your voice into the RCL Network feed.',href:'/social?compose=1',complete:state.conversation},
  ];
  const done=steps.filter(step=>step.complete).length;
  if(done===steps.length)return null;

  const dismiss=()=>{
    window.localStorage.setItem(`rcl-network-activation-dismissed:${user.id}`,String(Date.now()));
    setDismissed(true);
  };

  return <aside className="fixed bottom-[82px] right-3 z-[45] w-[min(390px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-rcl-blue/20 bg-[#071522]/95 text-white shadow-[0_24px_80px_rgba(0,0,0,.48)] backdrop-blur-xl lg:bottom-5 lg:right-5" aria-label="Build your RCL Network">
    <div className="border-b border-white/10 p-4">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Start your RCL Network</p><h2 className="mt-1 font-display text-xl font-black uppercase">Build your basketball circle</h2></div><button type="button" onClick={dismiss} aria-label="Dismiss network starter" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-white/35 transition hover:text-white"><FaXmark/></button></div>
      <div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><i className="block h-full rounded-full bg-rcl-blue transition-all" style={{width:`${(done/steps.length)*100}%`}}/></div><span className="text-xs font-black text-rcl-blue">{done}/{steps.length}</span></div>
    </div>
    <div className="p-2">{steps.map(step=><Link key={step.id} href={step.href} className={`flex items-center gap-3 rounded-xl p-3 transition ${step.complete?'opacity-55':'hover:bg-white/[.04]'}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${step.complete?'border-emerald-400/30 bg-emerald-400/10 text-emerald-300':'border-rcl-blue/20 bg-rcl-blue/5 text-rcl-blue'}`}>{step.complete?<FaCheck/>:step.id==='people'?<FaUserGroup/>:step.id==='community'?<FaPeopleGroup/>:<span className="text-xs font-black">{steps.findIndex(item=>item.id===step.id)+1}</span>}</span><span className="min-w-0 flex-1"><b className="block text-sm">{step.label}</b><small className="mt-0.5 block text-xs leading-4 text-white/35">{step.complete?'Complete':step.detail}</small></span>{!step.complete&&<FaArrowRight className="shrink-0 text-xs text-white/20"/>}</Link>)}</div>
  </aside>;
}

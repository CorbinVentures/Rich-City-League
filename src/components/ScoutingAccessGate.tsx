'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { FaLock, FaUserShield } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

export function ScoutingAccessGate({children}:{children:ReactNode}){
  const {user,loading:authLoading}=useAuth();
  const supabase=useMemo(()=>getSupabaseClient(true),[]);const db=supabase as any;
  const [allowed,setAllowed]=useState<boolean|null>(null);
  useEffect(()=>{if(authLoading)return;if(!user||!db){setAllowed(false);return;}void(async()=>{const {data,error}=await db.rpc('is_coach_or_staff');setAllowed(!error&&Boolean(data));})();},[authLoading,db,user]);
  if(authLoading||allowed===null)return <div className="min-h-[60vh] bg-[#03070d] p-8 text-white"><Container maxWidth="lg"><div className="h-48 animate-pulse rounded-3xl border border-white/10 bg-white/[.02]"/></Container></div>;
  if(!user)return <div className="min-h-[70vh] bg-[#03070d] p-8 text-white"><Container maxWidth="lg"><div className="rounded-3xl border border-rcl-blue/15 bg-[#071522]/45 p-10 text-center"><FaUserShield className="mx-auto text-3xl text-rcl-blue"/><h1 className="mt-4 font-display text-2xl font-black uppercase">Coach access required</h1><p className="mt-2 text-sm text-white/40">Sign in with the RCL profile connected to your coaching assignment.</p><Link href="/auth/sign-in?next=/coaches/scouting" className="mt-5 inline-flex rounded-xl bg-rcl-orange px-5 py-3 text-xs font-black uppercase text-black">Sign in</Link></div></Container></div>;
  if(!allowed)return <div className="min-h-[70vh] bg-[#03070d] p-8 text-white"><Container maxWidth="lg"><div className="rounded-3xl border border-rcl-orange/15 bg-rcl-orange/[.03] p-10 text-center"><FaLock className="mx-auto text-3xl text-rcl-orange"/><h1 className="mt-4 font-display text-2xl font-black uppercase">Scouting Room is private</h1><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/40">This workspace is limited to profiles assigned as RCL coaches and authorized league staff. The restriction is enforced in the database as well as the interface.</p><Link href="/coaches" className="mt-5 inline-flex rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase">Back to coaches</Link></div></Container></div>;
  return <>{children}</>;
}

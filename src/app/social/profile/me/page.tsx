'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function MySocialProfilePage(){
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(()=>{
    if (loading) return;
    if (user) router.replace(`/social/profile/${user.id}`);
    else router.replace('/auth/sign-in?redirect=/social/profile/me');
  },[loading,user,router]);

  return <main className="grid min-h-screen place-items-center bg-[#03070d] text-white"><div className="text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-rcl-blue/30 bg-rcl-blue/10 font-display text-xl font-black text-rcl-blue">RCL</div><p className="mt-5 text-xs font-black uppercase tracking-[.24em] text-rcl-orange">RCL Network</p><h1 className="mt-2 font-display text-2xl font-black uppercase">Opening your basketball identity</h1><p className="mt-2 text-sm text-white/35">Profile · REP · achievements · activity</p></div></main>;
}

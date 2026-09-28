'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function MemberHomeRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace('/social');
  }, [loading, user, router]);

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[#03070d] text-white">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-rcl-blue/35 bg-rcl-blue/10 font-display text-xl font-black text-rcl-blue">RCL</div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[.28em] text-rcl-orange">RCL Network</p>
        <h1 className="mt-2 font-display text-3xl font-black uppercase">Opening your basketball network</h1>
        <p className="mt-2 text-sm text-white/40">Feed · people · league · REP · community</p>
      </div>
    </div>
  );
}

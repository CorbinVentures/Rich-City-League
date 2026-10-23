'use client';

import { useEffect, useState } from 'react';
import { isMobileStandaloneExperience } from '@/lib/rch-mobile-experience';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function MemberHomeRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [installedMobile, setInstalledMobile] = useState(false);

  useEffect(() => {
    const standaloneNavigator = navigator as Navigator & {standalone?: boolean};
    setInstalledMobile(isMobileStandaloneExperience({
      standalone: window.matchMedia('(display-mode: standalone)').matches || standaloneNavigator.standalone === true,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
    }));
  }, []);

  useEffect(() => {
    if (installedMobile && !loading && user) router.replace('/social');
  }, [installedMobile, loading, user, router]);

  if (!user || !installedMobile) return null;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[#03070d] text-white">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-rcl-blue/35 bg-rcl-blue/10 font-display text-xl font-black text-rcl-blue">RCH</div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[.28em] text-rcl-orange">Rich City Hoops</p>
        <h1 className="mt-2 font-display text-3xl font-black uppercase">Opening RCH Pulse</h1>
        <p className="mt-2 text-sm text-white/40">Local basketball · clips · runs · community</p>
      </div>
    </div>
  );
}

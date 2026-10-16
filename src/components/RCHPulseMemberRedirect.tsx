'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { isMobileStandaloneExperience } from '@/lib/rch-mobile-experience';

/**
 * /pulse is the public SEO preview. A signed-in website member belongs in
 * /social, which retains the same browser header without mounting PWA chrome.
 * Never redirect the installed mobile PWA from its existing flow.
 */
export function RCHPulseMemberRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading || !user) return;
    const nav = navigator as Navigator & { standalone?: boolean };
    const installed = isMobileStandaloneExperience({
      standalone: window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
    });
    if (!installed) router.replace('/social');
  }, [loading, user, router]);
  return null;
}

'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { classifyMobilePwaLaunch } from '@/lib/pwa-adoption';

const INSTALLATION_KEY = 'rch:pwa:installation-id:v1';
const THROTTLE_MS = 30 * 60 * 1000;

/**
 * Records signed-in launches of the installed RCH PWA only. This observer does
 * not track ordinary site browsing, IP addresses, location, or user-agent text.
 */
export function PwaAdoptionTracker() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const db = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    if (!db || loading || !user || pathname === '/command' ||
        pathname.startsWith('/command/') || pathname.startsWith('/sites/')) return;

    const privacy = navigator as Navigator & { standalone?: boolean; globalPrivacyControl?: boolean };
    if (navigator.doNotTrack === '1' || privacy.globalPrivacyControl === true) return;

    const platform = classifyMobilePwaLaunch({
      standalone: window.matchMedia('(display-mode: standalone)').matches || privacy.standalone === true,
      userAgent: navigator.userAgent,
      navigatorPlatform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
    });
    if (!platform) return;

    let installationId: string;
    try {
      const saved = window.localStorage.getItem(INSTALLATION_KEY);
      installationId = saved && /^[a-f0-9-]{36}$/i.test(saved) ? saved : crypto.randomUUID();
      window.localStorage.setItem(INSTALLATION_KEY, installationId);
    } catch {
      // No stable installation signal without durable local storage.
      return;
    }

    let active = true;
    let sending = false;
    const lastSentKey = 'rch:pwa:last-sent:' + user.id;

    const observe = () => {
      if (!active || sending || document.visibilityState !== 'visible') return;
      try {
        const last = Number(sessionStorage.getItem(lastSentKey) || 0);
        if (Date.now() - last < THROTTLE_MS) return;
      } catch {
        return;
      }

      sending = true;
      void (db as any).rpc('record_rch_pwa_launch', {
        p_installation_id: installationId,
        p_platform: platform,
      }).then(({ error }: { error: { message: string } | null }) => {
        if (!active || error) return;
        try { sessionStorage.setItem(lastSentKey, String(Date.now())); } catch {}
      }).catch(() => {
        // Offline, revoked sessions and database outages must not block the PWA.
      }).finally(() => { sending = false; });
    };

    observe();
    const onVisible = () => observe();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const interval = window.setInterval(observe, THROTTLE_MS);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.clearInterval(interval);
    };
  }, [db, loading, user?.id, pathname]);

  return null;
}
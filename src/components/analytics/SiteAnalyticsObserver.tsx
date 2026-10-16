'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

/** Approved screen categories only. Never transmit raw URLs or query strings. */
export function analyticsSection(pathname: string): string | null {
  if (pathname === '/') return 'home';
  const root = pathname.split('/').filter(Boolean)[0];
  if (root === 'social') return 'social';
  if (root === 'discover' || root === 'explore' || root === 'search') return 'discover';
  if (root === 'runs' || root === 'richmond-basketball-runs') return 'runs';
  if (root === 'crews') return 'crews';
  if (root === 'commonwealth') return 'commonwealth';
  if (['league','games','standings','schedule','stats','draft','rankings'].includes(root)) return 'league';
  if (root === 'players') return 'players';
  if (root === 'teams') return 'teams';
  if (root === 'media' || root === 'clips') return 'media';
  if (root === 'news') return 'news';
  if (root === 'communities' || root === 'community') return 'communities';
  if (root === 'organizations' || root === 'network') return 'organizations';
  if (root === 'shop') return 'shop';
  if (root === 'professional') return 'professional';
  return null; // Never record auth, account, admin, command or private routes.
}

/** First-party, privacy-minimal observational telemetry. No identity fingerprinting. */
export function SiteAnalyticsObserver() {
  const pathname = usePathname();
  const db = useMemo(() => getSupabaseClient(), []);
  useEffect(() => {
    const section = analyticsSection(pathname);
    if (!db || !section || document.visibilityState !== 'visible') return;
    const privacy = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (privacy.doNotTrack === '1' || privacy.globalPrivacyControl === true) return;
    try {
      const key = 'rch:site-analytics-tab-session';
      let session = sessionStorage.getItem(key);
      if (!session || !/^[a-f0-9-]{36}$/i.test(session)) {
        session = crypto.randomUUID();
        sessionStorage.setItem(key, session);
      }
      // The backend de-duplicates section visits by 10-minute bucket.
      // Failure must never prevent browsing or create console noise.
      void db.rpc('record_rch_site_visit' as never, {
        p_session_id: session, p_section: section,
      } as never).then(() => {}, () => {});
    } catch {
      // Storage, privacy controls, and restricted browsers can block telemetry.
    }
  }, [db, pathname]);
  return null;
}

'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { analyticsSection } from '@/lib/analytics/sections';

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

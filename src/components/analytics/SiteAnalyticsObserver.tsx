'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { analyticsSection } from '@/lib/analytics/sections';

/**
 * First-party, opt-out-respecting section telemetry. Short-lived tab presence
 * is a heartbeat, not a unique-person or exact active-user census.
 * No raw path, query, position or device fingerprint is sent.
 */
export function SiteAnalyticsObserver() {
  const pathname = usePathname();
  const db = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    const section = analyticsSection(pathname);
    if (!db || !section) return;
    const privacy = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (privacy.doNotTrack === '1' || privacy.globalPrivacyControl === true) return;

    const key = 'rch:site-analytics-tab-session';
    let active = true;
    const observe = (includeVisit = false) => {
      if (!active || document.visibilityState !== 'visible') return;
      try {
        let session = sessionStorage.getItem(key);
        if (!session || !/^[a-f0-9-]{36}$/i.test(session)) {
          session = crypto.randomUUID();
          sessionStorage.setItem(key, session);
        }
        // A heartbeat refreshes one coarse-section row per browser tab.
        // No personal location, IP, device ID or full URL is ever transmitted.
        void db.rpc('record_rch_live_heartbeat' as never, {
          p_session_id: session, p_section: section,
        } as never).then(() => {}, () => {});
        if (includeVisit) {
          // Original recorded section visits still de-duplicate in 10m buckets.
          void db.rpc('record_rch_site_visit' as never, {
            p_session_id: session, p_section: section,
          } as never).then(() => {}, () => {});
        }
      } catch {
        // Browsing must still work with storage denied or tracking blocked.
      }
    };

    observe(true);
    const interval = window.setInterval(() => observe(false), 45_000);
    const resume = () => observe(true);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
    };
  }, [db, pathname]);

  return null;
}

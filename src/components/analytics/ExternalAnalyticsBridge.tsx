'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  canSendExternalAnalytics, externalAnalyticsSection,
  EXTERNAL_CONSENT_EVENT, EXTERNAL_CONSENT_KEY, privacySignalBlocked,
  readExternalAnalyticsChoice,
} from '@/lib/analytics/external-consent';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || '';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST === 'https://eu.i.posthog.com'
  ? 'https://eu.i.posthog.com' : 'https://us.i.posthog.com';
const SESSION_KEY = 'rch:external-optin-anonymous-tab-id';
const SENT_KEY = 'rch:external-optin-sent-section';

/**
 * Strictly opt-in, anonymous, coarse-section PostHog event delivery.
 * No SDK, cookies, input/form autocapture, session replay, member ID,
 * email, raw path, referrer, search query, geolocation or user agent sent.
 *
 * A project token must be configured before any request is sent.
 * Does not automatically turn on Vercel Analytics or other providers.
 */
export function ExternalAnalyticsBridge() {
  const pathname = usePathname();
  const [optedIn, setOptedIn] = useState(false);
  useEffect(() => {
    const sync = () => setOptedIn(readExternalAnalyticsChoice());
    sync();
    const storage = (event: StorageEvent) => {
      if (event.key === EXTERNAL_CONSENT_KEY || event.key === null) sync();
    };
    window.addEventListener(EXTERNAL_CONSENT_EVENT, sync);
    window.addEventListener('storage', storage);
    return () => {window.removeEventListener(EXTERNAL_CONSENT_EVENT, sync);window.removeEventListener('storage', storage);};
  }, []);

  useEffect(() => {
    if (!POSTHOG_KEY || process.env.NODE_ENV !== 'production') return;
    const privacy = navigator as Navigator & {globalPrivacyControl?:boolean};
    const section = externalAnalyticsSection(pathname);
    if (!section || !canSendExternalAnalytics(pathname, optedIn, privacySignalBlocked(privacy))) return;
    if (document.visibilityState !== 'visible') return;
    let id = '';
    try {
      id = sessionStorage.getItem(SESSION_KEY) || '';
      if (!/^[a-f0-9-]{36}$/i.test(id)) {
        id = crypto.randomUUID();
        sessionStorage.setItem(SESSION_KEY,id);
      }
      const dedupe = section + ':' + id;
      if (sessionStorage.getItem(SENT_KEY) === dedupe) return;
      // Throttle repeated renders and route change signals within a browser tab.
      sessionStorage.setItem(SENT_KEY,dedupe);
    } catch { return; } // Never track when the browser restricts storage.

    const controller = new AbortController();
    void fetch(POSTHOG_HOST+'/i/v0/e/',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      mode:'cors',
      credentials:'omit',
      keepalive:true,
      signal:controller.signal,
      body:JSON.stringify({
        api_key:POSTHOG_KEY,
        event:'rch_public_section_view',
        distinct_id:id,
        properties:{
          section, $geoip_disable:true, $process_person_profile:false,
          source:'rcl_explicit_opt_in', platform:'web',
        }
      }),
    }).catch(()=>{ /* Third-party analytics must never interrupt website use. */ });
    return () => controller.abort();
  },[pathname,optedIn]);
  return null;
}

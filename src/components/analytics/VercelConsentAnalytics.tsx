'use client';

import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {
  EXTERNAL_CONSENT_EVENT, EXTERNAL_CONSENT_KEY, canSendExternalAnalytics,
  privacySignalBlocked, readExternalAnalyticsChoice,
} from '@/lib/analytics/external-consent';
import {filterVercelPageview} from '@/lib/analytics/vercel-filter';

type BrowserAnalytics = Window & {
  va?: (event: 'beforeSend'|'event'|'pageview', value?:unknown)=>void;
  vaq?: [string,unknown?][];
};

/**
 * Optional Vercel Web Analytics (not active until Vercel project Analytics
 * is enabled and the production deployment refreshed).
 * The script is only injected after a voluntary opt-in on an allowed public page.
 * Route privacy filters remain active for later client-side navigation,
 * including opting out without a full page reload.
 */
export function VercelConsentAnalytics() {
  const path = usePathname();
  const [optedIn,setOptedIn] = useState(false);
  useEffect(()=>{
    const sync=()=>setOptedIn(readExternalAnalyticsChoice());
    const storage=(event:StorageEvent)=>{
      if(event.key===EXTERNAL_CONSENT_KEY||event.key===null)sync();
    };
    sync();
    window.addEventListener(EXTERNAL_CONSENT_EVENT,sync);
    window.addEventListener('storage',storage);
    return ()=>{
      window.removeEventListener(EXTERNAL_CONSENT_EVENT,sync);
      window.removeEventListener('storage',storage);
    };
  },[]);

  useEffect(()=>{
    if(process.env.NODE_ENV !== 'production')return;
    const privacy=navigator as Navigator&{globalPrivacyControl?:boolean};
    if(!canSendExternalAnalytics(path,optedIn,privacySignalBlocked(privacy)))return;
    if(document.querySelector('script[data-rch-vercel-analytics]'))return;

    const browser=window as BrowserAnalytics;
    // Register the filter synchronously before the tracking script is fetched.
    browser.va = browser.va || ((name,value)=>{
      (browser.vaq=browser.vaq||[]).push([name,value]);
    });
    browser.va('beforeSend',(event:{type:string;url:string})=>{
      const livePrivacy=navigator as Navigator&{globalPrivacyControl?:boolean};
      return filterVercelPageview(
        event,window.location.origin,window.location.pathname,
        readExternalAnalyticsChoice(),privacySignalBlocked(livePrivacy),
      );
    });
    const script=document.createElement('script');
    script.src='/_vercel/insights/script.js';
    script.defer=true;
    script.dataset.rchVercelAnalytics='opt-in';
    // Once activated in Vercel, the script is served from the same site.
    document.head.appendChild(script);
  },[path,optedIn]);

  return null;
}

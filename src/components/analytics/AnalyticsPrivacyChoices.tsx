'use client';

import {useEffect,useState} from 'react';
import {
  EXTERNAL_CONSENT_EVENT, EXTERNAL_CONSENT_KEY,
  readExternalAnalyticsChoice, setExternalAnalyticsChoice,
  privacySignalBlocked,
} from '@/lib/analytics/external-consent';

export function AnalyticsPrivacyChoices() {
  const [allowed,setAllowed]=useState(false);
  const [blocked,setBlocked]=useState(false);
  const [ready,setReady]=useState(false);
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    const privacy=navigator as Navigator&{globalPrivacyControl?:boolean};
    setBlocked(privacySignalBlocked(privacy));
    const sync=()=>setAllowed(readExternalAnalyticsChoice());
    sync();setReady(true);
    const storage=(event:StorageEvent)=>{if(event.key===EXTERNAL_CONSENT_KEY||event.key===null)sync()};
    window.addEventListener(EXTERNAL_CONSENT_EVENT,sync);
    window.addEventListener('storage',storage);
    return ()=>{window.removeEventListener(EXTERNAL_CONSENT_EVENT,sync);window.removeEventListener('storage',storage)};
  },[]);
  const update=(value:boolean)=>{
    if(blocked&&value)return;
    if(!setExternalAnalyticsChoice(value)){setNotice('Browser storage is disabled. No optional analytics have been enabled.');return;}
    setAllowed(value);
    setNotice(value?'Optional anonymous product analytics enabled on public landing pages.':'Optional third-party analytics disabled on this device.');
  };
  return <section className="not-prose rounded-2xl border border-white/20 bg-[#0b253b] p-5 text-white" aria-labelledby="external-analytics-title">
    <h2 id="external-analytics-title" className="text-lg font-black">Optional product analytics</h2>
    <p className="mt-2 text-sm leading-6 text-white/75">
      By default, no external product analytics are sent. You can choose to share anonymous, broad-section activity on designated public landing pages with an analytics provider once RCH has connected one. Private messages, profiles, account pages, form fields, and precise location are excluded. You can withdraw this choice at any time.
    </p>
    <p className="mt-2 text-xs leading-5 text-white/60">Session recordings and heatmaps remain disabled. This choice does not enable advertising personalization or identify you as a member. Essential service and existing first-party operational telemetry have separate rules.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" disabled={!ready||blocked} aria-pressed={allowed&&!blocked} onClick={()=>update(true)}
        className={`min-h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-45 ${allowed&&!blocked?'bg-[#8ccfff] text-[#091b2b]':'border border-[#5983a0] text-white'}`}>Allow optional analytics</button>
      <button type="button" disabled={!ready} aria-pressed={!allowed||blocked} onClick={()=>update(false)}
        className={`min-h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-45 ${!allowed||blocked?'bg-[#8ccfff] text-[#091b2b]':'border border-[#5983a0] text-white'}`}>Decline / withdraw</button>
    </div>
    {blocked&&<p role="status" className="mt-3 text-xs font-semibold text-[#c9e5fb]">Your browser's Do Not Track or Global Privacy Control signal takes priority. External analytics remain disabled.</p>}
    {notice&&<p role="status" className="mt-3 text-xs text-[#c9e5fb]">{notice}</p>}
  </section>;
}

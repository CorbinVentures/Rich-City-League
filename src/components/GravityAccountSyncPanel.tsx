'use client';

import { useEffect, useState } from 'react';
import { FaArrowsRotate, FaCloudArrowUp, FaLock } from 'react-icons/fa6';
import {
  GRAVITY_ACCOUNT_STATUS_EVENT, readGravityAccountStatus,
  requestGravityAccountRefresh, requestGravityAccountSync,
  type GravityAccountStatus,
} from '@/lib/rch-gravity-account';

export function GravityAccountSyncPanel() {
  const [status,setStatus] = useState<GravityAccountStatus>(readGravityAccountStatus);
  useEffect(() => {
    setStatus(readGravityAccountStatus());
    const update=(event:Event)=>setStatus((event as CustomEvent<GravityAccountStatus>).detail || readGravityAccountStatus());
    window.addEventListener(GRAVITY_ACCOUNT_STATUS_EVENT,update);
    return ()=>window.removeEventListener(GRAVITY_ACCOUNT_STATUS_EVENT,update);
  }, []);
  return <section className="rounded-2xl border border-[#315878] bg-[#0b253b] p-6" aria-label="Account discovery preferences">
    <div className="flex items-center gap-3">
      <FaCloudArrowUp className="text-xl text-[#91cfff]" aria-hidden="true"/>
      <h2 className="text-lg font-bold text-white">Sync my basketball area</h2>
    </div>
    <p className="mt-3 text-sm leading-7 text-[#d2e1ed]">Keep your selected Virginia city and search radius consistent when you sign in on another device. This is optional and off by default. Only your private account can read these preferences, and precise GPS coordinates are never uploaded.</p>
    {!status.authenticated ? <p className="mt-4 rounded-lg border border-[#486684] bg-[#142f49] p-3 text-sm text-[#d7e9f8]">
      Sign in to enable cross-device location preferences. You can still customize this device without an account.
    </p> : <div className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" role="switch" aria-checked={status.enabled}
        disabled={status.loading || status.saving}
        onClick={()=>requestGravityAccountSync(!status.enabled)}
        className={`min-h-11 rounded-xl px-5 text-sm font-bold disabled:opacity-50 ${status.enabled?'border border-[#7caad0] bg-[#163958] text-white':'bg-[#438ad1] text-white'}`}>
        {status.saving?'Saving…':status.loading?'Checking…':status.enabled?'Account sync ON · Turn off':'Enable account sync'}
      </button>
      {status.enabled && <button type="button" disabled={status.saving||status.loading}
        onClick={requestGravityAccountRefresh}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#6586a5] px-4 text-xs font-semibold text-[#c8e5ff] disabled:opacity-50">
        <FaArrowsRotate aria-hidden="true"/> Refresh from account
      </button>}
    </div>}
    {status.enabled&&<p role="status" className="mt-3 flex items-start gap-2 text-xs text-[#b6edcd]"><FaLock className="mt-0.5 shrink-0" aria-hidden="true"/> Saved to your private account. Turning sync off deletes the saved account location and keeps this device’s choice.</p>}
    {status.error && <p role="alert" className="mt-3 text-sm text-[#ffc0bb]">{status.error}</p>}
  </section>;
}

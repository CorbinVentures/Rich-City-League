'use client';

import { useEffect, useState } from 'react';
import type { AnchorHTMLAttributes, PropsWithChildren } from 'react';

const SCOREBOOK_URL = 'https://rch-scorebook.vercel.app/';
const EXPERIMENTAL_IOS_SCHEME = 'webapp://rch-scorebook.vercel.app/';
const PREFERENCE_KEY = 'rch-scorebook-ios-installed-link-confirmed-v1';
const TRIAL_KEY = 'rch-scorebook-ios-installed-link-tried-v1';
const PREFERENCE_EVENT = 'rch-scorebook-link-preference';

function iosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function confirmedPreference() {
  try {
    return iosDevice() && window.localStorage.getItem(PREFERENCE_KEY) === 'yes';
  } catch {
    return false;
  }
}

type ScorebookAppLinkProps = PropsWithChildren<
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'>
>;

/**
 * Plain HTTPS links on Android allow the OS to hand off to a registered WebAPK.
 * On iOS, use the undocumented webapp:// scheme ONLY after the person verifies
 * on their own device that it opens the correct installed app.
 * iOS does not provide an install-detection API for separate Home Screen PWAs.
 */
export function ScorebookAppLink({ children, ...props }: ScorebookAppLinkProps) {
  const [useInstalled, setUseInstalled] = useState(false);

  useEffect(() => {
    const syncPreference = () => setUseInstalled(confirmedPreference());
    syncPreference();
    window.addEventListener(PREFERENCE_EVENT, syncPreference);
    return () => window.removeEventListener(PREFERENCE_EVENT, syncPreference);
  }, []);

  return (
    <a
      {...props}
      href={useInstalled ? EXPERIMENTAL_IOS_SCHEME : SCOREBOOK_URL}
      data-scorebook-launch={useInstalled ? 'ios-opted-in' : 'https'}
    >
      {children}
    </a>
  );
}

/**
 * Optional, explicit trial only. An invalid webapp:// target has been observed
 * to open a DIFFERENT installed web app on iOS; never silently apply it.
 */
export function ScorebookIosLaunchTrial() {
  const [eligible, setEligible] = useState(false);
  const [tried, setTried] = useState(false);
  const [preferred, setPreferred] = useState(false);

  useEffect(() => {
    setEligible(iosDevice());
    setPreferred(confirmedPreference());
    try {
      setTried(window.localStorage.getItem(TRIAL_KEY) === 'yes');
    } catch { /* storage may be unavailable */ }
  }, []);

  if (!eligible) return null;

  function updatePreference(enabled: boolean) {
    try {
      if (enabled) window.localStorage.setItem(PREFERENCE_KEY, 'yes');
      else window.localStorage.removeItem(PREFERENCE_KEY);
      window.localStorage.removeItem(TRIAL_KEY);
    } catch { /* use HTTPS if preference cannot persist */ }
    setPreferred(confirmedPreference());
    setTried(false);
    window.dispatchEvent(new Event(PREFERENCE_EVENT));
  }

  function markTried() {
    try { window.localStorage.setItem(TRIAL_KEY, 'yes'); } catch { /* ignore */ }
    setTried(true);
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#D9E4EF] bg-white p-4 text-[#0F2547]">
      <p className="text-xs font-bold">Already installed RCH Scorebook on this iPhone?</p>
      <p className="mt-1 text-xs leading-5 text-[#64748B]">
        iOS does not officially support launching one Home Screen web app from another.
        You can optionally test an experimental link. If it works, future RCH Scorebook
        buttons can use it on this device.
      </p>
      {!preferred && (
        <a
          href={EXPERIMENTAL_IOS_SCHEME}
          onClick={markTried}
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#3B82F6] bg-[#EDF4FF] px-4 py-3 text-xs font-bold text-[#0F2547]"
        >
          Try installed Scorebook · iPhone beta ↗
        </a>
      )}
      {tried && !preferred && (
        <div className="mt-3 rounded-xl border border-[#D9E4EF] bg-[#F6F9FC] p-3">
          <p className="text-xs font-bold">Did it open the correct RCH Scorebook app?</p>
          <p className="mt-1 text-xs text-[#64748B]">
            Confirm only if you saw the installed Scorebook, not Safari or another app.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updatePreference(true)}
              className="rounded-xl bg-[#3B82F6] px-4 py-2 text-xs font-bold text-white"
            >
              Yes · Use it next time
            </button>
            <button
              type="button"
              onClick={() => updatePreference(false)}
              className="rounded-xl border border-[#D9E4EF] bg-white px-4 py-2 text-xs font-bold text-[#0F2547]"
            >
              No · Keep website links
            </button>
          </div>
        </div>
      )}
      {preferred && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-[#2E8B70]">
            Installed-app link enabled on this RCH Home Screen app.
          </p>
          <button
            type="button"
            onClick={() => updatePreference(false)}
            className="mt-2 rounded-lg border border-[#D9E4EF] bg-white px-3 py-2 text-xs font-semibold text-[#0F2547]"
          >
            Switch back to normal website links
          </button>
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-[#64748B]">
        Experimental link not working, or opened the wrong app? Use the normal
        Scorebook link or tap your Scorebook Home Screen icon instead. There is
        no automatic installed-app detection or guaranteed fallback on iOS.
      </p>
    </div>
  );
}

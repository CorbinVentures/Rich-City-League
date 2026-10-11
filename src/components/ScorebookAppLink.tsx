'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
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

/**
 * Show the installed-app trial at the point of intent, on EVERY RCH Scorebook
 * launch button, not buried below the public Game IQ page.
 *
 * On iOS, HTTPS cross-origin links cannot reliably open a different installed
 * Home Screen PWA. This modal tells the truth, allows an explicit scheme trial,
 * and never auto-enables a scheme that might open the wrong installed app.
 */
export function ScorebookAppLink({ children, onClick, ...props }: ScorebookAppLinkProps) {
  const [eligible, setEligible] = useState(false);
  const [ready, setReady] = useState(false);
  const [useInstalled, setUseInstalled] = useState(false);
  const [opened, setOpened] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const syncPreference = () => {
      setEligible(iosDevice());
      setUseInstalled(confirmedPreference());
    };
    setReady(true);
    syncPreference();
    window.addEventListener(PREFERENCE_EVENT, syncPreference);
    return () => window.removeEventListener(PREFERENCE_EVENT, syncPreference);
  }, []);

  useEffect(() => {
    if (!opened) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpened(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [opened]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (eligible && !useInstalled) {
      event.preventDefault();
      setTried(false);
      setOpened(true);
    }
  }

  function tryInstalled() {
    setTried(true);
    try { window.localStorage.setItem(TRIAL_KEY, 'yes'); } catch { /* optional */ }
  }

  function setVerifiedPreference(enabled: boolean) {
    try {
      if (enabled) window.localStorage.setItem(PREFERENCE_KEY, 'yes');
      else window.localStorage.removeItem(PREFERENCE_KEY);
      window.localStorage.removeItem(TRIAL_KEY);
    } catch { /* future taps fall back to HTTPS */ }
    const confirmed = confirmedPreference();
    setUseInstalled(confirmed);
    setOpened(false);
    window.dispatchEvent(new Event(PREFERENCE_EVENT));
  }

  return (
    <>
      <a
        {...props}
        href={useInstalled ? EXPERIMENTAL_IOS_SCHEME : SCOREBOOK_URL}
        onClick={handleClick}
        data-scorebook-launch={useInstalled ? 'ios-opted-in' : 'https-with-optional-iphone-handoff'}
      >
        {children}
      </a>
      {ready && eligible && opened && createPortal(
        <div
          role="presentation"
          onClick={(event) => { if (event.target === event.currentTarget) setOpened(false); }}
          className="fixed inset-0 flex items-center justify-center bg-[#071326]/80 px-4 py-6"
          style={{ zIndex: 2147482000 }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="rch-scorebook-launch-heading"
            aria-describedby="rch-scorebook-launch-description"
            className="w-full max-w-md overflow-y-auto rounded-3xl border border-[#D9E4EF] bg-white p-5 text-[#0F2547] shadow-2xl sm:p-6"
            style={{ maxHeight: 'calc(100dvh - 44px)', WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#2563EB]">RICH CITY HOOPS</p>
                <h2 id="rch-scorebook-launch-heading" className="mt-1 text-2xl font-black tracking-tight text-[#0F2547]">
                  Open RCH Scorebook
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close Scorebook launcher"
                onClick={() => setOpened(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D9E4EF] bg-[#F6F9FC] text-xl text-[#0F2547]"
              >
                ×
              </button>
            </div>
            <p id="rch-scorebook-launch-description" className="mt-3 text-sm leading-6 text-[#64748B]">
              Already installed the separate Scorebook app? iPhone doesn’t reliably
              hand off an ordinary website link to its Home Screen PWA. You can
              test an experimental installed-app link once, or continue in the browser.
            </p>
            <a
              href={EXPERIMENTAL_IOS_SCHEME}
              onClick={tryInstalled}
              className="mt-5 flex min-h-14 w-full items-center justify-center rounded-xl bg-[#3B82F6] px-4 py-3 text-center text-sm font-black text-white"
              style={{ color: '#fff' }}
            >
              Try opening installed Scorebook ↗
            </a>
            <a
              href={SCOREBOOK_URL}
              className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl border border-[#D9E4EF] bg-[#F6F9FC] px-4 py-3 text-center text-sm font-bold text-[#0F2547]"
              style={{ color: '#0F2547' }}
            >
              Open Scorebook website
            </a>
            {tried && (
              <div className="mt-4 rounded-2xl border border-[#D9E4EF] bg-[#EDF4FA] p-4">
                <p className="text-sm font-bold text-[#0F2547]">
                  Did the first button launch the actual Scorebook Home Screen app?
                </p>
                <p className="mt-2 text-xs leading-5 text-[#64748B]">
                  If it opened Safari, another app, or showed an error, choose No.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifiedPreference(true)}
                    className="min-h-11 rounded-xl bg-[#3B82F6] px-4 py-3 text-xs font-bold text-white"
                  >
                    Yes, use it next time
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerifiedPreference(false)}
                    className="min-h-11 rounded-xl border border-[#D9E4EF] bg-white px-4 py-3 text-xs font-bold text-[#0F2547]"
                  >
                    No, use website
                  </button>
                </div>
              </div>
            )}
            <p className="mt-4 text-xs leading-5 text-[#64748B]">
              The first option uses an undocumented iOS method and may fail or
              open the wrong web app. RCH never enables it permanently without
              your explicit confirmation.
            </p>
          </section>
        </div>,
        document.body
      )}
    </>
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

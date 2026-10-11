'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { AnchorHTMLAttributes, PropsWithChildren } from 'react';

const SCOREBOOK_URL = 'https://rch-scorebook.vercel.app/';
const RETIRED_STORAGE_KEYS = [
  'rch-scorebook-ios-installed-link-confirmed-v1',
  'rch-scorebook-ios-installed-link-tried-v1',
];

type ScorebookAppLinkProps = PropsWithChildren<
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'>
>;

function isInstalledIosWebApp() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;

  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return isIos && (
    window.matchMedia('(display-mode: standalone)').matches
    || navigatorWithStandalone.standalone === true
  );
}

/**
 * iOS Home Screen PWAs cannot reliably launch another installed Home Screen PWA.
 * A user on an installed RCH iOS PWA gets accurate options; every actual link
 * uses valid HTTPS. Android and regular browsers can follow HTTPS directly,
 * allowing OS-level PWA link handling where supported.
 *
 * Previous versions offered an undocumented webapp:// URL that produced a
 * "Safari cannot open the page because the address is invalid" alert on iOS.
 * Never expose or persist that invalid link again.
 */
export function ScorebookAppLink({ children, onClick, ...props }: ScorebookAppLinkProps) {
  const [showInfoOnTap, setShowInfoOnTap] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setShowInfoOnTap(isInstalledIosWebApp());
    try {
      for (const key of RETIRED_STORAGE_KEYS) {
        window.localStorage.removeItem(key);
      }
    } catch { /* Storage may be disabled; URLs are valid regardless. */ }
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (showInfoOnTap) {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <>
      <a
        {...props}
        href={SCOREBOOK_URL}
        onClick={handleClick}
        data-scorebook-launch="https"
      >
        {children}
      </a>
      {open && createPortal(
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          className="fixed inset-0 flex items-center justify-center bg-[#071326]/80 px-4 py-6"
          style={{ zIndex: 2147482000 }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="rch-scorebook-handoff-heading"
            aria-describedby="rch-scorebook-handoff-description"
            className="w-full max-w-md overflow-y-auto rounded-3xl border border-[#D9E4EF] bg-white p-5 text-[#0F2547] shadow-2xl sm:p-6"
            style={{ maxHeight: 'calc(100dvh - 44px)', WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#2563EB]">
                  RICH CITY HOOPS
                </p>
                <h2 id="rch-scorebook-handoff-heading" className="mt-1 text-2xl font-black tracking-tight text-[#0F2547]">
                  RCH Scorebook
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close Scorebook information"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D9E4EF] bg-[#F6F9FC] text-xl text-[#0F2547]"
              >
                ×
              </button>
            </div>
            <p id="rch-scorebook-handoff-description" className="mt-3 text-sm leading-6 text-[#64748B]">
              You can use the separate Scorebook app already saved on your iPhone.
              Apple does not currently provide a supported way for the installed
              RCH web app to automatically switch into that other Home Screen app.
            </p>
            <div className="mt-4 rounded-2xl border border-[#D9E4EF] bg-[#EDF4FA] p-4">
              <p className="text-sm font-bold text-[#0F2547]">
                For the installed Scorebook experience
              </p>
              <p className="mt-2 text-xs leading-5 text-[#64748B]">
                Close this message, go to your iPhone Home Screen or App Switcher,
                and tap the RCH Scorebook icon. It will open full-screen with its
                own saved login.
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3 min-h-11 w-full rounded-xl bg-[#0F2547] px-4 py-3 text-xs font-bold text-white"
              >
                Got it · Use my Scorebook icon
              </button>
            </div>
            <a
              href={SCOREBOOK_URL}
              className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#3B82F6] px-4 py-3 text-center text-sm font-bold text-white"
              style={{ color: '#fff' }}
            >
              Open Scorebook website ↗
            </a>
            <p className="mt-3 text-xs leading-5 text-[#64748B]">
              The website option is a valid HTTPS link. On an iPhone, it may open
              in a Safari view instead of switching to your installed Scorebook.
            </p>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

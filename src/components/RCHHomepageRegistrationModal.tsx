'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaArrowRight, FaBasketball, FaXmark } from 'react-icons/fa6';
import { trackRchConversion } from '@/lib/analytics/conversion';

const DISMISS_KEY = 'rch-home-registration-notice-v1';

/**
 * Homepage-only acquisition notice for browser visitors.
 * Does not block public discovery, installed PWA navigation, or existing members.
 */
export function RCHHomepageRegistrationModal({
  authenticated,
  loading,
}: {
  authenticated: boolean;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const signupRef = useRef<HTMLAnchorElement>(null);

  const dismiss = useCallback(() => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Browsers with blocked storage can still close the dialog.
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    if (loading || authenticated) {
      setOpen(false);
      return;
    }
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      // The invitation works even with storage disabled.
    }
    // Let the public page settle before prompting new visitors.
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, [loading, authenticated]);

  useEffect(() => {
    if (!open || authenticated || loading) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    signupRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      ));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, authenticated, loading, dismiss]);

  if (!open || authenticated || loading) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center p-3 text-white sm:items-center sm:p-6">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={dismiss}
        className="absolute inset-0 cursor-default bg-black/80 backdrop-blur-[7px]"
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rch-register-title"
        aria-describedby="rch-register-description"
        className="relative w-full max-w-[580px] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[26px] border border-white/20 bg-gradient-to-br from-[#16191e] via-[#0c0e12] to-[#050608] px-5 pb-6 pt-6 shadow-[0_28px_100px_rgba(0,0,0,.8)] sm:px-9 sm:pb-9 sm:pt-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: 'radial-gradient(ellipse at 90% 5%,rgba(160,176,190,.22),transparent 45%)' }}
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[.23em] text-white/75">
              <FaBasketball className="text-lg text-white" aria-hidden="true" /> RICH CITY HOOPS
            </span>
            <button
              type="button"
              aria-label="Close registration message"
              onClick={dismiss}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <FaXmark aria-hidden="true" />
            </button>
          </div>

          <div className="mt-7 inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-white/80">
            FREE ACCOUNT REQUIRED FOR APP ACCESS
          </div>
          <h2 id="rch-register-title" className="mt-4 max-w-[480px] font-display text-[clamp(2rem,6vw,3.25rem)] font-black uppercase leading-[.98] tracking-tight text-white">
            THE COMMUNITY IS OPEN. <span className="text-white/55">YOUR PROFILE UNLOCKS IT.</span>
          </h2>
          <p id="rch-register-description" className="mt-5 max-w-[480px] text-sm leading-6 text-white/80 sm:text-base">
            Register for a free Rich City Hoops account to access the app&apos;s member features.
            Connect with hoopers across Virginia and make every run count.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-2 text-xs font-semibold text-white/85 sm:grid-cols-3">
            {['Organize pickup runs', 'Earn REP & badges', 'Post your highlights'].map(item => (
              <span key={item} className="rounded-xl border border-white/15 bg-white/[.06] px-3 py-3">
                <span className="mr-2 text-white" aria-hidden="true">✓</span>{item}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              ref={signupRef}
              href="/auth/sign-up"
              onClick={() => {
                trackRchConversion('join_click', 'home_hero');
                dismiss();
              }}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-[#0b0d11] transition hover:bg-[#dfe3e8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Create Free Account <FaArrowRight aria-hidden="true" />
            </Link>
            <Link
              href="/auth/sign-in"
              onClick={dismiss}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/35 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Already a member? Sign in
            </Link>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="mt-5 w-full py-2 text-center text-xs font-medium text-white/65 underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            Continue exploring the public site
          </button>
          <p className="mt-2 text-center text-[11px] leading-5 text-white/50">
            No payment or app installation is required to register. Public pages remain open to everyone.
          </p>
        </div>
      </section>
    </div>
  );
}

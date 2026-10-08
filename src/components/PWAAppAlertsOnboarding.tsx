'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBell, FaPhone, FaXmark } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import {
  enableAppAlerts,
  getAppAlertState,
  rebindExistingAppAlerts,
} from '@/lib/pwa-notifications';

const DISMISS_PREFIX = 'rch:push-opt-in-dismissed-until:';
const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;

function isExcludedPath(pathname: string) {
  return pathname === '/app'
    || pathname === '/access'
    || pathname === '/member-access'
    || pathname.startsWith('/auth/')
    || pathname === '/auth'
    || pathname.startsWith('/legal/');
}

function wasRecentlyDismissed(userId: string) {
  try {
    return Date.now() < Number(localStorage.getItem(DISMISS_PREFIX + userId) || 0);
  } catch {
    return false;
  }
}

function rememberDismissal(userId: string) {
  try {
    localStorage.setItem(DISMISS_PREFIX + userId, String(Date.now() + TWO_WEEKS));
  } catch {
    // The in-memory dismissal below still prevents repeat prompts this session.
  }
}

/**
 * Notification permission must come from a direct tap, not from the auth event.
 * This opt-in appears after sign-in, then handles the entire push subscription
 * and account registration from one button. iOS browser-only visitors instead
 * receive the existing Add to Home Screen guidance from PWAInstallExperience.
 */
export function PWAAppAlertsOnboarding() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [visible, setVisible] = useState(false);
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dismissedUser, setDismissedUser] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user || !supabase || isExcludedPath(pathname) || dismissedUser === user.id) {
      setVisible(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const checkPermission = async () => {
        if (wasRecentlyDismissed(user.id)) return;

        const state = getAppAlertState();
        // Never prompt when notifications are blocked, unsupported or when
        // iOS needs the Home Screen installation step first.
        if (state === 'unsupported' || state === 'not-installed' || state === 'denied') return;

        if (state === 'granted') {
          // Already-permitted devices reconnect silently after login; only
          // request a tap if the subscription cannot be restored.
          if (await rebindExistingAppAlerts(supabase as any)) return;
        }

        if (cancelled) return;
        setNeedsSubscription(state === 'granted');
        setError('');
        setVisible(true);
      };
      void checkPermission();
    }, 1600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [dismissedUser, loading, pathname, supabase, user]);

  const dismiss = () => {
    if (user) {
      rememberDismissal(user.id);
      setDismissedUser(user.id);
    }
    setVisible(false);
    setError('');
  };

  const enable = async () => {
    if (!supabase || !user || busy) return;
    setBusy(true);
    setError('');
    try {
      // Runs directly from this button's user gesture. It requests permission,
      // subscribes to Web Push and registers the device with Supabase.
      await enableAppAlerts(supabase as any);
      setVisible(false);
      setDismissedUser(user.id);
      window.dispatchEvent(new Event('rcl:notification-state-changed'));
    } catch (cause) {
      const state = getAppAlertState();
      setError(state === 'denied'
        ? 'Notifications are blocked on this device. You can change that in your phone or browser settings.'
        : cause instanceof Error ? cause.message : 'Unable to enable alerts. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!visible || !user) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/75 px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-6 sm:items-center sm:p-6" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="rch-push-onboarding-title"
        aria-describedby="rch-push-onboarding-description"
        className="relative w-full max-w-md rounded-3xl border border-white/20 bg-[#07131d] p-6 text-white shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss notification setup"
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white/85 hover:bg-white/10"
        >
          <FaXmark aria-hidden="true" />
        </button>
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2474e7] text-2xl text-white">
          <FaBell aria-hidden="true" />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[#91ceff]">Rich City Hoops</p>
        <h2 id="rch-push-onboarding-title" className="pr-7 text-2xl font-black leading-tight text-white">
          {needsSubscription ? 'Finish setting up alerts' : 'Never miss a call or message'}
        </h2>
        <p id="rch-push-onboarding-description" className="mt-3 text-sm leading-6 text-white/85">
          Turn on RCH notifications for incoming calls, direct messages, and basketball updates—even when the app is closed.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-white/90">
          <span className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-2"><FaPhone aria-hidden="true" /> Call alerts</span>
          <span className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-2"><FaBell aria-hidden="true" /> Messages & updates</span>
        </div>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/50 bg-red-950/70 p-3 text-sm leading-5 text-white">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={() => void enable()}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2474e7] px-5 text-sm font-bold text-white hover:bg-[#1664d7] disabled:cursor-wait disabled:opacity-60"
        >
          <FaBell aria-hidden="true" />
          {busy ? 'Connecting notifications…' : needsSubscription ? 'Finish setup' : 'Enable notifications'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={dismiss}
          className="mt-2 min-h-11 w-full rounded-xl text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-60"
        >
          Not now
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-white/65">
          You control alerts anytime in <Link href="/settings/notifications" onClick={() => setVisible(false)} className="font-semibold text-[#91ceff] underline underline-offset-2">Notification Settings</Link>.
        </p>
      </section>
    </div>
  );
}

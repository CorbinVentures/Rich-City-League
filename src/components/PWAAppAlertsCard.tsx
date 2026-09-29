'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaBell, FaCircleCheck, FaMobileScreenButton } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { enableAppAlerts, getAppAlertState, type AppAlertState } from '@/lib/pwa-notifications';

export function PWAAppAlertsCard() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [state, setState] = useState<AppAlertState>('unsupported');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setState(getAppAlertState());
  }, []);

  if (!user) return null;

  const enable = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage('');
    try {
      await enableAppAlerts(supabase as any);
      setState('granted');
      setMessage('RCL app alerts and Home Screen badge counts are on.');
      window.dispatchEvent(new Event('rcl:notification-state-changed'));
    } catch (error) {
      setState(getAppAlertState());
      setMessage(error instanceof Error ? error.message : 'Could not enable app notifications.');
    } finally {
      setBusy(false);
    }
  };

  const status = state === 'granted'
    ? 'ON'
    : state === 'denied'
      ? 'BLOCKED'
      : state === 'not-installed'
        ? 'INSTALL APP'
        : state === 'unsupported'
          ? 'UNAVAILABLE'
          : 'OFF';

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-rcl-blue/18 bg-[radial-gradient(circle_at_top_right,rgba(145,206,242,.10),transparent_42%),#07131d] p-5 sm:p-6" aria-label="RCL app notification settings">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-rcl-blue/20 bg-rcl-blue/10 text-xl text-rcl-blue">
            {state === 'granted' ? <FaCircleCheck /> : <FaMobileScreenButton />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-black">RCL App Alerts</h2>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[.16em] ${state === 'granted' ? 'border-rcl-blue/30 bg-rcl-blue/10 text-rcl-blue' : 'border-white/10 text-white/35'}`}>{status}</span>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/45">
              Push notifications work when the installed RCL app is closed, and unread alerts appear as the red number badge on the Home Screen app icon.
            </p>
            {state === 'not-installed' && <p className="mt-2 text-xs text-rcl-blue">Add RCL to your Home Screen, open the installed app, then return here to enable alerts.</p>}
            {state === 'denied' && <p className="mt-2 text-xs text-white/45">Notifications are blocked at the device level. Re-enable RCL in your system Notification settings.</p>}
            {message && <p className="mt-2 text-xs text-rcl-blue">{message}</p>}
          </div>
        </div>

        {(state === 'default' || state === 'granted') && (
          <button type="button" disabled={busy} onClick={() => void enable()} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 px-4 text-xs font-black uppercase tracking-wider text-white transition hover:border-rcl-blue/55 disabled:opacity-50">
            <FaBell /> {busy ? 'Connecting…' : state === 'granted' ? 'Refresh alerts' : 'Enable app alerts'}
          </button>
        )}
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaCalendarDays, FaCrown, FaShieldHalved } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type Variant = 'royaltee' | 'drawer' | 'staff';

/**
 * Discovery only. Authorization remains enforced by the Royaltee pages, RLS
 * policies, and can_manage_royaltee RPCs. Never infer manager rights from the
 * user's generic RCH staff/cheerleading assignment.
 */
export function RoyalteeStaffShortcut({ variant }: { variant: Variant }) {
  const { user } = useAuth();
  return user ? <RoyalteeStaffShortcutForAccount key={user.id} variant={variant} /> : null;
}

function RoyalteeStaffShortcutForAccount({ variant }: { variant: Variant }) {
  const db = useMemo(() => getSupabaseClient(), []);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!db) return;
    let active = true;
    void db.rpc('can_manage_royaltee').then(({ data, error }) => {
      if (active) setAllowed(!error && data === true);
    }).catch(() => { if (active) setAllowed(false); });
    return () => { active = false; };
  }, [db]);

  if (!allowed) return null;

  const compact = variant === 'drawer';
  return <section aria-label="Royaltee coach tools" className={
    variant === 'royaltee'
      ? 'relative z-20 border-y border-[#3973a4] bg-[linear-gradient(100deg,#0c3456,#061729)] px-5 py-4 text-white'
      : compact
        ? 'rounded-2xl border border-[#4387bb] bg-[#0a2b49] p-4 text-white'
        : 'rounded-2xl border border-[#548fb5] bg-[linear-gradient(110deg,#103f62,#082439)] p-5 text-white sm:p-6'
  }>
    <div className={variant === 'royaltee' ? 'mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4' : 'flex flex-wrap items-center justify-between gap-4'}>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.12em] text-[#ffc28f]"><FaShieldHalved aria-hidden="true" /> Approved Royaltee leadership</p>
        <h2 className={compact ? 'mt-1 text-lg font-black' : 'mt-1 text-xl font-black sm:text-2xl'}>Your Cheerleading Coach Tools</h2>
        <p className="mt-1 text-sm leading-6 text-[#cee6f5]">Events, fees, registration desk, performers and website management.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/league/royaltee/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#ff9c52] px-4 py-2 text-xs font-black text-[#160c04] hover:bg-[#ffbb85]">
          <FaCalendarDays aria-hidden="true" /> Open Coach Dashboard <FaArrowRight aria-hidden="true" />
        </Link>
        <Link href="/league/royaltee/manage" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#89c9f0] bg-[#113b5e] px-4 py-2 text-xs font-black text-white hover:bg-[#18527e]">
          <FaCrown aria-hidden="true" /> Manage Royaltee Site <FaArrowRight aria-hidden="true" />
        </Link>
      </div>
    </div>
  </section>;
}

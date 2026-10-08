'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaBell, FaCircleCheck } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

export function OrganizationFollowButton({
  organizationId,
  organizationSlug,
  initialFollowerCount = 0,
}: {
  organizationId: string;
  organizationSlug: string;
  initialFollowerCount?: number;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(Math.max(initialFollowerCount, 0));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    void db.from('network_organization_follows')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('profile_id', user.id)
      .maybeSingle()
      .then(({ data }: { data: { organization_id: string } | null }) => {
        if (active) setFollowing(Boolean(data));
      });
    return () => { active = false; };
  }, [authLoading, db, organizationId, user]);

  const toggle = async () => {
    if (!user) {
      router.push(`/auth/sign-in?next=${encodeURIComponent(`/organizations/${organizationSlug}`)}`);
      return;
    }
    if (busy) return;
    setBusy(true);

    if (following) {
      const { error } = await db.from('network_organization_follows')
        .delete()
        .eq('organization_id', organizationId)
        .eq('profile_id', user.id);
      if (!error) {
        setFollowing(false);
        setCount((value) => Math.max(value - 1, 0));
      }
    } else {
      const { error } = await db.from('network_organization_follows').insert({
        organization_id: organizationId,
        profile_id: user.id,
      });
      if (!error) {
        setFollowing(true);
        setCount((value) => value + 1);
      }
    }

    setBusy(false);
  };

  return <button
    type="button"
    onClick={toggle}
    disabled={busy || authLoading}
    className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-wide transition disabled:opacity-60 ${following ? 'border-emerald-400/25 bg-emerald-400/[.08] text-emerald-300' : 'border-rcl-orange/30 bg-rcl-orange/[.07] text-rcl-orange hover:border-rcl-orange/55'}`}
  >
    {following ? <FaCircleCheck/> : <FaBell/>}
    {following ? 'Following' : 'Follow'}
    <span className="text-[10px] text-current/60">{count.toLocaleString()}</span>
  </button>;
}

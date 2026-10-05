'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaArrowTrendUp, FaEye } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type ViewSummary = {
  views_7d: number;
  views_prev_7d: number;
  views_30d: number;
  unique_viewers_30d: number;
};

export function ProfileViewInsights({ profileId }: { profileId: string }) {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;
  const [summary, setSummary] = useState<ViewSummary | null>(null);

  useEffect(() => {
    if (!db || !user) return;
    if (user.id !== profileId) {
      void db.rpc('record_profile_view', { p_profile: profileId });
      return;
    }

    void db.rpc('get_my_profile_view_summary').then(({ data, error }: any) => {
      if (error) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return;
      setSummary({
        views_7d: Number(row.views_7d ?? 0),
        views_prev_7d: Number(row.views_prev_7d ?? 0),
        views_30d: Number(row.views_30d ?? 0),
        unique_viewers_30d: Number(row.unique_viewers_30d ?? 0),
      });
    });
  }, [db, profileId, user?.id]);

  if (!user || user.id !== profileId || !summary) return null;

  const delta = summary.views_7d - summary.views_prev_7d;
  const percent = summary.views_prev_7d > 0
    ? Math.round((delta / summary.views_prev_7d) * 100)
    : summary.views_7d > 0 ? 100 : 0;

  return <section className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
    <div className="rounded-2xl border border-rcl-blue/20 bg-rcl-blue/[.055] p-4">
      <div className="flex items-center gap-2 text-rcl-blue"><FaEye/><span className="text-[10px] font-black uppercase tracking-[.18em]">Profile attention</span></div>
      <div className="mt-2 flex items-end gap-2"><strong className="font-display text-3xl font-black">{summary.views_7d}</strong><span className="pb-1 text-xs font-bold text-white/45">views this week</span></div>
      <p className="mt-1 text-xs text-white/35">{summary.unique_viewers_30d} unique signed-in members viewed your profile in the last 30 days.</p>
    </div>
    <div className="flex min-w-36 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4">
      <FaArrowTrendUp className={delta >= 0 ? 'text-rcl-blue' : 'rotate-90 text-white/35'} />
      <span><strong className="block text-sm">{percent > 0 ? '+' : ''}{percent}%</strong><small className="text-[10px] font-black uppercase tracking-wider text-white/30">vs prior week</small></span>
    </div>
  </section>;
}

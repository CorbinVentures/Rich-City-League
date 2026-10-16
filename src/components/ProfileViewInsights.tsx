'use client';

import Link from 'next/link';
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

  if (!user || user.id !== profileId) return null;

  const delta = (summary?.views_7d ?? 0) - (summary?.views_prev_7d ?? 0);
  const percent = (summary?.views_prev_7d ?? 0) > 0
    ? Math.round((delta / (summary?.views_prev_7d ?? 1)) * 100)
    : (summary?.views_7d ?? 0) > 0 ? 100 : 0;

  return <section className="rcl-profile-attention mt-5 grid gap-3 sm:grid-cols-[1fr_auto]" aria-label="Profile attention statistics">
    <Link href="/professional" className="col-span-full flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[#477ea9] bg-[#143652] px-4 py-3 text-sm font-black text-[#eaf7ff] hover:border-[#91ceff]">
      <span>Professional Dashboard <small className="ml-2 text-xs font-medium text-[#c0e4ff]">Your 90-day reach and content insights</small></span>
      <span aria-hidden="true">→</span>
    </Link>
    {summary && <>
    <div className="rcl-profile-attention-primary rounded-2xl border border-rcl-blue/20 bg-rcl-blue/[.055] p-4">
      <div className="flex items-center gap-2 text-rcl-blue"><FaEye/><span className="text-[10px] font-black uppercase tracking-[.18em]">Profile attention</span></div>
      <div className="mt-2 flex items-end gap-2"><strong className="font-display text-3xl font-black">{summary.views_7d}</strong><span className="rcl-profile-attention-label pb-1 text-xs font-bold text-white/70">views this week</span></div>
      <p className="rcl-profile-attention-caption mt-1 text-xs text-white/75">{summary.unique_viewers_30d} unique signed-in members viewed your profile in the last 30 days.</p>
    </div>
    <div className="rcl-profile-attention-delta flex min-w-36 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4">
      <FaArrowTrendUp className={delta >= 0 ? 'text-rcl-blue' : 'rotate-90 text-white/35'} />
      <span><strong className="block text-sm">{percent > 0 ? '+' : ''}{percent}%</strong><small className="rcl-profile-attention-label text-[10px] font-black uppercase tracking-wider text-white/70">vs prior week</small></span>
    </div>
    </>}
  </section>;
}

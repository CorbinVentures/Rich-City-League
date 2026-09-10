'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';

type Leader = { profile_id: string; xp: number; level: number; profile?: { display_name: string | null; username: string | null } };
export default function LeaderboardsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []); const [leaders, setLeaders] = useState<Leader[]>([]);
  useEffect(() => { if (!supabase) return; const load = async () => { const { data } = await supabase.from('user_levels').select('*, profile:profiles(display_name,username)').order('xp', { ascending: false }).limit(50); setLeaders((data ?? []) as Leader[]); }; void load(); }, [supabase]);
  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="md" className="py-12"><p className="text-xs font-black tracking-[0.25em] text-rcl-gold">RCL RANKINGS</p><h1 className="mt-2 text-4xl font-black">Community leaderboard</h1><p className="mt-2 text-gray-400">Earn XP by showing up for the basketball community.</p><section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">{leaders.map((leader, index) => <div key={leader.profile_id} className="flex items-center gap-4 border-b border-white/10 p-5"><span className="w-8 text-2xl font-black text-rcl-gold">{index + 1}</span><div className="flex-1"><p className="font-bold">{leader.profile?.display_name ?? leader.profile?.username ?? 'RCL player'}</p><p className="text-xs uppercase tracking-widest text-gray-500">LEVEL {leader.level}</p></div><span className="font-black">{leader.xp.toLocaleString()} XP</span></div>)}{leaders.length === 0 && <p className="p-8 text-center text-gray-500">Leaderboard data will appear as the community levels up.</p>}</section></Container></main>;
}

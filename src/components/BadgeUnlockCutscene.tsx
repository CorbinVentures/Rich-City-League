'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaBolt, FaTrophy, FaXmark } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type Unlock = {
  awardId: string;
  badgeId: string;
  name: string;
  description: string | null;
  icon: string | null;
  tier: string | null;
  earnedAt: string;
};

type AwardRow = { id:string; badge_id:string; earned_at:string; badge?: { name?:string|null; description?:string|null; icon?:string|null; tier?:string|null } | null };

const STORAGE_PREFIX = 'rcl_seen_badge_unlocks_v1:';

export function BadgeUnlockCutscene() {
  const { user, profile } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [queue, setQueue] = useState<Unlock[]>([]);
  const [current, setCurrent] = useState<Unlock | null>(null);
  const playerIdRef = useRef<string | null>(null);

  const seenKey = user ? `${STORAGE_PREFIX}${user.id}` : '';
  const readSeen = useCallback(() => {
    if (!seenKey || typeof window === 'undefined') return new Set<string>();
    try { return new Set<string>(JSON.parse(window.localStorage.getItem(seenKey) || '[]')); }
    catch { return new Set<string>(); }
  }, [seenKey]);
  const markSeen = useCallback((awardId:string) => {
    if (!seenKey || typeof window === 'undefined') return;
    const seen = readSeen(); seen.add(awardId);
    window.localStorage.setItem(seenKey, JSON.stringify([...seen].slice(-200)));
  }, [readSeen, seenKey]);

  const pushUnlock = useCallback((unlock:Unlock) => {
    const seen = readSeen();
    if (seen.has(unlock.awardId)) return;
    markSeen(unlock.awardId);
    setQueue(items => items.some(item => item.awardId === unlock.awardId) ? items : [...items, unlock]);
  }, [markSeen, readSeen]);

  const hydrateAward = useCallback(async (award:{ id:string; badge_id:string; earned_at:string }) => {
    if (!supabase) return;
    const { data } = await supabase.from('badges').select('id,name,description,icon,tier').eq('id', award.badge_id).maybeSingle();
    if (!data) return;
    pushUnlock({ awardId:award.id, badgeId:award.badge_id, name:data.name, description:data.description, icon:data.icon, tier:data.tier, earnedAt:award.earned_at });
  }, [pushUnlock, supabase]);

  useEffect(() => {
    if (current || !queue.length) return;
    setCurrent(queue[0]);
    setQueue(items => items.slice(1));
  }, [current, queue]);

  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(() => setCurrent(null), 6500);
    return () => window.clearTimeout(timer);
  }, [current]);

  useEffect(() => {
    let active = true;
    if (!supabase || !user || !profile?.role) return;
    const client: NonNullable<typeof supabase> = supabase;
    const userId = user.id;
    const activeRole = profile.role;
    const db = client as any;

    async function bootstrap() {
      const seen = readSeen();
      let rows: AwardRow[] = [];
      let table = '';
      let filterColumn = '';
      let filterValue = userId;

      if (activeRole === 'player') {
        const { data: player } = await client.from('players').select('id').eq('profile_id', userId).eq('is_active', true).maybeSingle();
        if (!active || !player) return;
        playerIdRef.current = player.id;
        table = 'player_badges'; filterColumn = 'player_id'; filterValue = player.id;
      } else if (activeRole === 'coach') {
        table = 'coach_badges'; filterColumn = 'profile_id';
      } else {
        table = 'fan_badges'; filterColumn = 'profile_id';
      }

      const result = await db.from(table).select('id,badge_id,earned_at,badge:badges(name,description,icon,tier)').eq(filterColumn, filterValue).order('earned_at', { ascending:false }).limit(6);
      rows = (result.data ?? []) as AwardRow[];
      const unseen = rows.filter(row => !seen.has(row.id)).reverse();
      unseen.forEach(row => {
        const badge = row.badge;
        pushUnlock({ awardId:row.id, badgeId:row.badge_id, name:badge?.name ?? 'RCL Badge', description:badge?.description ?? null, icon:badge?.icon ?? null, tier:badge?.tier ?? null, earnedAt:row.earned_at });
      });

      const channel = client.channel(`rcl-badge-unlocks-${userId}`);
      if (activeRole === 'player' && playerIdRef.current) {
        channel.on('postgres_changes', { event:'INSERT', schema:'public', table:'player_badges', filter:`player_id=eq.${playerIdRef.current}` }, payload => void hydrateAward(payload.new as { id:string; badge_id:string; earned_at:string }));
      } else if (activeRole === 'coach') {
        channel.on('postgres_changes', { event:'INSERT', schema:'public', table:'coach_badges', filter:`profile_id=eq.${userId}` }, payload => void hydrateAward(payload.new as { id:string; badge_id:string; earned_at:string }));
      } else {
        channel.on('postgres_changes', { event:'INSERT', schema:'public', table:'fan_badges', filter:`profile_id=eq.${userId}` }, payload => void hydrateAward(payload.new as { id:string; badge_id:string; earned_at:string }));
      }
      channel.subscribe();
      return channel;
    }

    let liveChannel: ReturnType<typeof client.channel> | undefined;
    void bootstrap().then(channel => { liveChannel = channel; });
    return () => { active = false; if (liveChannel) void client.removeChannel(liveChannel); };
  }, [hydrateAward, profile?.role, pushUnlock, readSeen, supabase, user]);

  if (!current) return null;

  return <div className="fixed inset-0 z-[10000] grid place-items-center overflow-hidden bg-black/92 px-5 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={`Badge unlocked: ${current.name}`}>
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(255,79,22,.24),transparent_18%),radial-gradient(circle_at_50%_48%,rgba(21,159,255,.18),transparent_38%)]" />
    <div className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 animate-[spin_14s_linear_infinite] rounded-full border border-dashed border-rcl-blue/20" />
    <div className="pointer-events-none absolute left-1/2 top-1/2 h-[27rem] w-[27rem] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border border-rcl-orange/20" />
    <button type="button" onClick={() => setCurrent(null)} className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-white/45 hover:text-white" aria-label="Close badge unlock"><FaXmark/></button>
    <section className="relative w-full max-w-xl text-center">
      <p className="inline-flex items-center gap-2 rounded-full border border-rcl-orange/30 bg-rcl-orange/10 px-4 py-2 text-xs font-black uppercase tracking-[.28em] text-rcl-orange"><FaBolt/> Achievement unlocked</p>
      <div className="relative mx-auto mt-8 grid h-44 w-44 place-items-center rounded-[2.5rem] border border-rcl-orange/40 bg-[linear-gradient(145deg,rgba(255,79,22,.18),rgba(21,159,255,.10))] shadow-[0_0_90px_rgba(255,79,22,.24)]"><div className="absolute inset-3 rounded-[2rem] border border-white/10"/><span className="relative text-7xl drop-shadow-2xl">{current.icon || '🏆'}</span><span className="absolute -bottom-3 rounded-full border border-rcl-blue/30 bg-[#071522] px-4 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">{current.tier || 'RCL'} badge</span></div>
      <p className="mt-10 text-xs font-black uppercase tracking-[.35em] text-white/35">Badge unlocked</p><h2 className="mt-3 font-display text-5xl font-black uppercase leading-none sm:text-6xl">{current.name}</h2>{current.description&&<p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/52">{current.description}</p>}
      <div className="mx-auto mt-7 flex max-w-sm items-center justify-center gap-3 border-t border-white/10 pt-6 text-xs font-black uppercase tracking-wider text-white/35"><FaTrophy className="text-rcl-orange"/> Added to your RCL identity</div><button type="button" onClick={() => setCurrent(null)} className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-rcl-orange px-7 text-xs font-black uppercase tracking-wider text-black">Continue</button>
    </section>
  </div>;
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaBolt, FaTrophy, FaXmark } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { BadgeMedallion } from '@/components/BadgeMedallion';
import { getSupabaseClient } from '@/lib/supabase';
import {getSybBadgeConcept,SYB_AWARDABLE_BADGE_CODES} from '@/lib/syb-badges';
import styles from './BadgeUnlockCutscene.module.css';

type Unlock = {
  awardId: string;
  badgeId: string;
  name: string;
  description: string | null;
  icon: string | null;
  tier: string | null;
  earnedAt: string;
  brand?:'syb';
  code?:string;
  mark?:string;
  proof?: {event:string;court:string;opponent:string;score:string;result:'WIN'|'FINAL'};
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

  const hydrateSybAward=useCallback(async(award:{badge_code:string;earned_from_match_id:string;awarded_at:string})=>{
    const badge=getSybBadgeConcept(award.badge_code);
    if(!badge||!badge.awardable)return;
    let proof:Unlock['proof'];
    const db=supabase as any;
    try{
      if(db&&user?.id){
        const {data:match}=await db.from('run_ranked_matches')
          .select('run_id,home_roster,away_roster,home_score,away_score')
          .eq('id',award.earned_from_match_id).maybeSingle();
        if(match){
          const home=match.home_roster.includes(user.id);
          const ownScore=home?match.home_score:match.away_score;
          const opponentScore=home?match.away_score:match.home_score;
          const opponentId=home?match.away_roster[0]:match.home_roster[0];
          const [{data:event},{data:opponent}]=await Promise.all([
            db.from('runs').select('title,location').eq('id',match.run_id).maybeSingle(),
            opponentId?db.from('profiles').select('display_name,username').eq('id',opponentId).maybeSingle():Promise.resolve({data:null}),
          ]);
          proof={event:event?.title||'Official SYB 1v1',court:event?.location||'Verified court',
            opponent:opponent?.display_name||opponent?.username||'Circuit opponent',
            score:ownScore+'–'+opponentScore,result:ownScore>opponentScore?'WIN':'FINAL'};
        }
      }
    }catch{/* The verified badge still unlocks if its optional receipt details are unavailable. */}
    pushUnlock({awardId:'syb-run:'+badge.code,badgeId:badge.code,name:badge.name,description:badge.requirement,
      icon:badge.icon,tier:'gold',earnedAt:award.awarded_at,brand:'syb',code:badge.code,mark:badge.mark,proof});
  },[pushUnlock,supabase,user?.id]);

  useEffect(() => {
    if (current || !queue.length) return;
    setCurrent(queue[0]);
    setQueue(items => items.slice(1));
  }, [current, queue]);

  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(() => setCurrent(null), current.brand==='syb'?9000:6500);
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

      if(activeRole==='player'){
        const recentSince=new Date(Date.now()-48*60*60*1000).toISOString();
        const {data:runAwards}=await db.from('rch_run_badge_awards')
          .select('badge_code,earned_from_match_id,awarded_at').eq('profile_id',userId)
          .in('badge_code',SYB_AWARDABLE_BADGE_CODES).gte('awarded_at',recentSince)
          .order('awarded_at',{ascending:false}).limit(SYB_AWARDABLE_BADGE_CODES.length);
        if(!active)return;
        for(const award of [...(runAwards||[])].reverse())await hydrateSybAward(award as {badge_code:string;earned_from_match_id:string;awarded_at:string});
      }

      const channel = client.channel(`rcl-badge-unlocks-${userId}`);
      if (activeRole === 'player' && playerIdRef.current) {
        channel.on('postgres_changes', { event:'INSERT', schema:'public', table:'player_badges', filter:`player_id=eq.${playerIdRef.current}` }, payload => void hydrateAward(payload.new as { id:string; badge_id:string; earned_at:string }));
        channel.on('postgres_changes', { event:'INSERT', schema:'public', table:'rch_run_badge_awards', filter:`profile_id=eq.${userId}` }, payload => hydrateSybAward(payload.new as {badge_code:string;earned_from_match_id:string;awarded_at:string}));
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
  }, [hydrateAward, hydrateSybAward, profile?.role, pushUnlock, readSeen, supabase, user]);

  if (!current) return null;

  const sybUnlock=current.brand==='syb';
  return <div data-syb-badge={sybUnlock?current.code:undefined} className={'fixed inset-0 z-[10000] grid place-items-center overflow-hidden bg-black/92 px-5 backdrop-blur-xl '+(sybUnlock?styles.sybBackdrop:'')} role="dialog" aria-modal="true" aria-label={`${sybUnlock?'SYB circuit crest':'Badge'} unlocked: ${current.name}`}>
    <div className="pointer-events-none absolute inset-0" style={{backgroundImage:sybUnlock?'radial-gradient(circle_at_50%_48%,rgba(245,31,49,.25),transparent 18%),radial-gradient(circle_at_50%_48%,rgba(245,31,49,.15),transparent 38%)':'radial-gradient(circle_at_50%_48%,rgba(59,130,246,.24),transparent 18%),radial-gradient(circle_at_50%_48%,rgba(21,159,255,.18),transparent 38%)'}} />
    {sybUnlock&&<div aria-hidden="true" className={styles.sybCourt}/>}
    {sybUnlock&&<div aria-hidden="true" className={styles.sybSlash}/>}
    <div className={'pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 animate-[spin_14s_linear_infinite] rounded-full border border-dashed '+(sybUnlock?styles.sybOrbit:'border-rcl-blue/20')} />
    <div className={'pointer-events-none absolute left-1/2 top-1/2 h-[27rem] w-[27rem] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border '+(sybUnlock?styles.sybPulse:'border-rcl-orange/20')} />
    <button type="button" onClick={() => setCurrent(null)} className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-white/45 hover:text-white" aria-label="Close badge unlock"><FaXmark/></button>
    <section className={'relative max-h-[calc(100dvh-2.5rem)] w-full max-w-xl overflow-y-auto py-4 text-center '+(sybUnlock?styles.sybContent:'')}>
      <p className={'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[.28em] '+(sybUnlock?'border-[#f51f31]/35 bg-[#f51f31]/10 text-[#ff6571] '+styles.sybKicker:'border-rcl-orange/30 bg-rcl-orange/10 text-rcl-orange')}><FaBolt/> {sybUnlock?'SYB circuit crest unlocked':'Achievement unlocked'}</p>
      <div className={'relative mx-auto mt-8 flex justify-center '+(sybUnlock?styles.sybMedal:'')}><BadgeMedallion badge={current} size="lg" /></div>
      <p className={'mt-10 text-xs font-black uppercase tracking-[.35em] text-white/45 '+(sybUnlock?styles.sybProof:'')}>{sybUnlock?'Official 1v1 · verified result':'Badge unlocked'}</p><h2 className={'mt-3 font-display text-5xl font-black uppercase leading-none sm:text-6xl '+(sybUnlock?styles.sybName:'')}>{current.name}</h2>{current.description&&<p className={'mx-auto mt-4 max-w-md text-sm leading-6 text-white/65 '+(sybUnlock?styles.sybDescription:'')}>{current.description}</p>}
      {sybUnlock&&current.proof&&<div className={styles.sybReceipt} aria-label="Verified badge match receipt">
        <span><small>EVENT</small><b title={current.proof.event}>{current.proof.event}</b></span>
        <span><small>COURT</small><b title={current.proof.court}>{current.proof.court}</b></span>
        <span><small>OPPONENT</small><b title={current.proof.opponent}>{current.proof.opponent}</b></span>
        <span><small>{current.proof.result}</small><b>{current.proof.score}</b></span>
        <span><small>VERIFIED</small><b>{new Date(current.earnedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}</b></span>
      </div>}
      <div className={'mx-auto mt-7 flex max-w-sm items-center justify-center gap-3 border-t border-white/10 pt-6 text-xs font-black uppercase tracking-wider text-white/45 '+(sybUnlock?styles.sybProof:'')}><FaTrophy className={sybUnlock?'text-[#ff4b59]':'text-rcl-orange'}/> Added to your {sybUnlock?'SYB circuit record':'RCL identity'}</div><button type="button" onClick={() => setCurrent(null)} className={'mt-7 inline-flex min-h-12 items-center justify-center rounded-xl px-7 text-xs font-black uppercase tracking-wider '+(sybUnlock?'bg-[#f51f31] text-white '+styles.sybContinue:'bg-rcl-orange text-black')}>Continue</button>
    </section>
  </div>;
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaCrown, FaFire, FaLocationDot, FaMedal, FaTrophy } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { buildRunLeaderboardDisplay, runPlayerInitials, type RunLeaderboardEntry } from '@/lib/run-leaderboard-preview';

type RankScope = 'city' | 'state';
type Leader = RunLeaderboardEntry;

function RankAvatar({ name, src, size = 44 }: { name: string; src?: string | null; size?: number }) {
  return <span className="relative grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[#8c8c8c]/70 bg-[#2f2f2f] font-black text-[#e8e8e8]" style={{width:size,height:size}}>
    {src ? <Image src={src} width={size} height={size} unoptimized alt="" className="h-full w-full object-cover" /> : <span className="text-sm">{runPlayerInitials(name)}</span>}
  </span>;
}
const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);
function statLabel(value: number | string) { return toNumber(value).toFixed(1); }

export function RunArenaLeaderboard() {
  const { user } = useAuth();
  const db = useMemo(() => getSupabaseClient() as any, []);
  const [scope, setScope] = useState<RankScope>('state');
  const [city, setCity] = useState('Richmond');
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loadingRanks, setLoadingRanks] = useState(true);
  const [ranksUnavailable, setRanksUnavailable] = useState(false);
  const [profile, setProfile] = useState<{display_name: string | null; username: string | null; avatar_url: string | null; location: string | null} | null>(null);
  const [level, setLevel] = useState<{xp: number; level: number; current_streak: number} | null>(null);

  const fetchRanks = useCallback(async () => {
    if (!db) { setLeaders([]); setRanksUnavailable(true); setLoadingRanks(false); return; }
    setLoadingRanks(true);
    const { data, error } = await db.rpc('get_rch_verified_run_box_score_leaderboard', { p_scope: scope, p_city: city, p_limit: 30 });
    if (!error) { setLeaders((data ?? []) as Leader[]); setRanksUnavailable(false); }
    else { setLeaders([]); setRanksUnavailable(true); }
    setLoadingRanks(false);
  }, [db, scope, city]);

  useEffect(() => { void fetchRanks(); }, [fetchRanks]);

  useEffect(() => {
    if (!db || !user?.id) { setProfile(null); setLevel(null); return; }
    let cancelled = false;
    void (async () => {
      const [p, l] = await Promise.all([
        db.from('profiles').select('display_name,username,avatar_url,location').eq('id', user.id).maybeSingle(),
        db.from('user_levels').select('xp,level,current_streak').eq('profile_id',user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      if (!p.error && p.data) {
        setProfile(p.data);
        const personalCity = String(p.data.location || '').split(',')[0].trim();
        if (personalCity && personalCity.length <= 40 && /^[a-z .'-]+$/i.test(personalCity)) setCity(personalCity);
      }
      if (!l.error) setLevel(l.data);
    })();
    return () => { cancelled = true; };
  }, [db, user?.id]);

  const myName = profile?.display_name || profile?.username || 'Your RCH Player';
  const myWins = leaders.find(entry=>entry.profile_id===user?.id)?.wins ?? 0;
  const ranked = useMemo(() => buildRunLeaderboardDisplay(leaders, scope, city), [leaders, scope, city]);
  const demoCount = ranked.filter(entry => entry.isDemo).length;
  const shown = showAll ? ranked : ranked.slice(0,6);

  return <>
    <section className="rch-arena-profile rounded-[22px] border border-[#4d4d4d]/65 p-4 sm:p-5" aria-label="My basketball REP">
      <div className="rch-arena-profile-layout">
        <div className="rch-arena-person">
          <RankAvatar name={myName} src={profile?.avatar_url} size={62}/>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#b3b3b3]">{user ? 'Your Court Reputation' : 'Join the RCH community'}</p>
            <p className="mt-1 truncate text-lg font-black text-white">{user ? myName : 'Build your basketball identity'}</p>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#d3d3d3]"><FaCrown className="text-[#cdcdcd]"/> {user ? 'LEVEL ' + (level?.level ?? 1) : 'Sign in to earn REP'}</span>
          </div>
        </div>
        <div className="rch-arena-metrics">
          <div className="rch-arena-metric"><FaFire className="mx-auto text-gray-400"/><p className="mt-1 text-lg font-black text-white">{level?.current_streak ?? 0}</p><span className="text-[10px] text-[#bcbcbc]">Streak</span></div>
          <div className="rch-arena-metric"><FaTrophy className="mx-auto text-[#cdcdcd]"/><p className="mt-1 text-lg font-black text-white">{myWins}</p><span className="text-[10px] text-[#bcbcbc]">Ranked wins</span></div>
          <div className="rch-arena-metric"><FaMedal className="mx-auto text-[#a8a8a8]"/><p className="mt-1 text-lg font-black text-white">{level?.xp ?? 0}</p><span className="text-[10px] text-[#bcbcbc]">REP</span></div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#525252]/50 pt-3">
        <p className="text-[11px] font-medium text-[#cbcbcb]">{user ? 'Your participation builds your RCH reputation' : 'Join real runs and earn REP'}</p>
        <Link href="/badges" className="text-[11px] font-bold text-[#b0b0b0]">See badges →</Link>
      </div>
    </section>

    <section className="rch-arena-panel mt-4 min-w-0 rounded-[22px] border border-[#484848]/80 p-3 sm:p-5" aria-labelledby="rch-run-rank-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="rch-run-rank-title" className="text-[clamp(1.35rem,5vw,1.9rem)] font-black leading-tight tracking-tight text-white">
            Runs <span className="text-[#8a8a8a]">Leaderboard</span>
          </h2>
          <p className="mt-1 text-xs font-semibold text-[#bebebe]">
            {demoCount>0 ? 'Sample preview · Official box scores take the lead' : 'Official box scores from reviewed matches'}
          </p>
        </div>
        <div className="inline-flex shrink-0 rounded-full border border-[#535353] bg-[#151515] p-1 text-xs font-bold" role="group" aria-label="Leaderboard scope">
          {(['state','city'] as const).map(value=><button type="button" key={value}
            onClick={()=>{setScope(value);setShowAll(false);}}
            className={'min-h-10 min-w-[70px] rounded-full px-4 transition sm:min-w-[88px] '+(scope===value?'bg-[#767676] text-white shadow-[0_0_15px_rgba(45,148,255,.25)]':'text-[#cacaca] hover:text-white')}
            aria-pressed={scope===value}>{value==='city'?'City':'State'}</button>)}
        </div>
      </div>
      {scope==='city' && <label className="mt-3 flex items-center gap-2 text-xs text-[#c8c8c8]"><FaLocationDot/>
        <span>City</span>
        <input className="min-h-9 w-36 rounded-lg border border-[#585858] bg-[#131313] px-3 text-sm text-white outline-none focus:border-[#a2a2a2]" value={city} maxLength={40} onChange={e=>setCity(e.target.value)} placeholder="Richmond"/>
      </label>}

      {!loadingRanks && <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-[#d1d1d1]" aria-live="polite">
        <span><span className="text-[#bebebe]">●</span> {leaders.length} verified player{leaders.length===1?'':'s'}</span>
        {demoCount>0 && <span><span className="text-[#d0d0d0]">◇</span> {demoCount} sample player{demoCount===1?'':'s'}</span>}
      </div>}
      {ranksUnavailable && !loadingRanks && <p role="status" className="mt-3 rounded-lg border border-[#676767] bg-[#292929]/60 p-3 text-xs text-[#dddddd]">Live verified rankings are temporarily unavailable. The players shown below are examples only.</p>}
      {loadingRanks ? <p className="py-8 text-center text-sm text-[#b5b5b5]">Loading the rankings…</p> : <ol className="mt-4 space-y-3" aria-label="Competitive Runs player rankings">
        {shown.map((entry,index)=><li key={entry.profile_id} className={'rch-run-rank-card '+(index===0?'rch-run-rank-card-first ':'')+(entry.isDemo?'rch-run-rank-card-sample':'rch-run-rank-card-verified')}>
          <div className="rch-run-rank-identity">
            <span className={'rch-run-rank-place '+(index===0?'rch-run-rank-gold':index===1?'rch-run-rank-silver':index===2?'rch-run-rank-bronze':'rch-run-rank-regular')} aria-label={`Rank ${index+1}`}>{index+1}</span>
            <RankAvatar name={entry.player_name} src={entry.avatar_url} size={44}/>
            <div className="rch-run-rank-details">
              <p className="rch-run-rank-name" title={entry.player_name}>{entry.player_name}</p>
              <span className={'rch-run-rank-status '+(entry.isDemo?'rch-run-rank-status-sample':'rch-run-rank-status-verified')}>{entry.isDemo?'Sample':'Verified'}</span>
              <p className="rch-run-rank-location" title={`${entry.city}, VA · ${entry.games} games`}>{entry.city}, VA · {entry.games} game{entry.games===1?'':'s'}</p>
            </div>
          </div>
          <div className="rch-run-rank-stats" aria-label={`${entry.player_name} basketball statistics`}>
            {[[statLabel(entry.ppg),'PPG'],[statLabel(entry.apg),'APG'],[statLabel(entry.rpg),'RPG'],[String(entry.wins),'W']].map(([value,label])=><div key={label} className="rch-run-rank-stat">
              <strong>{value}</strong><span>{label}</span>
            </div>)}
          </div>
        </li>)}
      </ol>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/runs?view=list#rch-upcoming-runs" className="rch-arena-add-stats inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6e6e6e] to-[#959595] px-4 text-sm font-black text-white shadow-[0_4px_18px_rgba(32,145,255,.27)]"><FaArrowRight/> Find a Live Run</Link>
        {ranked.length>6 && <button type="button" className="min-h-11 rounded-xl border border-[#585858] px-4 text-xs font-semibold text-[#dedede]" onClick={()=>setShowAll(x=>!x)}>{showAll?'Top six':'Full leaderboard'}</button>}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[#a7a7a7]">Box scores are imported from the Run Game Mode and enter this board only after the match and player stats receive independent review. Sample players are fictional previews and do not earn REP or count as official results.</p>
    </section>
  </>;
}

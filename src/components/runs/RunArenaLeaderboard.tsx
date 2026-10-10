'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaBasketball, FaChartSimple, FaCircleCheck, FaCrown, FaFire, FaLocationDot, FaMedal, FaTrophy, FaXmark } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { buildRunLeaderboardDisplay, type RunLeaderboardEntry } from '@/lib/run-leaderboard-preview';

type RankScope = 'city' | 'state';
type Leader = RunLeaderboardEntry;
type EligibleRun = { id: string; title: string; starts_at: string; location: string; host_id: string };
type ReviewRow = { id: string; run_id: string; profile_id: string; points: number; rebounds: number; assists: number; won: boolean; name: string; run_title: string };
type MySubmission = { run_id: string; review_status: string };
const emptyScore = { run: '', points: '0', rebounds: '0', assists: '0', won: false };

function RankAvatar({ name, src, size = 44 }: { name: string; src?: string | null; size?: number }) {
  return <span className="relative grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[#4196ff]/70 bg-[#123358] font-black text-[#d8eaff]" style={{width:size,height:size}}>
    {src ? <Image src={src} width={size} height={size} unoptimized alt="" className="h-full w-full object-cover" /> : <span className="text-sm">{name.slice(0,2).toUpperCase()}</span>}
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
  const [statsOpen, setStatsOpen] = useState(false);
  const [profile, setProfile] = useState<{display_name: string | null; username: string | null; avatar_url: string | null; location: string | null} | null>(null);
  const [level, setLevel] = useState<{xp: number; level: number; current_streak: number} | null>(null);
  const [myRuns, setMyRuns] = useState<EligibleRun[]>([]);
  const [mySubmissions, setMySubmissions] = useState<MySubmission[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [score, setScore] = useState(emptyScore);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);

  const fetchRanks = useCallback(async () => {
    if (!db) { setLeaders([]); setRanksUnavailable(true); setLoadingRanks(false); return; }
    setLoadingRanks(true);
    const { data, error } = await db.rpc('get_competitive_run_leaderboard', { p_scope: scope, p_city: city, p_limit: 30 });
    if (!error) { setLeaders((data ?? []) as Leader[]); setRanksUnavailable(false); }
    else { setLeaders([]); setRanksUnavailable(true); }
    setLoadingRanks(false);
  }, [db, scope, city]);

  useEffect(() => { void fetchRanks(); }, [fetchRanks, reload]);

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

  useEffect(() => {
    if (!statsOpen || !db || !user?.id) return;
    let cancelled = false;
    void (async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30*86400000).toISOString();
      const [joined, hosted, checked, mine] = await Promise.all([
        db.from('run_players').select('run_id').eq('profile_id',user.id).limit(200),
        db.from('runs').select('id,title,starts_at,location,host_id').eq('host_id',user.id).eq('run_type','competitive').lte('starts_at',now.toISOString()).gte('starts_at',thirtyDaysAgo).limit(100),
        db.from('run_checkins').select('run_id').eq('profile_id',user.id).limit(200),
        db.from('run_competitive_box_scores').select('run_id,review_status').eq('profile_id',user.id).limit(100),
      ]);
      const joinedIds = [...new Set(((joined.data ?? []) as Array<{run_id: string}>).map(x=>x.run_id))];
      const eligibleResult = joinedIds.length ? await db.from('runs')
        .select('id,title,starts_at,location,host_id')
        .in('id',joinedIds).eq('run_type','competitive').neq('status','cancelled')
        .lte('starts_at',now.toISOString()).gte('starts_at',thirtyDaysAgo).limit(100)
        : {data:[],error:null};
      const eligible = (eligibleResult.data ?? []) as EligibleRun[];
      const hostedRuns = (hosted.data ?? []) as EligibleRun[];
      const checkedIds = new Set(((checked.data ?? []) as Array<{run_id:string}>).map(x=>x.run_id));
      const reviewRunIds = [...new Set([...hostedRuns.map(x=>x.id),...checkedIds])];
      const reviewResult = reviewRunIds.length ? await db.from('run_competitive_box_scores')
        .select('id,run_id,profile_id,points,rebounds,assists,won')
        .eq('review_status','pending').in('run_id',reviewRunIds).limit(60)
        : {data:[],error:null};
      const possible = ((reviewResult.data ?? []) as ReviewRow[]).filter(x =>
        x.profile_id !== user.id &&
        (hostedRuns.some(run => run.id === x.run_id) ||
          (checkedIds.has(x.run_id) && eligible.some(run => run.id === x.run_id && run.host_id === x.profile_id)))
      );
      const users = [...new Set(possible.map(x=>x.profile_id))];
      const namesResult = users.length ? await db.from('profiles').select('id,display_name,username').in('id',users)
        : {data:[],error:null};
      const names = new Map<string,string>(((namesResult.data ?? []) as Array<{id:string;display_name:string|null;username:string|null}>)
        .map(x=>[x.id,x.display_name||x.username||'Player']));
      const titles = new Map([...eligible,...hostedRuns].map(x=>[x.id,x.title]));
      if (!cancelled) {
        setMyRuns(eligible);
        setMySubmissions((mine.data ?? []) as MySubmission[]);
        setReviews(possible.map(x=>({...x,name:names.get(x.profile_id)||'Player',run_title:titles.get(x.run_id)||'Competitive run'})));
      }
    })();
    return () => { cancelled = true; };
  }, [statsOpen, db, user?.id, reload]);

  async function submitStats(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !user) { setMessage('Sign in to submit a box score.'); return; }
    if (!score.run) { setMessage('Choose a completed competitive run.'); return; }
    setBusy(true);
    setMessage('');
    const {error} = await db.rpc('submit_competitive_run_stats',{
      p_run:score.run,
      p_points:Number(score.points),
      p_rebounds:Number(score.rebounds),
      p_assists:Number(score.assists),
      p_won:score.won,
    });
    if (error) setMessage(error.message);
    else { setMessage('Box score submitted. It will appear on the leaderboard after independent verification.'); setScore(emptyScore); setReload(x=>x+1); }
    setBusy(false);
  }

  async function reviewScore(id:string, approve:boolean) {
    if (!db) return;
    setBusy(true);
    setMessage('');
    const {error}=await db.rpc('review_competitive_run_stats',{p_submission:id,p_approve:approve});
    if (error) setMessage(error.message);
    else { setMessage(approve ? 'Stats verified and added to the leaderboard.' : 'Stats rejected. The player may correct and resubmit.'); setReload(x=>x+1); }
    setBusy(false);
  }

  const myName = profile?.display_name || profile?.username || 'Your RCH Player';
  const myWins = leaders.find(entry=>entry.profile_id===user?.id)?.wins ?? 0;
  const ranked = useMemo(() => buildRunLeaderboardDisplay(leaders, scope, city), [leaders, scope, city]);
  const demoCount = ranked.filter(entry => entry.isDemo).length;
  const shown = showAll ? ranked : ranked.slice(0,3);

  return <>
    <section className="rch-arena-profile rounded-[22px] border border-[#235486]/65 p-4 sm:p-5" aria-label="My basketball REP">
      <div className="rch-arena-profile-layout">
        <div className="rch-arena-person">
          <RankAvatar name={myName} src={profile?.avatar_url} size={62}/>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#8cb9ef]">{user ? 'Your Court Reputation' : 'Join the RCH community'}</p>
            <p className="mt-1 truncate text-lg font-black text-white">{user ? myName : 'Build your basketball identity'}</p>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#b2d9ff]"><FaCrown className="text-[#facc59]"/> {user ? 'LEVEL ' + (level?.level ?? 1) : 'Sign in to earn REP'}</span>
          </div>
        </div>
        <div className="rch-arena-metrics">
          <div className="rch-arena-metric"><FaFire className="mx-auto text-orange-400"/><p className="mt-1 text-lg font-black text-white">{level?.current_streak ?? 0}</p><span className="text-[10px] text-[#a6c0db]">Streak</span></div>
          <div className="rch-arena-metric"><FaTrophy className="mx-auto text-[#facc59]"/><p className="mt-1 text-lg font-black text-white">{myWins}</p><span className="text-[10px] text-[#a6c0db]">Ranked wins</span></div>
          <div className="rch-arena-metric"><FaMedal className="mx-auto text-[#56b7ff]"/><p className="mt-1 text-lg font-black text-white">{level?.xp ?? 0}</p><span className="text-[10px] text-[#a6c0db]">REP</span></div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#335779]/50 pt-3">
        <p className="text-[11px] font-medium text-[#b6cee9]">{user ? 'Your participation builds your RCH reputation' : 'Join real runs and earn REP'}</p>
        <Link href="/badges" className="text-[11px] font-bold text-[#72baff]">See badges →</Link>
      </div>
    </section>

    <section className="rch-arena-panel mt-4 rounded-[22px] border border-[#234e78]/80 p-4 sm:p-5" aria-labelledby="rch-run-rank-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="rch-run-rank-title" className="flex items-center gap-2 text-xl font-black tracking-tight text-white"><FaCrown className="text-[#f5cf69]"/> Leaderboard</h2>
          <p className="mt-1 text-xs leading-5 text-[#a3bad5]">Verified competitive Open Run stats plus a sample rankings preview</p>
        </div>
        <div className="rch-arena-rank-tabs inline-flex rounded-full border border-[#2e587f] bg-[#071322] p-1 text-xs font-bold" role="group" aria-label="Leaderboard scope">
          {(['city','state'] as const).map(value=><button type="button" key={value}
            onClick={()=>{setScope(value);setShowAll(false);}}
            className={'rounded-full px-4 py-2 transition '+(scope===value?'bg-[#268dff] text-white shadow-[0_0_15px_rgba(45,148,255,.4)]':'text-[#b9cce2]')}
            aria-pressed={scope===value}>{value==='city'?'City':'State'}</button>)}
        </div>
      </div>
      {scope==='city' && <label className="mt-3 flex items-center gap-2 text-xs text-[#b4cbe5]"><FaLocationDot/>
        <span>City</span>
        <input className="min-h-9 w-36 rounded-lg border border-[#315e8e] bg-[#071526] px-3 text-sm text-white outline-none focus:border-[#55b0ff]" value={city} maxLength={40} onChange={e=>setCity(e.target.value)} placeholder="Richmond"/>
      </label>}

      {!loadingRanks && <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-[#bbd5f1]" aria-live="polite">
        <span><span className="text-[#6ed8ac]">●</span> {leaders.length} verified player{leaders.length===1?'':'s'}</span>
        {demoCount>0 && <span><span className="text-[#f5cf69]">◇</span> {demoCount} sample player{demoCount===1?'':'s'}</span>}
      </div>}
      {ranksUnavailable && !loadingRanks && <p role="status" className="mt-3 rounded-lg border border-[#876334] bg-[#392710]/60 p-3 text-xs text-[#f9dba5]">Live verified rankings are temporarily unavailable. The players shown below are examples only.</p>}
      {loadingRanks ? <p className="py-8 text-center text-sm text-[#9eb8d6]">Loading the rankings…</p> : <div className="mt-4 space-y-2">
        {shown.map((entry,index)=><div key={entry.profile_id} className={'flex flex-wrap items-center gap-3 rounded-xl border p-3 '+(entry.isDemo?'border-[#355272] bg-[#11243b]/70':'border-[#266b9f] bg-[#102e4e]/90')}>
          <span className={'grid size-8 shrink-0 place-items-center rounded-lg font-black '+(index===0?'bg-[#f1c55a] text-[#112039]':index===1?'bg-[#becde2] text-[#112039]':index===2?'bg-[#d7a173] text-[#112039]':'bg-[#204669] text-white')}>{index+1}</span>
          <RankAvatar name={entry.player_name} src={entry.avatar_url} size={42}/>
          <div className="min-w-[125px] flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-black text-white">{entry.player_name}</p>
              {entry.isDemo ? <span className="shrink-0 rounded-md border border-[#90733b] bg-[#584522]/50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#f5dc9b]">Sample</span>
                : <span className="shrink-0 rounded-md border border-[#31856a] bg-[#153f35] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#9df1d2]">Verified</span>}
            </div>
            <p className="mt-1 truncate text-xs text-[#a5bad2]">{entry.city}, VA · {entry.games} game{entry.games===1?'':'s'}</p>
          </div>
          <div className="grid min-w-[150px] flex-1 grid-cols-4 gap-2 text-center sm:max-w-sm">
            {[[statLabel(entry.ppg),'PPG'],[statLabel(entry.apg),'APG'],[statLabel(entry.rpg),'RPG'],[String(entry.wins),'W']].map(([value,label])=><div key={label}><p className="text-sm font-black text-[#56b1ff]">{value}</p><span className="text-[10px] text-[#b2cbe4]">{label}</span></div>)}
          </div>
        </div>)}
      </div>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={()=>{setStatsOpen(true);setMessage('');}} className="rch-arena-add-stats inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#167aff] to-[#32a8ff] px-4 text-sm font-black text-white shadow-[0_4px_18px_rgba(32,145,255,.27)]"><FaChartSimple/> Add Stats <FaArrowRight/></button>
        {ranked.length>3 && <button type="button" className="min-h-11 rounded-xl border border-[#355e8a] px-4 text-xs font-semibold text-[#cce1f5]" onClick={()=>setShowAll(x=>!x)}>{showAll?'Top three':'Full leaderboard'}</button>}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[#90abc8]">Verified players always take the top spots as their stats are approved. Sample players are fictional previews only: they do not earn REP or count as official results.</p>
    </section>

    {statsOpen && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#02060b]/90 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Submit and review competitive stats">
      <div className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-[#2c537d] bg-[#091726] p-5 text-white sm:rounded-3xl sm:p-6">
        <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#76baff]">My competitive record</p><h2 className="mt-1 text-2xl font-black text-white">Add Game Stats</h2></div><button type="button" aria-label="Close stats form" onClick={()=>{setStatsOpen(false);setMessage('');}} className="grid size-10 place-items-center rounded-full border border-[#355574]"><FaXmark/></button></div>
        <p className="mt-3 text-sm leading-6 text-[#bacde1]">Submit points, rebounds, assists and a win/loss result from a competitive run you joined. The host must verify it; hosts need an independent checked-in participant.</p>
        {!user ? <Link href="/auth/sign-in?next=%2Fruns" className="mt-5 inline-flex rounded-xl bg-[#258aff] px-5 py-3 font-bold text-white">Sign in to submit stats</Link> : <>
          <form onSubmit={e=>void submitStats(e)} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-[#d8e9fb]">Completed run
              <select value={score.run} onChange={e=>setScore(x=>({...x,run:e.target.value}))} className="mt-2 min-h-11 w-full rounded-xl border border-[#34577c] bg-[#07111e] px-3 text-sm text-white">
                <option value="">Choose a completed run</option>
                {myRuns.map(run=><option value={run.id} key={run.id}>{run.title} · {new Date(run.starts_at).toLocaleDateString()}</option>)}
              </select>
            </label>
            {!myRuns.length && <p className="rounded-xl border border-[#355474] p-3 text-xs leading-5 text-[#b6d4f1]">No eligible completed competitive runs yet. Join or host a competitive run first, then add stats afterward.</p>}
            {score.run && mySubmissions.some(x=>x.run_id===score.run) && <p className="text-xs text-[#a6d5ff]">Current status: {mySubmissions.find(x=>x.run_id===score.run)?.review_status}. Verified scores cannot be changed.</p>}
            <div className="grid grid-cols-3 gap-3">
              {(['points','rebounds','assists'] as const).map(field=><label key={field} className="text-xs font-semibold capitalize text-[#bfd7f0]">{field}
                <input type="number" min={0} max={field==='points'?100:field==='rebounds'?40:35} required value={score[field]}
                  onChange={e=>setScore(x=>({...x,[field]:e.target.value}))} className="mt-2 min-h-11 w-full rounded-xl border border-[#34577c] bg-[#07111e] px-3 text-base text-white"/>
              </label>)}
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-[#355474] p-3 text-sm text-[#d0e4fa]"><input type="checkbox" checked={score.won} onChange={e=>setScore(x=>({...x,won:e.target.checked}))} className="size-4 accent-[#258aff]"/> Our team won this run</label>
            <button disabled={busy||!myRuns.length||!score.run} className="min-h-12 w-full rounded-xl bg-[#258aff] px-4 font-black text-white disabled:opacity-45">{busy?'Saving…':'Submit for verification'}</button>
          </form>
          {reviews.length>0 && <section className="mt-7 border-t border-[#355474] pt-5"><h3 className="font-black text-white">Verify player stats</h3><p className="mt-1 text-xs text-[#abc6df]">Independent review is required before scores affect rankings.</p>
            <div className="mt-3 space-y-2">{reviews.map(row=><div key={row.id} className="rounded-xl border border-[#355474] bg-[#0d2338] p-3">
              <p className="text-sm font-bold text-white">{row.name} · {row.run_title}</p>
              <p className="mt-1 text-xs text-[#b4cfe5]">{row.points} PTS · {row.rebounds} REB · {row.assists} AST · {row.won?'Win':'Loss'}</p>
              <div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={()=>void reviewScore(row.id,true)} className="rounded-lg bg-[#247fed] px-3 py-2 text-xs font-bold text-white"><FaCircleCheck className="mr-1 inline"/> Confirm</button>
                <button type="button" disabled={busy} onClick={()=>void reviewScore(row.id,false)} className="rounded-lg border border-[#45627e] px-3 py-2 text-xs font-semibold text-white">Reject</button></div>
            </div>)}</div>
          </section>}
        </>}
        {message && <p role="status" className="mt-4 rounded-xl border border-[#3779c2] bg-[#173253] p-3 text-sm text-[#e6f2ff]">{message}</p>}
        <button type="button" className="mt-5 w-full rounded-xl border border-[#355474] px-4 py-3 text-sm font-semibold text-[#d0dfea]" onClick={()=>setStatsOpen(false)}>Done</button>
      </div>
    </div>}
  </>;
}

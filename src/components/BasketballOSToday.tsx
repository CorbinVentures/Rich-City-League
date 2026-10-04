'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaArrowRight,
  FaBasketball,
  FaBolt,
  FaChartLine,
  FaCircleCheck,
  FaCrown,
  FaFire,
  FaLocationDot,
  FaMedal,
  FaPeopleGroup,
  FaPlay,
  FaTrophy,
} from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ClientPageHero } from '@/components/ClientPageHero';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type Mission = {
  id: string;
  mission_key: string;
  title: string;
  description: string;
  event_type: string;
  rep_dimension: RepDimension;
  target_count: number;
  reward_xp: number;
  icon: string | null;
  sort_order: number;
};

type Progress = {
  mission_id: string;
  progress: number;
  completed_at: string | null;
  claimed_at: string | null;
};

type RepDimension = 'hooper' | 'community' | 'creator' | 'coach' | 'reliability';

type RepSummary = {
  total_xp: number;
  level: number;
  status_label: string;
  hooper_xp: number;
  community_xp: number;
  creator_xp: number;
  coach_xp: number;
  reliability_xp: number;
};

type UpcomingGame = {
  id: string;
  scheduled_at: string;
  status: string;
  home_score: number;
  away_score: number;
  home?: { name?: string | null; short_name?: string | null } | null;
  away?: { name?: string | null; short_name?: string | null } | null;
};

type Run = {
  id: string;
  title: string;
  court_name: string;
  location: string;
  starts_at: string;
  skill_level: string;
  max_players: number;
};

type Highlight = {
  id: string;
  title: string;
  category: string;
  clip_url: string | null;
  thumbnail_url: string | null;
  player?: { first_name?: string | null; last_name?: string | null } | null;
};

const dimensionMeta: Array<{ key: RepDimension; label: string; blurb: string }> = [
  { key: 'hooper', label: 'Hooper', blurb: 'Games, stats and player development' },
  { key: 'community', label: 'Community', blurb: 'Participation and conversation' },
  { key: 'creator', label: 'Creator', blurb: 'Posts, media and highlights' },
  { key: 'coach', label: 'Coach', blurb: 'Scouting and basketball leadership' },
  { key: 'reliability', label: 'Reliability', blurb: 'Runs, check-ins and showing up' },
];

const quickLinks = [
  { href: '/games', label: 'Game Night', detail: 'Scores, live action and box scores', icon: FaBasketball },
  { href: '/runs', label: 'Find a Run', detail: 'Richmond court network', icon: FaLocationDot },
  { href: '/pickem', label: 'Pick’em', detail: 'Call upcoming RCL games', icon: FaTrophy },
  { href: '/players/compare', label: 'Compare', detail: 'Put player profiles side-by-side', icon: FaChartLine },
  { href: '/legacy', label: 'Legacy', detail: 'History, seasons and Hall of Fame', icon: FaCrown },
];

function prettyDate(value: string) {
  return new Date(value).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
}

export function BasketballOSToday() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(true), []);
  const db = supabase as any;
  const [missions, setMissions] = useState<Mission[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [rep, setRep] = useState<RepSummary | null>(null);
  const [games, setGames] = useState<UpcomingGame[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!db) { setLoading(false); return; }
    setLoading(true);
    setError('');
    const now = new Date().toISOString();
    const weekStart = new Date();
    const day = weekStart.getUTCDay();
    const delta = day === 0 ? 6 : day - 1;
    weekStart.setUTCDate(weekStart.getUTCDate() - delta);
    weekStart.setUTCHours(0, 0, 0, 0);
    const week = weekStart.toISOString().slice(0, 10);

    const [missionsResult, gamesResult, runsResult, highlightsResult] = await Promise.all([
      db.from('weekly_missions').select('id,mission_key,title,description,event_type,rep_dimension,target_count,reward_xp,icon,sort_order').eq('is_active', true).order('sort_order'),
      db.from('games').select('id,scheduled_at,status,home_score,away_score,home:teams!games_home_team_id_fkey(name,short_name),away:teams!games_away_team_id_fkey(name,short_name)').in('status', ['scheduled', 'live']).gte('scheduled_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()).order('scheduled_at').limit(4),
      db.from('runs').select('id,title,court_name,location,starts_at,skill_level,max_players').neq('status', 'cancelled').gte('starts_at', now).order('starts_at').limit(3),
      db.from('player_highlights').select('id,title,category,clip_url,thumbnail_url,player:players(first_name,last_name)').eq('status', 'published').order('created_at', { ascending: false }).limit(3),
    ]);

    if (missionsResult.error) setError('Missions could not be loaded.');
    setMissions((missionsResult.data ?? []) as Mission[]);
    setGames((gamesResult.data ?? []) as UpcomingGame[]);
    setRuns((runsResult.data ?? []) as Run[]);
    setHighlights((highlightsResult.data ?? []) as Highlight[]);

    if (user) {
      const [progressResult, repResult] = await Promise.all([
        db.from('mission_progress').select('mission_id,progress,completed_at,claimed_at').eq('profile_id', user.id).eq('week_start', week),
        db.from('rep_dimension_summary').select('*').eq('profile_id', user.id).maybeSingle(),
      ]);
      setProgress((progressResult.data ?? []) as Progress[]);
      setRep((repResult.data ?? null) as RepSummary | null);
    } else {
      setProgress([]);
      setRep(null);
    }
    setLoading(false);
  }, [db, user]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('rcl-today-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_progress' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_highlights' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, supabase]);

  const progressByMission = useMemo(() => new Map(progress.map((item) => [item.mission_id, item])), [progress]);
  const nextGame = games[0];
  const nextRun = runs[0];
  const completed = missions.filter((mission) => (progressByMission.get(mission.id)?.progress ?? 0) >= mission.target_count).length;

  const claimMission = async (mission: Mission) => {
    if (!db || !user || busy) return;
    setBusy(mission.id); setNotice(''); setError('');
    const { data, error: claimError } = await db.rpc('claim_weekly_mission', { target_mission: mission.id });
    if (claimError) setError(claimError.message);
    else setNotice(Number(data ?? 0) > 0 ? `+${Number(data)} REP claimed from ${mission.title}.` : `${mission.title} was already claimed.`);
    setBusy(null);
    await load();
  };

  return <main className="min-h-screen bg-[#03070d] pb-28 text-white">
    <ClientPageHero
      eyebrow="RCL Basketball OS"
      title="Today in RCL"
      accent={rep ? `${rep.status_label} · Level ${rep.level}` : 'Your basketball world'}
      description="One personalized command center for tonight’s games, your REP, weekly missions, runs, highlights and everything moving across Rich City League."
      assetKey="social.cover"
      actions={<div className="flex flex-wrap gap-2"><Link href="/social" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-wider text-black">Open social <FaArrowRight /></Link><Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 px-4 text-xs font-black uppercase tracking-wider">My career</Link></div>}
      meta={<div className="min-w-52 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 p-5 shadow-xl backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">Your REP</p><p className="mt-1 font-display text-4xl font-black">{rep?.total_xp ?? 0}</p><p className="mt-2 text-xs text-white/40">{user ? `${completed}/${missions.length || 6} weekly missions complete` : 'Sign in to activate your REP board'}</p></div>}
    />

    <Container maxWidth="xl" className="py-8 sm:py-12">
      {notice && <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] px-5 py-4 text-sm font-semibold text-emerald-100">{notice}</div>}
      {error && <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/[.06] px-5 py-4 text-sm text-red-100">{error}</div>}

      <section className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <article className="overflow-hidden rounded-3xl border border-rcl-orange/20 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,.16),transparent_38%),#071018] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-rcl-orange"><FaFire className="mr-2 inline" />Game Night</p><h2 className="mt-2 font-display text-3xl font-black uppercase">{nextGame ? `${nextGame.away?.name ?? 'Away'} vs ${nextGame.home?.name ?? 'Home'}` : 'The next matchup is loading'}</h2></div>{nextGame?.status === 'live' && <span className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-300">Live now</span>}</div>
          {nextGame ? <><p className="mt-3 text-sm text-white/50">{prettyDate(nextGame.scheduled_at)}</p>{nextGame.status === 'live' && <p className="mt-5 font-display text-5xl font-black">{nextGame.away_score}<span className="mx-3 text-white/20">–</span>{nextGame.home_score}</p>}<div className="mt-7 flex flex-wrap gap-2"><Link href={`/games/${nextGame.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-wider text-black"><FaPlay /> Open Game Night</Link>{nextGame.status === 'scheduled' && <Link href="/pickem" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-black uppercase tracking-wider">Make a pick</Link>}</div></> : <p className="mt-5 max-w-xl text-sm leading-6 text-white/40">As soon as the next official game is scheduled it becomes the primary live destination here.</p>}
        </article>

        <article className="rounded-3xl border border-rcl-blue/15 bg-[#071522]/55 p-6">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-rcl-blue"><FaLocationDot className="mr-2 inline" />Next Run</p>
          {nextRun ? <><h2 className="mt-3 font-display text-2xl font-black uppercase">{nextRun.title}</h2><p className="mt-2 text-sm leading-6 text-white/45">{nextRun.court_name || nextRun.location}</p><p className="mt-3 text-xs font-black uppercase tracking-wider text-rcl-orange">{prettyDate(nextRun.starts_at)} · {nextRun.skill_level}</p><Link href="/runs" className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rcl-blue">Open runs <FaArrowRight /></Link></> : <><h2 className="mt-3 font-display text-2xl font-black uppercase">Find your next court</h2><p className="mt-2 text-sm leading-6 text-white/40">Browse Richmond, Henrico and Chesterfield courts or create the next run.</p><Link href="/runs" className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rcl-blue">Explore court network <FaArrowRight /></Link></>}
        </article>
      </section>

      <section className="mt-7 rounded-3xl border border-white/10 bg-white/[.02] p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-rcl-orange"><FaBolt className="mr-2 inline" />Weekly Missions</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Turn activity into REP</h2></div><Link href="/missions" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rcl-blue">Full mission board <FaArrowRight /></Link></div>
        {!user && !authLoading ? <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/45">Sign in to track mission progress and claim REP rewards.</div> : <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{missions.slice(0, 6).map((mission) => {
          const item = progressByMission.get(mission.id);
          const current = Math.min(item?.progress ?? 0, mission.target_count);
          const done = current >= mission.target_count;
          const claimed = Boolean(item?.claimed_at);
          const pct = Math.round((current / mission.target_count) * 100);
          return <article key={mission.id} className="rounded-2xl border border-white/10 bg-[#071018] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-2xl">{mission.icon ?? '⚡'}</p><h3 className="mt-3 font-black">{mission.title}</h3></div><span className="rounded-full bg-rcl-orange/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rcl-orange">+{mission.reward_xp} REP</span></div><p className="mt-2 min-h-10 text-xs leading-5 text-white/40">{mission.description}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-rcl-blue transition-all" style={{ width: `${pct}%` }} /></div><div className="mt-3 flex items-center justify-between text-[10px] font-black uppercase tracking-wider"><span className="text-white/35">{current}/{mission.target_count}</span>{claimed ? <span className="inline-flex items-center gap-1 text-emerald-300"><FaCircleCheck /> Claimed</span> : done ? <button type="button" disabled={busy === mission.id} onClick={() => void claimMission(mission)} className="rounded-lg bg-rcl-orange px-3 py-2 text-black disabled:opacity-50">{busy === mission.id ? 'Claiming…' : 'Claim REP'}</button> : <span className="text-rcl-blue">In progress</span>}</div></article>;
        })}</div>}
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <article className="rounded-3xl border border-white/10 bg-[#071018] p-6">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-rcl-orange/10 text-rcl-orange"><FaMedal /></span><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-white/35">REP 2.0</p><h2 className="font-display text-2xl font-black uppercase">Your identity</h2></div></div>
          {rep ? <div className="mt-6 space-y-4">{dimensionMeta.map((item) => {
            const value = Number(rep[`${item.key}_xp` as keyof RepSummary] ?? 0);
            const max = Math.max(rep.hooper_xp, rep.community_xp, rep.creator_xp, rep.coach_xp, rep.reliability_xp, 1);
            return <div key={item.key}><div className="flex items-end justify-between gap-3"><div><p className="text-sm font-black">{item.label}</p><p className="text-[11px] text-white/30">{item.blurb}</p></div><b className="font-display text-lg">{value}</b></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-rcl-orange" style={{ width: `${Math.max(3, Math.round((value / max) * 100))}%` }} /></div></div>;
          })}</div> : <p className="mt-6 text-sm leading-6 text-white/40">Your Hooper, Community, Creator, Coach and Reliability REP will appear here after you sign in and start participating.</p>}
          <Link href="/leaderboards" className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rcl-orange">REP leaderboards <FaArrowRight /></Link>
        </article>

        <article className="rounded-3xl border border-rcl-blue/15 bg-[#071522]/45 p-6">
          <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-rcl-blue">RCH TV</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Latest highlights</h2></div><Link href="/media" className="text-xs font-black uppercase tracking-wider text-rcl-blue">Watch all</Link></div>
          {highlights.length ? <div className="mt-5 grid gap-3 sm:grid-cols-3">{highlights.map((highlight) => <a key={highlight.id} href={highlight.clip_url ?? '/media'} className="group rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-rcl-blue/35"><div className="grid aspect-video place-items-center overflow-hidden rounded-xl bg-[radial-gradient(circle_at_center,rgba(26,155,220,.16),transparent_60%),#020408]"><FaPlay className="text-rcl-blue transition group-hover:scale-110" /></div><p className="mt-3 text-[10px] font-black uppercase tracking-wider text-rcl-orange">{highlight.category.replace(/_/g, ' ')}</p><h3 className="mt-1 line-clamp-2 text-sm font-black">{highlight.title}</h3><p className="mt-1 text-[11px] text-white/30">{highlight.player ? `${highlight.player.first_name ?? ''} ${highlight.player.last_name ?? ''}`.trim() : 'RCL Basketball'}</p></a>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-8 text-center"><FaPlay className="mx-auto text-2xl text-rcl-blue"/><p className="mt-3 text-sm text-white/40">Player-tagged highlights will surface here as the library grows.</p></div>}
        </article>
      </section>

      <section className="mt-7">
        <div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-rcl-orange">Basketball OS</p><h2 className="mt-1 font-display text-2xl font-black uppercase">Where do you want to go?</h2></div></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{quickLinks.map(({ href, label, detail, icon: Icon }) => <Link key={href} href={href} className="group flex min-h-28 items-center gap-4 rounded-2xl border border-white/10 bg-white/[.02] p-5 transition hover:border-rcl-blue/35 hover:bg-rcl-blue/[.04]"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><Icon /></span><span className="min-w-0 flex-1"><strong className="block font-display text-lg font-black uppercase">{label}</strong><small className="mt-1 block text-xs leading-5 text-white/35">{detail}</small></span><FaArrowRight className="text-white/20 transition group-hover:translate-x-1 group-hover:text-rcl-orange" /></Link>)}</div>
      </section>
    </Container>
  </main>;
}

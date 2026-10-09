'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Container } from '@/components/Container';
import { RunArenaHero } from '@/components/runs/RunArenaHero';
import { RunArenaLeaderboard } from '@/components/runs/RunArenaLeaderboard';
import './runs-arena.css';
import { RunVenuePicker, runVenueLocation, type RunVenue as Court } from '@/components/runs/RunVenuePicker';
import { NetworkSponsoredPlacement } from '@/components/network/NetworkSponsoredPlacement';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { buildWeeklyRunStarts, runInviteUrl, validateRunStart } from '@/lib/run-activation';
import {
  FaArrowUpRightFromSquare,
  FaBasketball,
  FaCalendarDays,
  FaCircleCheck,
  FaDumbbell,
  FaLocationDot,
  FaMedal,
  FaPeopleGroup,
  FaPlus,
  FaTrophy,
  FaVideo,
  FaXmark,
} from 'react-icons/fa6';

type RunType = 'competitive' | 'social' | 'training';
type SkillLevel = 'all' | 'beginner' | 'intermediate' | 'advanced' | 'elite';
type ViewMode = 'runs' | 'rewards';

type Run = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  location: string;
  location_slug: string | null;
  starts_at: string;
  skill_level: SkillLevel;
  game_format: string;
  max_players: number;
  status: 'open' | 'full' | 'cancelled' | 'completed';
  run_type: RunType;
  allow_fan_checkin: boolean;
  host?: { display_name: string | null; username: string | null; avatar_url?: string | null };
  players?: string[];
};

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  requirement_type: string;
  requirement_value: number;
};

const skillLabels: Record<SkillLevel, string> = {
  all: 'Everyone',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Elite',
};

const runTypeLabels: Record<RunType, string> = {
  competitive: 'Competitive run',
  social: 'Social meetup',
  training: 'Training',
};

const badgeTypes = ['run_checkins', 'player_run_checkins', 'fan_run_checkins', 'run_highlights'];

const emptyForm = {
  title: '',
  location_slug: '',
  custom_location: '',
  date: '',
  time: '',
  skill_level: 'all' as SkillLevel,
  game_format: '5v5',
  max_players: 10,
  description: '',
  run_type: 'competitive' as RunType,
  allow_fan_checkin: true,
  repeat_weeks: 1 as 1 | 4,
};

export default function RunsPage() {
  const searchParams = useSearchParams();
  const courtParam = searchParams.get('court')?.trim() || '';
  const createIntent = searchParams.get('create') === '1';
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;

  const [runs, setRuns] = useState<Run[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [checkins, setCheckins] = useState<Set<string>>(new Set());
  const [highlightClaims, setHighlightClaims] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>('runs');
  const [showCreate, setShowCreate] = useState(false);
  const [skillFilter, setSkillFilter] = useState<'all' | SkillLevel>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | RunType>('all');
  const [runSearch, setRunSearch] = useState('');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createdRuns, setCreatedRuns] = useState<Array<{ id:string; title:string; starts_at:string }>>([]);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    if (!db) {
      setLoading(false);
      setError('Open Runs services are not configured.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const [runsResult, courtsResult, badgesResult, checkinsResult, highlightsResult] = await Promise.all([
        db.from('runs')
          .select('id,host_id,title,description,location,location_slug,starts_at,skill_level,game_format,max_players,status,run_type,allow_fan_checkin')
          .neq('status', 'cancelled')
          .gte('starts_at', since)
          .order('starts_at', { ascending: true })
          .limit(100),
        db.from('basketball_locations')
          .select('slug,name,address,locality,region,postal_code,area,venue_type,access_type,court_count,lights,latitude,longitude,hours_text,open_gym_text,source_label,source_url,last_verified_on,verification_status,notes')
          .eq('is_active', true)
          .in('verification_status', ['official', 'provider'])
          .order('name')
          .limit(125),
        db.from('badges')
          .select('id,name,description,icon,tier,requirement_type,requirement_value')
          .eq('is_active', true)
          .in('requirement_type', badgeTypes)
          .order('requirement_value'),
        user ? db.from('run_checkins').select('run_id').eq('profile_id', user.id) : Promise.resolve({ data: [], error: null }),
        user ? db.from('run_highlight_claims').select('run_id').eq('profile_id', user.id) : Promise.resolve({ data: [], error: null }),
      ]);

      if (runsResult.error) throw runsResult.error;
      if (courtsResult.error) throw courtsResult.error;

      const rows = (runsResult.data ?? []) as Run[];
      const hostIds = [...new Set(rows.map((run) => run.host_id))];
      const runIds = rows.map((run) => run.id);
      const [hostsResult, playersResult] = await Promise.all([
        hostIds.length ? db.from('profiles').select('id,display_name,username,avatar_url').in('id', hostIds) : Promise.resolve({ data: [] }),
        runIds.length ? db.from('run_players').select('run_id,profile_id').in('run_id', runIds) : Promise.resolve({ data: [] }),
      ]);

      const hostMap = new Map<string, Run['host']>((hostsResult.data ?? []).map((host: any) => [host.id, host]));
      const playerMap = new Map<string, string[]>();
      for (const player of (playersResult.data ?? []) as Array<{ run_id: string; profile_id: string }>) {
        playerMap.set(player.run_id, [...(playerMap.get(player.run_id) ?? []), player.profile_id]);
      }

      setRuns(rows.map((run) => ({ ...run, host: hostMap.get(run.host_id), players: playerMap.get(run.id) ?? [] })));
      const courtRows = (courtsResult.data ?? []) as Court[];
      if (courtParam && !courtRows.some(court => court.slug === courtParam)) {
        const { data: selectedCourtRow } = await db.from('basketball_locations')
          .select('slug,name,address,locality,region,postal_code,area,venue_type,access_type,court_count,lights,latitude,longitude,hours_text,open_gym_text,source_label,source_url,last_verified_on,verification_status,notes')
          .eq('slug', courtParam).eq('is_active', true).maybeSingle();
        if (selectedCourtRow) courtRows.unshift(selectedCourtRow as Court);
      }
      setCourts(courtRows);
      setBadges((badgesResult.data ?? []) as Badge[]);
      setCheckins(new Set((checkinsResult.data ?? []).map((row: any) => row.run_id)));
      setHighlightClaims(new Set((highlightsResult.data ?? []).map((row: any) => row.run_id)));
    } catch (loadError) {
      console.error('Unable to load Open Runs', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Open Runs right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [supabase, user?.id]);

  useEffect(() => { if (createIntent) setShowCreate(true); }, [createIntent]);

  useEffect(() => {
    if (!courtParam || !courts.length) return;
    const match=courts.find(court=>court.slug===courtParam);
    if (!match) return;
    setSelectedCourt(match);
  }, [courtParam,courts]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('rcl-runs-network')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'runs' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'run_players' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, user?.id]);

  const openCreateForCourt = (court?: Court, runType: RunType = 'competitive') => {
    setForm({ ...emptyForm, run_type: runType, location_slug: court?.slug ?? '' });
    setShowCreate(true);
  };

  const pickRunVenue = (venue: Court) => {
    setCourts(current => current.some(court => court.slug === venue.slug) ? current : [...current, venue]);
    setForm(current => ({ ...current, location_slug: venue.slug, custom_location: '' }));
  };

  const createRun = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy === 'create') return;
    if (!db || !user) {
      window.location.href = `/auth/sign-in?next=${encodeURIComponent('/runs?create=1')}`;
      return;
    }
    const court = courts.find(item => item.slug === form.location_slug);
    const location = court ? runVenueLocation(court) : form.custom_location.trim();
    if (!form.title.trim() || !location || !form.date || !form.time) {
      setError('Add a title, court or location, date, and start time.');
      return;
    }
    const startError = validateRunStart(form.date, form.time);
    if (startError) { setError(startError); return; }
    if (!Number.isInteger(form.max_players) || form.max_players < 2 || form.max_players > 50) {
      setError('Capacity must be between 2 and 50 players.');
      return;
    }
    setBusy('create');
    setError('');
    try {
      const starts = buildWeeklyRunStarts(form.date, form.time, form.repeat_weeks);
      const seriesId = starts.length > 1 ? crypto.randomUUID() : null;
      const shared = {
        host_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        court_name: court?.name ?? form.custom_location.trim().slice(0, 160),
        location,
        location_slug: court?.slug ?? null,
        skill_level: form.skill_level,
        game_format: form.game_format.toLowerCase(),
        max_players: form.max_players,
        capacity: form.max_players,
        status: 'open',
        run_type: form.run_type,
        allow_fan_checkin: form.allow_fan_checkin,
      };
      // Bulk insert is atomic: no partial series when a row fails.
      const rows = starts.map((starts_at, recurrence_sequence) => ({
        ...shared, starts_at,
        recurrence_series_id: seriesId,
        recurrence_sequence: seriesId ? recurrence_sequence : null,
      }));
      const { data, error: insertError } = await db.from('runs')
        .insert(rows).select('id,title,starts_at');
      if (insertError) throw insertError;
      const created = ((data ?? []) as Array<{id:string;title:string;starts_at:string}>)
        .sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
      if (!created.length) throw new Error('Run publication did not return the new schedule.');
      const { error: hostJoinError } = await db.from('run_players')
        .insert(created.map(run => ({ run_id: run.id, profile_id: user.id })));
      if (hostJoinError) console.error('Runs created, but automatic host RSVP failed:',hostJoinError);
      setCreatedRuns(created);
      setForm(emptyForm);
      setShowCreate(false);
      setNotice(`${created.length === 1 ? 'Run is' : `${created.length} weekly runs are`} live. Share ${created.length === 1 ? 'the link' : 'each date'} with your crew.${hostJoinError ? ' Host RSVP needs attention.' : ''}`);
      setView('runs');
      void load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to schedule this run.');
    } finally {
      setBusy(null);
    }
  };

  const joinRun = async (run: Run) => {
    if (!db || !user) {
      setError('Sign in to join a run.');
      return;
    }
    setBusy(`join-${run.id}`);
    setError('');
    const joined = run.players?.includes(user.id);
    if (joined) {
      const { error: leaveError } = await db.from('run_players').delete().eq('run_id', run.id).eq('profile_id', user.id);
      if (leaveError) setError(leaveError.message);
    } else if ((run.players?.length ?? 0) >= run.max_players) {
      setError('This run is full.');
    } else {
      const { error: joinError } = await db.from('run_players').insert({ run_id: run.id, profile_id: user.id });
      if (joinError) setError(joinError.message);
    }
    setBusy(null);
    void load();
  };

  const checkIn = async (run: Run) => {
    if (!db || !user) {
      setError('Sign in to check in.');
      return;
    }
    setBusy(`checkin-${run.id}`);
    setError('');
    const { data, error: rpcError } = await db.rpc('check_in_to_run', { p_run: run.id });
    if (rpcError) setError(rpcError.message);
    else {
      setNotice(Number(data ?? 0) > 0 ? '+15 REP earned for your verified check-in.' : 'You are already checked in to this run.');
      void load();
    }
    setBusy(null);
  };

  const claimHighlight = async (run: Run) => {
    if (!db || !user) {
      setError('Sign in to claim highlight REP.');
      return;
    }
    setBusy(`highlight-${run.id}`);
    setError('');
    const { data, error: rpcError } = await db.rpc('claim_latest_run_highlight', { p_run: run.id });
    if (rpcError) setError(rpcError.message);
    else {
      const reward = Number(data?.[0]?.rep_awarded ?? 0);
      setNotice(reward ? `+${reward} REP earned for your run highlight.` : 'This run highlight has already been rewarded.');
      void load();
    }
    setBusy(null);
  };

  const visibleRuns = runs.filter((run) => {
    const skillMatch = skillFilter === 'all' || run.skill_level === skillFilter;
    const typeMatch = typeFilter === 'all' || run.run_type === typeFilter;
    const courtMatch = !courtParam || run.location_slug === courtParam;
    const words = runSearch.trim().toLowerCase();
    const searchMatch = !words || (run.title + ' ' + run.location + ' ' + (run.description ?? '')).toLowerCase().includes(words);
    return skillMatch && typeMatch && courtMatch && searchMatch;
  });

  return (
    <main className="rch-arena-shell min-h-screen overflow-x-hidden pb-28 text-white">
      <RunArenaHero
        activeMode={typeFilter}
        onHost={() => openCreateForCourt(selectedCourt ?? undefined)}
        onMode={mode => {
          setTypeFilter(mode);
          setView('runs');
          document.getElementById('rch-upcoming-runs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />
      <Container maxWidth="xl" className="px-3 pb-10 pt-3 sm:px-5 sm:pt-5">
        {courtParam&&selectedCourt&&<div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#366b9b] bg-[#102d4d] p-3 text-xs font-semibold text-[#cae6ff]"><FaLocationDot/>{selectedCourt.name}<Link href="/runs" className="ml-auto text-[#84caff]">Clear court filter</Link></div>}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[.2em] text-[#88bffa]">The Park · Player Hub</span>
          <button type="button" onClick={() => setView(view === 'runs' ? 'rewards' : 'runs')} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#325f8d] bg-[#0d2b4a] px-3 text-[11px] font-bold text-[#b8dbff]">
            <FaTrophy className="text-[#f8d078]"/> {view === 'runs' ? 'REP Rewards' : 'Back to Runs'}
          </button>
        </div>
        {view === 'runs' && <RunArenaLeaderboard />}
        {notice && <div className="mb-5 flex items-center gap-2 rounded-xl border border-rcl-blue/20 bg-rcl-blue/[.07] px-4 py-3 text-sm text-[#c8eaff]"><FaCircleCheck className="shrink-0" />{notice}<button onClick={() => setNotice('')} className="ml-auto text-white/35"><FaXmark /></button></div>}
        {createdRuns.length > 0 && <section aria-label="Share your new runs" className="mb-5 rounded-2xl border border-rcl-blue/30 bg-rcl-blue/[.07] p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-rcl-blue">Your schedule is live</p><p className="mt-1 text-sm text-white/60">Every date has its own RSVP and invitation.</p></div><button type="button" onClick={() => setCreatedRuns([])} aria-label="Dismiss new runs" className="rounded-lg border border-white/10 p-2 text-white/60"><FaXmark /></button></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{createdRuns.map(run=><div key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rcl-blue/15 bg-[#071522] px-4 py-3"><div><p className="font-semibold text-sm">{run.title}</p><p className="text-xs text-white/45">{new Date(run.starts_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</p></div><div className="flex gap-2"><ShareRunButton id={run.id} title={run.title}/><Link href={`/runs/${run.id}`} className="rounded-xl border border-rcl-blue/30 px-3 py-2.5 text-xs font-semibold text-rcl-blue">View</Link></div></div>)}</div>
        </section>}
        {error && <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</div>}

        {view === 'runs' && <section id="rch-upcoming-runs" className="mt-7 scroll-mt-20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-black text-white sm:text-2xl"><FaCalendarDays className="text-[#82caff]"/> Upcoming Runs</h2>
            <button type="button" onClick={() => {setTypeFilter('all');setSkillFilter('all');setRunSearch('');}} className="text-xs font-bold text-[#6cbaff]">See all runs →</button>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setTypeFilter('all')} className="rch-arena-upcoming-filter min-h-10 rounded-xl px-3 text-xs font-bold" aria-pressed={typeFilter === 'all'}>All Runs</button>
            <select aria-label="Filter by skill level" value={skillFilter} onChange={event => setSkillFilter(event.target.value as typeof skillFilter)} className="min-h-10 max-w-[170px] rounded-xl border border-[#315b86] bg-[#0a1d34] px-3 text-xs font-semibold text-white">
              <option value="all">Any skill level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="elite">Elite</option>
            </select>
            {typeFilter !== 'all' && <span className="min-w-0 rounded-lg bg-[#0d345c] px-3 py-2 text-xs font-bold text-[#a5d5ff]">{runTypeLabels[typeFilter]}</span>}
            <input aria-label="Search upcoming runs by city or court" type="search" value={runSearch} onChange={event => setRunSearch(event.target.value)}
              placeholder="Search courts, cities or run names" className="min-h-11 w-full flex-1 basis-[220px] rounded-xl border border-[#315b86] bg-[#081a2e] px-4 text-sm text-white placeholder:text-[#97b3d1] outline-none focus:border-[#4b9fff]" />
          </div>

          {loading ? <LoadingCard label="Finding runs and meetups…" /> : visibleRuns.length === 0 ? <div className="rch-arena-empty rounded-2xl border border-dashed p-6 text-center sm:p-8"><FaBasketball className="mx-auto text-3xl text-rcl-blue/60" /><h2 className="mt-3 text-xl font-black">{runs.length ? 'No runs match these filters' : 'Your next game starts here'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#bed6ef]">{runs.length ? 'Try another mode or skill level.' : 'No upcoming games yet. Host a competitive run, social meetup or training session, then invite your crew.'}</p><div className="mt-5 flex flex-wrap items-center justify-center gap-2"><button onClick={() => openCreateForCourt()} className="rounded-xl bg-rcl-blue px-5 py-3 text-sm font-semibold text-[#071018]">Host a run</button><button onClick={() => setView('rewards')} className="rounded-xl border border-rcl-blue/30 px-5 py-3 text-sm font-semibold text-rcl-blue">How run rewards work</button></div></div> : <div className="rch-arena-run-slider">{visibleRuns.map((run) => <RunCard key={run.id} run={run} userId={user?.id} checkedIn={checkins.has(run.id)} highlightClaimed={highlightClaims.has(run.id)} busy={busy} onJoin={joinRun} onCheckIn={checkIn} onClaimHighlight={claimHighlight} />)}</div>}
        </section>}

        <NetworkSponsoredPlacement
          placement="regional-feature"
          surface="rch-runs-presenting"
          region="central-virginia"
          variant="strip"
          slotKey="runs-presenting"
          dailyCap={12}
          sessionCap={8}
          brandLabel="RCH Runs partner"
          ctaLabel="Visit partner"
          className="mb-5"
        />

        {view === 'rewards' && <section>
          <div className="grid gap-4 md:grid-cols-3">
            <RewardRule icon={<FaLocationDot />} value="+15 REP" title="Check in" detail="Check in from 2 hours before a run until 6 hours after it starts." />
            <RewardRule icon={<FaVideo />} value="+35 REP" title="Post a run highlight" detail="Players can post a photo/video highlight and claim one bonus per run." />
            <RewardRule icon={<FaMedal />} value="Badges" title="Build your run résumé" detail="Players and fans unlock different badges from participation, check-ins and highlights." />
          </div>
          <div className="mt-7 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold text-white/32">OPEN RUN ACHIEVEMENTS</p><h2 className="mt-1 text-xl font-semibold">Badges earned in the real world</h2></div><Link href="/badges" className="text-xs font-semibold text-rcl-blue">All RCL badges</Link></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{badges.map((badge) => <article key={badge.id} className="rounded-2xl border border-rcl-blue/12 bg-[#09131d]/72 p-5"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-rcl-blue/12 bg-rcl-blue/[.06] text-xl">{badge.icon}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{badge.name}</h3><span className="rounded-full border border-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">{badge.tier}</span></div><p className="mt-2 text-xs leading-5 text-white/42">{badge.description}</p></div></div></article>)}</div>
          <div className="mt-6 rounded-2xl border border-rcl-blue/14 bg-rcl-blue/[.045] p-5"><div className="flex gap-3"><FaVideo className="mt-0.5 shrink-0 text-rcl-blue" /><div><h3 className="font-semibold">Highlight bonus workflow</h3><p className="mt-1 text-sm leading-6 text-white/45">Join the run, play, then post a photo or video to RCL Social within 72 hours. Return to the run card and tap <b className="text-white/70">Claim highlight REP</b>. Normal social-post REP still applies separately.</p><Link href="/social?compose=1" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-rcl-blue">Post a highlight <FaArrowUpRightFromSquare /></Link></div></div></div>
        </section>}
      </Container>

      {showCreate && <CreateRunModal form={form} setForm={setForm} courts={courts} onPickVenue={pickRunVenue} busy={busy === 'create'} onClose={() => setShowCreate(false)} onSubmit={createRun} />}
    </main>
  );
}

function LoadingCard({ label }: { label: string }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[.025] p-10 text-center text-sm text-white/38">{label}</div>;
}

function RunCard({ run, userId, checkedIn, highlightClaimed, busy, onJoin, onCheckIn, onClaimHighlight }: {
  run: Run;
  userId?: string;
  checkedIn: boolean;
  highlightClaimed: boolean;
  busy: string | null;
  onJoin: (run: Run) => Promise<void>;
  onCheckIn: (run: Run) => Promise<void>;
  onClaimHighlight: (run: Run) => Promise<void>;
}) {
  const count = run.players?.length ?? 0;
  const joined = Boolean(userId && run.players?.includes(userId));
  const host = userId === run.host_id;
  const starts = new Date(run.starts_at);
  const now = Date.now();
  const startMs = starts.getTime();
  const checkInOpen = now >= startMs - 2 * 60 * 60 * 1000 && now <= startMs + 6 * 60 * 60 * 1000;
  const highlightWindow = now >= startMs - 2 * 60 * 60 * 1000 && now <= startMs + 72 * 60 * 60 * 1000;
  const participantCanHighlight = (joined || host) && highlightWindow;
  const typeIcon = run.run_type === 'competitive' ? <FaTrophy /> : run.run_type === 'training' ? <FaDumbbell /> : <FaPeopleGroup />;

  return <article className="rch-arena-game-card min-w-0 overflow-hidden rounded-2xl">
    <div className="rch-arena-game-cover relative h-24 overflow-hidden border-b border-[#264f79]"><div className="absolute inset-0 bg-gradient-to-t from-[#08192d]/85 to-transparent"/><span className="absolute bottom-3 left-3 rounded-full border border-[#53a5ff]/50 bg-[#167af3] px-3 py-1 text-[11px] font-black text-white">{starts.toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'})} · {starts.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</span><span className="absolute bottom-3 right-3 rounded-full bg-[#071b30]/90 px-2 py-1 text-[10px] font-semibold text-[#d1e6ff]">{count}/{run.max_players} players</span></div>
    <div className="border-b border-[#244664] p-4">
      <div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-lg border border-rcl-blue/16 bg-rcl-blue/[.06] px-2.5 py-1 text-[11px] font-semibold text-rcl-blue">{typeIcon}{runTypeLabels[run.run_type]}</span><span className="rounded-lg border border-white/8 px-2.5 py-1 text-[11px] font-medium text-white/38">{run.game_format}</span><span className="ml-auto text-[11px] text-white/32">{skillLabels[run.skill_level]}</span></div>
      <h2 className="mt-4 break-words text-xl font-semibold tracking-[-.02em]"><Link href={`/runs/${run.id}`} className="hover:text-rcl-blue">{run.title}</Link></h2>
      {run.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/42">{run.description}</p>}
    </div>
    <div className="space-y-3 p-4 text-sm text-[#bacbe2]">
      <div className="flex items-start gap-3"><FaCalendarDays className="mt-1 shrink-0 text-rcl-blue" /><span>{starts.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {starts.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>
      <div className="flex min-w-0 items-start gap-3"><FaLocationDot className="mt-1 shrink-0 text-rcl-blue" /><span className="min-w-0 break-words">{run.location}</span></div>
      <div className="flex items-center gap-3"><FaPeopleGroup className="shrink-0 text-rcl-blue" /><span>{count}/{run.max_players} attending</span></div>
      <div className="flex flex-wrap gap-2 pt-2">
        <a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(run.location)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-xl border border-white/15 px-3 py-2.5 text-xs font-semibold text-white/85">Directions <FaArrowUpRightFromSquare className="ml-1.5" /></a>
        <button disabled={busy === `join-${run.id}`} onClick={() => void onJoin(run)} className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${joined ? 'border border-white/10 bg-white/[.035] text-white/65' : 'bg-rcl-blue text-[#071018]'}`}>{joined ? 'Leave' : count >= run.max_players ? 'Full' : run.run_type === 'social' ? 'Join meetup' : 'Join run'}</button><ShareRunButton id={run.id} title={run.title} />
        {checkInOpen && <button disabled={checkedIn || busy === `checkin-${run.id}`} onClick={() => void onCheckIn(run)} className="rounded-xl border border-rcl-blue/22 bg-rcl-blue/[.06] px-4 py-2.5 text-xs font-semibold text-rcl-blue disabled:opacity-45">{checkedIn ? 'Checked in ✓' : 'Check in · +15 REP'}</button>}
      </div>
      {participantCanHighlight && <div className="mt-2 rounded-xl border border-white/7 bg-black/15 p-3"><p className="text-xs leading-5 text-white/38">Played here? Post a photo or video from this run, then claim the run-highlight bonus.</p><div className="mt-2 flex flex-wrap gap-2"><Link href="/social?compose=1" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/62">Post highlight</Link><button disabled={highlightClaimed || busy === `highlight-${run.id}`} onClick={() => void onClaimHighlight(run)} className="rounded-lg border border-rcl-blue/20 bg-rcl-blue/[.06] px-3 py-2 text-xs font-semibold text-rcl-blue disabled:opacity-45">{highlightClaimed ? 'Highlight bonus claimed ✓' : 'Claim +35 REP'}</button></div></div>}
      <div className="flex items-center justify-between gap-3 border-t border-white/7 pt-3"><span className="min-w-0 truncate text-xs text-white/30">Hosted by {run.host?.display_name || run.host?.username || 'RCL member'}</span>{run.allow_fan_checkin && <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-rcl-blue/55">Fan check-in</span>}</div>
    </div>
  </article>;
}

function RewardRule({ icon, value, title, detail }: { icon: React.ReactNode; value: string; title: string; detail: string }) {
  return <article className="rounded-2xl border border-rcl-blue/14 bg-[#09131d]/72 p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rcl-blue/[.07] text-rcl-blue">{icon}</span><div><p className="text-xs font-semibold text-rcl-blue">{value}</p><h3 className="font-semibold">{title}</h3></div></div><p className="mt-3 text-sm leading-6 text-white/42">{detail}</p></article>;
}

function CreateRunModal({ form, setForm, courts, onPickVenue, busy, onClose, onSubmit }: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  courts: Court[];
  onPickVenue: (venue: Court) => void;
  busy: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => Promise<void>;
}) {
  // The Runs page is isolated for its arena theme. Portal outside that stacking
  // context so the shared sticky header and bottom navigation cannot cover the form.
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => {
    setPortalReady(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!portalReady) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex h-[100dvh] items-center justify-center bg-black/80 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="rch-create-run-title" className="rch-run-create-dialog flex max-h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#28547d] bg-[#09121b] text-white shadow-2xl sm:rounded-3xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#28547d] px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#91cef2]">Open Runs</p>
            <h2 id="rch-create-run-title" className="mt-1 text-xl font-semibold leading-tight sm:text-2xl">Create basketball activity</h2>
          </div>
          <button type="button" aria-label="Close activity form" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#28547d] text-[#c5dbf1]"><FaXmark /></button>
        </header>
        <form id="rch-create-run-form" onSubmit={onSubmit} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 grid grid-cols-3 gap-2">{(['competitive', 'social', 'training'] as RunType[]).map((type) => <button type="button" key={type} onClick={() => setForm((current) => ({ ...current, run_type: type }))} className={`rounded-xl border px-2 py-3 text-xs font-semibold ${form.run_type === type ? 'border-rcl-blue/35 bg-rcl-blue/10 text-rcl-blue' : 'border-white/8 text-white/42'}`}>{type === 'competitive' ? 'Competitive' : type === 'social' ? 'Social meetup' : 'Training'}</button>)}</div>
      <label className="sm:col-span-2"><span className="text-xs font-semibold text-white/42">Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={form.run_type === 'social' ? 'Saturday hoops meetup' : 'Friday night competitive run'} className="mt-2 w-full rounded-xl border border-white/10 bg-[#050b11] px-4 py-3 text-sm outline-none focus:border-rcl-blue/40" /></label>
      <RunVenuePicker selected={courts.find(court => court.slug === form.location_slug) ?? null} onSelect={onPickVenue} onClear={() => setForm(current => ({ ...current, location_slug: '' }))} />
      {!form.location_slug && <label className="sm:col-span-2"><span className="text-xs font-semibold text-white/42">Custom location</span><input value={form.custom_location} onChange={(event) => setForm({ ...form, custom_location: event.target.value })} placeholder="Court name and address" className="mt-2 w-full rounded-xl border border-white/10 bg-[#050b11] px-4 py-3 text-sm outline-none focus:border-rcl-blue/40" /></label>}
      <label><span className="text-xs font-semibold text-white/42">Date</span><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#050b11] px-4 py-3 text-sm outline-none" /></label>
      <label><span className="text-xs font-semibold text-white/42">Start time</span><input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#050b11] px-4 py-3 text-sm outline-none" /></label>
      <label><span className="text-xs font-semibold text-white/42">Format</span><select value={form.game_format} onChange={(event) => setForm({ ...form, game_format: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#08111a] px-4 py-3 text-sm"><option>5v5</option><option>4v4</option><option>3v3</option><option>1v1</option><option value="open_run">Open run</option><option>Shootaround</option></select></label>
      <label><span className="text-xs font-semibold text-white/42">Competition level</span><select value={form.skill_level} onChange={(event) => setForm({ ...form, skill_level: event.target.value as SkillLevel })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#08111a] px-4 py-3 text-sm"><option value="all">Everyone</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="elite">Elite</option></select></label>
      <label><span className="text-xs font-semibold text-white/42">Capacity</span><input type="number" min={2} max={50} value={form.max_players} onChange={(event) => setForm({ ...form, max_players: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#050b11] px-4 py-3 text-sm" /></label>
      <label><span className="text-xs font-semibold text-white/42">Schedule</span><select value={form.repeat_weeks} onChange={event=>setForm({...form,repeat_weeks:Number(event.target.value) as 1|4})} className="mt-2 w-full rounded-xl border border-white/10 bg-[#08111a] px-4 py-3 text-sm"><option value={1}>One run</option><option value={4}>Repeat weekly · 4 weeks</option></select><small className="mt-2 block text-xs text-white/40">Each date has its own RSVP.</small></label>
      <label className="flex items-end"><span className="flex min-h-[46px] w-full items-center gap-3 rounded-xl border border-white/10 bg-[#050b11] px-4 text-xs text-white/55"><input type="checkbox" checked={form.allow_fan_checkin} onChange={(event) => setForm({ ...form, allow_fan_checkin: event.target.checked })} className="accent-[#91cef2]" /> Allow fan check-ins</span></label>
      <label className="sm:col-span-2"><span className="text-xs font-semibold text-white/42">Details</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} placeholder="Competition level, winners-stay rules, jerseys, parking, meetup details…" className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#050b11] px-4 py-3 text-sm outline-none focus:border-rcl-blue/40" /></label>
          </div>
        </form>
        <footer className="shrink-0 border-t border-[#28547d] bg-[#09121b] px-5 py-3 sm:px-7">
          <button type="submit" form="rch-create-run-form" disabled={busy} className="min-h-12 w-full rounded-xl bg-[#217ef5] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Publishing…' : form.repeat_weeks === 4 ? 'Post 4 weekly runs' : form.run_type === 'social' ? 'Post meetup' : 'Post run'}</button>
        </footer>
      </section>
    </div>,
    document.body
  );
}

/** A native share sheet on mobile; copy-link fallback for desktop browsers. */
function ShareRunButton({ id, title }: { id: string; title: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function share() {
    const url = runInviteUrl(window.location.origin, id);
    try {
      if (navigator.share) {
        await navigator.share({ title, text: 'Join this basketball run on Rich City Hoops.', url });
        setState('idle');
        return;
      }
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setState('error');
    }
  }

  return <button type="button" onClick={() => void share()} className="rounded-xl border border-rcl-blue/25 bg-rcl-blue/[.05] px-4 py-2.5 text-xs font-semibold text-rcl-blue">{state === 'copied' ? 'Link copied ✓' : state === 'error' ? 'Try sharing again' : 'Share invite'}</button>;
}

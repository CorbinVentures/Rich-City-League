'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import {
  FaArrowUpRightFromSquare,
  FaBasketball,
  FaCalendarDays,
  FaCircleCheck,
  FaClock,
  FaDumbbell,
  FaLocationDot,
  FaMagnifyingGlass,
  FaMap,
  FaMedal,
  FaPeopleGroup,
  FaPlus,
  FaTrophy,
  FaVideo,
  FaXmark,
} from 'react-icons/fa6';

type RunType = 'competitive' | 'social' | 'training';
type SkillLevel = 'all' | 'beginner' | 'intermediate' | 'advanced' | 'elite';
type ViewMode = 'runs' | 'courts' | 'map' | 'rewards';

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

type Court = {
  slug: string;
  name: string;
  address: string;
  locality: string;
  region: string;
  postal_code: string | null;
  area: string;
  venue_type: 'outdoor' | 'indoor' | 'mixed';
  access_type: 'public' | 'free_pass' | 'membership' | 'reservation' | 'varies';
  court_count: number | null;
  lights: boolean | null;
  latitude: number | null;
  longitude: number | null;
  hours_text: string | null;
  open_gym_text: string | null;
  source_label: string | null;
  source_url: string | null;
  last_verified_on: string | null;
  verification_status: 'official' | 'provider' | 'community';
  notes: string | null;
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

const accessLabels: Record<Court['access_type'], string> = {
  public: 'Public / free',
  free_pass: 'Free access pass',
  membership: 'Membership / guest',
  reservation: 'Reservation',
  varies: 'Schedule varies',
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
};

export default function RunsPage() {
  const searchParams = useSearchParams();
  const courtParam = searchParams.get('court')?.trim() || '';
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
  const [areaFilter, setAreaFilter] = useState<'all' | 'Richmond' | 'Henrico' | 'Chesterfield'>('all');
  const [courtTypeFilter, setCourtTypeFilter] = useState<'all' | 'open-gym' | Court['venue_type']>('all');
  const [courtSearch, setCourtSearch] = useState('');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [mapArea, setMapArea] = useState('Richmond');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
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
          .order('area')
          .order('name'),
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
      setCourts((courtsResult.data ?? []) as Court[]);
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

  useEffect(() => {
    if (!courtParam || !courts.length) return;
    const match=courts.find(court=>court.slug===courtParam);
    if (!match) return;
    setSelectedCourt(match);
    setCourtSearch(match.name);
    if (match.area==='Richmond'||match.area==='Henrico'||match.area==='Chesterfield') setAreaFilter(match.area);
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

  const createRun = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!db || !user) {
      setError('Sign in to create a run or meetup.');
      return;
    }
    const court = courts.find((item) => item.slug === form.location_slug);
    const location = court ? `${court.name} — ${court.address}` : form.custom_location.trim();
    if (!form.title.trim() || !location || !form.date || !form.time) {
      setError('Add a title, court or location, date, and start time.');
      return;
    }
    setBusy('create');
    setError('');
    const startsAt = new Date(`${form.date}T${form.time}`).toISOString();
    const { data, error: insertError } = await db.from('runs').insert({
      host_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      location,
      location_slug: court?.slug ?? null,
      starts_at: startsAt,
      skill_level: form.skill_level,
      game_format: form.game_format,
      max_players: form.max_players,
      status: 'open',
      run_type: form.run_type,
      allow_fan_checkin: form.allow_fan_checkin,
    }).select('id').single();
    if (insertError) {
      setError(insertError.message);
      setBusy(null);
      return;
    }
    if (data?.id) await db.from('run_players').insert({ run_id: data.id, profile_id: user.id });
    setForm(emptyForm);
    setShowCreate(false);
    setBusy(null);
    setNotice(form.run_type === 'social' ? 'Meetup posted to RCL Open Runs.' : 'Run posted to RCL Open Runs.');
    setView('runs');
    void load();
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
    return skillMatch && typeMatch && courtMatch;
  });

  const visibleCourts = courts.filter((court) => {
    const areaMatch = areaFilter === 'all' || court.area === areaFilter;
    const typeMatch = courtTypeFilter === 'all'
      || (courtTypeFilter === 'open-gym' ? Boolean(court.open_gym_text) : court.venue_type === courtTypeFilter || court.venue_type === 'mixed');
    const search = courtSearch.trim().toLowerCase();
    const searchMatch = !search || `${court.name} ${court.address} ${court.locality} ${court.area}`.toLowerCase().includes(search);
    return areaMatch && typeMatch && searchMatch;
  });

  const mapQuery = selectedCourt
    ? `${selectedCourt.name}, ${selectedCourt.address}, ${selectedCourt.locality}, VA`
    : `basketball courts ${mapArea} Virginia`;

  const directionsHref = (court: Court) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${court.name}, ${court.address}, ${court.locality}, VA`)}`;

  return (
    <main className="rcl-social-secondary min-h-screen overflow-x-hidden bg-[#05080d] pb-28 text-white">
      <header className="border-b border-rcl-blue/12 bg-[#071018]/88">
        <Container maxWidth="xl" className="py-6 sm:py-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-rcl-blue/65">RCL Runs</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Open Runs</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">Competitive runs, pickup basketball and social meetups across Richmond, Henrico and Chesterfield.</p>
              {courtParam&&selectedCourt&&<div className="mt-3 inline-flex items-center gap-2 rounded-full border border-rcl-blue/20 bg-rcl-blue/[.06] px-3 py-1.5 text-xs font-semibold text-rcl-blue"><FaLocationDot/>{selectedCourt.name}<Link href="/runs" className="ml-1 text-white/40 hover:text-white">Clear</Link></div>}
            </div>
            <button onClick={() => openCreateForCourt()} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-rcl-blue px-5 text-sm font-semibold text-[#071018]"><FaPlus /> Create run / meetup</button>
          </div>
        </Container>
      </header>

      <Container maxWidth="xl" className="py-5 sm:py-7">
        <nav className="mb-6 grid grid-cols-4 gap-1 rounded-2xl border border-white/8 bg-[#09131d]/80 p-1" aria-label="Open Runs sections">
          {([
            ['runs', 'Runs', FaBasketball],
            ['courts', 'Courts', FaLocationDot],
            ['map', 'Map', FaMap],
            ['rewards', 'Rewards', FaTrophy],
          ] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setView(key)} className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-xs font-semibold transition sm:text-sm ${view === key ? 'bg-rcl-blue text-[#071018]' : 'text-white/45 hover:bg-white/[.04] hover:text-white'}`}><Icon className="shrink-0" /><span className="truncate">{label}</span></button>
          ))}
        </nav>

        {notice && <div className="mb-5 flex items-center gap-2 rounded-xl border border-rcl-blue/20 bg-rcl-blue/[.07] px-4 py-3 text-sm text-[#c8eaff]"><FaCircleCheck className="shrink-0" />{notice}<button onClick={() => setNotice('')} className="ml-auto text-white/35"><FaXmark /></button></div>}
        {error && <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</div>}

        {view === 'runs' && <section>
          <div className="mb-5 grid gap-3 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="flex flex-wrap gap-2">
              {(['all', 'competitive', 'social', 'training'] as const).map((item) => <button key={item} onClick={() => setTypeFilter(item)} className={`rounded-xl border px-3.5 py-2 text-xs font-semibold ${typeFilter === item ? 'border-rcl-blue/45 bg-rcl-blue text-[#071018]' : 'border-white/10 bg-white/[.025] text-white/48'}`}>{item === 'all' ? 'All activity' : runTypeLabels[item]}</button>)}
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {(['all', 'intermediate', 'advanced', 'elite'] as const).map((item) => <button key={item} onClick={() => setSkillFilter(item)} className={`rounded-xl border px-3.5 py-2 text-xs font-semibold ${skillFilter === item ? 'border-rcl-blue/35 bg-rcl-blue/12 text-rcl-blue' : 'border-white/8 text-white/35'}`}>{item === 'all' ? 'Any level' : skillLabels[item]}</button>)}
            </div>
          </div>

          {loading ? <LoadingCard label="Finding runs and meetups…" /> : visibleRuns.length === 0 ? <div className="rounded-2xl border border-dashed border-rcl-blue/18 bg-[#071522]/42 p-8 text-center sm:p-12"><FaBasketball className="mx-auto text-3xl text-rcl-blue/60" /><h2 className="mt-4 text-2xl font-semibold">No scheduled runs match these filters</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/40">Create a competitive run, organize a social meetup, or pick a court from the directory below.</p><button onClick={() => openCreateForCourt()} className="mt-5 rounded-xl bg-rcl-blue px-5 py-3 text-sm font-semibold text-[#071018]">Post a run</button></div> : <div className="grid gap-4 lg:grid-cols-2">{visibleRuns.map((run) => <RunCard key={run.id} run={run} userId={user?.id} checkedIn={checkins.has(run.id)} highlightClaimed={highlightClaims.has(run.id)} busy={busy} onJoin={joinRun} onCheckIn={checkIn} onClaimHighlight={claimHighlight} />)}</div>}
        </section>}

        {view === 'courts' && <section>
          <div className="mb-5 rounded-2xl border border-rcl-blue/12 bg-[#09131d]/70 p-4">
            <div className="relative"><FaMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/28" /><input value={courtSearch} onChange={(event) => setCourtSearch(event.target.value)} placeholder="Search court, neighborhood or address" className="w-full rounded-xl border border-white/8 bg-[#050b11] py-3 pl-11 pr-4 text-sm outline-none placeholder:text-white/25 focus:border-rcl-blue/35" /></div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(['all', 'Richmond', 'Henrico', 'Chesterfield'] as const).map((area) => <button key={area} onClick={() => setAreaFilter(area)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${areaFilter === area ? 'border-rcl-blue/35 bg-rcl-blue/10 text-rcl-blue' : 'border-white/8 text-white/38'}`}>{area === 'all' ? 'All RVA' : area}</button>)}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['all', 'open-gym', 'outdoor', 'indoor'] as const).map((kind) => <button key={kind} onClick={() => setCourtTypeFilter(kind)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${courtTypeFilter === kind ? 'border-rcl-blue/35 bg-rcl-blue/10 text-rcl-blue' : 'border-white/8 text-white/38'}`}>{kind === 'all' ? 'All courts' : kind === 'open-gym' ? 'Open gym schedules' : kind[0].toUpperCase() + kind.slice(1)}</button>)}
            </div>
          </div>

          <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold text-white/32">RVA COURT DIRECTORY</p><h2 className="mt-1 text-xl font-semibold">{visibleCourts.length} verified locations</h2></div><button onClick={() => setView('map')} className="inline-flex items-center gap-2 text-xs font-semibold text-rcl-blue"><FaMap /> Map view</button></div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{visibleCourts.map((court) => <CourtCard key={court.slug} court={court} directionsHref={directionsHref(court)} onMap={() => { setSelectedCourt(court); setView('map'); }} onMeetup={() => openCreateForCourt(court, 'social')} />)}</div>
        </section>}

        {view === 'map' && <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-white/32">RVA BASKETBALL MAP</p><h2 className="mt-1 text-xl font-semibold">Find a court, then build the run</h2></div>{selectedCourt && <button onClick={() => setSelectedCourt(null)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50">Show area results</button>}</div>
          <div className="overflow-hidden rounded-2xl border border-rcl-blue/16 bg-[#071522]/50">
            <iframe title="RVA basketball courts map" src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`} className="h-[52vh] min-h-[390px] w-full border-0 grayscale-[.25]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
          {!selectedCourt && <div className="mt-3 flex flex-wrap gap-2">{['Richmond', 'Henrico', 'Chesterfield'].map((area) => <button key={area} onClick={() => setMapArea(area)} className={`rounded-xl border px-4 py-2 text-xs font-semibold ${mapArea === area ? 'border-rcl-blue/35 bg-rcl-blue/10 text-rcl-blue' : 'border-white/8 text-white/40'}`}>{area}</button>)}</div>}
          {selectedCourt && <div className="mt-4 rounded-2xl border border-rcl-blue/14 bg-[#09131d]/80 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-rcl-blue">{selectedCourt.area} · {selectedCourt.venue_type}</p><h3 className="mt-1 text-xl font-semibold">{selectedCourt.name}</h3><p className="mt-1 text-sm text-white/45">{selectedCourt.address}, {selectedCourt.locality}, VA</p></div><div className="flex gap-2"><a href={directionsHref(selectedCourt)} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-white/65">Directions</a><button onClick={() => openCreateForCourt(selectedCourt)} className="rounded-xl bg-rcl-blue px-4 py-2.5 text-xs font-semibold text-[#071018]">Create run</button></div></div></div>}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{courts.slice(0, 12).map((court) => <button key={court.slug} onClick={() => setSelectedCourt(court)} className="min-w-0 rounded-xl border border-white/8 bg-white/[.02] p-4 text-left hover:border-rcl-blue/25"><b className="block truncate text-sm">{court.name}</b><span className="mt-1 block truncate text-xs text-white/35">{court.area} · {court.venue_type}</span></button>)}</div>
        </section>}

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

      {showCreate && <CreateRunModal form={form} setForm={setForm} courts={courts} busy={busy === 'create'} onClose={() => setShowCreate(false)} onSubmit={createRun} />}
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

  return <article className="min-w-0 overflow-hidden rounded-2xl border border-rcl-blue/14 bg-[#071522]/48">
    <div className="border-b border-white/8 p-5">
      <div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-lg border border-rcl-blue/16 bg-rcl-blue/[.06] px-2.5 py-1 text-[11px] font-semibold text-rcl-blue">{typeIcon}{runTypeLabels[run.run_type]}</span><span className="rounded-lg border border-white/8 px-2.5 py-1 text-[11px] font-medium text-white/38">{run.game_format}</span><span className="ml-auto text-[11px] text-white/32">{skillLabels[run.skill_level]}</span></div>
      <h2 className="mt-4 break-words text-xl font-semibold tracking-[-.02em]">{run.title}</h2>
      {run.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/42">{run.description}</p>}
    </div>
    <div className="space-y-3 p-5 text-sm text-white/55">
      <div className="flex items-start gap-3"><FaCalendarDays className="mt-1 shrink-0 text-rcl-blue" /><span>{starts.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {starts.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>
      <div className="flex min-w-0 items-start gap-3"><FaLocationDot className="mt-1 shrink-0 text-rcl-blue" /><span className="min-w-0 break-words">{run.location}</span></div>
      <div className="flex items-center gap-3"><FaPeopleGroup className="shrink-0 text-rcl-blue" /><span>{count}/{run.max_players} attending</span></div>
      <div className="flex flex-wrap gap-2 pt-2">
        <button disabled={busy === `join-${run.id}`} onClick={() => void onJoin(run)} className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${joined ? 'border border-white/10 bg-white/[.035] text-white/65' : 'bg-rcl-blue text-[#071018]'}`}>{joined ? 'Leave' : count >= run.max_players ? 'Full' : run.run_type === 'social' ? 'Join meetup' : 'Join run'}</button>
        {checkInOpen && <button disabled={checkedIn || busy === `checkin-${run.id}`} onClick={() => void onCheckIn(run)} className="rounded-xl border border-rcl-blue/22 bg-rcl-blue/[.06] px-4 py-2.5 text-xs font-semibold text-rcl-blue disabled:opacity-45">{checkedIn ? 'Checked in ✓' : 'Check in · +15 REP'}</button>}
      </div>
      {participantCanHighlight && <div className="mt-2 rounded-xl border border-white/7 bg-black/15 p-3"><p className="text-xs leading-5 text-white/38">Played here? Post a photo or video from this run, then claim the run-highlight bonus.</p><div className="mt-2 flex flex-wrap gap-2"><Link href="/social?compose=1" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/62">Post highlight</Link><button disabled={highlightClaimed || busy === `highlight-${run.id}`} onClick={() => void onClaimHighlight(run)} className="rounded-lg border border-rcl-blue/20 bg-rcl-blue/[.06] px-3 py-2 text-xs font-semibold text-rcl-blue disabled:opacity-45">{highlightClaimed ? 'Highlight bonus claimed ✓' : 'Claim +35 REP'}</button></div></div>}
      <div className="flex items-center justify-between gap-3 border-t border-white/7 pt-3"><span className="min-w-0 truncate text-xs text-white/30">Hosted by {run.host?.display_name || run.host?.username || 'RCL member'}</span>{run.allow_fan_checkin && <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-rcl-blue/55">Fan check-in</span>}</div>
    </div>
  </article>;
}

function CourtCard({ court, directionsHref, onMap, onMeetup }: { court: Court; directionsHref: string; onMap: () => void; onMeetup: () => void }) {
  return <article className="min-w-0 rounded-2xl border border-rcl-blue/12 bg-[#09131d]/72 p-5">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-rcl-blue/65">{court.area} · {court.venue_type}</p><h3 className="mt-1 break-words text-lg font-semibold">{court.name}</h3></div><span className="shrink-0 rounded-full border border-rcl-blue/14 bg-rcl-blue/[.05] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-rcl-blue/70">{court.verification_status === 'official' ? 'Verified' : 'Provider'}</span></div>
    <p className="mt-2 text-sm leading-5 text-white/40">{court.address}<br />{court.locality}, VA {court.postal_code}</p>
    <div className="mt-4 flex flex-wrap gap-2 text-[11px]"><span className="rounded-lg border border-white/8 px-2.5 py-1.5 text-white/45">{accessLabels[court.access_type]}</span>{court.court_count && <span className="rounded-lg border border-white/8 px-2.5 py-1.5 text-white/45">{court.court_count} court{court.court_count === 1 ? '' : 's'}</span>}{court.lights && <span className="rounded-lg border border-white/8 px-2.5 py-1.5 text-white/45">Lighted</span>}</div>
    {court.hours_text && <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-white/38"><FaClock className="mt-1 shrink-0 text-rcl-blue/65" /><span>{court.hours_text}</span></div>}
    {court.open_gym_text && <div className="mt-3 rounded-xl border border-rcl-blue/12 bg-rcl-blue/[.045] p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-rcl-blue">Open gym / drop-in</p><p className="mt-1 text-xs leading-5 text-white/48">{court.open_gym_text}</p></div>}
    <div className="mt-4 grid grid-cols-3 gap-2"><button onClick={onMap} className="rounded-xl border border-white/9 px-2 py-2.5 text-xs font-semibold text-white/55">Map</button><a href={directionsHref} target="_blank" rel="noreferrer" className="rounded-xl border border-white/9 px-2 py-2.5 text-center text-xs font-semibold text-white/55">Directions</a><button onClick={onMeetup} className="rounded-xl bg-rcl-blue px-2 py-2.5 text-xs font-semibold text-[#071018]">Meetup</button></div>
    {court.source_url && <a href={court.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-white/25 hover:text-rcl-blue">Source: {court.source_label || 'venue provider'} <FaArrowUpRightFromSquare /></a>}
  </article>;
}

function RewardRule({ icon, value, title, detail }: { icon: React.ReactNode; value: string; title: string; detail: string }) {
  return <article className="rounded-2xl border border-rcl-blue/14 bg-[#09131d]/72 p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rcl-blue/[.07] text-rcl-blue">{icon}</span><div><p className="text-xs font-semibold text-rcl-blue">{value}</p><h3 className="font-semibold">{title}</h3></div></div><p className="mt-3 text-sm leading-6 text-white/42">{detail}</p></article>;
}

function CreateRunModal({ form, setForm, courts, busy, onClose, onSubmit }: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  courts: Court[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => Promise<void>;
}) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/78 p-0 backdrop-blur-sm sm:items-center sm:p-6"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#09121b] p-5 sm:rounded-3xl sm:p-7"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-rcl-blue/65">Open Runs</p><h2 className="mt-1 text-2xl font-semibold">Create basketball activity</h2></div><button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-white/50"><FaXmark /></button></div>
    <form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 grid grid-cols-3 gap-2">{(['competitive', 'social', 'training'] as RunType[]).map((type) => <button type="button" key={type} onClick={() => setForm((current) => ({ ...current, run_type: type }))} className={`rounded-xl border px-2 py-3 text-xs font-semibold ${form.run_type === type ? 'border-rcl-blue/35 bg-rcl-blue/10 text-rcl-blue' : 'border-white/8 text-white/42'}`}>{type === 'competitive' ? 'Competitive' : type === 'social' ? 'Social meetup' : 'Training'}</button>)}</div>
      <label className="sm:col-span-2"><span className="text-xs font-semibold text-white/42">Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={form.run_type === 'social' ? 'Saturday hoops meetup' : 'Friday night competitive run'} className="mt-2 w-full rounded-xl border border-white/10 bg-[#050b11] px-4 py-3 text-sm outline-none focus:border-rcl-blue/40" /></label>
      <label className="sm:col-span-2"><span className="text-xs font-semibold text-white/42">Court / venue</span><select value={form.location_slug} onChange={(event) => setForm({ ...form, location_slug: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#08111a] px-4 py-3 text-sm outline-none"><option value="">Custom / other location</option>{courts.map((court) => <option key={court.slug} value={court.slug}>{court.name} · {court.area}</option>)}</select></label>
      {!form.location_slug && <label className="sm:col-span-2"><span className="text-xs font-semibold text-white/42">Custom location</span><input value={form.custom_location} onChange={(event) => setForm({ ...form, custom_location: event.target.value })} placeholder="Court name and address" className="mt-2 w-full rounded-xl border border-white/10 bg-[#050b11] px-4 py-3 text-sm outline-none focus:border-rcl-blue/40" /></label>}
      <label><span className="text-xs font-semibold text-white/42">Date</span><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#050b11] px-4 py-3 text-sm outline-none" /></label>
      <label><span className="text-xs font-semibold text-white/42">Start time</span><input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#050b11] px-4 py-3 text-sm outline-none" /></label>
      <label><span className="text-xs font-semibold text-white/42">Format</span><select value={form.game_format} onChange={(event) => setForm({ ...form, game_format: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#08111a] px-4 py-3 text-sm"><option>5v5</option><option>4v4</option><option>3v3</option><option>1v1</option><option value="open_run">Open run</option><option>Shootaround</option></select></label>
      <label><span className="text-xs font-semibold text-white/42">Competition level</span><select value={form.skill_level} onChange={(event) => setForm({ ...form, skill_level: event.target.value as SkillLevel })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#08111a] px-4 py-3 text-sm"><option value="all">Everyone</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="elite">Elite</option></select></label>
      <label><span className="text-xs font-semibold text-white/42">Capacity</span><input type="number" min={2} max={50} value={form.max_players} onChange={(event) => setForm({ ...form, max_players: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#050b11] px-4 py-3 text-sm" /></label>
      <label className="flex items-end"><span className="flex min-h-[46px] w-full items-center gap-3 rounded-xl border border-white/10 bg-[#050b11] px-4 text-xs text-white/55"><input type="checkbox" checked={form.allow_fan_checkin} onChange={(event) => setForm({ ...form, allow_fan_checkin: event.target.checked })} className="accent-[#91cef2]" /> Allow fan check-ins</span></label>
      <label className="sm:col-span-2"><span className="text-xs font-semibold text-white/42">Details</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} placeholder="Competition level, winners-stay rules, jerseys, parking, meetup details…" className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#050b11] px-4 py-3 text-sm outline-none focus:border-rcl-blue/40" /></label>
      <button disabled={busy} className="sm:col-span-2 rounded-xl bg-rcl-blue px-5 py-3.5 text-sm font-semibold text-[#071018] disabled:opacity-50">{busy ? 'Publishing…' : form.run_type === 'social' ? 'Post meetup' : 'Post run'}</button>
    </form>
  </div></div>;
}

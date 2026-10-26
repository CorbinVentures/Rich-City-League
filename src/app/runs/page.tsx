'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Container } from '@/components/Container';
import RunsWorldGame from '@/components/runs/RunsWorldGame';
import { RunsRulesIntro } from '@/components/runs/RunsRulesIntro';
import {readPagedUpcomingRuns} from '@/lib/runs-world-game';
import {RCHEmptyState,RCHRunDetails,RCHSectionHeader,RCHStatusChip} from '@/components/runs/arena-ui';
import { RunArenaLeaderboard } from '@/components/runs/RunArenaLeaderboard';
import { RunRankedLadder } from '@/components/runs/RunRankedLadder';
import { RunPassport } from '@/components/runs/RunPassport';
import { RunCultureMoments } from '@/components/runs/RunCultureMoments';
import { ProgramEmblem } from '@/components/ProgramEmblem';
import { BadgeMedallion } from '@/components/BadgeMedallion';
import { rankSoloRuns, isSoloJoinable, runShareText } from '@/lib/runs-social-discovery';
import { RunDailyCircuit } from '@/components/runs/RunDailyCircuit';
import { rankDailyRuns, type DailyCircuitCandidate, type RunFormat, type RunPlayType } from '@/lib/run-daily-circuit';
import { CourtDominion } from '@/components/runs/CourtDominion';
import './runs-arena.css';
import './visual-experience.css';
import { RunVenuePicker, runVenueLocation, type RunVenue as Court } from '@/components/runs/RunVenuePicker';
import { NetworkSponsoredPlacement } from '@/components/network/NetworkSponsoredPlacement';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { GravityLocationPicker } from '@/components/GravityLocationPicker';
import { useGravityLocation } from '@/hooks/useGravityLocation';
import { cityForText } from '@/lib/virginia-world';
import { buildWeeklyRunStarts, runInviteUrl, validateRunStart } from '@/lib/run-activation';
import {
  FaArrowUpRightFromSquare,
  FaArrowRight,
  FaBasketball,
  FaBookOpen,
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
  partner?: {slug:string;name:string;experience:'park'|'rec';price_cents:number};
  independently_verified?:boolean;
  verified_host?:boolean;
  weekendMultiplier?: 1 | 2;
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
  const { location:gravityLocation } = useGravityLocation();
  const searchParams = useSearchParams();
  const courtParam = searchParams.get('court')?.trim() || '';
  const createIntent = searchParams.get('create') === '1';
  const showLegacyList=searchParams.get('view')!=='world'||createIntent||Boolean(courtParam);
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;

  const [runs, setRuns] = useState<Run[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [checkins, setCheckins] = useState<Set<string>>(new Set());
  const [highlightClaims, setHighlightClaims] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>('runs');
  const [rulesOpen, setRulesOpen] = useState(false);
  const closeRules = useCallback(() => {
    setRulesOpen(false);
    try { window.sessionStorage.setItem('rch-runs-rules-intro-session-v1', 'seen'); } catch { /* Storage must never block basketball. */ }
  }, []);
  useEffect(() => {
    // Auto-show on entry to the game world once per browser session; let
    // explicit RSVP, Run creation and court deep links proceed uninterrupted.
    if (showLegacyList) return;
    try { if (window.sessionStorage.getItem('rch-runs-rules-intro-session-v1') === 'seen') return; } catch { /* Show the rules if storage is unavailable. */ }
    setRulesOpen(true);
  }, [showLegacyList]);
  const competitionParam=searchParams.get('competition');
  const [competitionView, setCompetitionView] = useState<'passport'|'courts'|'rankings'>(competitionParam==='rankings'?'rankings':competitionParam==='courts'?'courts':'passport');
  const [showCreate, setShowCreate] = useState(false);
  const [skillFilter, setSkillFilter] = useState<'all' | SkillLevel>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | RunType>('all');
  const [runSearch, setRunSearch] = useState('');
  const [soloOnly,setSoloOnly]=useState(searchParams.get('solo')==='1');
  const [visibleLimit,setVisibleLimit]=useState(8);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createdRuns, setCreatedRuns] = useState<Array<{ id:string; title:string; starts_at:string }>>([]);
  const [form, setForm] = useState(emptyForm);
  const [staffIntelligence, setStaffIntelligence] = useState(false);
  const [dailyPrefs, setDailyPrefs] = useState<{preferred_format:RunFormat;preferred_type:RunPlayType;watched_courts:string[]}>({preferred_format:'all',preferred_type:'all',watched_courts:[]});

  useEffect(() => {
    if (!showLegacyList || !db || !user?.id) { setStaffIntelligence(false); return; }
    let active = true;
    void db.rpc('is_staff_or_admin').then(({data}: {data:boolean|null}) => {
      if(active)setStaffIntelligence(Boolean(data));
    });
    return () => { active = false; };
  }, [db,user?.id,showLegacyList]);


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
        readPagedUpcomingRuns<Run>((from,to)=>db.from('runs')
          .select('id,host_id,title,description,location,location_slug,starts_at,skill_level,game_format,max_players,status,run_type,allow_fan_checkin')
          .neq('status', 'cancelled')
          .gte('starts_at', since)
          .order('starts_at', { ascending: true })
          .range(from,to)),
        db.from('rch_runs_outdoor_courts')
          .select('slug,name,address,locality,region,postal_code,area,venue_type,access_type,court_count,lights,latitude,longitude,hours_text,open_gym_text,source_label,source_url,last_verified_on,verification_status,notes')
          .eq('is_active', true)
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
      if(runsResult.truncated)setNotice('Showing the first 2,000 upcoming Runs. Refine by city in Runs World.');
      if (courtsResult.error) throw courtsResult.error;

      const rows = (runsResult.data ?? []) as Run[];
      const hostIds = [...new Set(rows.map((run) => run.host_id))];
      const runIds = rows.map((run) => run.id);
      const [hostsResult, playersResult, partnerLinksResult, verificationResult, hostVerificationResult, weekendResult] = await Promise.all([
        hostIds.length ? db.from('profiles').select('id,display_name,username,avatar_url').in('id', hostIds) : Promise.resolve({ data: [] }),
        runIds.length ? db.from('run_players').select('run_id,profile_id').in('run_id', runIds) : Promise.resolve({ data: [] }),
        runIds.length ? db.from('rch_runs_partner_sessions').select('run_id,partner_id,experience,price_cents').in('run_id', runIds) : Promise.resolve({ data: [] }),
        runIds.length ? db.from('rch_run_verifications').select('run_id').in('run_id',runIds).eq('verification_status','verified'):Promise.resolve({data:[]}),
        hostIds.length ? db.from('rch_verified_run_hosts').select('profile_id').in('profile_id',hostIds).eq('verification_status','approved').gt('expires_at',new Date().toISOString()):Promise.resolve({data:[]}),
        runIds.length ? db.from('rch_weekend_circuit_events').select('run_id').in('run_id',runIds).eq('bonus_enabled',true) : Promise.resolve({data:[]}),
      ]);

      const hostMap = new Map<string, Run['host']>((hostsResult.data ?? []).map((host: any) => [host.id, host]));
      const playerMap = new Map<string, string[]>();
      for (const player of (playersResult.data ?? []) as Array<{ run_id: string; profile_id: string }>) {
        playerMap.set(player.run_id, [...(playerMap.get(player.run_id) ?? []), player.profile_id]);
      }

      const partnerLinks=(partnerLinksResult.data??[]) as Array<{run_id:string;partner_id:string;experience:'park'|'rec';price_cents:number}>;
      const partnerIds=[...new Set(partnerLinks.map(link=>link.partner_id))];
      const {data:partnerRows}=partnerIds.length?await db.from('rch_runs_partners')
        .select('id,slug,name').in('id',partnerIds).eq('status','approved'): {data:[]};
      const partnerById=new Map(((partnerRows??[]) as Array<{id:string;slug:string;name:string}>).map(p=>[p.id,p]));
      const runPartners=new Map(partnerLinks.flatMap(link=>{
        const org=partnerById.get(link.partner_id);
        return org?[[link.run_id,{slug:org.slug,name:org.name,experience:link.experience,price_cents:link.price_cents}] as const]:[];
      }));
      const certifiedRuns=new Set(((verificationResult.data??[]) as {run_id:string}[]).map(x=>x.run_id));
      const certifiedHosts=new Set(((hostVerificationResult.data??[]) as {profile_id:string}[]).map(x=>x.profile_id));
      const weekendRunIds=new Set(((weekendResult.data??[]) as {run_id:string}[]).map(x=>x.run_id));
      setRuns(rows.map((run) => ({ ...run, host: hostMap.get(run.host_id), players: playerMap.get(run.id) ?? [],partner:runPartners.get(run.id), independently_verified:certifiedRuns.has(run.id), verified_host:certifiedHosts.has(run.host_id), weekendMultiplier:weekendRunIds.has(run.id)?2:1 })));
      const courtRows = (courtsResult.data ?? []) as Court[];
      if (courtParam && !courtRows.some(court => court.slug === courtParam)) {
        const { data: selectedCourtRow } = await db.from('rch_runs_outdoor_courts')
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

  useEffect(() => { if(showLegacyList)void load(); }, [supabase, user?.id,showLegacyList]);

  useEffect(() => {
    if (!createIntent) return;
    const requestedFormat=searchParams.get('format')||'';
    const requestedMode=searchParams.get('mode')||'';
    const selectedFormat=['1v1','2v2','3v3','4v4','5v5'].includes(requestedFormat)?requestedFormat:'5v5';
    const selectedMode:RunType=(['competitive','social','training'] as string[]).includes(requestedMode)
      ?requestedMode as RunType:'competitive';
    const teamSize=parseInt(selectedFormat.split('v')[0],10);
    setForm(current=>({...current,game_format:selectedFormat,run_type:selectedMode,max_players:teamSize*2}));
    setShowCreate(true);
  }, [createIntent,searchParams]);

  useEffect(() => {
    if (!courtParam || !courts.length) return;
    const match=courts.find(court=>court.slug===courtParam);
    if (!match) return;
    setSelectedCourt(match);
  }, [courtParam,courts]);

  useEffect(() => {
    if (!supabase || !showLegacyList) return;
    const channel = supabase.channel('rcl-runs-network')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'runs' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'run_players' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, user?.id,showLegacyList]);

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
    const location = court ? runVenueLocation(court) : '';
    if (!form.title.trim() || !location || !form.date || !form.time) {
      setError('Add a title, public outdoor park court, date, and start time.');
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
        court_name: court!.name,
        location,
        location_slug: court!.slug,
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

  const dailyCandidates = useMemo<DailyCircuitCandidate[]>(()=>runs.map(run=>({
    id:run.id,title:run.title,host_id:run.host_id,location:run.location,location_slug:run.location_slug,
    city:courts.find(c=>c.slug===run.location_slug)?.locality||cityForText(run.location)?.name||null,
    starts_at:run.starts_at,run_type:run.run_type,game_format:run.game_format,
    max_players:run.max_players,player_count:run.players?.length??0,status:run.status,
    independently_verified:run.independently_verified,verified_host:run.verified_host,
    joined:Boolean(user?.id&&run.players?.includes(user.id)),partner_slug:run.partner?.slug
  })),[runs,courts,user?.id]);

  const visibleRuns = useMemo(() => {
    const matching = runs.filter((run) => {
      const skillMatch = skillFilter === 'all' || run.skill_level === skillFilter;
      const typeMatch = typeFilter === 'all' || run.run_type === typeFilter;
      const courtMatch = !courtParam || run.location_slug === courtParam;
      const words = runSearch.trim().toLowerCase();
      const searchMatch = !words || (run.title + ' ' + run.location + ' ' + (run.description ?? '')).toLowerCase().includes(words);
      return skillMatch && typeMatch && courtMatch && searchMatch && (!soloOnly || isSoloJoinable(run));
    });
    // Registered availability always comes before filled/cancelled events;
    // a player-selected city/format makes this feed relevant without hiding other Virginia courts.
    const matchedIds=new Set(matching.map(run=>run.id));
    const priorities=rankDailyRuns(dailyCandidates.filter(candidate=>matchedIds.has(candidate.id)),{
      cityId:gravityLocation.cityId,radiusMiles:gravityLocation.radiusMiles,userId:user?.id,
      preferredFormat:dailyPrefs.preferred_format,preferredType:dailyPrefs.preferred_type,
      watchedCourts:dailyPrefs.watched_courts
    });
    const order = new Map(priorities.map((candidate,index)=>[candidate.id,index]));
    if(soloOnly) return rankSoloRuns(matching);
    return [...matching].sort((a,b)=>{
      const capacityA=a.status === 'full' || (a.players?.length ?? 0) >= a.max_players ? 1 : 0;
      const capacityB=b.status === 'full' || (b.players?.length ?? 0) >= b.max_players ? 1 : 0;
      return capacityA-capacityB || (order.get(a.id) ?? Infinity)-(order.get(b.id) ?? Infinity);
    });
  },[runs,dailyCandidates,dailyPrefs,skillFilter,typeFilter,courtParam,runSearch,soloOnly,gravityLocation.cityId,gravityLocation.radiusMiles,user?.id]);

  useEffect(()=>setVisibleLimit(8),[skillFilter,typeFilter,runSearch,courtParam,soloOnly]);

  // People looking for Runs land on upcoming real games. The cinematic court
  // world remains available by explicit choice, without interrupting first use.
  if(!showLegacyList)return <><RunsWorldGame onOpenRules={() => setRulesOpen(true)} introEnabled={!rulesOpen} /><RunsRulesIntro open={rulesOpen} onClose={closeRules} /></>;

  return (
    <main className="rch-arena-shell min-h-screen overflow-x-hidden pb-28 text-white">
      <Container maxWidth="xl" className="px-3 pt-6 sm:px-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="rch-program-brand-lockup">
            <ProgramEmblem program="runs" className="rch-program-emblem-runs" priority/>
            <div><h1 className="text-3xl font-black">Runs</h1><Link href="/league/join" className="mt-1 inline-flex min-h-10 items-center gap-2 text-xs font-bold text-rcl-orange">Want to join Rich City League? <FaArrowRight aria-hidden="true"/></Link></div></div>
          <button type="button" onClick={() => openCreateForCourt(selectedCourt ?? undefined)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-sm font-semibold text-black">
            <FaPlus aria-hidden="true"/> Host a run
          </button>
        </header>
      </Container>
      <Container maxWidth="xl" className="px-3 pb-10 pt-3 sm:px-5 sm:pt-5">
        <nav aria-label="Runs quick actions" className="rch-run-primary-actions">
          <Link href="/runs?view=world" className="rch-ux-quicklink"><FaLocationDot aria-hidden="true"/> Court Map</Link>
          <Link href="/crews?intent=mine" className="rch-ux-quicklink" aria-label="Open my crew dashboard or create a crew"><FaPeopleGroup aria-hidden="true"/> My Crew</Link>
          <button type="button" className="rch-ux-quicklink" onClick={() => setRulesOpen(true)}><FaBookOpen aria-hidden="true"/> How to Play</button>
        </nav>
        <details className="rch-run-extras">
          <summary>More run tools</summary>
          <div className="rch-run-extra-links">
            <Link href="/runs/partners" aria-label="Runs Partner Network" className="rch-ux-quicklink"><FaBasketball aria-hidden="true"/> Parks & Rec</Link>
            <Link href="/badges" className="rch-ux-quicklink"><FaMedal aria-hidden="true"/> Badges</Link>
            <button type="button" className="rch-ux-quicklink" onClick={()=>{setCompetitionView('courts');document.getElementById('rch-competition')?.scrollIntoView({behavior:'auto',block:'start'});}}><FaTrophy aria-hidden="true"/> Court Crowns</button>
            <Link href="/runs/hosts" className="rch-ux-quicklink">Verified Hosts</Link>
            <Link href="/rep" className="rch-ux-quicklink">REP Exchange</Link>
            {staffIntelligence && <>
              <Link href="/runs/intelligence" className="rch-ux-quicklink">Statewide Intelligence</Link>
              <Link href="/admin/runs/weekend-circuit" className="rch-ux-quicklink">Weekend Circuit HQ</Link>
            </>}
            <button type="button" className="rch-ux-quicklink" onClick={() => setView(view === 'runs' ? 'rewards' : 'runs')}>{view === 'runs' ? 'REP Rewards' : 'Back to Runs'}</button>
          </div>
        </details>
        {courtParam&&selectedCourt&&<div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#366b9b] bg-[#102d4d] p-3 text-xs font-semibold text-[#cae6ff]"><FaLocationDot/>{selectedCourt.name}<Link href="/runs" className="ml-auto text-[#84caff]">Clear court filter</Link></div>}
        <details className="mb-4 rounded-xl border border-white/10 p-3">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">My run recommendations</summary>
          {view === 'runs' && !loading&&<RunDailyCircuit runs={dailyCandidates} cityId={gravityLocation.cityId} radiusMiles={gravityLocation.radiusMiles} onPreferencesChange={setDailyPrefs}/>}
        </details>
        {view === 'runs' && runs.some(run=>run.weekendMultiplier===2) && <section aria-label="Weekend Double XP Circuit" className="mb-5 rounded-2xl border border-[#eebc5a]/40 bg-[#1c2032] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[.15em] text-[#ffd47a]">RCH Weekend Circuit · Two courts per city</p><h2 className="mt-1 text-xl font-black text-white">DOUBLE RUNS REP EVERY WEEKEND</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-[#d3deef]">Saturday and Sunday rotate between two sets of local parks every week. Double rewards apply to independently verified games and reviewed stats; check-ins, highlights, and player-created Runs remain standard. Community drop-ins are not guaranteed staffed or reserved.</p></div>
            <span className="rounded-xl bg-[#ffd47a] px-3 py-2 text-sm font-black text-[#182137]">2× VERIFIED REP</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{runs.filter(run=>run.weekendMultiplier===2&&run.status!=='cancelled').slice(0,4).map(run=><Link key={run.id} href={'/runs/'+run.id} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-[#d0b46a]/20 bg-[#091629] px-3 py-3 text-sm font-bold text-white hover:border-[#ffd47a]/60"><span><span className="block text-xs font-bold text-[#ffda90]">{new Date(run.starts_at).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</span>{run.location}</span><FaArrowRight aria-hidden="true"/></Link>)}</div>
        </section>}
        {view === 'runs' && <GravityLocationPicker compact className="mb-4" />}
        {notice && <div className="mb-5 flex items-center gap-2 rounded-xl border border-rcl-blue/20 bg-rcl-blue/[.07] px-4 py-3 text-sm text-[#c8eaff]"><FaCircleCheck className="shrink-0" />{notice}<button onClick={() => setNotice('')} className="ml-auto text-white/35"><FaXmark /></button></div>}
        {createdRuns.length > 0 && <section aria-label="Share your new runs" className="mb-5 rounded-2xl border border-rcl-blue/30 bg-rcl-blue/[.07] p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-rcl-blue">Your schedule is live</p><p className="mt-1 text-sm text-white/60">Every date has its own RSVP and invitation.</p></div><button type="button" onClick={() => setCreatedRuns([])} aria-label="Dismiss new runs" className="rounded-lg border border-white/10 p-2 text-white/60"><FaXmark /></button></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{createdRuns.map(run=><div key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rcl-blue/15 bg-[#071522] px-4 py-3"><div><p className="font-semibold text-sm">{run.title}</p><p className="text-xs text-white/45">{new Date(run.starts_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</p></div><div className="flex gap-2"><ShareRunButton id={run.id} title={run.title}/><Link href={`/runs/${run.id}`} className="rounded-xl border border-rcl-blue/30 px-3 py-2.5 text-xs font-semibold text-rcl-blue">View</Link></div></div>)}</div>
        </section>}
        {error && <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</div>}

        {view === 'runs' && <section id="rch-upcoming-runs" className="mt-7 scroll-mt-20">
          <RCHSectionHeader eyebrow="FIND YOUR NEXT GAME" title="Upcoming Runs" description="Real courts, real people. See who's hosting and find a place on the floor." action={{href:'/runs/partners',label:'Explore organizers'}}/>
          <div className="rch-run-discovery-controls">
            <button type="button" className="rch-run-solo-toggle" aria-pressed={soloOnly} onClick={()=>setSoloOnly(v=>!v)}><FaBasketball aria-hidden="true"/>{soloOnly?'Solo spots only ✓':'Find a solo spot'}</button>
            <a href="#rch-competition" className="rch-run-passport-link"><FaMedal aria-hidden="true"/> My Passport</a>
            <button type="button" className="rch-run-clear" onClick={()=>{setTypeFilter('all');setSkillFilter('all');setRunSearch('');setSoloOnly(false);}}>Clear filters</button>
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

          {soloOnly&&!loading&&visibleRuns.length>0&&<p role="status" className="rch-run-solo-explainer">{visibleRuns.length} open {visibleRuns.length===1?'Run':'Runs'} taking individual RSVPs. No crew required to register.</p>}
          {loading ? <LoadingCard label="Finding runs and meetups…" /> : visibleRuns.length === 0 ? <RCHEmptyState title={runs.length?'No games match those filters':'THE COURT IS WAITING'} description={runs.length?'Try another game format, style or city. All Virginia is available through location preferences.':'There are no upcoming Runs scheduled yet. Be the one to bring your city to life, or explore independent partner organizers.'} actions={[{href:'/runs?create=1',label:'Host a Run',primary:true},{href:'/runs/partners',label:'Find organizers'}]}/> : <div className="rch-arena-run-slider">{visibleRuns.slice(0,visibleLimit).map((run) => <RunCard key={run.id} run={run} userId={user?.id} checkedIn={checkins.has(run.id)} highlightClaimed={highlightClaims.has(run.id)} busy={busy} onJoin={joinRun} onCheckIn={checkIn} onClaimHighlight={claimHighlight} />)}</div>}
          {view==='runs'&&visibleRuns.length>visibleLimit&&
            <div className="rch-run-load-more">
              <span>Showing {visibleLimit} of {visibleRuns.length} matching Runs</span>
              <button type="button" onClick={()=>setVisibleLimit(n=>n+8)}>Show more Runs <FaArrowRight aria-hidden="true"/></button>
            </div>}
        </section>}

        {view==='runs'&&<>
          {badges.length>0&&<section className="rch-run-badge-chase" aria-label="Run badges available to earn">
            <div className="rch-run-badge-heading"><div><p>COLLECT YOUR LEGACY</p><h2>Badge chase</h2></div><Link href="/badges">All badges <FaArrowRight aria-hidden="true"/></Link></div>
            <div className="rch-run-badge-grid">{badges.slice(0,3).map(badge=>
              <Link href="/badges" key={badge.id} className="rch-run-badge"><BadgeMedallion badge={badge} size="xs"/>
                <div><strong>{badge.name}</strong><span>{badge.tier} · Available to earn</span><small>{badge.description}</small></div>
              </Link>)}</div>
          </section>}
          <RunCultureMoments/>
        </>}
        {view==='runs'&&<section id="rch-competition" className="mt-9 scroll-mt-20">
          <RCHSectionHeader eyebrow="YOUR BASKETBALL LEGACY" title="Competition Center" description="Your verified history, court championships, and real player ladders."/>
          <div role="group" aria-label="Choose competition section" className="rch-ux-competition-tabs">
            {([
              ['passport','My Passport',FaMedal],
              ['courts','Court Dominion',FaTrophy],
              ['rankings','Ranked Arena',FaPeopleGroup],
            ] as const).map(([tab,label,Icon])=><button key={tab} type="button" aria-pressed={competitionView===tab} className="rch-ux-competition-tab" onClick={()=>setCompetitionView(tab)}><Icon aria-hidden="true"/>{label}</button>)}
          </div>
          <div className="rch-ux-competition-panel">
            {competitionView==='passport'&&<RunPassport />}
            {competitionView==='courts'&&<CourtDominion initialCourt={courtParam||''} showTakeovers/>}
            {competitionView==='rankings'&&<><RunRankedLadder/><RunArenaLeaderboard/></>}
          </div>
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
      <RunsRulesIntro open={rulesOpen} onClose={closeRules} />
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
  const count=run.players?.length??0;
  const joined=Boolean(userId&&run.players?.includes(userId));
  const host=userId===run.host_id;
  const start=new Date(run.starts_at);
  const startMs=start.getTime();
  const now=Date.now();
  const full=run.status==='full'||count>=run.max_players;
  const effectiveStatus=full&&run.status==='open'?'full':run.status;
  const canJoin=!joined&&!!userId&&!full&&run.status==='open';
  const checkInOpen=now>=startMs-2*3600000&&now<=startMs+6*3600000;
  const highlightWindow=now>=startMs-2*3600000&&now<=startMs+72*3600000;
  const dateLabel=start.toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  const experience=run.partner&&run.partner.experience==='rec'?'THE REC':run.partner&&run.partner.experience==='park'?'THE PARK':run.run_type==='competitive'?'COMPETITIVE':'COMMUNITY';
  return <article className="rch-ux-game" aria-label={run.title+' · '+effectiveStatus}>
    <div className="rch-ux-game-cover">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-[#b7e2ff]">{experience} · {run.game_format}</span>
        {run.weekendMultiplier===2&&<span className="rounded-full border border-[#ffe3a2]/60 bg-[#473410] px-2.5 py-1 text-[11px] font-black text-[#ffe3a2]">2× VERIFIED REP</span>}
        <RCHStatusChip status={effectiveStatus}/>
      </div>
      <Link href={'/runs/'+run.id} className="mt-5 text-white hover:text-[#bfe7ff]"><h3 className="rch-ux-game-title">{run.title}</h3></Link>
    </div>
    <div className="rch-ux-game-body">
      {run.weekendMultiplier===2&&<p className="text-xs leading-5 text-[#ffe3a2]">Featured weekend community drop-in · Court access and staffing are not guaranteed.</p>}
      {run.partner&&<Link href={'/runs/partners/'+run.partner.slug} className="inline-flex items-center gap-2 self-start rounded-lg border border-[#3d8c88] bg-[#123e45] px-3 py-2 text-xs font-bold text-[#bbf3e4]"><FaCircleCheck aria-hidden="true"/>{run.partner.name} · Approved organizer</Link>}
      <RCHRunDetails date={dateLabel} location={run.location} occupancy={count+' / '+run.max_players+' registered'} format={run.game_format}/>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-[#b7d2e5]">{skillLabels[run.skill_level]} · {runTypeLabels[run.run_type]}</span>
        {isSoloJoinable(run)&&<span className="rch-run-availability">{run.max_players-count} open {run.max_players-count===1?'spot':'spots'} · Solo RSVP</span>}
        {run.partner&&<span className="text-xs font-black text-[#f7d79c]">{run.partner.price_cents?'$'+(run.partner.price_cents/100).toFixed(2)+' · pay organizer':'Free session'}</span>}
      </div>
      <div className="rch-ux-game-cta">
        <div className="rch-run-card-primary">
        {canJoin?<button type="button" disabled={busy===`join-${run.id}`} onClick={()=>void onJoin(run)} className="rch-ux-btn-primary"><FaPlus aria-hidden="true"/> Join Run <FaArrowRight aria-hidden="true"/></button>:<Link href={'/runs/'+run.id} className="rch-ux-btn-primary">{joined?'Your Run Room':full?'View Full Run':'View Run'} <FaArrowRight aria-hidden="true"/></Link>}
        <ShareRunButton id={run.id} title={run.title} location={run.location} startsAt={run.starts_at} format={run.game_format}/>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {joined&&<button type="button" disabled={busy===`join-${run.id}`} onClick={()=>void onJoin(run)} className="rch-ux-game-secondary">Leave Run</button>}
          <a href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(run.location)} className="rch-ux-game-secondary" target="_blank" rel="noopener noreferrer">Directions <FaArrowUpRightFromSquare aria-hidden="true"/></a>
        </div>
      </div>
      <details className="group border-t border-[#315573] pt-3">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 text-xs font-bold text-[#b9dcf2]">Host, share &amp; other actions <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span></summary>
        <p className="mb-3 text-xs leading-5 text-[#bed6e6]">Hosted by {run.partner?.name||run.host?.display_name||run.host?.username||'RCH member'}{run.verified_host?' · RCH verified host':''}</p>
        <div className="flex flex-wrap gap-2">
          {checkInOpen&&(joined||host)&&<button disabled={checkedIn||busy===`checkin-${run.id}`} onClick={()=>void onCheckIn(run)} className="rch-ux-btn-secondary">{checkedIn?'Checked in ✓':'Check in'}</button>}
          {(joined||host)&&highlightWindow&&<><Link href="/social?compose=1" className="rch-ux-btn-secondary">Post highlight</Link><button disabled={highlightClaimed||busy===`highlight-${run.id}`} onClick={()=>void onClaimHighlight(run)} className="rch-ux-btn-secondary">{highlightClaimed?'Highlight reward claimed':'Claim eligible highlight REP'}</button></>}
        </div>
      </details>
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
      <label><span className="text-xs font-semibold text-white/42">Date</span><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#050b11] px-4 py-3 text-sm outline-none" /></label>
      <label><span className="text-xs font-semibold text-white/42">Start time</span><input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#050b11] px-4 py-3 text-sm outline-none" /></label>
      <label><span className="text-xs font-semibold text-white/42">Format</span><select value={form.game_format} onChange={(event) => setForm({ ...form, game_format: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#08111a] px-4 py-3 text-sm"><option>5v5</option><option>4v4</option><option>3v3</option><option>2v2</option><option>1v1</option><option value="open_run">Open run</option><option>Shootaround</option></select></label>
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
function ShareRunButton({ id, title, location, startsAt, format }: { id: string; title: string; location?:string; startsAt?:string; format?:string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function share() {
    const url = runInviteUrl(window.location.origin, id);
    try {
      if (navigator.share) {
        await navigator.share({ title, text: location&&startsAt&&format ? runShareText({title,location,starts_at:startsAt,game_format:format}) : 'Pull up to this basketball Run on Rich City Hoops.', url });
        setState('idle');
        return;
      }
      await navigator.clipboard.writeText((location&&startsAt&&format ? runShareText({title,location,starts_at:startsAt,game_format:format})+'\n' : '')+url);
      setState('copied');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setState('error');
    }
  }

  return <button type="button" onClick={() => void share()} aria-label={'Share '+title} className="rch-run-share-button">{state === 'copied' ? 'Copied ✓' : state === 'error' ? 'Retry share' : <><FaArrowUpRightFromSquare aria-hidden="true"/> Share</>}</button>;
}

'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaArrowLeft,
  FaArrowRight,
  FaBasketball,
  FaCamera,
  FaCircleCheck,
  FaImage,
  FaLocationDot,
  FaPeopleGroup,
  FaShareNodes,
  FaTrophy,
  FaVideo,
} from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ClientPageHero } from '@/components/ClientPageHero';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { RunRankedMatchControl } from '@/components/runs/RunRankedMatchControl';
import { RunCrewEntries } from '@/components/runs/RunCrewEntries';
import { RunCrewTeamLinker } from '@/components/runs/RunCrewTeamLinker';
import { RunOperationsHQ } from '@/components/runs/RunOperationsHQ';
import { RunVerifiedSignal } from '@/components/runs/RunVerifiedSignal';
import { RunMasterOfficialControl } from '@/components/runs/RunMasterOfficialControl';
import { RunNextUp } from '@/components/runs/RunNextUp';
import {RunLobbyReadiness} from '@/components/runs/RunLobbyReadiness';
import {RunsGameplayJourney} from '@/components/runs/RunsGameplayJourney';
import {RunTeamMatchupBoard} from '@/components/runs/RunTeamMatchupBoard';
import { RunResultAppeals } from '@/components/runs/RunResultAppeals';
import './run-room-game.css';

type Run = {
  id: string;
  host_id: string;
  run_type: string;
  title: string;
  description: string | null;
  court_name: string | null;
  location: string;
  location_slug: string | null;
  starts_at: string;
  skill_level: string;
  game_format: string | null;
  max_players: number;
  status: string;
};

type PartnerSession={slug:string;name:string;experience:'park'|'rec';price_cents:number};
type Profile = { id: string; display_name: string | null; username: string | null; avatar_url?: string | null };
type Team = { id: string; name: string; sort_order: number };
type Member = { run_team_id: string; profile_id: string };
type Game = { id: string; home_run_team_id: string; away_run_team_id: string; home_score: number; away_score: number; status: string; played_at: string | null };
type Reliability = { profile_id: string; runs_joined: number; verified_checkins: number; reliability_pct: number | null };
type RunPost = { id: string; author_id: string; body: string; media_urls: string[]; created_at: string; author?: Profile };

function isVideoUrl(url: string) {
  return /\.(?:mp4|webm|mov|ogv)(?:\?|#|$)/i.test(url);
}

export default function RunRoomPage() {
  const params = useParams<{ id: string }>();
  const runId = params.id;
  const searchParams=useSearchParams();
  const fromCourt=searchParams.get('fromCourt');
  const fromCity=searchParams.get('fromCity');
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(true), []);
  const db = supabase as any;

  const [run, setRun] = useState<Run | null>(null);
  const [partner, setPartner] = useState<PartnerSession | null>(null);
  const [weekendDoubleRep, setWeekendDoubleRep] = useState(false);
  const [suggestedCourt, setSuggestedCourt] = useState(false);
  const [listingStatusUnknown, setListingStatusUnknown] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [registeredPlayerIds,setRegisteredPlayerIds]=useState<string[]>([]);
  const [checkins, setCheckins] = useState<Set<string>>(new Set());
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [reliability, setReliability] = useState<Reliability[]>([]);
  const [runPosts, setRunPosts] = useState<RunPost[]>([]);
  const [highlightClaimed, setHighlightClaimed] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [checkInCode,setCheckInCode]=useState('');
  const [hostCourtCode,setHostCourtCode]=useState('');
  const [teamName, setTeamName] = useState('');
  const [gameDraft, setGameDraft] = useState({ home: '', away: '', homeScore: '', awayScore: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!db || !runId) return;
    setError('');
    const [runResult, playersResult, checkResult, teamResult, memberResult, gameResult, mediaResult, claimResult] = await Promise.all([
      db.from('runs').select('id,host_id,run_type,title,description,court_name,location,location_slug,starts_at,skill_level,game_format,max_players,status').eq('id', runId).maybeSingle(),
      db.from('run_players').select('profile_id').eq('run_id', runId),
      db.from('run_checkins').select('profile_id').eq('run_id', runId),
      db.from('run_teams').select('id,name,sort_order').eq('run_id', runId).order('sort_order'),
      db.from('run_team_members').select('run_team_id,profile_id').eq('run_id', runId),
      db.from('run_games').select('id,home_run_team_id,away_run_team_id,home_score,away_score,status,played_at').eq('run_id', runId).order('created_at', { ascending: false }),
      db.from('posts').select('id,author_id,body,media_urls,created_at').eq('run_id', runId).eq('status', 'published').order('created_at', { ascending: false }).limit(40),
      user ? db.from('run_highlight_claims').select('id').eq('run_id', runId).eq('profile_id', user.id).limit(1) : Promise.resolve({ data: [], error: null }),
    ]);

    if (runResult.error) {
      setError(runResult.error.message);
      return;
    }

    setRun((runResult.data ?? null) as Run | null);
    const {data:weekend,error:circuitError}=await db.from('rch_weekend_circuit_events').select('run_id,bonus_enabled').eq('run_id',runId).maybeSingle();
    setListingStatusUnknown(Boolean(circuitError));
    setSuggestedCourt(Boolean(weekend));
    setWeekendDoubleRep(Boolean(weekend?.bonus_enabled));
    const {data:linked}=await db.from('rch_runs_partner_sessions').select('partner_id,experience,price_cents').eq('run_id',runId).maybeSingle();
    if(linked){
      const {data:org}=await db.from('rch_runs_partners').select('slug,name,status').eq('id',linked.partner_id).eq('status','approved').maybeSingle();
      setPartner(org?{slug:org.slug,name:org.name,experience:linked.experience,price_cents:linked.price_cents}:null);
    }else setPartner(null);
    const playerIds = (playersResult.data ?? []).map((item: any) => item.profile_id) as string[];
    setRegisteredPlayerIds(playerIds);
    const mediaRows = (mediaResult.data ?? []) as Array<Omit<RunPost, 'media_urls'> & { media_urls: unknown }>;
    const mediaAuthorIds = mediaRows.map((item) => item.author_id);
    const identityIds = [...new Set([...playerIds, ...mediaAuthorIds])];

    if (identityIds.length) {
      const [profileResult, reliabilityResult] = await Promise.all([
        db.from('profiles').select('id,display_name,username,avatar_url').in('id', identityIds),
        playerIds.length ? db.from('run_reliability').select('*').in('profile_id', playerIds) : Promise.resolve({ data: [] }),
      ]);
      const identityRows = (profileResult.data ?? []) as Profile[];
      const profileMap = new Map(identityRows.map((profile) => [profile.id, profile]));
      setProfiles(identityRows.filter((profile) => playerIds.includes(profile.id)));
      setReliability((reliabilityResult.data ?? []) as Reliability[]);
      setRunPosts(mediaRows.map((post) => ({
        ...post,
        media_urls: Array.isArray(post.media_urls) ? post.media_urls.filter((url): url is string => typeof url === 'string') : [],
        author: profileMap.get(post.author_id),
      })));
    } else {
      setProfiles([]);
      setReliability([]);
      setRunPosts([]);
    }

    setCheckins(new Set((checkResult.data ?? []).map((item: any) => item.profile_id)));
    setTeams((teamResult.data ?? []) as Team[]);
    setMembers((memberResult.data ?? []) as Member[]);
    setGames((gameResult.data ?? []) as Game[]);
    setHighlightClaimed(Boolean((claimResult.data ?? []).length));

    if (user) {
      const { data } = await db.rpc('can_manage_run', { target_run: runId });
      setCanManage(Boolean(data));
    } else {
      setCanManage(false);
    }
  }, [db, runId, user]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const savedNotice = window.sessionStorage.getItem('rcl-run-highlight-notice');
    if (!savedNotice) return;
    window.sessionStorage.removeItem('rcl-run-highlight-notice');
    setNotice(savedNotice);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel(`run-room-${runId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'run_players', filter: `run_id=eq.${runId}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'run_checkins', filter: `run_id=eq.${runId}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'run_team_members', filter: `run_id=eq.${runId}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'run_games', filter: `run_id=eq.${runId}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `run_id=eq.${runId}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, runId, supabase]);

  const name = (id: string) => {
    const profile = profiles.find((item) => item.id === id);
    return profile?.display_name ?? (profile?.username ? `@${profile.username}` : 'RCL Player');
  };

  const team = (id: string) => teams.find((item) => item.id === id)?.name ?? 'Team';
  const joined = Boolean(user && (run?.host_id === user.id || registeredPlayerIds.includes(user.id)));
  const returnCourt=run?.location_slug&&(fromCourt===run.location_slug||!fromCourt)?run.location_slug:null;
  const returnHref=returnCourt?'/runs/courts/'+encodeURIComponent(returnCourt)+(fromCity&&/^[a-z-]{2,40}$/.test(fromCity)?'?fromCity='+encodeURIComponent(fromCity):''):null;
  const registered = Boolean(user && registeredPlayerIds.includes(user.id));
  const spotsLeft=run?Math.max(0,run.max_players-registeredPlayerIds.length):0;
  const startMs = run ? new Date(run.starts_at).getTime() : 0;
  const isPastRun=startMs<=Date.now();
  const canJoin=Boolean(run?.status==='open'&&spotsLeft>0&&!isPastRun&&!listingStatusUnknown);
  const now = Date.now();
  const checkInOpen = Boolean(run && !suggestedCourt && !listingStatusUnknown && ['open','full'].includes(run.status) && now >= startMs - 2 * 60 * 60 * 1000 && now <= startMs + 6 * 60 * 60 * 1000);
  const canIssueCode=Boolean(canManage&&run&&!suggestedCourt&&!listingStatusUnknown&&['open','full'].includes(run.status)&&now>=startMs-12*3600000&&now<=startMs+6*3600000);
  const highlightWindow = Boolean(run && !suggestedCourt && now >= startMs - 2 * 60 * 60 * 1000 && now <= startMs + 72 * 60 * 60 * 1000);

  const toggleRegistration = async () => {
    if(!db||!run)return;
    if(!user){window.location.href='/auth/sign-in?next='+encodeURIComponent('/runs/'+runId);return;}
    if(user.id===run.host_id&&!registered){setNotice('You are hosting this Run. Manage its roster through the event tools.');return;}
    if(!registered&&!canJoin){setError('This Run is full or no longer accepting registrations.');return;}
    setBusy('registration');setError('');setNotice('');
    const result=registered
      ?await db.from('run_players').delete().eq('run_id',run.id).eq('profile_id',user.id)
      :await db.from('run_players').insert({run_id:run.id,profile_id:user.id});
    if(result.error)setError(result.error.message);
    else{setNotice(registered?(suggestedCourt?'You withdrew your interest.':'You left this Run.'):(suggestedCourt?'Interest registered. No game, organizer or court access is guaranteed. Coordinate with players before traveling.':'You joined this Run. Review venue rules and arrive during the posted event window.'));await load();}
    setBusy('');
  };

  const addTeam = async () => {
    if (!db || !user || !teamName.trim()) return;
    setBusy('team');
    setError('');
    const { error: insertError } = await db.from('run_teams').insert({ run_id: runId, name: teamName.trim(), created_by: user.id, sort_order: teams.length });
    if (insertError) setError(insertError.message);
    else {
      setTeamName('');
      setNotice('Run team created.');
      await load();
    }
    setBusy('');
  };

  const assign = async (profileId: string, teamId: string) => {
    if (!db) return;
    setBusy(`member-${profileId}`);
    setError('');
    const result = teamId
      ? await db.from('run_team_members').upsert({ run_id: runId, run_team_id: teamId, profile_id: profileId }, { onConflict: 'run_id,profile_id' })
      : await db.from('run_team_members').delete().eq('run_id', runId).eq('profile_id', profileId);
    if (result.error) setError(result.error.message);
    await load();
    setBusy('');
  };

  const record = async () => {
    if (!db || !user || !gameDraft.home || !gameDraft.away || gameDraft.home === gameDraft.away) return;
    const homeScore = Number(gameDraft.homeScore);
    const awayScore = Number(gameDraft.awayScore);
    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
      setError('Enter valid whole-number scores.');
      return;
    }
    setBusy('game');
    const { error: insertError } = await db.from('run_games').insert({
      run_id: runId,
      home_run_team_id: gameDraft.home,
      away_run_team_id: gameDraft.away,
      home_score: homeScore,
      away_score: awayScore,
      status: 'completed',
      played_at: new Date().toISOString(),
      created_by: user.id,
    });
    if (insertError) setError(insertError.message);
    else {
      setNotice('Pickup scorecard saved. Rankings, World XP and REP remain pending until independent match confirmation.');
      setGameDraft({ home: '', away: '', homeScore: '', awayScore: '' });
      await load();
    }
    setBusy('');
  };

  const cancelRun=async()=>{
    if(!db||!run||!user||user.id!==run.host_id||!['open','full'].includes(run.status))return;
    if(games.length>0){
      setError('Recorded game results exist. Stop play for safety and contact RCH staff to preserve scored-match history before changing the Run status.');return;
    }
    if(!window.confirm('Cancel this hosted Run? All RSVPs will stop accepting signups. You must also notify your players directly; this action does not send a message.'))return;
    setBusy('cancel');setError('');
    const {error:cancelError}=await db.from('runs').update({status:'cancelled'}).eq('id',run.id).eq('host_id',user.id).in('status',['open','full']);
    if(cancelError)setError(cancelError.message);
    else {setNotice('Run cancelled. Notify all registered players directly and announce the weather or venue change.');await load();}
    setBusy('');
  };

  const issueCourtCode=async()=>{
    if(!db||!run||!canIssueCode)return;
    setBusy('issue-code');setError('');setHostCourtCode('');
    const {data,error:codeError}=await db.rpc('rch_issue_run_checkin_code',{p_run:run.id});
    if(codeError)setError(codeError.message);
    else {setHostCourtCode(String(data||''));setNotice('A new code is active. Share it in person only; generating another invalidates the previous code.');}
    setBusy('');
  };

  const checkIn = async () => {
    if (!db || !user || !run) {
      window.location.href = `/auth/sign-in?next=${encodeURIComponent(`/runs/${runId}#rch-game-day`)}`;
      return;
    }
    if(!checkInOpen||!checkInCode.trim()){
      setError('Ask the event host for the current court code and enter it before checking in.');return;
    }
    setBusy('checkin');
    setError('');
    const { data, error: rpcError } = await db.rpc('rch_check_in_with_code', { p_run: run.id, p_code: checkInCode.trim() });
    if (rpcError) setError(rpcError.message);
    else {
      setCheckInCode('');
      setNotice(Number(data ?? 0) > 0 ? '+15 XP recorded for your court-code check-in.' : 'You are already checked in.');
      await load();
    }
    setBusy('');
  };

  const claimHighlight = async () => {
    if (!db || !user || !run) return;
    setBusy('highlight');
    setError('');
    const { data, error: rpcError } = await db.rpc('rch_claim_checked_in_run_highlight', { p_run: run.id });
    if (rpcError) setError(rpcError.message);
    else {
      const reward = Number(data?.[0]?.rep_awarded ?? 0);
      setNotice(reward ? `+${reward} XP recorded for your checked-in Run highlight.` : 'Your highlight reward for this Run is already claimed.');
      await load();
    }
    setBusy('');
  };

  const shareRun = async () => {
    if (!run) return;
    const url = `${window.location.origin}/runs/${run.id}`;
    try {
      if (navigator.share) await navigator.share({ title: run.title, text: 'Join this RCL Open Run.', url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice('Run link copied.');
      }
    } catch {
      // User cancelled the native share sheet.
    }
  };

  if (!run) {
    return <main className="rcl-social-secondary min-h-screen bg-[#03070d] p-8 text-white"><Container maxWidth="lg"><p className="rounded-3xl border border-white/10 p-10 text-center text-white/40">{error || 'Loading run…'}</p></Container></main>;
  }

  return (
    <main className="rcl-social-secondary min-h-screen bg-[#03070d] pb-28 text-white">
      {listingStatusUnknown&&<div className="mx-auto max-w-6xl px-4 pt-4" role="alert"><div className="rounded-2xl border border-red-400/40 bg-[#351515] px-4 py-3 text-sm font-semibold text-red-100">Listing verification is temporarily unavailable. Registration is paused until this page can confirm whether an organizer is present. Refresh before making travel plans.</div></div>}
      {suggestedCourt&&<div className="mx-auto max-w-6xl px-4 pt-4"><div className="rounded-2xl border border-[#eabf70]/60 bg-[#2c250f] px-4 py-3 text-sm font-black text-[#ffe4b5]">SUGGESTED OPEN COURT · NOT A CONFIRMED GAME<p className="mt-1 text-xs font-normal leading-5 text-[#f7e8cf]">This is an unstaffed public-court meetup suggestion. There is no confirmed organizer, reserved court, guaranteed attendance or independently verified host. RSVP expresses interest only. Check venue availability and coordinate with other players before traveling.</p></div></div>}
      {weekendDoubleRep&&<div className="mx-auto max-w-6xl px-4 pt-4"><div className="rounded-2xl border border-[#d4a34d]/50 bg-[#30270e] px-4 py-3 text-sm font-bold text-[#ffe3a2]">2× Verified Runs REP · Weekend Circuit <span className="block pt-1 text-xs font-normal text-[#efe2c6]">Double rewards apply to independently confirmed ranked games and independently reviewed stats only. Check-ins and highlights stay at 1×. This is a community drop-in, not a reserved or staffed court.</span></div></div>}
      <ClientPageHero
        eyebrow="RCL Runs"
        title={suggestedCourt?'Weekend Court Suggestion · '+(run.court_name||run.location):run.title}
        accent={run.status === 'cancelled' ? 'Cancelled' : isPastRun?'Past listing':suggestedCourt?'Court suggestion':'Run Room'}
        description={suggestedCourt?'Public court discovery only—not an organized or confirmed basketball event.':run.description ?? 'Pickup basketball organized through RCL Runs.'}
        assetKey="runs.cover"
        actions={<div className="flex flex-wrap gap-2">{returnHref&&<Link href={returnHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#5592bb] bg-[#103b5c] px-4 text-xs font-black uppercase"><FaArrowLeft/> Back to Court Arena</Link>}{partner&&<Link href={'/runs/partners/'+partner.slug} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#65b6ff]/40 bg-[#13456c] px-4 text-xs font-black uppercase">{partner.experience==='rec'?'THE REC':'THE PARK'} · {partner.name} <FaArrowLeft/></Link>}<Link href="/runs" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-black uppercase"><FaArrowLeft />Runs</Link><button type="button" onClick={() => void shareRun()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-black uppercase"><FaShareNodes />Share</button></div>}
        meta={<div className="min-w-52 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 p-5"><p className="text-[10px] font-black uppercase tracking-wider text-rcl-blue"><FaLocationDot className="mr-1 inline" />{run.court_name || run.location}</p><p className="mt-2 text-sm font-black">{new Date(run.starts_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' })}</p><p className="mt-2 text-xs text-white/35">{run.skill_level} · {run.game_format ?? 'Pickup'} · {profiles.length}/{run.max_players}</p></div>}
      />

      <Container maxWidth="xl" className="py-9">
        <RunsGameplayJourney runId={run.id} format={run.game_format||'unknown'} status={run.status} capacity={run.max_players}
          suggested={suggestedCourt} listingUnknown={listingStatusUnknown} past={isPastRun}
          registeredIds={registeredPlayerIds} checkedInIds={Array.from(checkins)} profiles={profiles}
          userId={user?.id||null} scorecardCount={games.length}/>
        <RunTeamMatchupBoard format={run.game_format||'unknown'} teams={teams} members={members}
          profiles={profiles} registeredIds={registeredPlayerIds} checkedInIds={Array.from(checkins)}
          canManage={canManage} suggested={suggestedCourt||listingStatusUnknown||isPastRun} status={run.status}/>
        <section aria-label="Your game-day pathway" className="mb-7 overflow-hidden rounded-3xl border border-[#4f84ae] bg-[linear-gradient(135deg,#102f53,#071528)] p-5 shadow-[0_15px_45px_#0006] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black tracking-[.2em] text-[#9cd9ff]">RUNS WORLD / GAME LOBBY</p><h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">{suggestedCourt?'Find players before you go.':'The real game starts here.'}</h2><p className="mt-2 max-w-xl text-xs leading-6 text-[#bdd7e9]">{suggestedCourt?'Express interest and coordinate with other players. A public court listing is not a confirmed game or a court reservation.':'Meet the roster, register for an available place, then show up at the real court. Score review and rewards remain separate from checking in.'}</p></div><div className="rounded-xl border border-[#6499bf] bg-[#071b2f] px-4 py-3 text-right"><small className="block text-[10px] font-bold text-[#99c5e3]">{suggestedCourt?'INTERESTED PLAYERS':'REGISTERED PLAYERS'}</small><strong className="text-2xl font-black text-white">{registeredPlayerIds.length}<span className="text-[#7da4bb]"> / {run.max_players}</span></strong><small className="block text-[10px] text-[#b0dbf3]">{spotsLeft?spotsLeft+' open spots':run.status==='full'?'Full':'No open spots'}</small></div></div>
          <div className="mt-5 flex flex-wrap gap-3"><button id="rch-join-action" type="button" onClick={()=>void toggleRegistration()} disabled={busy==='registration'||(user?.id===run.host_id&&!registered)||(!registered&&!canJoin)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-3 rounded-xl border border-[#8bd1ff] bg-[#196cef] px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-55 sm:flex-none"><FaBasketball/>{busy==='registration'?'Updating registration…':registered?(suggestedCourt?'Withdraw Interest':'Leave Run'):joined?'Hosting this Run':canJoin?(suggestedCourt?'REGISTER INTEREST':'JOIN THIS RUN'):run.status==='cancelled'?'Run Cancelled':isPastRun?'Listing Ended':'Registration Closed'}<FaArrowRight/></button><button type="button" onClick={()=>void shareRun()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#4b789a] bg-[#0d304e] px-5 text-xs font-bold"><FaShareNodes/> Invite your crew</button><button type="button" onClick={()=>void load()} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#436e8d] bg-[#0b2841] px-4 text-xs font-bold text-[#c5e5f8]">Refresh slots</button></div>
          <RunLobbyReadiness format={run.game_format||'unknown'} registered={registeredPlayerIds.length} capacity={run.max_players} status={run.status} suggested={suggestedCourt} past={isPastRun}/>
          <nav aria-label="Game-day sections" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
           {([{id:'rch-run-lobby',title:'01 · Lobby'},{id:'rch-game-day',title:'02 · Check in'},{id:'rch-next-up',title:'03 · Next Up'},{id:'rch-result-review',title:'04 · Results'},...(canManage?[{id:'rch-host-operations',title:'Host ops'}]:[])] as const).map(step=><a key={step.id} href={'#'+step.id} className="flex min-h-11 items-center justify-center rounded-lg border border-[#375f85] bg-[#061e34] px-2 text-center text-[11px] font-bold text-[#d0e9fb] hover:border-[#91d7ff]">{step.title}</a>)}
          </nav>
          {canJoin&&!registered&&<p className="mt-3 text-xs font-semibold text-[#d6e9f4]">{suggestedCourt?'Solo players welcome, but joining is not a promise of opponents, a host or open court time.':'Pull up solo — you don&apos;t need a crew to reserve an open roster spot. The host arranges the game.'}</p>}
          {!user&&<p className="mt-3 text-xs text-[#b9d6eb]">Sign in to register, check in and save your verified basketball progression.</p>}
          <p className="mt-3 text-[10px] leading-5 text-[#9cbdd5]"><FaCircleCheck className="mr-1 inline"/> In-person code check-ins grant legacy XP only. Competitive REP, ratings and Court Master titles require independently confirmed game results and separate official certification.</p>
        </section>
        {user?.id===run.host_id&&['open','full'].includes(run.status)&&<div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4"><div><p className="text-xs font-black text-[#d3e6f3]">Host event control</p><p className="mt-1 text-xs text-white/65">Bad weather or no usable court? Cancel before play, then contact your registered players directly.</p></div><button type="button" disabled={busy==='cancel'||games.length>0} onClick={()=>void cancelRun()} className="min-h-11 rounded-xl border border-red-300/40 bg-red-900/20 px-4 text-xs font-bold text-red-200 disabled:opacity-40">Cancel hosted Run</button></div>}
        {partner&&<div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#4288b5] bg-[#0a3453] p-4"><div><p className="text-[11px] font-black uppercase tracking-wider text-[#92d2ff]">Official Runs Partner · {partner.experience==='rec'?'The REC':'The PARK'}</p><p className="mt-1 text-lg font-black text-white">Organized by {partner.name}</p><p className="mt-1 text-xs text-[#bdd7e9]">{partner.price_cents?'Advertised organizer fee $'+(partner.price_cents/100).toFixed(2)+' · Pay the organizer directly':'Free session · No advertised entry fee'} · RCH verifies competitive results separately</p></div><Link href={'/runs/partners/'+partner.slug} className="rounded-xl border border-[#73b6e3] px-4 py-2 text-xs font-bold text-[#cbeaff]">Partner HQ profile →</Link></div>}
        {notice && <p className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-4 text-sm text-emerald-100">{notice}</p>}
        {error && <p className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/[.06] p-4 text-sm text-red-100">{error}</p>}

        <section id="rch-game-day" className="mb-6 grid scroll-mt-36 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Game day check-in and media">
          {canIssueCode&&<div className="rounded-2xl border border-[#77a3c6] bg-[#102c42] p-4 sm:col-span-2"><p className="text-[10px] font-black uppercase tracking-wider text-[#b8ddf6]">HOST · IN-PERSON CHECK-IN</p><p className="mt-1 text-sm text-white">Issue a one-time event code when you reach the court. Show it only to players who are physically present. Reissuing invalidates the previous code.</p><button type="button" onClick={()=>void issueCourtCode()} disabled={busy==='issue-code'} className="mt-3 min-h-11 rounded-xl bg-rcl-orange px-4 text-xs font-black text-black disabled:opacity-50">{busy==='issue-code'?'Issuing…':hostCourtCode?'Rotate court code':'Generate court code'}</button>{hostCourtCode&&<p className="mt-3 rounded-xl bg-black/30 p-3 font-mono text-xl font-black tracking-[.16em] text-[#bce8ff]" aria-label="Current court check-in code">{hostCourtCode}</p>}</div>}
          {checkInOpen&&(joined||registered)&&<div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[.05] p-4 sm:col-span-2"><label htmlFor="rch-court-code" className="text-xs font-black text-emerald-200">IN-PERSON COURT CHECK-IN · +15 XP</label>{user&&checkins.has(user.id)?<p className="mt-2 text-sm text-emerald-200">Checked in ✓</p>:<><p className="mt-2 text-xs text-white/70">Ask the host for the current code at the court. RSVP alone does not confirm attendance.</p><div className="mt-3 flex flex-wrap gap-2"><input id="rch-court-code" aria-label="In-person court code" autoComplete="off" spellCheck={false} maxLength={12} value={checkInCode} onChange={event=>setCheckInCode(event.target.value.toUpperCase().replace(/[^A-F0-9]/g,''))} placeholder="12-character court code" className="min-h-11 min-w-0 flex-1 rounded-xl border border-emerald-400/30 bg-[#0b2332] px-3 font-mono text-sm text-white placeholder:text-white/50" /><button type="button" onClick={()=>void checkIn()} disabled={busy==='checkin'||checkInCode.length!==12} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-40">{busy==='checkin'?'Checking in…':'Check in'}</button></div></>}</div>}
          <Link href={`/runs/${run.id}/highlight?mode=clip`} className="rounded-2xl border border-rcl-orange/20 bg-rcl-orange/[.05] p-4"><span className="text-[10px] font-black uppercase tracking-wider text-rcl-orange">Run Tape</span><strong className="mt-1 flex items-center gap-2 text-sm"><FaVideo />Drop a clip</strong></Link>
          <Link href={`/runs/${run.id}/highlight?mode=moment`} className="rounded-2xl border border-rcl-blue/20 bg-rcl-blue/[.05] p-4"><span className="text-[10px] font-black uppercase tracking-wider text-rcl-blue">Run Tape</span><strong className="mt-1 flex items-center gap-2 text-sm"><FaCamera />Post photos</strong></Link>
          {joined && highlightWindow && <button type="button" onClick={() => void claimHighlight()} disabled={highlightClaimed || busy === 'highlight'} className="rounded-2xl border border-rcl-blue/20 bg-white/[.025] p-4 text-left disabled:opacity-55"><span className="text-[10px] font-black uppercase tracking-wider text-rcl-blue">Verified highlight</span><strong className="mt-1 block text-sm">{highlightClaimed ? 'Reward claimed ✓' : 'Claim +35 XP'}</strong></button>}
        </section>

        <section id="rch-run-lobby" className="grid scroll-mt-36 gap-6 lg:grid-cols-[.75fr_1.25fr]" aria-label="Run roster and floor">
          <article className="rounded-3xl border border-white/10 bg-white/[.02] p-6">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue"><FaPeopleGroup className="mr-1 inline" />Run roster</p>
            <h2 className="mt-1 font-display text-2xl font-black uppercase">Registered players</h2>
            <div className="mt-5 space-y-2">
              {profiles.map((profile) => {
                const rel = reliability.find((item) => item.profile_id === profile.id);
                const member = members.find((item) => item.profile_id === profile.id);
                return <div key={profile.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black">{name(profile.id)}</p><p className="mt-1 text-[10px] text-white/35">{checkins.has(profile.id) ? 'Verified check-in' : 'Joined'} · Reliability {rel?.reliability_pct ?? '—'}%</p></div>{checkins.has(profile.id) && <FaCircleCheck className="text-emerald-300" />}</div>{canManage && teams.length ? <select disabled={busy === `member-${profile.id}`} value={member?.run_team_id ?? ''} onChange={(event) => void assign(profile.id, event.target.value)} className="mt-3 h-10 w-full rounded-xl border border-white/10 bg-[#071018] px-3 text-xs text-white"><option value="">Unassigned</option>{teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : null}</div>;
              })}
              {!profiles.length && <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/35">No players have joined yet.</p>}
            </div>
          </article>

          <div className="space-y-6">
            <article className="rounded-3xl border border-rcl-blue/15 bg-[#071522]/40 p-6">
              <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue"><FaBasketball className="mr-1 inline" />Pickup teams</p><h2 className="mt-1 font-display text-2xl font-black uppercase">Organize the floor</h2></div>{canManage ? <div className="flex gap-2"><input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Team name" className="h-10 rounded-xl border border-white/10 bg-black/25 px-3 text-sm outline-none focus:border-rcl-blue/40" /><button onClick={() => void addTeam()} disabled={busy === 'team' || !teamName.trim()} className="rounded-xl bg-rcl-orange px-4 text-[10px] font-black uppercase text-black disabled:opacity-40">Add</button></div> : null}</div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">{teams.length ? teams.map((item) => <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-5"><h3 className="font-display text-xl font-black uppercase">{item.name}</h3><div className="mt-3 space-y-2">{members.filter((member) => member.run_team_id === item.id).map((member) => <p key={member.profile_id} className="rounded-xl bg-white/[.03] px-3 py-2 text-xs">{name(member.profile_id)}</p>)}{!members.some((member) => member.run_team_id === item.id) && <p className="text-xs text-white/30">No players assigned.</p>}</div></div>) : <p className="sm:col-span-2 rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/35">The run host can create teams once players arrive.</p>}</div>
            </article>

            <article className="rounded-3xl border border-rcl-orange/15 bg-rcl-orange/[.025] p-6">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange"><FaTrophy className="mr-1 inline" />Run results</p>
              <h2 className="mt-1 font-display text-2xl font-black uppercase">Record an unverified score</h2><p className="mt-1 text-xs text-white/60">Scorecards are not ranked results. Opposing checked-in players must separately confirm a game before ratings or awards change.</p>
              {canManage && teams.length >= 2 && !suggestedCourt && !listingStatusUnknown ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><select aria-label="Away team" value={gameDraft.away} onChange={(event) => setGameDraft((current) => ({ ...current, away: event.target.value }))} className="field"><option value="">Away team</option>{teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input aria-label="Away team final score" inputMode="numeric" value={gameDraft.awayScore} onChange={(event) => setGameDraft((current) => ({ ...current, awayScore: event.target.value }))} className="field" placeholder="Score" /><select aria-label="Home team" value={gameDraft.home} onChange={(event) => setGameDraft((current) => ({ ...current, home: event.target.value }))} className="field"><option value="">Home team</option>{teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input aria-label="Home team final score" inputMode="numeric" value={gameDraft.homeScore} onChange={(event) => setGameDraft((current) => ({ ...current, homeScore: event.target.value }))} className="field" placeholder="Score" /><button onClick={() => void record()} disabled={busy === 'game'} className="h-11 rounded-xl bg-rcl-orange px-4 text-[10px] font-black uppercase text-black disabled:opacity-40">Record</button></div> : null}
              <div className="mt-5 space-y-2">{games.length ? games.map((game) => <div key={game.id} className="grid grid-cols-[1fr_auto_1fr] items-center rounded-2xl border border-white/10 bg-black/20 p-4"><div><p className="text-[9px] uppercase text-white/30">Away</p><p className="font-black">{team(game.away_run_team_id)}</p></div><p className="font-display text-3xl font-black">{game.away_score}<span className="mx-2 text-white/20">–</span>{game.home_score}</p><div className="text-right"><p className="text-[9px] uppercase text-white/30">Home</p><p className="font-black">{team(game.home_run_team_id)}</p></div></div>) : <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/35">No pickup results recorded yet.</p>}</div>
            </article>
          </div>
        </section>

        {!suggestedCourt&&!listingStatusUnknown&&run.status!=='cancelled'&&<>
        <RunCrewEntries runId={run.id} />
        <RunCrewTeamLinker runId={run.id} />
        <div id="rch-result-review" className="scroll-mt-36"><RunRankedMatchControl runId={run.id} hostId={run.host_id} runType={run.run_type} format={run.game_format} games={games} teams={teams} /></div>
        <div id="rch-host-operations" className="scroll-mt-36"><RunOperationsHQ runId={run.id} hostId={run.host_id} /></div>
        <RunVerifiedSignal runId={run.id} />
        <RunMasterOfficialControl runId={run.id} />
        <div id="rch-next-up" className="scroll-mt-36"><RunNextUp runId={run.id} hostId={run.host_id} /></div>
        <div id="rch-appeals" className="scroll-mt-36"><RunResultAppeals runId={run.id} hostId={run.host_id} /></div>
        </>}

        <section id="rch-run-tape" className="mt-6 scroll-mt-36 rounded-3xl border border-white/10 bg-[#07111b] p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange"><FaImage className="mr-1 inline" />Run Tape</p><h2 className="mt-1 font-display text-3xl font-black uppercase">What happened here.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">Native clips and photos from this Run stay attached to the Run Room while also living in the RCL social feed.</p></div>
            <div className="flex gap-2"><Link href={`/runs/${run.id}/highlight?mode=clip`} className="rounded-xl bg-rcl-orange px-4 py-3 text-xs font-black uppercase text-black">Add clip</Link><Link href={`/runs/${run.id}/highlight?mode=moment`} className="rounded-xl border border-rcl-blue/25 px-4 py-3 text-xs font-black uppercase text-rcl-blue">Add photos</Link></div>
          </div>

          {runPosts.length ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{runPosts.map((post) => {
            const first = post.media_urls[0];
            return <article key={post.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">{first ? (isVideoUrl(first) ? <video src={first} controls playsInline preload="metadata" className="aspect-video w-full bg-black object-contain" /> : <img src={first} alt="Run highlight" className="aspect-video w-full object-cover" />) : null}<div className="p-4"><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-black">{post.author?.display_name || post.author?.username || 'RCL member'}</p><span className="text-[10px] text-white/25">{new Date(post.created_at).toLocaleDateString()}</span></div><p className="mt-2 line-clamp-3 text-sm leading-6 text-white/48">{post.body}</p><Link href={`/social?post=${post.id}`} className="mt-3 inline-flex text-[10px] font-black uppercase tracking-wider text-rcl-blue">Open in RCL Social →</Link></div></article>;
          })}</div> : <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-8 text-center"><FaVideo className="mx-auto text-2xl text-rcl-orange" /><p className="mt-3 text-sm font-black">No Run Tape yet.</p><p className="mt-1 text-xs text-white/35">Be the first to show RCL what happened at this Run.</p></div>}
        </section>
      </Container>
      <style jsx>{`.field{height:2.75rem;width:100%;border-radius:.75rem;border:1px solid rgba(255,255,255,.1);background:#071018;padding:0 .75rem;color:white;outline:none}`}</style>
    </main>
  );
}

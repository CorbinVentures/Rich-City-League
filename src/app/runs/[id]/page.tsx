'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaArrowLeft,
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

type Run = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  court_name: string | null;
  location: string;
  starts_at: string;
  skill_level: string;
  game_format: string | null;
  max_players: number;
  status: string;
};

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
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(true), []);
  const db = supabase as any;

  const [run, setRun] = useState<Run | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [checkins, setCheckins] = useState<Set<string>>(new Set());
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [reliability, setReliability] = useState<Reliability[]>([]);
  const [runPosts, setRunPosts] = useState<RunPost[]>([]);
  const [highlightClaimed, setHighlightClaimed] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [gameDraft, setGameDraft] = useState({ home: '', away: '', homeScore: '', awayScore: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!db || !runId) return;
    setError('');
    const [runResult, playersResult, checkResult, teamResult, memberResult, gameResult, mediaResult, claimResult] = await Promise.all([
      db.from('runs').select('id,host_id,title,description,court_name,location,starts_at,skill_level,game_format,max_players,status').eq('id', runId).maybeSingle(),
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
    const playerIds = (playersResult.data ?? []).map((item: any) => item.profile_id) as string[];
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
  const joined = Boolean(user && (run?.host_id === user.id || profiles.some((profile) => profile.id === user.id)));
  const startMs = run ? new Date(run.starts_at).getTime() : 0;
  const now = Date.now();
  const checkInOpen = Boolean(run && now >= startMs - 2 * 60 * 60 * 1000 && now <= startMs + 6 * 60 * 60 * 1000);
  const highlightWindow = Boolean(run && now >= startMs - 2 * 60 * 60 * 1000 && now <= startMs + 72 * 60 * 60 * 1000);

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
      setNotice('Run result recorded.');
      setGameDraft({ home: '', away: '', homeScore: '', awayScore: '' });
      await load();
    }
    setBusy('');
  };

  const checkIn = async () => {
    if (!db || !user || !run) {
      window.location.href = `/auth/sign-in?redirect=${encodeURIComponent(`/runs/${runId}`)}`;
      return;
    }
    setBusy('checkin');
    setError('');
    const { data, error: rpcError } = await db.rpc('check_in_to_run', { p_run: run.id });
    if (rpcError) setError(rpcError.message);
    else {
      setNotice(Number(data ?? 0) > 0 ? '+15 REP earned for your verified check-in.' : 'You are already checked in.');
      await load();
    }
    setBusy('');
  };

  const claimHighlight = async () => {
    if (!db || !user || !run) return;
    setBusy('highlight');
    setError('');
    const { data, error: rpcError } = await db.rpc('claim_latest_run_highlight', { p_run: run.id });
    if (rpcError) setError(rpcError.message);
    else {
      const reward = Number(data?.[0]?.rep_awarded ?? 0);
      setNotice(reward ? `+${reward} REP earned for your verified Run highlight.` : 'Your highlight reward for this Run is already claimed.');
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
      <ClientPageHero
        eyebrow="RCL Runs"
        title={run.title}
        accent={run.status === 'cancelled' ? 'Cancelled' : 'Run Room'}
        description={run.description ?? 'Pickup basketball organized through RCL Runs.'}
        assetKey="runs.cover"
        actions={<div className="flex flex-wrap gap-2"><Link href="/runs" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-black uppercase"><FaArrowLeft />Runs</Link><button type="button" onClick={() => void shareRun()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-black uppercase"><FaShareNodes />Share</button></div>}
        meta={<div className="min-w-52 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 p-5"><p className="text-[10px] font-black uppercase tracking-wider text-rcl-blue"><FaLocationDot className="mr-1 inline" />{run.court_name || run.location}</p><p className="mt-2 text-sm font-black">{new Date(run.starts_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' })}</p><p className="mt-2 text-xs text-white/35">{run.skill_level} · {run.game_format ?? 'Pickup'} · {profiles.length}/{run.max_players}</p></div>}
      />

      <Container maxWidth="xl" className="py-9">
        {notice && <p className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-4 text-sm text-emerald-100">{notice}</p>}
        {error && <p className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/[.06] p-4 text-sm text-red-100">{error}</p>}

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {checkInOpen && <button type="button" onClick={() => void checkIn()} disabled={busy === 'checkin' || Boolean(user && checkins.has(user.id))} className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[.055] p-4 text-left disabled:opacity-55"><span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">At the court?</span><strong className="mt-1 block text-sm">{user && checkins.has(user.id) ? 'Checked in ✓' : 'Verify check-in · +15 REP'}</strong></button>}
          <Link href={`/runs/${run.id}/highlight?mode=clip`} className="rounded-2xl border border-rcl-orange/20 bg-rcl-orange/[.05] p-4"><span className="text-[10px] font-black uppercase tracking-wider text-rcl-orange">Run Tape</span><strong className="mt-1 flex items-center gap-2 text-sm"><FaVideo />Drop a clip</strong></Link>
          <Link href={`/runs/${run.id}/highlight?mode=moment`} className="rounded-2xl border border-rcl-blue/20 bg-rcl-blue/[.05] p-4"><span className="text-[10px] font-black uppercase tracking-wider text-rcl-blue">Run Tape</span><strong className="mt-1 flex items-center gap-2 text-sm"><FaCamera />Post photos</strong></Link>
          {joined && highlightWindow && <button type="button" onClick={() => void claimHighlight()} disabled={highlightClaimed || busy === 'highlight'} className="rounded-2xl border border-rcl-blue/20 bg-white/[.025] p-4 text-left disabled:opacity-55"><span className="text-[10px] font-black uppercase tracking-wider text-rcl-blue">Verified highlight</span><strong className="mt-1 block text-sm">{highlightClaimed ? 'Reward claimed ✓' : 'Claim +35 REP'}</strong></button>}
        </section>

        <section className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
          <article className="rounded-3xl border border-white/10 bg-white/[.02] p-6">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue"><FaPeopleGroup className="mr-1 inline" />Run roster</p>
            <h2 className="mt-1 font-display text-2xl font-black uppercase">Who showed up</h2>
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
              <h2 className="mt-1 font-display text-2xl font-black uppercase">Keep the score</h2>
              {canManage && teams.length >= 2 ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><select value={gameDraft.away} onChange={(event) => setGameDraft((current) => ({ ...current, away: event.target.value }))} className="field"><option value="">Away team</option>{teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input inputMode="numeric" value={gameDraft.awayScore} onChange={(event) => setGameDraft((current) => ({ ...current, awayScore: event.target.value }))} className="field" placeholder="Score" /><select value={gameDraft.home} onChange={(event) => setGameDraft((current) => ({ ...current, home: event.target.value }))} className="field"><option value="">Home team</option>{teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input inputMode="numeric" value={gameDraft.homeScore} onChange={(event) => setGameDraft((current) => ({ ...current, homeScore: event.target.value }))} className="field" placeholder="Score" /><button onClick={() => void record()} disabled={busy === 'game'} className="h-11 rounded-xl bg-rcl-orange px-4 text-[10px] font-black uppercase text-black disabled:opacity-40">Record</button></div> : null}
              <div className="mt-5 space-y-2">{games.length ? games.map((game) => <div key={game.id} className="grid grid-cols-[1fr_auto_1fr] items-center rounded-2xl border border-white/10 bg-black/20 p-4"><div><p className="text-[9px] uppercase text-white/30">Away</p><p className="font-black">{team(game.away_run_team_id)}</p></div><p className="font-display text-3xl font-black">{game.away_score}<span className="mx-2 text-white/20">–</span>{game.home_score}</p><div className="text-right"><p className="text-[9px] uppercase text-white/30">Home</p><p className="font-black">{team(game.home_run_team_id)}</p></div></div>) : <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/35">No pickup results recorded yet.</p>}</div>
            </article>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#07111b] p-5 sm:p-6">
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

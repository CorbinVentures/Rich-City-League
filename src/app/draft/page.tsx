'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type {
  Draft,
  DraftOrder,
  DraftPick,
  PublicPlayer,
  PublicPlayerIQ,
  Team,
  TeamCoach,
} from '@/types/database';

type PoolEntry = { player_id: string; eligible: boolean };
type Filter = 'ALL' | 'PG' | 'SG' | 'SF' | 'PF' | 'C';

const statusCopy: Record<string, { label: string; detail: string }> = {
  SETUP: { label: 'DRAFT STARTING SOON', detail: 'The league is preparing the official board.' },
  OPEN: { label: 'LIVE DRAFT', detail: 'Every pick updates here in real time.' },
  PAUSED: { label: 'DRAFT PAUSED', detail: 'The commissioner will resume shortly.' },
  COMPLETED: { label: 'DRAFT COMPLETE', detail: 'The official selections are locked.' },
};

function nameOf(player?: PublicPlayer) {
  return player ? `${player.first_name} ${player.last_name}` : 'Player announcement pending';
}

function formatHeight(inches: number | null | undefined) {
  return inches ? `${Math.floor(inches / 12)}'${inches % 12}"` : 'Height TBD';
}

function formatClock(seconds: number | null) {
  if (seconds === null) return '—';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function TeamMark({ team }: { team?: Team }) {
  return team?.logo_url ? (
    <img src={team.logo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
  ) : (
    <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-rcl-orange/15 text-sm font-black text-rcl-orange">
      {team?.short_name?.slice(0, 2) ?? 'RCL'}
    </span>
  );
}

export default function DraftNightPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user, profile } = useAuth();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [draftOrder, setDraftOrder] = useState<DraftOrder[]>([]);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [pool, setPool] = useState<PoolEntry[]>([]);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [iq, setIq] = useState<PublicPlayerIQ[]>([]);
  const [coachTeams, setCoachTeams] = useState<string[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const draftResult = await supabase
      .from('drafts')
      .select('*')
      .in('status', ['SETUP', 'OPEN', 'PAUSED', 'COMPLETED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (draftResult.error) {
      setMessage('The draft feed is temporarily unavailable.');
      setLoading(false);
      return;
    }

    const liveDraft = draftResult.data as Draft | null;
    setDraft(liveDraft);
    if (!liveDraft) {
      setLoading(false);
      return;
    }

    const [teamsResult, orderResult, picksResult, poolResult, playerResult, iqResult, ownPlayerResult] = await Promise.all([
      supabase.from('teams').select('*').eq('is_active', true).order('name'),
      supabase.from('draft_order').select('*').eq('draft_id', liveDraft.id).order('pick_number'),
      supabase.from('draft_picks').select('*').eq('draft_id', liveDraft.id).order('pick_number'),
      supabase.from('draft_pools').select('player_id, eligible').eq('season_id', liveDraft.season_id),
      supabase.from('public_players').select('*').eq('is_active', true),
      supabase.from('public_player_iq').select('*'),
      user ? supabase.from('players').select('id').eq('profile_id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);

    if (teamsResult.error || orderResult.error || picksResult.error || poolResult.error || playerResult.error || iqResult.error) {
      setMessage('Unable to load the live draft board. Please try again.');
    } else {
      setTeams((teamsResult.data ?? []) as Team[]);
      setDraftOrder((orderResult.data ?? []) as DraftOrder[]);
      setPicks((picksResult.data ?? []) as DraftPick[]);
      setPool((poolResult.data ?? []) as PoolEntry[]);
      setPlayers((playerResult.data ?? []) as PublicPlayer[]);
      setIq((iqResult.data ?? []) as PublicPlayerIQ[]);
      setMyPlayerId((ownPlayerResult.data as { id: string } | null)?.id ?? null);
    }

    if (user && profile?.role === 'coach') {
      const coachResult = await supabase.from('team_coaches').select('team_id').eq('profile_id', user.id);
      setCoachTeams(((coachResult.data ?? []) as TeamCoach[]).map((coach) => coach.team_id));
    } else {
      setCoachTeams([]);
    }
    setLoading(false);
  }, [profile?.role, supabase, user]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!supabase || !draft) return;
    const channel = supabase
      .channel(`draft-night-${draft.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drafts', filter: `id=eq.${draft.id}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_picks', filter: `draft_id=eq.${draft.id}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_order', filter: `draft_id=eq.${draft.id}` }, () => void load())
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') void load();
      });
    return () => { void supabase.removeChannel(channel); };
  }, [draft, load, supabase]);

  useEffect(() => {
    if (!draft?.clock_deadline_at || draft.status !== 'OPEN') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [draft?.clock_deadline_at, draft?.status]);

  const currentOrder = draftOrder.find((entry) => entry.pick_number === draft?.current_pick);
  const currentTeam = teams.find((team) => team.id === currentOrder?.team_id);
  const secondsRemaining = draft?.clock_deadline_at && draft.status === 'OPEN'
    ? Math.max(0, Math.ceil((new Date(draft.clock_deadline_at).getTime() - now) / 1000))
    : null;
  const clockExpired = draft?.status === 'OPEN' && secondsRemaining === 0;
  const pickedIds = new Set(picks.map((pick) => pick.player_id));
  const ratings = new Map(iq.map((entry) => [entry.player_id, entry]));
  const availablePlayers = players
    .filter((player) => pool.some((entry) => entry.player_id === player.id && entry.eligible) && !pickedIds.has(player.id))
    .filter((player) => filter === 'ALL' || player.position?.toUpperCase() === filter)
    .filter((player) => nameOf(player).toLowerCase().includes(query.toLowerCase()));
  const myPlayer = myPlayerId ? players.find((player) => player.id === myPlayerId) : undefined;
  const myPick = myPlayer ? picks.find((pick) => pick.player_id === myPlayer.id) : undefined;
  const isOnClock = Boolean(coachTeams.includes(currentTeam?.id ?? '') && draft?.status === 'OPEN' && !clockExpired);
  const copy = statusCopy[draft?.status ?? 'SETUP'];

  async function submitPick() {
    if (!supabase || !draft || !currentTeam || !selectedPlayer || !isOnClock) return;
    setMessage('');
    if (!window.confirm('Confirm this official draft selection?')) return;
    const { error } = await supabase.rpc('record_draft_pick' as never, {
      target_draft: draft.id,
      target_team: currentTeam.id,
      target_player: selectedPlayer,
    } as never);
    if (error) setMessage(error.message.includes('authorized') ? 'You are not authorized to make this selection.' : error.message);
    else {
      setSelectedPlayer(null);
      setMessage('Selection submitted. The board is updating for every viewer.');
      void load();
    }
  }

  if (loading) return <main><Container maxWidth="xl" className="py-20"><div className="h-80 animate-pulse rounded-3xl bg-white/5" /></Container></main>;

  return (
    <main className="min-h-screen overflow-hidden pb-20">
      <section className="rcl-hero relative flex min-h-[39rem] items-end">
        <div className="rcl-skyline" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 70% 45%, rgba(255,107,26,.7), transparent 20%), repeating-linear-gradient(115deg, transparent 0 8rem, rgba(255,255,255,.08) 8.1rem 8.2rem)' }} />
        <Container maxWidth="xl" className="relative z-10 w-full pb-14 pt-20">
          <p className="rcl-kicker"><span className={draft?.status === 'OPEN' ? 'rcl-live' : ''}>RCL Draft Night</span><span className="text-white/40">Richmond, Virginia</span></p>
          <h1 className="rcl-display mt-5 max-w-4xl text-6xl uppercase leading-[.86] text-white sm:text-8xl">Built<br /><span className="text-rcl-orange">different.</span></h1>
          <p className="mt-7 max-w-md text-lg font-semibold uppercase tracking-[.16em] text-white/70">Same city.<br />Real players.<br />Real opportunity.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#draft-details" className="rcl-button">Draft details</a>
            <Link href="/register" className="rounded-xl border border-white/20 px-5 py-4 text-xs font-black uppercase tracking-[.14em] text-white hover:border-rcl-orange">Get involved</Link>
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="relative z-10 -mt-10">
        <div id="draft-details" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Date', 'Announcing soon'],
            ['Location', 'Richmond, VA'],
            ['Teams', teams.length ? `${teams.length} active teams` : 'TBD'],
            ['Rounds', draft ? `${draft.rounds} round${draft.rounds === 1 ? '' : 's'}` : 'Multi-round'],
          ].map(([label, value]) => <div key={label} className="rcl-editorial rounded-2xl p-4 sm:p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">{label}</p><p className="mt-2 text-sm font-bold uppercase text-white sm:text-base">{value}</p></div>)}
        </div>

        {message && <p role="status" className="mt-5 rounded-xl border border-rcl-orange/30 bg-rcl-orange/10 p-4 text-sm text-rcl-orange">{message}</p>}

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rcl-editorial rcl-texture rounded-3xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="rcl-kicker">Draft status</p><h2 className="rcl-display mt-2 text-4xl uppercase">{copy.label}</h2><p className="mt-2 text-sm text-white/55">{copy.detail}</p></div>{draft?.status === 'OPEN' && <span className="rcl-live mt-1">Live</span>}</div>
            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
              <div><p className="text-[10px] uppercase tracking-widest text-white/40">Round</p><p className="mt-1 text-2xl font-black">{currentOrder?.round_number ?? '—'}</p></div>
              <div><p className="text-[10px] uppercase tracking-widest text-white/40">Pick</p><p className="mt-1 text-2xl font-black">{draft?.current_pick ?? '—'}</p></div>
              <div><p className="text-[10px] uppercase tracking-widest text-white/40">On the clock</p><p className="mt-1 truncate text-lg font-black text-rcl-orange">{currentTeam?.name ?? 'TBD'}</p></div>
              <div><p className="text-[10px] uppercase tracking-widest text-white/40">Clock</p><p aria-live="polite" className="mt-1 text-2xl font-black text-rcl-orange">{formatClock(secondsRemaining)}</p></div>
            </div>
          </div>
          <div className="rounded-3xl border border-rcl-orange/25 bg-rcl-orange/10 p-6 sm:p-8"><p className="rcl-kicker">The moment</p><p className="rcl-display mt-3 text-5xl uppercase leading-none">On the<br /><span className="text-rcl-orange">clock.</span></p><p className="mt-5 text-sm text-white/60">{draft?.status === 'OPEN' ? `${currentTeam?.name ?? 'The next team'} has the floor.` : 'The next chapter starts here.'}</p><div className="mt-6 h-1 rounded-full bg-rcl-orange/20"><div className="h-1 rounded-full bg-rcl-orange transition-all" style={{ width: secondsRemaining !== null && draft?.clock_duration_seconds ? `${Math.min(100, (secondsRemaining / draft.clock_duration_seconds) * 100)}%` : '0%' }} /></div></div>
        </section>

        <section className="mt-14">
          <div className="flex items-end justify-between gap-4"><div><p className="rcl-kicker">Official order</p><h2 className="rcl-display mt-2 text-4xl uppercase">Draft order</h2></div><span className="text-xs uppercase tracking-widest text-white/40">{draftOrder.length ? `${draftOrder.length} picks` : 'Order pending'}</span></div>
          <div className="rcl-shortcuts mt-5 pb-2">
            {(draftOrder.length ? draftOrder : Array.from({ length: 4 }, (_, index) => ({ id: `pending-${index}`, pick_number: index + 1, round_number: 1, team_id: '', created_at: '' }))).map((order) => { const team = teams.find((item) => item.id === order.team_id); return <div key={order.id} className="rcl-editorial min-w-[10rem] rounded-2xl p-4"><p className="text-3xl font-black text-rcl-orange">#{order.pick_number}</p><div className="mt-4 flex items-center gap-2"><TeamMark team={team} /><p className="truncate text-xs font-black uppercase">{team?.name ?? 'TBD'}</p></div><p className="mt-3 text-[10px] uppercase tracking-widest text-white/35">Round {order.round_number}</p></div>; })}
          </div>
        </section>

        {user && myPlayer && <section className="mt-14 rounded-3xl border border-rcl-gold/30 bg-rcl-gold/10 p-6 sm:p-8"><p className="rcl-kicker text-rcl-gold">My draft status</p><h2 className="mt-2 text-2xl font-black uppercase">{myPick ? "You've been drafted" : 'Waiting to be selected'}</h2><p className="mt-2 text-sm text-white/65">{myPick ? `${teams.find((team) => team.id === myPick.team_id)?.name ?? 'Your new team'} · Round ${myPick.round_number} · Pick ${myPick.pick_number}` : `Eligibility: ${pool.some((entry) => entry.player_id === myPlayer.id && entry.eligible) ? 'Draft pool' : 'Not announced'}`}</p></section>}

        {profile?.role === 'coach' && <section className={`mt-6 rounded-3xl border p-6 sm:p-8 ${isOnClock ? 'border-rcl-orange bg-rcl-orange/10' : 'border-white/10 bg-white/[.03]'}`}><p className="rcl-kicker">Coach war room</p><h2 className="mt-2 text-2xl font-black uppercase">{isOnClock ? 'Your team is on the clock' : `Waiting for ${currentTeam?.name ?? 'the official order'}`}</h2><p className="mt-2 text-sm text-white/60">{coachTeams.length ? `Assigned teams: ${coachTeams.map((id) => teams.find((team) => team.id === id)?.name ?? 'Team').join(', ')}` : 'No team assignment found.'}</p></section>}

        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="rcl-kicker">The board</p><h2 className="rcl-display mt-2 text-4xl uppercase">Every pick matters</h2></div><span className="text-xs uppercase tracking-widest text-white/40">{picks.length} selected</span></div>
          <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/[.03]">
            <div className="hidden grid-cols-[.5fr_1.2fr_1.5fr_.5fr_.6fr] gap-4 border-b border-white/10 p-4 text-[10px] font-black uppercase tracking-widest text-white/35 sm:grid"><span>Pick</span><span>Team</span><span>Player</span><span>Pos</span><span>OVR</span></div>
            {draftOrder.length === 0 && <p className="p-8 text-center text-sm text-white/40">Official draft order pending.</p>}
            {draftOrder.map((order) => { const pick = picks.find((item) => item.pick_number === order.pick_number); const team = teams.find((item) => item.id === order.team_id); const player = pick ? players.find((item) => item.id === pick.player_id) : undefined; const rating = player ? ratings.get(player.id)?.rcl_rating : undefined; const current = order.pick_number === draft?.current_pick; return <div key={order.id} className={`grid gap-2 border-b border-white/5 p-4 sm:grid-cols-[.5fr_1.2fr_1.5fr_.5fr_.6fr] sm:items-center sm:gap-4 ${current ? 'bg-rcl-orange/10' : ''}`}><span className="text-2xl font-black text-rcl-orange">#{order.pick_number}</span><span className="flex items-center gap-2 text-sm font-bold uppercase"><TeamMark team={team} />{team?.name ?? 'TBD'}</span><span>{player ? <Link className="font-bold hover:text-rcl-orange" href={`/players/${player.id}`}>{nameOf(player)}</Link> : <span className="text-white/30">{current ? 'ON THE CLOCK' : 'Awaiting selection'}</span>}</span><span className="text-xs uppercase text-white/45">{player?.position ?? '—'}</span><span className="font-black">{rating ?? '—'}</span></div>; })}
          </div>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <p className="rcl-kicker">Draft pool</p>
            <h2 className="rcl-display mt-2 text-4xl uppercase">Top prospects</h2>
            <div className="mt-5 flex gap-3 overflow-x-auto pb-3">
              {availablePlayers.slice(0, 8).map((player, index) => {
                const rating = ratings.get(player.id)?.rcl_rating;
                return (
                  <Link key={player.id} href={`/players/${player.id}`} className="rcl-editorial min-w-[16rem] rounded-2xl p-5 transition-transform hover:-translate-y-1">
                    <div className="flex items-start justify-between">
                      <span className="text-3xl font-black text-rcl-orange">#{index + 1}</span>
                      {player.photo_url ? <img src={player.photo_url} alt="" className="h-14 w-14 rounded-full object-cover" /> : <span className="h-14 w-14 rounded-full bg-white/10" />}
                    </div>
                    <h3 className="mt-7 text-lg font-black uppercase">{nameOf(player)}</h3>
                    <p className="mt-1 text-xs uppercase tracking-widest text-white/45">{player.position ?? 'Position TBD'} · OVR {rating ?? '—'}</p>
                    <p className="mt-4 text-xs text-white/45">{player.hometown ?? 'Hometown not published'}</p>
                    <span className="rcl-link mt-5">View profile →</span>
                  </Link>
                );
              })}
              {availablePlayers.length === 0 && <div className="rcl-editorial w-full rounded-2xl p-8 text-sm text-white/45">No players announced yet.</div>}
            </div>
          </div>
          <div className="rcl-editorial rounded-3xl p-6"><p className="rcl-kicker">Player search</p><h2 className="mt-2 text-2xl font-black uppercase">Browse the pool</h2><input aria-label="Search draft prospects" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players…" className="mt-5 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-rcl-orange" /><div className="mt-3 flex flex-wrap gap-2">{(['ALL', 'PG', 'SG', 'SF', 'PF', 'C'] as Filter[]).map((position) => <button key={position} type="button" onClick={() => setFilter(position)} className={`rounded-full px-3 py-2 text-[10px] font-black tracking-widest ${filter === position ? 'bg-rcl-orange text-black' : 'bg-white/10 text-white/60'}`}>{position}</button>)}</div><p className="mt-5 text-xs text-white/35">{availablePlayers.length} eligible prospects available</p></div>
        </section>

        {isOnClock && selectedPlayer && <div className="sticky bottom-4 z-20 mt-8 rounded-2xl border border-rcl-orange bg-[#101c2d] p-4 shadow-2xl"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold">Confirm selection: <span className="text-rcl-orange">{nameOf(players.find((player) => player.id === selectedPlayer))}</span></p><button type="button" onClick={() => void submitPick()} className="rcl-button">Confirm pick</button></div></div>}

        <section className="mt-20 border-t border-white/10 pt-16"><p className="rcl-kicker">The RCL path</p><h2 className="rcl-display mt-3 max-w-2xl text-5xl uppercase">How the draft works</h2><div className="mt-8 grid gap-3 sm:grid-cols-5">{[['01', 'Evaluation'], ['02', 'Draft pool'], ['03', 'Draft night'], ['04', 'Roster'], ['05', 'Season']].map(([number, title]) => <div key={number} className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><span className="text-sm font-black text-rcl-orange">{number}</span><h3 className="mt-8 text-sm font-black uppercase">{title}</h3><p className="mt-2 text-xs leading-5 text-white/40">{title === 'Evaluation' ? 'Players show up and compete.' : title === 'Draft pool' ? 'Eligible players enter the board.' : title === 'Draft night' ? 'Coaches make official selections.' : title === 'Roster' ? 'Selections become assignments.' : 'Careers start in Richmond.'}</p></div>)}</div></section>
        <section className="rcl-hero relative mt-20 overflow-hidden rounded-3xl p-8 sm:p-14"><div className="relative z-10 max-w-2xl"><p className="rcl-kicker">More than a draft</p><h2 className="rcl-display mt-4 text-6xl uppercase leading-[.9]">It&apos;s a<br /><span className="text-rcl-orange">movement.</span></h2><p className="mt-6 text-base leading-7 text-white/65">The RCL Draft is where preparation meets opportunity. Local talent. Real competition. Real platform. Bigger futures.</p><p className="mt-8 text-sm font-black uppercase tracking-[.25em] text-white">The city is the court.</p></div></section>
      </Container>
    </main>
  );
}

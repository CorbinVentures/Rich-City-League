'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { Draft, DraftPick, PublicPlayer, PublicPlayerIQ, Team, TeamCoach } from '@/types/database';

type PoolEntry = { player_id: string; eligible: boolean };

function playerName(player?: PublicPlayer) {
  return player ? `${player.first_name} ${player.last_name}` : 'Unknown player';
}

function formatHeight(inches: number | null | undefined) {
  if (!inches) return '—';
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export default function DraftNightPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user, profile } = useAuth();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [pool, setPool] = useState<PoolEntry[]>([]);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [iq, setIq] = useState<PublicPlayerIQ[]>([]);
  const [coachTeam, setCoachTeam] = useState<string | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const draftResult = await supabase.from('drafts').select('*').in('status', ['OPEN', 'PAUSED', 'COMPLETED']).order('created_at', { ascending: false }).limit(1).maybeSingle();
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
    const [teamsResult, picksResult, poolResult, playerResult, iqResult, ownPlayerResult] = await Promise.all([
      supabase.from('teams').select('*').eq('is_active', true).order('name'),
      supabase.from('draft_picks').select('*').eq('draft_id', liveDraft.id).order('pick_number'),
      supabase.from('draft_pools').select('player_id, eligible').eq('season_id', liveDraft.season_id),
      supabase.from('public_players').select('*'),
      supabase.from('public_player_iq').select('*'),
      user ? supabase.from('players').select('id').eq('profile_id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    if (teamsResult.error || picksResult.error || poolResult.error || playerResult.error || iqResult.error) {
      setMessage('Unable to load the live draft board. Please try again.');
    } else {
      setTeams((teamsResult.data ?? []) as Team[]);
      setPicks((picksResult.data ?? []) as DraftPick[]);
      setPool((poolResult.data ?? []) as PoolEntry[]);
      setPlayers((playerResult.data ?? []) as PublicPlayer[]);
      setIq((iqResult.data ?? []) as PublicPlayerIQ[]);
      setMyPlayerId((ownPlayerResult.data as { id: string } | null)?.id ?? null);
    }
    if (user && profile?.role === 'coach') {
      const coachResult = await supabase.from('team_coaches').select('team_id').eq('profile_id', user.id);
      setCoachTeam((coachResult.data as TeamCoach[] | null)?.[0]?.team_id ?? null);
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
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [draft, load, supabase]);

  const orderedTeams = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name)), [teams]);
  const currentTeam = draft && orderedTeams.length ? orderedTeams[(draft.current_pick - 1) % orderedTeams.length] : null;
  const pickedIds = new Set(picks.map((pick) => pick.player_id));
  const availablePlayers = players.filter((player) => pool.some((entry) => entry.player_id === player.id && entry.eligible) && !pickedIds.has(player.id) && playerName(player).toLowerCase().includes(query.toLowerCase()));
  const myPlayer = myPlayerId ? players.find((player) => player.id === myPlayerId) : undefined;
  const myPick = myPlayer ? picks.find((pick) => pick.player_id === myPlayer.id) : undefined;
  const isOnClock = Boolean(coachTeam && currentTeam?.id === coachTeam && draft?.status === 'OPEN');

  async function submitPick() {
    if (!supabase || !draft || !coachTeam || !selectedPlayer) return;
    setMessage('');
    const confirmed = window.confirm('Confirm this draft selection? This action cannot be undone.');
    if (!confirmed) return;
    const { error } = await supabase.rpc('record_draft_pick' as never, { target_draft: draft.id, target_team: coachTeam, target_player: selectedPlayer } as never);
    if (error) setMessage(error.message.includes('not authorized') ? 'You are not authorized to make this selection.' : error.message);
    else {
      setSelectedPlayer(null);
      setMessage('Selection submitted. The board will update for everyone.');
      void load();
    }
  }

  if (loading) return <main><Container maxWidth="xl" className="py-16"><div className="h-12 w-72 animate-pulse rounded bg-white/10" /></Container></main>;
  if (!draft) return <main><Container maxWidth="xl" className="py-20"><p className="text-xs font-bold uppercase tracking-[0.3em] text-rcl-orange">RCL Draft Night</p><h1 className="mt-3 font-display text-5xl font-black">The board is warming up.</h1><p className="mt-4 max-w-xl text-gray-400">There is no public draft in progress right now. Check back when the commissioner opens the next league draft.</p></Container></main>;

  return <main className="min-h-screen pb-20">
    <Container maxWidth="xl" className="py-8 sm:py-12">
      <section className="relative overflow-hidden rounded-3xl border border-rcl-orange/30 bg-gradient-to-br from-[#111c35] via-[#0b1224] to-[#07090d] p-6 shadow-[0_0_80px_rgba(255,107,26,0.12)] sm:p-10">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-rcl-orange/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-rcl-orange px-3 py-1 text-xs font-black tracking-widest text-black">{draft.status === 'OPEN' ? 'LIVE' : draft.status}</span><span className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Live from Richmond</span></div>
          <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight sm:text-6xl">RCL Draft Night</h1>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div><p className="text-xs uppercase tracking-widest text-gray-500">On the clock</p><p className="mt-1 text-2xl font-black text-rcl-orange">{currentTeam?.name ?? 'Awaiting order'}</p></div>
            <div><p className="text-xs uppercase tracking-widest text-gray-500">Round · pick</p><p className="mt-1 text-2xl font-black">R{Math.ceil(draft.current_pick / Math.max(orderedTeams.length, 1))} · {draft.current_pick}</p></div>
            <div><p className="text-xs uppercase tracking-widest text-gray-500">Completed</p><p className="mt-1 text-2xl font-black">{picks.length} <span className="text-base font-normal text-gray-500">selections</span></p></div>
          </div>
        </div>
      </section>

      {message && <p role="status" className="mt-5 rounded-xl border border-rcl-orange/30 bg-rcl-orange/10 p-4 text-sm text-rcl-orange">{message}</p>}
      {profile?.role === 'coach' && <section className={`mt-6 rounded-2xl border p-5 ${isOnClock ? 'border-rcl-orange bg-rcl-orange/10' : 'border-white/10 bg-white/[0.03]'}`}><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-orange">{isOnClock ? 'Your team is on the clock' : 'Coach draft room'}</p><p className="mt-2 text-lg font-bold">{coachTeam ? (teams.find((team) => team.id === coachTeam)?.name ?? 'Your team') : 'No team assignment found'}</p><p className="mt-1 text-sm text-gray-400">{isOnClock ? 'Select a player below, then confirm the official pick.' : `Waiting for ${currentTeam?.name ?? 'the next team'} to make pick ${draft.current_pick}.`}</p></section>}
      {user && myPlayer && <section className="mt-6 rounded-2xl border border-rcl-gold/30 bg-rcl-gold/10 p-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Your RCL draft status</p><p className="mt-2 text-xl font-bold">{myPick ? `You've been drafted by ${teams.find((team) => team.id === myPick.team_id)?.name ?? 'an RCL team'}` : 'Waiting to be selected'}</p><p className="mt-1 text-sm text-gray-300">{myPick ? `Round ${myPick.round_number} · Pick ${myPick.pick_number}` : `Draft pool: ${pool.some((entry) => entry.player_id === myPlayer.id && entry.eligible) ? 'Yes' : 'Not eligible'}`}</p></section>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Live board</p><h2 className="mt-2 font-display text-3xl font-bold">Every pick, in real time</h2></div><span className="text-xs text-gray-500">{picks.length} completed</span></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-widest text-gray-500"><tr><th className="p-3">Pick</th><th className="p-3">Round</th><th className="p-3">Team</th><th className="p-3">Player</th><th className="p-3">OVR</th><th className="p-3">Status</th></tr></thead><tbody>{Array.from({ length: Math.max(picks.length + 1, Math.min(orderedTeams.length * draft.rounds, 8)) }, (_, index) => { const pickNumber = index + 1; const pick = picks.find((item) => item.pick_number === pickNumber); const team = pick ? teams.find((item) => item.id === pick.team_id) : orderedTeams[(pickNumber - 1) % Math.max(orderedTeams.length, 1)]; const player = pick ? players.find((item) => item.id === pick.player_id) : undefined; const rating = player ? iq.find((item) => item.player_id === player.id)?.rcl_rating : undefined; const current = pickNumber === draft.current_pick; return <tr key={pickNumber} className={`border-b border-white/5 ${current ? 'bg-rcl-orange/10' : ''}`}><td className="p-3 font-bold">{pickNumber}</td><td className="p-3 text-gray-400">R{Math.ceil(pickNumber / Math.max(orderedTeams.length, 1))}</td><td className="p-3 font-semibold">{team?.name ?? 'TBD'}{current && <span className="ml-2 rounded bg-rcl-orange px-2 py-1 text-[10px] font-black text-black">ON CLOCK</span>}</td><td className="p-3">{player ? <Link className="font-semibold hover:text-rcl-orange" href={`/players/${player.id}`}>{playerName(player)}</Link> : <span className="text-gray-600">—</span>}</td><td className="p-3 font-bold">{rating ?? '—'}</td><td className="p-3 text-xs font-bold uppercase text-gray-500">{pick ? 'Drafted' : current ? 'On clock' : 'Future'}</td></tr>; })}</tbody></table></div></section>
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Available players</p><h2 className="mt-2 font-display text-2xl font-bold">The pool</h2><input aria-label="Search available players" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players…" className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white outline-none focus:border-rcl-orange" /><div className="mt-4 max-h-[580px] space-y-2 overflow-y-auto">{availablePlayers.map((player) => { const rating = iq.find((item) => item.player_id === player.id)?.rcl_rating; const active = selectedPlayer === player.id; return <div key={player.id} className={`rounded-xl border p-3 ${active ? 'border-rcl-orange bg-rcl-orange/10' : 'border-white/10'}`}><div className="flex items-center justify-between gap-3"><Link href={`/players/${player.id}`} className="min-w-0"><p className="truncate font-semibold">{playerName(player)}</p><p className="text-xs text-gray-500">{player.position ?? 'Position TBD'} · {formatHeight(player.height_inches)} · OVR {rating ?? '—'}</p></Link>{isOnClock && <button type="button" onClick={() => setSelectedPlayer(active ? null : player.id)} className="rounded-lg bg-rcl-orange px-3 py-2 text-xs font-black text-black">{active ? 'Selected' : 'Select'}</button>}</div></div>; })}{availablePlayers.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No eligible players match this search.</p>}</div>{isOnClock && selectedPlayer && <button type="button" onClick={() => void submitPick()} className="mt-4 w-full rounded-xl bg-rcl-orange p-3 font-black text-black">Confirm draft pick</button>}</section>
      </div>
    </Container>
  </main>;
}

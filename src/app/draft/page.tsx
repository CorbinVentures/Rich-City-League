'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { ContentAssetBackground } from '@/components/ContentAssetBackground';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { Draft, DraftOrder, DraftPick, PublicPlayer, PublicPlayerIQ, Team, TeamCoach } from '@/types/database';
import { FaArrowRight, FaBolt, FaCrown, FaMagnifyingGlass, FaShieldHalved, FaUserGroup } from 'react-icons/fa6';

type Filter = 'ALL' | 'PG' | 'SG' | 'SF' | 'PF' | 'C';
type PoolEntry = { player_id: string; eligible: boolean };
type DraftFeature = { title: string; detail: string; Icon: typeof FaUserGroup };

function playerName(player?: PublicPlayer) {
  return player ? `${player.first_name} ${player.last_name}` : 'Player TBD';
}
function clock(seconds: number | null) {
  return seconds === null ? '—' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
function TeamMark({ team }: { team?: Team }) {
  return team?.logo_url ? <img src={team.logo_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rcl-orange/15 text-xs font-black text-rcl-orange">{team?.short_name?.slice(0, 2) ?? 'RCL'}</span>;
}

export default function DraftNightPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user, profile } = useAuth();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [order, setOrder] = useState<DraftOrder[]>([]);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [iq, setIq] = useState<PublicPlayerIQ[]>([]);
  const [pool, setPool] = useState<PoolEntry[]>([]);
  const [coachTeams, setCoachTeams] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    if (!supabase) return setLoading(false);
    const draftResult = await supabase.from('drafts').select('*').in('status', ['SETUP', 'OPEN', 'PAUSED', 'COMPLETED']).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (draftResult.error) { setMessage('The draft feed is temporarily unavailable.'); setLoading(false); return; }
    const live = draftResult.data as Draft | null;
    setDraft(live);
    if (!live) { setLoading(false); return; }

    const [teamsResult, orderResult, picksResult, poolResult, playersResult, iqResult] = await Promise.all([
      supabase.from('teams').select('*').eq('is_active', true).order('name'),
      supabase.from('draft_order').select('*').eq('draft_id', live.id).order('pick_number'),
      supabase.from('draft_picks').select('*').eq('draft_id', live.id).order('pick_number'),
      supabase.from('draft_pools').select('player_id, eligible').eq('season_id', live.season_id),
      supabase.from('public_players').select('*').eq('is_active', true),
      supabase.from('public_player_iq').select('*'),
    ]);
    if (teamsResult.error || orderResult.error || picksResult.error || poolResult.error || playersResult.error || iqResult.error) {
      setMessage('Unable to load the live draft board. Please try again.');
    } else {
      setTeams((teamsResult.data ?? []) as Team[]);
      setOrder((orderResult.data ?? []) as DraftOrder[]);
      setPicks((picksResult.data ?? []) as DraftPick[]);
      setPool((poolResult.data ?? []) as PoolEntry[]);
      setPlayers((playersResult.data ?? []) as PublicPlayer[]);
      setIq((iqResult.data ?? []) as PublicPlayerIQ[]);
    }
    if (user && profile?.role === 'coach') {
      const result = await supabase.from('team_coaches').select('team_id').eq('profile_id', user.id);
      setCoachTeams(((result.data ?? []) as TeamCoach[]).map((item) => item.team_id));
    }
    setLoading(false);
  }, [profile?.role, supabase, user]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!supabase || !draft) return;
    const channel = supabase.channel(`draft-platform-${draft.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_picks', filter: `draft_id=eq.${draft.id}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_order', filter: `draft_id=eq.${draft.id}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drafts', filter: `id=eq.${draft.id}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [draft, load, supabase]);
  useEffect(() => {
    if (!draft?.clock_deadline_at || draft.status !== 'OPEN') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [draft?.clock_deadline_at, draft?.status]);

  const current = order.find((item) => item.pick_number === draft?.current_pick);
  const currentTeam = teams.find((team) => team.id === current?.team_id);
  const seconds = draft?.clock_deadline_at && draft.status === 'OPEN' ? Math.max(0, Math.ceil((new Date(draft.clock_deadline_at).getTime() - now) / 1000)) : null;
  const picked = new Set(picks.map((pick) => pick.player_id));
  const ratings = new Map(iq.map((entry) => [entry.player_id, entry.rcl_rating]));
  const available = players
    .filter((player) => pool.some((entry) => entry.player_id === player.id && entry.eligible) && !picked.has(player.id))
    .filter((player) => filter === 'ALL' || player.position?.toUpperCase() === filter)
    .filter((player) => playerName(player).toLowerCase().includes(query.toLowerCase()));
  const isOnClock = Boolean(profile?.role === 'coach' && currentTeam && coachTeams.includes(currentTeam.id) && draft?.status === 'OPEN' && seconds !== 0);
  const selectedPlayer = players.find((player) => player.id === selected);

  async function makePick() {
    if (!supabase || !draft || !currentTeam || !selected || !isOnClock) return;
    if (!window.confirm(`Draft ${playerName(selectedPlayer)} to ${currentTeam.name}?`)) return;
    const { error } = await supabase.rpc('record_draft_pick' as never, { target_draft: draft.id, target_team: currentTeam.id, target_player: selected } as never);
    if (error) setMessage(error.message);
    else { setSelected(null); setMessage('Selection submitted. Every RCL viewer is updating now.'); void load(); }
  }

  if (loading) return <main className="min-h-screen"><Container maxWidth="xl" className="py-20"><div className="h-96 animate-pulse rounded-3xl bg-white/5" /></Container></main>;

  return (
    <main className="rcl-draft-platform relative min-h-screen overflow-hidden pb-24"><ContentAssetBackground assetKey="draft.cover" opacity={0.12} /><div className="relative z-10">
      <section className="rcl-draft-hero relative overflow-hidden">
        <div className="rcl-draft-hero-grid" aria-hidden="true" />
        <Container maxWidth="xl" className="relative z-10 py-12 sm:py-16 lg:py-20">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="rcl-kicker"><FaBolt /> RCL DRAFT PLATFORM</p>
              <h1 className="rcl-display mt-3 text-5xl uppercase leading-[.86] sm:text-7xl lg:text-8xl">Draft<br /><span className="text-rcl-orange">Night.</span></h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-white/55 sm:text-base">Real players. Real teams. Real opportunity. The official Richmond basketball draft board, built for the entire RCL community.</p>
            </div>
            <div className="rcl-draft-live-card">
              <span className="rcl-live">LIVE DRAFT BOARD</span>
              <strong>{draft?.status === 'OPEN' ? 'ON THE CLOCK' : draft?.status ?? 'SETUP'}</strong>
              <small>{currentTeam?.name ?? 'Draft order pending'}</small>
              <div className="mt-4 flex items-end gap-3"><b>{clock(seconds)}</b><span>remaining</span></div>
            </div>
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="relative z-10 -mt-7">
        <div className="rcl-draft-stat-strip">
          <div><span>NEXT PICK</span><strong>#{draft?.current_pick ?? '—'}</strong></div>
          <div><span>ROUND</span><strong>{current?.round_number ?? '—'}</strong></div>
          <div><span>TEAMS</span><strong>{teams.length || '—'}</strong></div>
          <div><span>SELECTED</span><strong>{picks.length}</strong></div>
        </div>

        {message && <div role="status" className="mt-5 rounded-xl border border-rcl-orange/30 bg-rcl-orange/10 p-4 text-sm text-rcl-orange">{message}</div>}

        <section className="rcl-draft-workspace mt-8">
          <div className="rcl-draft-module rcl-draft-hub">
            <div className="rcl-module-heading"><span className="rcl-module-icon"><FaCrown /></span><div><small>DRAFT HUB</small><h2>Draft control</h2></div></div>
            <div className="rcl-draft-countdown"><span>NEXT DRAFT</span><strong>{draft?.status === 'OPEN' ? 'LIVE NOW' : 'RCL SEASON DRAFT'}</strong><div><b>{draft?.current_pick ?? '—'}</b><small>PICK</small><b>{order.length}</b><small>ORDER</small></div></div>
            <Link href="#draft-board" className="rcl-draft-primary">VIEW DRAFT BOARD <FaArrowRight /></Link>
            <Link href="#rules" className="rcl-draft-secondary">DRAFT RULES</Link>
          </div>

          <div id="draft-board" className="rcl-draft-module rcl-draft-board">
            <div className="rcl-module-heading"><span className="rcl-module-icon"><FaMagnifyingGlass /></span><div><small>DRAFT BOARD</small><h2>Available talent</h2></div></div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players..." aria-label="Search draft players" />
            <div className="rcl-filter-row">{(['ALL','PG','SG','SF','PF','C'] as Filter[]).map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={filter === item ? 'active' : ''}>{item}</button>)}</div>
            <div className="rcl-prospect-list">
              {available.slice(0, 8).map((player, index) => <button type="button" key={player.id} onClick={() => isOnClock && setSelected(player.id)} className={selected === player.id ? 'selected' : ''}>
                <span className="rcl-rank">#{index + 1}</span><span className="rcl-prospect-avatar">{player.photo_url ? <img src={player.photo_url} alt="" /> : player.first_name?.[0]}</span><span className="rcl-prospect-name">{playerName(player)}<small>{player.position ?? '—'}</small></span><b>{ratings.get(player.id) ?? '—'}</b>
              </button>)}
              {!available.length && <p className="p-5 text-xs text-white/35">No eligible prospects are currently published.</p>}
            </div>
          </div>

          <div className="rcl-draft-module rcl-team-selection">
            <div className="rcl-module-heading"><span className="rcl-module-icon"><FaCrown /></span><div><small>TEAM SELECTION</small><h2>{currentTeam?.name ?? 'Waiting'}</h2></div></div>
            <div className="rcl-on-clock"><span>ON THE CLOCK</span><strong>{clock(seconds)}</strong><small>Pick #{draft?.current_pick ?? '—'} · Round {current?.round_number ?? '—'}</small></div>
            {selectedPlayer ? <div className="rcl-selected-player"><strong>{playerName(selectedPlayer)}</strong><span>{selectedPlayer.position ?? 'Position TBD'} · OVR {ratings.get(selectedPlayer.id) ?? '—'}</span></div> : <div className="rcl-empty-pick">Select a prospect from the board.</div>}
            <button type="button" disabled={!selectedPlayer || !isOnClock} onClick={() => void makePick()} className="rcl-draft-primary w-full disabled:cursor-not-allowed disabled:opacity-35">MAKE SELECTION <FaArrowRight /></button>
            <p className="mt-3 text-[10px] uppercase tracking-widest text-white/30">{isOnClock ? 'Coach controls enabled' : 'Waiting for the authorized team'}</p>
          </div>

          <div className="rcl-draft-module rcl-player-preview">
            <div className="rcl-module-heading"><span className="rcl-module-icon"><FaUserGroup /></span><div><small>PLAYER PROFILE</small><h2>Scouting view</h2></div></div>
            {selectedPlayer ? <><div className="rcl-player-photo">{selectedPlayer.photo_url ? <img src={selectedPlayer.photo_url} alt="" /> : <span>{selectedPlayer.first_name?.[0]}</span>}</div><h3>{playerName(selectedPlayer)}</h3><p>{selectedPlayer.position ?? 'Position TBD'} · OVR {ratings.get(selectedPlayer.id) ?? '—'}</p><div className="rcl-player-metrics"><span><b>{selectedPlayer.height_inches ? `${Math.floor(selectedPlayer.height_inches / 12)}′${selectedPlayer.height_inches % 12}″` : '—'}</b>HEIGHT</span><span><b>{'—'}</b>WEIGHT</span><span><b>{selectedPlayer.hometown ?? 'RVA'}</b>HOME</span></div><Link href={`/players/${selectedPlayer.id}`} className="rcl-draft-secondary w-full">VIEW FULL PROFILE</Link></> : <div className="rcl-preview-empty"><FaShieldHalved /><strong>Select a player</strong><span>Scouting details appear here.</span></div>}
          </div>

          <div className="rcl-draft-module rcl-my-team">
            <div className="rcl-module-heading"><span className="rcl-module-icon"><FaShieldHalved /></span><div><small>MY TEAM</small><h2>{currentTeam?.name ?? 'Roster'}</h2></div></div>
            <p className="text-xs uppercase tracking-widest text-white/35">{profile?.role === 'coach' ? 'Coach war room' : 'Community view'}</p>
            <div className="rcl-roster-mini">{order.slice(0, 5).map((slot) => { const pick = picks.find((item) => item.pick_number === slot.pick_number); const player = pick ? players.find((item) => item.id === pick.player_id) : undefined; return <div key={slot.id}><b>{slot.pick_number}</b><span>{player ? playerName(player) : '—'}</span><small>{player?.position ?? 'OPEN'}</small></div>; })}</div>
            <Link href="/teams" className="rcl-draft-secondary w-full">VIEW FULL ROSTER</Link>
          </div>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {([
            { title: 'PLAYER SCOUTING', detail: 'Profiles, stats, highlights', Icon: FaUserGroup },
            { title: 'LIVE DRAFTING', detail: 'Real-time selections', Icon: FaCrown },
            { title: 'TEAM MANAGEMENT', detail: 'Rosters, trades, waivers', Icon: FaShieldHalved },
            { title: 'ANALYTICS', detail: 'Player rankings & trends', Icon: FaBolt },
            { title: 'COMMUNITY', detail: 'Discuss, react, follow', Icon: FaUserGroup },
          ] satisfies DraftFeature[]).map(({ title, detail, Icon }) => <div key={String(title)} className="rcl-draft-feature"><Icon /><div><strong>{title}</strong><span>{detail}</span></div></div>)}
        </section>

        <section className="mt-16">
          <div className="flex items-end justify-between gap-4"><div><p className="rcl-kicker">Official selections</p><h2 className="rcl-display mt-2 text-4xl uppercase">Draft history</h2></div><span className="text-xs uppercase tracking-widest text-white/35">{picks.length} selected</span></div>
          <div className="rcl-pick-history mt-5">
            {order.map((slot) => { const pick = picks.find((item) => item.pick_number === slot.pick_number); const team = teams.find((item) => item.id === slot.team_id); const player = pick ? players.find((item) => item.id === pick.player_id) : undefined; return <div key={slot.id} className={slot.pick_number === draft?.current_pick ? 'current' : ''}><b>#{slot.pick_number}</b><span className="flex items-center gap-2"><TeamMark team={team} />{team?.name ?? 'TBD'}</span><strong>{player ? playerName(player) : slot.pick_number === draft?.current_pick ? 'ON THE CLOCK' : 'Awaiting selection'}</strong><small>{player?.position ?? '—'} · OVR {player ? ratings.get(player.id) ?? '—' : '—'}</small></div>; })}
            {!order.length && <p className="p-8 text-center text-sm text-white/35">Official draft order pending.</p>}
          </div>
        </section>

        <section id="rules" className="mt-16 border-t border-white/10 pt-12">
          <p className="rcl-kicker">THE RCL PATH</p><h2 className="rcl-display mt-3 text-4xl uppercase sm:text-6xl">Evaluation → Draft → Roster → Season</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/45">Players compete, enter the official pool, hear their name called, join a roster, and start building their Richmond basketball legacy.</p>
        </section>
      </Container>
    </div></main>
  );
}

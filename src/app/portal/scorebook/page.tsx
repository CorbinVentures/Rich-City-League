'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { Game, GameEvent, GameLineup, Player, PlayerGameStats, Team, TeamSeason, Roster } from '@/types/database';
import { derivePlayerMetrics, describeEvent, formatClock, summarizeGame, zoneFromCoordinates } from '@/lib/game-iq';

type GameRow = Game & { home_team?: Team; away_team?: Team };

const actionGroups = [
  { label: 'SCORING', actions: [
    ['2PT MADE', 'shot_made', 2, true],
    ['2PT MISS', 'shot_missed', 2, false],
    ['3PT MADE', 'shot_made', 3, true],
    ['3PT MISS', 'shot_missed', 3, false],
    ['FT MADE', 'free_throw_made', 1, true],
    ['FT MISS', 'free_throw_missed', 1, false],
  ] },
  { label: 'HUSTLE', actions: [
    ['OREB', 'rebound_off', 0, false],
    ['DREB', 'rebound_def', 0, false],
    ['STEAL', 'steal', 0, false],
    ['BLOCK', 'block', 0, false],
  ] },
  { label: 'MISTAKES / FOULS', actions: [
    ['TURNOVER', 'turnover', 0, false],
    ['FOUL', 'foul', 0, false],
  ] },
] as const;

export default function ScorebookPage() {
  const { profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [games, setGames] = useState<GameRow[]>([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamSeasons, setTeamSeasons] = useState<TeamSeason[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [stats, setStats] = useState<PlayerGameStats[]>([]);
  const [lineups, setLineups] = useState<GameLineup[]>([]);
  const [startingFive, setStartingFive] = useState<string[]>([]);
  const [subOut, setSubOut] = useState('');
  const [subIn, setSubIn] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [assistPlayerId, setAssistPlayerId] = useState('');
  const [period, setPeriod] = useState(1);
  const [clock, setClock] = useState('10:00');
  const [mode, setMode] = useState<'quick' | 'pro'>('pro');
  const [pendingShot, setPendingShot] = useState<{ x: number; y: number; zone: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const isStaff = profile?.role === 'admin' || profile?.role === 'staff';
  const isCoach = profile?.role === 'coach';

  const selectedGame = games.find((game) => game.id === selectedGameId);
  const summary = selectedGame
    ? summarizeGame(events, selectedGame.home_team_id, selectedGame.away_team_id)
    : null;

  const teamPlayers = useMemo(() => {
    if (!selectedGame) return [];
    const ids = new Set(
      rosters
        .filter((r) => {
          const ts = teamSeasons.find((item) => item.id === r.team_season_id);
          return ts?.team_id === selectedTeamId && ts.season_id === selectedGame.season_id;
        })
        .map((r) => r.player_id),
    );
    return players.filter((p) => ids.has(p.id));
  }, [players, rosters, teamSeasons, selectedTeamId, selectedGame]);

  const selectedStat = stats.find((stat) => stat.player_id === selectedPlayerId);
  const selectedPlayer = players.find((player) => player.id === selectedPlayerId);
  const derived = selectedStat ? derivePlayerMetrics(selectedStat, summary?.possessions ?? 0) : null;

  async function loadGameData(gameId: string) {
    if (!supabase || !gameId) return;
    setBusy(true);
    setError('');
    try {
      const game = games.find((item) => item.id === gameId);
      const [eventResult, statResult, lineupResult] = await Promise.all([
        supabase.from('game_events').select('*').eq('game_id', gameId).order('sequence_no', { ascending: false }),
        supabase.from('player_game_stats').select('*').eq('game_id', gameId),
        supabase.from('game_lineups').select('*').eq('game_id', gameId).order('period_number').order('created_at'),
      ]);
      if (eventResult.error) throw eventResult.error;
      if (statResult.error) throw statResult.error;
      if (lineupResult.error) throw lineupResult.error;
      setEvents((eventResult.data ?? []) as GameEvent[]);
      setStats((statResult.data ?? []) as PlayerGameStats[]);
      setLineups((lineupResult.data ?? []) as GameLineup[]);
      setPeriod(1);
      setClock(game ? formatClock(game.period_length_seconds) : '10:00');
      setSelectedTeamId(game?.home_team_id ?? '');
      setSelectedPlayerId('');
      setAssistPlayerId('');
      setPendingShot(null);
      setStartingFive([]);
      setSubOut('');
      setSubIn('');
    } catch (reason) {
      console.error(reason);
      setError('Unable to load the scorebook.');
    } finally {
      setBusy(false);
    }
  }

  // loadGameData is intentionally kept local to this screen; the selected game changes through the explicit selector below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (authLoading || !supabase || !profile) return;
    async function load() {
      if (!supabase) return;
      setBusy(true);
      try {
        const [gamesResult, teamsResult, playersResult, rostersResult, teamSeasonsResult, coachResult] = await Promise.all([
          supabase.from('games').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)').order('scheduled_at', { ascending: false }),
          supabase.from('teams').select('*').eq('is_active', true).order('name'),
          supabase.from('players').select('*').eq('is_active', true).order('last_name'),
          supabase.from('rosters').select('*').is('left_at', null),
          supabase.from('team_seasons').select('*'),
          isCoach ? supabase.from('team_coaches').select('team_id').eq('profile_id', profile.id) : Promise.resolve({ data: [], error: null }),
        ]);
        const firstError = [gamesResult, teamsResult, playersResult, rostersResult, teamSeasonsResult, coachResult].find((r) => r.error)?.error;
        if (firstError) throw firstError;
        const loadedGames = (gamesResult.data ?? []) as GameRow[];
        const coachTeamIds = new Set(((coachResult.data ?? []) as Array<{ team_id: string }>).map((item) => item.team_id));
        const visibleGames = isCoach
          ? loadedGames.filter((g) => coachTeamIds.has(g.home_team_id) || coachTeamIds.has(g.away_team_id))
          : loadedGames;
        setGames(visibleGames);
        setTeams((teamsResult.data ?? []) as Team[]);
        setPlayers((playersResult.data ?? []) as Player[]);
        setRosters((rostersResult.data ?? []) as Roster[]);
        setTeamSeasons((teamSeasonsResult.data ?? []) as TeamSeason[]);
        if (visibleGames[0]) {
          setSelectedGameId(visibleGames[0].id);
          await loadGameData(visibleGames[0].id);
        }
      } catch (reason) {
        console.error(reason);
        setError('Unable to load scorebook data.');
      } finally {
        setBusy(false);
      }
    }
    void load();
  }, [authLoading, profile?.id, profile?.role, supabase]);

  async function saveStartingFive() {
    if (!supabase || !selectedGameId || !selectedTeamId || startingFive.length !== 5 || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: rpcError } = await supabase.rpc('set_starting_lineup', {
        target_game_id: selectedGameId, target_team_id: selectedTeamId,
        target_period: period, target_player_ids: startingFive,
      } as never);
      if (rpcError) throw rpcError;
      await loadGameData(selectedGameId);
      setMessage(`Starting five saved for Q${period}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the starting five.');
    } finally { setBusy(false); }
  }

  async function saveSubstitution() {
    if (!supabase || !selectedGameId || !selectedTeamId || !subOut || !subIn || busy) return;
    const [minutes, seconds] = clock.split(':').map(Number);
    const clockSeconds = Math.max(0, (minutes || 0) * 60 + (seconds || 0));
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: rpcError } = await supabase.rpc('record_substitution', {
        target_game_id: selectedGameId, target_team_id: selectedTeamId,
        target_period: period, target_clock_seconds: clockSeconds,
        target_player_out: subOut, target_player_in: subIn,
      } as never);
      if (rpcError) throw rpcError;
      await loadGameData(selectedGameId);
      setMessage('Substitution recorded. Minutes and lineup plus/minus recalculated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to record substitution.');
    } finally { setBusy(false); }
  }

  async function recordAction(eventType: GameEvent['event_type'], points = 0, shotValue: 1 | 2 | 3 | null = null, made = false) {
    if (!supabase || !selectedGame || !selectedTeamId || !selectedPlayerId || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    const [minutes, seconds] = clock.split(':').map(Number);
    const clockSeconds = Math.max(0, (minutes || 0) * 60 + (seconds || 0));
    const metadata = {
      assist: Boolean(assistPlayerId && eventType === 'shot_made'),
      ai_suggested: false,
    };

    try {
      const { data, error: rpcError } = await supabase.rpc('record_game_event', {
        target_game_id: selectedGame.id,
        p_period_number: period,
        p_clock_seconds: clockSeconds,
        p_event_type: eventType,
        p_team_id: selectedTeamId,
        p_player_id: selectedPlayerId,
        p_secondary_player_id: assistPlayerId || null,
        p_points: points,
        p_shot_value: shotValue,
        p_shot_result: shotValue ? (made ? 'made' : 'missed') : null,
        p_shot_x: pendingShot?.x ?? null,
        p_shot_y: pendingShot?.y ?? null,
        p_shot_zone: pendingShot?.zone ?? null,
        p_foul_type: eventType === 'foul' ? 'personal' : null,
        p_turnover_type: eventType === 'turnover' ? 'live_ball' : null,
        p_metadata: metadata,
      } as never);
      if (rpcError) throw rpcError;
      setEvents((current) => [data as GameEvent, ...current]);
      setAssistPlayerId('');
      setPendingShot(null);
      setMessage('Stat recorded.');
      const [statsResult, eventResult] = await Promise.all([
        supabase.from('player_game_stats').select('*').eq('game_id', selectedGame.id),
        supabase.from('game_events').select('*').eq('game_id', selectedGame.id).order('sequence_no', { ascending: false }),
      ]);
      setStats((statsResult.data ?? []) as PlayerGameStats[]);
      setEvents((eventResult.data ?? []) as GameEvent[]);
    } catch (reason) {
      console.error(reason);
      setError(reason instanceof Error ? reason.message : 'Unable to record that stat.');
    } finally {
      setBusy(false);
    }
  }

  async function runGameIQ() {
    if (!selectedGameId) return;
    setAiBusy(true);
    setError('');
    try {
      const response = await fetch('/api/game-iq/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: selectedGameId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Game IQ analysis failed.');
      setAiInsight(data.insight ?? '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Game IQ analysis failed.');
    } finally {
      setAiBusy(false);
    }
  }

  async function finalizeScorebook() {
    if (!supabase || !selectedGameId || busy) return;
    setBusy(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('finalize_game_scorebook', { target_game_id: selectedGameId } as never);
      if (rpcError) throw rpcError;
      setGames((current) => current.map((game) => game.id === selectedGameId ? { ...game, ...(data as Game) } : game));
      setMessage('Scorebook finalized. Official box score is locked into the league data pipeline.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to finalize the scorebook.');
    } finally {
      setBusy(false);
    }
  }

  async function undoLast() {
    const latest = events.find((event) => !event.voided_at);
    if (!latest || !supabase) return;
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('void_game_event', { target_event_id: latest.id } as never);
      if (rpcError) throw rpcError;
      await loadGameData(selectedGameId);
      setMessage('Last play undone.');
    } catch (reason) {
      console.error(reason);
      setError('Unable to undo the last play.');
    } finally {
      setBusy(false);
    }
  }

  function chooseCourtLocation(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setPendingShot({ x, y, zone: zoneFromCoordinates(x, y) });
  }

  const teamName = (id: string) => teams.find((team) => team.id === id)?.name ?? 'Team';
  const playerName = (id: string | null) => {
    if (!id) return 'Team';
    const p = players.find((player) => player.id === id);
    return p ? `${p.first_name} ${p.last_name}` : 'Player';
  };

  if (authLoading || !profile) {
    return <main><Container maxWidth="xl" className="py-16"><div className="h-48 animate-pulse rounded-3xl bg-white/5" /></Container></main>;
  }

  if (!isStaff && !isCoach) {
    return <main><Container maxWidth="lg" className="py-16"><h1 className="font-display text-3xl font-black uppercase">Scorebook access required</h1><p className="mt-3 text-white/50">The RCL Game IQ scorebook is limited to assigned coaches, league staff, and administrators.</p></Container></main>;
  }

  return (
    <main className="min-h-screen bg-[#05080d] text-white">
      <Container maxWidth="2xl" className="py-6 sm:py-10">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.3em] text-rcl-gold">RCL GAME IQ™ · LIVE SCOREBOOK</p>
            <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight sm:text-6xl">Control the game.</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/45">Record the play once. RCL calculates the box score, advanced metrics, shot profile, leaderboards, player profiles and downstream league data.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setMode('quick')} className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest ${mode === 'quick' ? 'bg-rcl-orange text-black' : 'border border-white/10 bg-white/5'}`}>Quick</button>
            <button onClick={() => setMode('pro')} className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest ${mode === 'pro' ? 'bg-rcl-gold text-black' : 'border border-white/10 bg-white/5'}`}>Pro</button>
          </div>
        </div>

        {error && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
        {message && <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</div>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={!selectedGameId || aiBusy} onClick={() => void runGameIQ()} className="rounded-xl border border-rcl-gold/30 bg-rcl-gold/10 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-rcl-gold disabled:opacity-40">{aiBusy ? 'Game IQ thinking…' : 'Ask Game IQ AI'}</button>
          <button disabled={!selectedGameId || busy} onClick={() => void finalizeScorebook()} className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-300 disabled:opacity-40">Finalize official game</button>
        </div>
        {aiInsight && <section className="mt-4 rounded-2xl border border-rcl-gold/20 bg-rcl-gold/[.06] p-4"><p className="text-[9px] font-black uppercase tracking-widest text-rcl-gold">RCL Game IQ · AI Coach Report</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/75">{aiInsight}</p></section>}

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_2fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/35">Game</label>
            <select value={selectedGameId} onChange={(e) => { setSelectedGameId(e.target.value); void loadGameData(e.target.value); }} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white">
              {games.map((game) => <option key={game.id} value={game.id}>{teamName(game.home_team_id)} vs {teamName(game.away_team_id)} · {new Date(game.scheduled_at).toLocaleDateString()}</option>)}
            </select>
            {selectedGame && <div className="mt-4 space-y-2 text-xs text-white/50"><p>{new Date(selectedGame.scheduled_at).toLocaleString()}</p><p>{selectedGame.venue_id ? 'Venue assigned' : 'Venue not assigned'}</p><p>{selectedGame.period_count} periods · {Math.floor(selectedGame.period_length_seconds / 60)} min</p></div>}
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.06] to-white/[.02] p-5">
            <div className="grid grid-cols-3 items-center text-center">
              <div><p className="text-[10px] font-black uppercase tracking-widest text-white/35">{selectedGame ? teamName(selectedGame.home_team_id) : 'HOME'}</p><p className="mt-1 font-display text-5xl font-black">{summary?.homeScore ?? 0}</p></div>
              <div><p className="text-[9px] font-black uppercase tracking-widest text-rcl-orange">PERIOD {period}</p><input value={clock} onChange={(e) => setClock(e.target.value)} className="mt-2 w-24 rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-center font-mono text-xl font-black" /><p className="mt-2 text-[9px] text-white/30">MANUAL CLOCK</p></div>
              <div><p className="text-[10px] font-black uppercase tracking-widest text-white/35">{selectedGame ? teamName(selectedGame.away_team_id) : 'AWAY'}</p><p className="mt-1 font-display text-5xl font-black">{summary?.awayScore ?? 0}</p></div>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-2">
              {[1,2,3,4].map((value) => <button key={value} onClick={() => setPeriod(value)} className={`rounded-xl px-3 py-2 text-[9px] font-black uppercase ${period === value ? 'bg-white text-black' : 'border border-white/10 text-white/45'}`}>Q{value}</button>)}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Game IQ snapshot</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[['EVENTS', summary?.totalEvents ?? 0], ['POSSESSIONS', summary?.possessions ?? 0], ['REB', summary?.rebounds ?? 0], ['TO', summary?.turnovers ?? 0]].map(([label, value]) => <div key={label} className="rounded-xl bg-black/20 p-3"><p className="text-[8px] font-black text-white/30">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>)}
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1.6fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Team</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {selectedGame && [selectedGame.home_team_id, selectedGame.away_team_id].map((teamId) => <button key={teamId} onClick={() => { setSelectedTeamId(teamId); setSelectedPlayerId(''); }} className={`rounded-xl p-3 text-left text-[10px] font-black uppercase ${selectedTeamId === teamId ? 'bg-rcl-orange text-black' : 'border border-white/10 bg-black/20 text-white/55'}`}>{teamName(teamId)}</button>)}
            </div>
            <p className="mt-5 text-[9px] font-black uppercase tracking-widest text-white/35">Player</p>
            <div className="mt-2 grid max-h-[330px] grid-cols-2 gap-2 overflow-y-auto pr-1">
              {teamPlayers.map((player) => {
                const stat = stats.find((item) => item.player_id === player.id);
                return <button key={player.id} onClick={() => setSelectedPlayerId(player.id)} className={`rounded-xl border p-3 text-left ${selectedPlayerId === player.id ? 'border-rcl-gold bg-rcl-gold/10' : 'border-white/10 bg-black/20'}`}><span className="text-[9px] font-black text-rcl-gold">#{player.jersey_number ?? '--'}</span><p className="mt-1 text-xs font-black">{player.first_name} {player.last_name}</p><p className="mt-1 text-[9px] text-white/35">{stat?.points ?? 0} PTS · {stat?.rebounds ?? 0} REB · {stat?.assists ?? 0} AST</p></button>;
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-white/35">Shot map</p><p className="mt-1 text-xs text-white/40">Tap a location, then record the shot.</p></div>{pendingShot && <span className="rounded-full bg-rcl-orange/15 px-3 py-1 text-[9px] font-black uppercase text-rcl-orange">{pendingShot.zone}</span>}</div>
            <div onClick={chooseCourtLocation} className="relative mt-4 aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1119]">
              <div className="absolute inset-[7%] rounded-[50%] border border-white/15" />
              <div className="absolute left-[25%] right-[25%] top-[5%] h-[23%] rounded-b-[45%] border border-white/15" />
              <div className="absolute left-[36%] right-[36%] top-[4%] h-[5%] rounded-b-full border-b-2 border-rcl-orange" />
              <div className="absolute left-1/2 top-0 bottom-0 border-l border-white/5" />
              {events.filter((e) => !e.voided_at && e.shot_x !== null && e.shot_y !== null && ['shot_made','shot_missed'].includes(e.event_type)).slice(0,120).map((shot) => <span key={shot.id} className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${shot.event_type === 'shot_made' ? 'border-emerald-300 bg-emerald-300/50' : 'border-red-300 bg-red-300/30'}`} style={{ left: `${shot.shot_x}%`, top: `${shot.shot_y}%` }} />)}
              {pendingShot && <span className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-rcl-gold bg-rcl-gold/30" style={{ left: `${pendingShot.x}%`, top: `${pendingShot.y}%` }} />}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Selected player</p>
            <h2 className="mt-2 font-display text-2xl font-black uppercase">{selectedPlayer ? `#${selectedPlayer.jersey_number ?? '--'} ${selectedPlayer.first_name} ${selectedPlayer.last_name}` : 'Select a player'}</h2>
            {derived && <div className="mt-4 grid grid-cols-2 gap-2">{[['PTS', derived.points], ['REB', derived.rebounds], ['AST', derived.assists], ['STL', derived.steals], ['BLK', derived.blocks], ['TO', derived.turnovers], ['FG%', `${(derived.fg_pct * 100).toFixed(0)}%`], ['TS%', `${(derived.ts_pct * 100).toFixed(0)}%`], ['eFG%', `${(derived.efg_pct * 100).toFixed(0)}%`], ['EFF', derived.efficiency]].map(([label, value]) => <div key={label} className="rounded-xl bg-black/20 p-3"><p className="text-[8px] font-black text-white/30">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>)}</div>}
            {mode === 'pro' && selectedPlayerId && <><p className="mt-5 text-[9px] font-black uppercase tracking-widest text-white/35">Optional assist</p><select value={assistPlayerId} onChange={(e) => setAssistPlayerId(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white"><option value="">No assist</option>{teamPlayers.filter((p) => p.id !== selectedPlayerId).map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}</select></>}
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-[9px] font-black uppercase tracking-widest text-white/35">Lineup Lab</p><p className="mt-1 text-xs text-white/40">Set the five on the floor. RCL derives minutes and plus/minus from the substitution timeline.</p></div>
              <span className="rounded-full border border-rcl-gold/20 bg-rcl-gold/10 px-2 py-1 text-[8px] font-black uppercase text-rcl-gold">{startingFive.length}/5 selected</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {teamPlayers.map((player) => {
                const selected = startingFive.includes(player.id);
                return <button key={player.id} onClick={() => setStartingFive((current) => selected ? current.filter((id) => id !== player.id) : current.length < 5 ? [...current, player.id] : current)} className={`rounded-xl border p-3 text-left ${selected ? 'border-emerald-300 bg-emerald-300/10' : 'border-white/10 bg-black/20'}`}><span className="text-[9px] font-black text-rcl-gold">#{player.jersey_number ?? '--'}</span><p className="mt-1 text-[10px] font-black">{player.first_name} {player.last_name}</p>{selected && <p className="mt-1 text-[8px] uppercase text-emerald-300">On floor</p>}</button>;
              })}
            </div>
            <button disabled={startingFive.length !== 5 || busy} onClick={() => void saveStartingFive()} className="mt-3 rounded-xl bg-rcl-gold px-4 py-3 text-[9px] font-black uppercase tracking-widest text-black disabled:opacity-30">Save Q{period} Starting Five</button>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Substitution Desk</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select value={subOut} onChange={(e) => setSubOut(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white"><option value="">Player OUT</option>{teamPlayers.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}</select>
              <select value={subIn} onChange={(e) => setSubIn(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white"><option value="">Player IN</option>{teamPlayers.filter((p) => p.id !== subOut).map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}</select>
            </div>
            <button disabled={!subOut || !subIn || busy} onClick={() => void saveSubstitution()} className="mt-3 w-full rounded-xl border border-rcl-orange/30 bg-rcl-orange/10 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-rcl-orange disabled:opacity-30">Record Substitution</button>
            <div className="mt-4 grid grid-cols-2 gap-2">{stats.filter((s) => s.team_id === selectedTeamId).sort((a,b) => (b.minutes ?? 0) - (a.minutes ?? 0)).slice(0,6).map((s) => <div key={s.id} className="rounded-xl bg-black/20 p-3"><p className="text-[8px] text-white/30">{playerName(s.player_id)}</p><p className="mt-1 text-sm font-black">{(s.minutes ?? 0).toFixed(1)} MIN <span className="text-white/30">·</span> {s.plus_minus >= 0 ? '+' : ''}{s.plus_minus} +/-</p></div>)}</div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            {actionGroups.map((group) => <div key={group.label} className="mb-5 last:mb-0"><p className="mb-2 text-[9px] font-black uppercase tracking-widest text-white/35">{group.label}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{group.actions.map(([label, type, value, made]) => <button key={label} disabled={!selectedPlayerId || busy} onClick={() => void recordAction(type as GameEvent['event_type'], value, value ? value as 1|2|3 : null, made)} className="min-h-14 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider transition hover:border-rcl-orange/50 hover:bg-rcl-orange/10 disabled:cursor-not-allowed disabled:opacity-30">{label}<span className="mt-1 block text-[8px] font-normal text-white/30">{selectedPlayerId ? 'Tap to record' : 'Select player first'}</span></button>)}</div></div>)}
            <div className="mt-5 flex gap-2"><button disabled={!events.length || busy} onClick={() => void undoLast()} className="rounded-xl border border-white/10 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/60 disabled:opacity-30">Undo last play</button><button disabled={!selectedPlayerId || busy} onClick={() => void recordAction('assist')} className="rounded-xl border border-rcl-gold/30 bg-rcl-gold/10 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-rcl-gold disabled:opacity-30">Record assist</button></div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-white/35">Play-by-play</p><p className="mt-1 text-[10px] text-white/30">{events.filter((e) => !e.voided_at).length} live events</p></div><span className="rounded-full border border-rcl-gold/20 bg-rcl-gold/10 px-2 py-1 text-[8px] font-black uppercase text-rcl-gold">source of truth</span></div>
            <div className="mt-3 max-h-[430px] space-y-1 overflow-y-auto pr-1">
              {events.filter((e) => !e.voided_at).map((event) => <div key={event.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2"><span className="w-12 shrink-0 font-mono text-[9px] text-rcl-gold">{formatClock(event.clock_seconds)}</span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold">{describeEvent(event, playerName(event.player_id), playerName(event.secondary_player_id))}</p><p className="text-[8px] uppercase text-white/25">{teamName(event.team_id ?? '')} · Q{event.period_number}</p></div>{event.points > 0 && <span className="font-black text-emerald-300">+{event.points}</span>}</div>)}
              {!events.length && <p className="py-10 text-center text-xs text-white/25">No plays recorded yet.</p>}
            </div>
          </div>
        </section>
      </Container>
    </main>
  );
}

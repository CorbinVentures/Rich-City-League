'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { ShotMap } from '@/components/scorebook/ShotMap';
import { useAuth } from '@/hooks/useAuth';
import { deriveGameAnalytics, derivePlayerMetrics, describeEvent, formatClock, summarizeGame, zoneFromCoordinates } from '@/lib/game-iq';
import { getSupabaseClient } from '@/lib/supabase';
import type { Game, GameEvent, GameLineup, Player, PlayerGameStats, Roster, Team, TeamSeason } from '@/types/database';

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

function periodLabel(period: number, periodCount: number) {
  if (periodCount === 4) return `Q${period}`;
  return `P${period}`;
}

function isFinalGame(game: GameRow | undefined) {
  return Boolean(game && (game.status === 'completed' || game.scorebook_status === 'final' || game.scorebook_status === 'locked'));
}

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
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachAnswer, setCoachAnswer] = useState('');
  const [coachAskBusy, setCoachAskBusy] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const isCoach = profile?.role === 'coach';
  const selectedGame = games.find((game) => game.id === selectedGameId);
  const locked = isFinalGame(selectedGame);
  const summary = selectedGame ? summarizeGame(events, selectedGame.home_team_id, selectedGame.away_team_id) : null;
  const activeActionGroups = mode === 'quick'
    ? actionGroups.filter((group) => group.label === 'SCORING' || group.label === 'MISTAKES / FOULS')
    : actionGroups;
  const modeConfig = mode === 'quick'
    ? { label: 'QUICK', description: 'Fast game-day entry for score, turnovers and fouls.', features: ['2PT / 3PT / FT', 'Turnovers', 'Fouls', 'Undo'] }
    : { label: 'PRO', description: 'Full capture with shot chart, assists, lineups, substitutions and Game IQ.', features: ['Shot map', 'Assists', 'Lineups + minutes', 'Game IQ'] };

  const teamPlayers = useMemo(() => {
    if (!selectedGame || !selectedTeamId) return [];
    const ids = new Set(
      rosters.filter((roster) => {
        const teamSeason = teamSeasons.find((item) => item.id === roster.team_season_id);
        return teamSeason?.team_id === selectedTeamId && teamSeason.season_id === selectedGame.season_id;
      }).map((roster) => roster.player_id),
    );
    return players.filter((player) => ids.has(player.id));
  }, [players, rosters, teamSeasons, selectedGame, selectedTeamId]);

  const periodSegments = useMemo(() => lineups.filter((item) =>
    item.game_id === selectedGameId && item.team_id === selectedTeamId && item.period_number === period,
  ), [lineups, selectedGameId, selectedTeamId, period]);

  const activeLineup = useMemo(() => {
    const current = [...periodSegments].sort((a, b) =>
      a.started_clock_seconds - b.started_clock_seconds || b.created_at.localeCompare(a.created_at),
    )[0];
    return current?.player_ids ?? [];
  }, [periodSegments]);

  useEffect(() => {
    const opening = [...periodSegments].sort((a, b) =>
      b.started_clock_seconds - a.started_clock_seconds || a.created_at.localeCompare(b.created_at),
    )[0];
    setStartingFive(opening?.player_ids ?? []);
    setSubOut('');
    setSubIn('');
    setAssistPlayerId('');
  }, [periodSegments, selectedTeamId, period]);

  const analytics = selectedGame ? deriveGameAnalytics(selectedGame, events, stats, lineups) : null;
  const selectedTeamAnalytics = analytics?.teams.find((item) => item.team_id === selectedTeamId);
  const selectedStat = stats.find((stat) => stat.player_id === selectedPlayerId);
  const selectedPlayer = players.find((player) => player.id === selectedPlayerId);
  const derived = selectedStat ? derivePlayerMetrics(selectedStat, summary?.possessions ?? 0) : null;
  const assistOptions = teamPlayers.filter((player) =>
    player.id !== selectedPlayerId && (!activeLineup.length || activeLineup.includes(player.id)),
  );
  const shotMapEvents = events.filter((event) =>
    event.team_id === selectedTeamId && (!selectedPlayerId || event.player_id === selectedPlayerId),
  );

  function teamName(id: string) {
    return teams.find((team) => team.id === id)?.name ?? 'Team';
  }

  function playerName(id: string | null) {
    if (!id) return 'Team';
    const player = players.find((item) => item.id === id);
    return player ? `${player.first_name} ${player.last_name}` : 'Player';
  }

  function parseClock() {
    if (!selectedGame) return null;
    const match = /^(\d{1,2}):([0-5]\d)$/.exec(clock.trim());
    if (!match) {
      setError('Enter the game clock as M:SS, for example 7:42.');
      return null;
    }
    const seconds = Number(match[1]) * 60 + Number(match[2]);
    if (seconds > selectedGame.period_length_seconds) {
      setError(`Clock cannot exceed ${formatClock(selectedGame.period_length_seconds)} for this game.`);
      return null;
    }
    return seconds;
  }

  async function refreshGameData(gameId: string) {
    if (!supabase || !gameId) return;
    const [eventResult, statResult, lineupResult] = await Promise.all([
      supabase.from('game_events').select('*').eq('game_id', gameId).order('sequence_no', { ascending: false }),
      supabase.from('player_game_stats').select('*').eq('game_id', gameId),
      supabase.from('game_lineups').select('*').eq('game_id', gameId).order('period_number').order('started_clock_seconds', { ascending: false }),
    ]);
    const firstError = [eventResult, statResult, lineupResult].find((result) => result.error)?.error;
    if (firstError) throw firstError;
    setEvents((eventResult.data ?? []) as GameEvent[]);
    setStats((statResult.data ?? []) as PlayerGameStats[]);
    setLineups((lineupResult.data ?? []) as GameLineup[]);
  }

  async function activateGame(game: GameRow) {
    setBusy(true);
    setError('');
    setMessage('');
    setSelectedGameId(game.id);
    setSelectedTeamId(game.home_team_id);
    setSelectedPlayerId('');
    setPeriod(1);
    setClock(formatClock(game.period_length_seconds));
    setMode(game.scorebook_mode ?? 'pro');
    setPendingShot(null);
    setCoachAnswer('');
    setAiInsight('');
    try {
      await refreshGameData(game.id);
    } catch (reason) {
      console.error(reason);
      setError('Unable to load the scorebook.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (authLoading || !supabase || !profile) return;
    async function load() {
      if (!supabase) return;
      setBusy(true);
      setError('');
      try {
        const [gamesResult, teamsResult, playersResult, rostersResult, teamSeasonsResult, coachResult] = await Promise.all([
          supabase.from('games').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)').order('scheduled_at', { ascending: false }),
          supabase.from('teams').select('*').eq('is_active', true).order('name'),
          supabase.from('players').select('*').eq('is_active', true).order('last_name'),
          supabase.from('rosters').select('*').is('left_at', null),
          supabase.from('team_seasons').select('*'),
          isCoach ? supabase.from('team_coaches').select('team_id').eq('profile_id', profile.id) : Promise.resolve({ data: [], error: null }),
        ]);
        const firstError = [gamesResult, teamsResult, playersResult, rostersResult, teamSeasonsResult, coachResult].find((result) => result.error)?.error;
        if (firstError) throw firstError;
        const loadedGames = (gamesResult.data ?? []) as GameRow[];
        const coachTeamIds = new Set(((coachResult.data ?? []) as Array<{ team_id: string }>).map((item) => item.team_id));
        const visibleGames = isCoach
          ? loadedGames.filter((game) => coachTeamIds.has(game.home_team_id) || coachTeamIds.has(game.away_team_id))
          : loadedGames;
        setGames(visibleGames);
        setTeams((teamsResult.data ?? []) as Team[]);
        setPlayers((playersResult.data ?? []) as Player[]);
        setRosters((rostersResult.data ?? []) as Roster[]);
        setTeamSeasons((teamSeasonsResult.data ?? []) as TeamSeason[]);

        const now = Date.now();
        const liveGame = visibleGames.find((game) => game.status === 'live');
        const nextGame = [...visibleGames]
          .filter((game) => game.status === 'scheduled' && new Date(game.scheduled_at).getTime() >= now)
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
        const initialGame = liveGame ?? nextGame ?? visibleGames[0];
        if (initialGame) {
          setSelectedGameId(initialGame.id);
          setSelectedTeamId(initialGame.home_team_id);
          setPeriod(1);
          setClock(formatClock(initialGame.period_length_seconds));
          setMode(initialGame.scorebook_mode ?? 'pro');
          await refreshGameData(initialGame.id);
        }
      } catch (reason) {
        console.error(reason);
        setError('Unable to load scorebook data.');
      } finally {
        setBusy(false);
      }
    }
    void load();
  // refreshGameData is intentionally local to this client workflow.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile?.id, profile?.role, supabase]);

  async function saveStartingFive() {
    if (!supabase || !selectedGame || !selectedTeamId || startingFive.length !== 5 || busy || locked) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: rpcError } = await supabase.rpc('set_starting_lineup', {
        target_game_id: selectedGame.id,
        target_team_id: selectedTeamId,
        target_period: period,
        target_player_ids: startingFive,
      } as never);
      if (rpcError) throw rpcError;
      await refreshGameData(selectedGame.id);
      setMessage(`${periodLabel(period, selectedGame.period_count)} starting five saved.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the starting five.');
    } finally { setBusy(false); }
  }

  async function saveSubstitution() {
    if (!supabase || !selectedGame || !selectedTeamId || !subOut || !subIn || busy || locked) return;
    const clockSeconds = parseClock();
    if (clockSeconds === null) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: rpcError } = await supabase.rpc('record_substitution', {
        target_game_id: selectedGame.id,
        target_team_id: selectedTeamId,
        target_period: period,
        target_clock_seconds: clockSeconds,
        target_player_out: subOut,
        target_player_in: subIn,
      } as never);
      if (rpcError) throw rpcError;
      await refreshGameData(selectedGame.id);
      setMessage('Substitution recorded. Minutes and plus/minus recalculated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to record substitution.');
    } finally { setBusy(false); }
  }

  async function recordAction(eventType: GameEvent['event_type'], points = 0, shotValue: 1 | 2 | 3 | null = null, made = false) {
    if (!supabase || !selectedGame || !selectedTeamId || !selectedPlayerId || busy || locked) return;
    const clockSeconds = parseClock();
    if (clockSeconds === null) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: rpcError } = await supabase.rpc('record_game_event', {
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
        p_metadata: { assist: Boolean(assistPlayerId && eventType === 'shot_made'), ai_suggested: false },
      } as never);
      if (rpcError) throw rpcError;
      setAssistPlayerId('');
      setPendingShot(null);
      await refreshGameData(selectedGame.id);
      setMessage(`${eventType.replace(/_/g, ' ')} recorded.`);
    } catch (reason) {
      console.error(reason);
      setError(reason instanceof Error ? reason.message : 'Unable to record that stat.');
    } finally { setBusy(false); }
  }

  async function undoLast() {
    const latest = events.find((event) => !event.voided_at && event.event_type !== 'period_start');
    if (!latest || !supabase || !selectedGame || busy || locked) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: rpcError } = await supabase.rpc('void_game_event', { target_event_id: latest.id } as never);
      if (rpcError) throw rpcError;
      await refreshGameData(selectedGame.id);
      setMessage('Last play undone.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to undo the last play.');
    } finally { setBusy(false); }
  }

  async function finalizeScorebook() {
    if (!supabase || !selectedGame || busy || locked) return;
    const confirmed = window.confirm('Finalize this game? The official event stream will be locked and standings will update.');
    if (!confirmed) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { data, error: rpcError } = await supabase.rpc('finalize_game_scorebook', { target_game_id: selectedGame.id } as never);
      if (rpcError) throw rpcError;
      setGames((current) => current.map((game) => game.id === selectedGame.id ? { ...game, ...(data as Game) } : game));
      await refreshGameData(selectedGame.id);
      setMessage('Game finalized. Box score, standings and downstream league data are now official.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to finalize the scorebook.');
    } finally { setBusy(false); }
  }

  async function runGameIQ() {
    if (!selectedGameId || aiBusy) return;
    setAiBusy(true); setError('');
    try {
      const response = await fetch('/api/game-iq/insights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game_id: selectedGameId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Game IQ analysis failed.');
      setAiInsight(data.insight ?? '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Game IQ analysis failed.');
    } finally { setAiBusy(false); }
  }

  async function askGameIQ(question = coachQuestion) {
    const normalized = question.trim();
    if (!selectedGameId || !normalized || coachAskBusy) return;
    setCoachAskBusy(true); setError(''); setCoachAnswer('');
    try {
      const response = await fetch('/api/game-iq/ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ game_id: selectedGameId, question: normalized }),
      });
      const raw = await response.text();
      const data = raw ? JSON.parse(raw) as { answer?: string; error?: string; detail?: string } : {};
      if (!response.ok) throw new Error(`${data.error ?? 'Game IQ could not answer that question.'}${data.detail ? ` ${data.detail}` : ''}`);
      if (!data.answer) throw new Error('Game IQ returned an empty answer.');
      setCoachAnswer(data.answer);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Game IQ could not answer that question.');
    } finally { setCoachAskBusy(false); }
  }

  function switchMode(nextMode: 'quick' | 'pro') {
    setMode(nextMode);
    setPendingShot(null);
    setCoachAnswer('');
    setAiInsight('');
  }

  if (authLoading || !profile) {
    return <main><Container maxWidth="xl" className="py-16"><div className="h-48 animate-pulse rounded-3xl bg-white/5" /></Container></main>;
  }
  if (!isAdmin && !isCoach) {
    return <main><Container maxWidth="lg" className="py-16"><h1 className="font-display text-3xl font-black uppercase">Scorebook access required</h1><p className="mt-3 text-white/50">RCL Game IQ is limited to authorized coaches and administrators.</p></Container></main>;
  }

  return (
    <main className="min-h-screen bg-[#05080d] pb-24 text-white">
      <Container maxWidth="2xl" className="py-6 sm:py-10">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[.3em] text-rcl-gold">RCL GAME IQ™ · SCOREBOOK</p>
              {selectedGame && <span className={`rounded-full px-2 py-1 text-xs font-black uppercase tracking-widest ${locked ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rcl-orange/15 text-rcl-orange'}`}>{locked ? 'FINAL · READ ONLY' : selectedGame.scorebook_status.replace(/_/g, ' ')}</span>}
            </div>
            <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight sm:text-6xl">Control the game.</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/45">Select the game, team and player, set the clock, then record each play once. RCL handles the official box score and downstream data.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => switchMode('quick')} className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest ${mode === 'quick' ? 'bg-rcl-orange text-black' : 'border border-white/10 bg-white/5'}`}>Quick</button>
            <button type="button" onClick={() => switchMode('pro')} className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest ${mode === 'pro' ? 'bg-rcl-gold text-black' : 'border border-white/10 bg-white/5'}`}>Pro</button>
          </div>
        </header>

        <section className={`mt-3 rounded-2xl border px-4 py-3 ${locked ? 'border-emerald-400/20 bg-emerald-400/[.05]' : mode === 'quick' ? 'border-rcl-orange/20 bg-rcl-orange/[.04]' : 'border-rcl-gold/20 bg-rcl-gold/[.04]'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-xs font-black uppercase tracking-widest text-white/40">{locked ? 'OFFICIAL GAME · EVENT STREAM LOCKED' : `${modeConfig.label} MODE`}</p><p className="mt-1 text-xs text-white/55">{locked ? 'Review stats, play-by-play and Game IQ. Scoring controls are disabled.' : modeConfig.description}</p></div>
            {!locked && <div className="flex flex-wrap gap-1.5">{modeConfig.features.map((feature) => <span key={feature} className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-xs font-black uppercase tracking-wide text-white/45">{feature}</span>)}</div>}
          </div>
        </section>

        {error && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
        {message && <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</div>}

        <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_2fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <label className="text-xs font-black uppercase tracking-widest text-white/35">1 · Game</label>
            <select aria-label="Game" value={selectedGameId} onChange={(event) => { const game = games.find((item) => item.id === event.target.value); if (game) void activateGame(game); }} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white">
              {games.length === 0 && <option value="">No games available</option>}
              {games.map((game) => <option key={game.id} value={game.id}>{teamName(game.home_team_id)} vs {teamName(game.away_team_id)} · {new Date(game.scheduled_at).toLocaleDateString()} · {game.status}</option>)}
            </select>
            {selectedGame && <div className="mt-4 space-y-2 text-xs text-white/50"><p>{new Date(selectedGame.scheduled_at).toLocaleString()}</p><p>{selectedGame.venue_id ? 'Venue assigned' : 'Venue not assigned'}</p><p>{selectedGame.period_count} periods · {formatClock(selectedGame.period_length_seconds)} each</p></div>}
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.06] to-white/[.02] p-5">
            <div className="grid grid-cols-3 items-center text-center">
              <div><p className="text-xs font-black uppercase tracking-widest text-white/35">{selectedGame ? teamName(selectedGame.home_team_id) : 'HOME'}</p><p className="mt-1 font-display text-5xl font-black">{summary?.homeScore ?? 0}</p></div>
              <div><p className="text-xs font-black uppercase tracking-widest text-rcl-orange">{selectedGame ? periodLabel(period, selectedGame.period_count) : 'PERIOD'}</p><input aria-label="Game clock" value={clock} onChange={(event) => setClock(event.target.value)} onBlur={() => { const seconds = parseClock(); if (seconds !== null) setClock(formatClock(seconds)); }} disabled={!selectedGame || locked} inputMode="numeric" className="mt-2 w-24 rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-center font-mono text-xl font-black disabled:opacity-40" /><p className="mt-2 text-xs text-white/30">M:SS · manual clock</p></div>
              <div><p className="text-xs font-black uppercase tracking-widest text-white/35">{selectedGame ? teamName(selectedGame.away_team_id) : 'AWAY'}</p><p className="mt-1 font-display text-5xl font-black">{summary?.awayScore ?? 0}</p></div>
            </div>
            <div className="mt-5 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(selectedGame?.period_count ?? 4, 6)}, minmax(0,1fr))` }}>
              {Array.from({ length: selectedGame?.period_count ?? 4 }, (_, index) => index + 1).map((value) => <button key={value} type="button" onClick={() => { setPeriod(value); setSelectedPlayerId(''); setPendingShot(null); }} className={`rounded-xl px-3 py-2 text-xs font-black uppercase ${period === value ? 'bg-white text-black' : 'border border-white/10 text-white/45'}`}>{periodLabel(value, selectedGame?.period_count ?? 4)}</button>)}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <p className="text-xs font-black uppercase tracking-widest text-white/35">Game IQ snapshot</p>
            <div className="mt-3 grid grid-cols-2 gap-2">{[['EVENTS', summary?.totalEvents ?? 0], ['POSS', summary?.possessions ?? 0], ['REB', summary?.rebounds ?? 0], ['TO', summary?.turnovers ?? 0]].map(([label, value]) => <div key={label} className="rounded-xl bg-black/20 p-3"><p className="text-xs font-black text-white/30">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>)}</div>
            <button type="button" disabled={!selectedGameId || aiBusy} onClick={() => void runGameIQ()} className="mt-3 w-full rounded-xl border border-rcl-gold/30 bg-rcl-gold/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-rcl-gold disabled:opacity-40">{aiBusy ? 'Analyzing…' : 'Generate Game IQ report'}</button>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_1.6fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <p className="text-xs font-black uppercase tracking-widest text-white/35">2 · Team</p>
            <div className="mt-2 grid grid-cols-2 gap-2">{selectedGame && [selectedGame.home_team_id, selectedGame.away_team_id].map((teamId) => <button type="button" key={teamId} onClick={() => { setSelectedTeamId(teamId); setSelectedPlayerId(''); setPendingShot(null); }} className={`rounded-xl p-3 text-left text-xs font-black uppercase ${selectedTeamId === teamId ? 'bg-rcl-orange text-black' : 'border border-white/10 bg-black/20 text-white/55'}`}>{teamName(teamId)}</button>)}</div>
            <p className="mt-5 text-xs font-black uppercase tracking-widest text-white/35">3 · Player</p>
            <div className="mt-2 grid max-h-[330px] grid-cols-2 gap-2 overflow-y-auto pr-1">
              {teamPlayers.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-white/10 p-4 text-center text-xs uppercase tracking-widest text-white/30">No active roster is attached to this team for this season.</div>}
              {teamPlayers.map((player) => {
                const stat = stats.find((item) => item.player_id === player.id);
                return <button type="button" key={player.id} aria-pressed={selectedPlayerId === player.id} onClick={() => { setSelectedPlayerId(player.id); setAssistPlayerId(''); setPendingShot(null); }} className={`rounded-xl border p-3 text-left transition ${selectedPlayerId === player.id ? 'border-rcl-gold bg-rcl-gold/10 ring-1 ring-rcl-gold/30' : 'border-white/10 bg-black/20 hover:border-white/25'}`}><span className="text-xs font-black text-rcl-gold">#{player.jersey_number ?? '--'}</span><p className="mt-1 text-xs font-black">{player.first_name} {player.last_name}</p><p className="mt-1 text-xs text-white/35">{stat?.points ?? 0} PTS · {stat?.rebounds ?? 0} REB · {stat?.assists ?? 0} AST</p></button>;
              })}
            </div>
          </div>

          {mode === 'pro' ? <ShotMap events={shotMapEvents} pendingShot={pendingShot} onLocationSelect={(x, y) => !locked && setPendingShot({ x, y, zone: zoneFromCoordinates(x, y) })} /> : <div className="rounded-3xl border border-rcl-orange/15 bg-gradient-to-br from-rcl-orange/[.07] to-white/[.02] p-5"><p className="text-xs font-black uppercase tracking-widest text-rcl-orange">Quick mode</p><h3 className="mt-2 font-display text-2xl font-black uppercase">Record the play. Keep moving.</h3><p className="mt-2 text-xs leading-5 text-white/40">Switch to Pro when you want shot location, assists, lineups, substitutions and advanced analytics.</p><button type="button" onClick={() => switchMode('pro')} className="mt-4 rounded-xl bg-rcl-gold px-4 py-3 text-xs font-black uppercase tracking-widest text-black">Switch to Pro</button></div>}

          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <p className="text-xs font-black uppercase tracking-widest text-white/35">Selected player</p>
            <h2 className="mt-2 font-display text-2xl font-black uppercase">{selectedPlayer ? `#${selectedPlayer.jersey_number ?? '--'} ${selectedPlayer.first_name} ${selectedPlayer.last_name}` : 'Select a player'}</h2>
            {derived && <div className="mt-4 grid grid-cols-2 gap-2">{[['PTS', derived.points], ['REB', derived.rebounds], ['AST', derived.assists], ['STL', derived.steals], ['BLK', derived.blocks], ['TO', derived.turnovers], ['FG%', `${(derived.fg_pct * 100).toFixed(0)}%`], ['TS%', `${(derived.ts_pct * 100).toFixed(0)}%`]].map(([label, value]) => <div key={label} className="rounded-xl bg-black/20 p-3"><p className="text-xs font-black text-white/30">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>)}</div>}
            {mode === 'pro' && selectedPlayerId && <><p className="mt-5 text-xs font-black uppercase tracking-widest text-white/35">Assist on next made shot</p><select aria-label="Assist player" value={assistPlayerId} onChange={(event) => setAssistPlayerId(event.target.value)} disabled={locked} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white disabled:opacity-40"><option value="">Unassisted / none</option>{assistOptions.map((player) => <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>)}</select><p className="mt-2 text-xs text-white/30">When selected, the assist is attached automatically to the next made field goal.</p></>}
          </div>
        </section>

        {mode === 'pro' && <section className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-white/35">Lineup control</p><p className="mt-1 text-xs text-white/40">Save the five starting this period. Changing team or period loads that group automatically.</p></div><span className="rounded-full border border-rcl-gold/20 bg-rcl-gold/10 px-2 py-1 text-xs font-black uppercase text-rcl-gold">{startingFive.length}/5</span></div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{teamPlayers.map((player) => { const selected = startingFive.includes(player.id); return <button type="button" disabled={locked} key={player.id} onClick={() => setStartingFive((current) => selected ? current.filter((id) => id !== player.id) : current.length < 5 ? [...current, player.id] : current)} className={`rounded-xl border p-3 text-left disabled:opacity-40 ${selected ? 'border-emerald-300 bg-emerald-300/10' : 'border-white/10 bg-black/20'}`}><span className="text-xs font-black text-rcl-gold">#{player.jersey_number ?? '--'}</span><p className="mt-1 text-xs font-black">{player.first_name} {player.last_name}</p>{selected && <p className="mt-1 text-xs uppercase text-emerald-300">Starter</p>}</button>; })}</div>
            <button type="button" disabled={startingFive.length !== 5 || busy || locked} onClick={() => void saveStartingFive()} className="mt-3 rounded-xl bg-rcl-gold px-4 py-3 text-xs font-black uppercase tracking-widest text-black disabled:opacity-30">Save {selectedGame ? periodLabel(period, selectedGame.period_count) : 'period'} starting five</button>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <p className="text-xs font-black uppercase tracking-widest text-white/35">Substitution desk</p>
            {!activeLineup.length && <p className="mt-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/40">Save a starting five for this team and period before recording substitutions.</p>}
            <div className="mt-3 grid grid-cols-2 gap-2"><select aria-label="Player leaving the court" value={subOut} onChange={(event) => setSubOut(event.target.value)} disabled={locked || !activeLineup.length} className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white disabled:opacity-40"><option value="">Player OUT</option>{teamPlayers.filter((player) => activeLineup.includes(player.id)).map((player) => <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>)}</select><select aria-label="Player entering the court" value={subIn} onChange={(event) => setSubIn(event.target.value)} disabled={locked || !activeLineup.length} className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white disabled:opacity-40"><option value="">Player IN</option>{teamPlayers.filter((player) => player.id !== subOut && !activeLineup.includes(player.id)).map((player) => <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>)}</select></div>
            <button type="button" disabled={!subOut || !subIn || busy || locked} onClick={() => void saveSubstitution()} className="mt-3 w-full rounded-xl border border-rcl-orange/30 bg-rcl-orange/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-rcl-orange disabled:opacity-30">Record substitution at {clock}</button>
            <div className="mt-4 grid grid-cols-2 gap-2">{stats.filter((stat) => stat.team_id === selectedTeamId).sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0)).slice(0, 6).map((stat) => <div key={stat.id} className="rounded-xl bg-black/20 p-3"><p className="text-xs text-white/30">{playerName(stat.player_id)}</p><p className="mt-1 text-sm font-black">{(stat.minutes ?? 0).toFixed(1)} MIN · {stat.plus_minus >= 0 ? '+' : ''}{stat.plus_minus}</p></div>)}</div>
          </div>
        </section>}

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <div className="mb-4"><p className="text-xs font-black uppercase tracking-widest text-white/35">4 · Record play</p><p className="mt-1 text-xs text-white/40">{selectedPlayer ? `${playerName(selectedPlayer.id)} · ${clock} · ${selectedGame ? periodLabel(period, selectedGame.period_count) : ''}` : 'Select a player to enable stat buttons.'}</p></div>
            {activeActionGroups.map((group) => <div key={group.label} className="mb-5 last:mb-0"><p className="mb-2 text-xs font-black uppercase tracking-widest text-white/35">{group.label}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{group.actions.map(([label, type, value, made]) => <button type="button" key={label} disabled={!selectedPlayerId || busy || locked} onClick={() => void recordAction(type as GameEvent['event_type'], value, value ? value as 1 | 2 | 3 : null, made)} className="min-h-14 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-left text-xs font-black uppercase tracking-wider transition hover:border-rcl-orange/50 hover:bg-rcl-orange/10 disabled:cursor-not-allowed disabled:opacity-30">{label}<span className="mt-1 block text-xs font-normal text-white/30">{locked ? 'Game is final' : selectedPlayerId ? (mode === 'pro' && (type === 'shot_made' || type === 'shot_missed') && !pendingShot ? 'Tap court first for shot location (optional)' : 'Tap to record') : 'Select player first'}</span></button>)}</div></div>)}
            <div className="mt-5 flex flex-wrap items-center gap-2"><button type="button" disabled={!events.some((event) => !event.voided_at && event.event_type !== 'period_start') || busy || locked} onClick={() => void undoLast()} className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-white/60 disabled:opacity-30">Undo last play</button><button type="button" disabled={!selectedGameId || busy || locked} onClick={() => void finalizeScorebook()} className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-emerald-300 disabled:opacity-30">Finalize official game</button></div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-white/35">Play-by-play</p><p className="mt-1 text-xs text-white/30">{events.filter((event) => !event.voided_at).length} active events</p></div><span className="rounded-full border border-rcl-gold/20 bg-rcl-gold/10 px-2 py-1 text-xs font-black uppercase text-rcl-gold">source of truth</span></div>
            <div className="mt-3 max-h-[430px] space-y-1 overflow-y-auto pr-1">{events.filter((event) => !event.voided_at).map((event) => <div key={event.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2"><span className="w-12 shrink-0 font-mono text-xs text-rcl-gold">{formatClock(event.clock_seconds)}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{describeEvent(event, playerName(event.player_id), playerName(event.secondary_player_id))}</p><p className="text-xs uppercase text-white/25">{teamName(event.team_id ?? '')} · {selectedGame ? periodLabel(event.period_number, selectedGame.period_count) : `P${event.period_number}`}</p></div>{event.points > 0 && <span className="font-black text-emerald-300">+{event.points}</span>}</div>)}{!events.length && <p className="py-10 text-center text-xs text-white/25">No plays recorded yet.</p>}</div>
          </div>
        </section>

        {mode === 'pro' && analytics && <section className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-white/35">Basketball intelligence</p><p className="mt-1 text-xs text-white/40">Live deterministic analytics from the official event stream.</p></div><span className="rounded-full border border-rcl-orange/20 bg-rcl-orange/10 px-2 py-1 text-xs font-black uppercase text-rcl-orange">LIVE IQ</span></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[['PACE / 48', selectedTeamAnalytics?.pace_48 ?? 0], ['ORtg', selectedTeamAnalytics?.offensive_rating ?? 0], ['DRtg', selectedTeamAnalytics?.defensive_rating ?? 0], ['NET', selectedTeamAnalytics?.net_rating ?? 0], ['eFG%', `${selectedTeamAnalytics?.efg_pct ?? 0}%`], ['TS%', `${selectedTeamAnalytics?.ts_pct ?? 0}%`], ['TOV%', `${selectedTeamAnalytics?.turnover_rate ?? 0}%`], ['ORB%', `${selectedTeamAnalytics?.offensive_rebound_rate ?? 0}%`]].map(([label, value]) => <div key={label} className="rounded-xl bg-black/20 p-3"><p className="text-xs font-black text-white/30">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>)}</div></div>
          <div className="rounded-3xl border border-rcl-orange/20 bg-rcl-orange/[.06] p-4"><p className="text-xs font-black uppercase tracking-widest text-rcl-orange">AI Coach</p><p className="mt-1 text-xs text-white/40">Ask against the event stream, box score and lineup data.</p><div className="mt-3 flex gap-2"><input aria-label="Ask Game IQ" value={coachQuestion} onChange={(event) => setCoachQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void askGameIQ(); }} placeholder="What changed in Q3?" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white" /><button type="button" disabled={!coachQuestion.trim() || coachAskBusy || !selectedGameId} onClick={() => void askGameIQ()} className="rounded-xl bg-rcl-gold px-4 py-3 text-xs font-black uppercase tracking-widest text-black disabled:opacity-30">{coachAskBusy ? 'Thinking…' : 'Ask'}</button></div>{coachAnswer && <p className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white/70">{coachAnswer}</p>}{aiInsight && <p className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white/65">{aiInsight}</p>}</div>
        </section>}
      </Container>
    </main>
  );
}

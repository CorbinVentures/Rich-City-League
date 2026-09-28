'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { ShotMap } from '@/components/scorebook/ShotMap';
import { useAuth } from '@/hooks/useAuth';
import { deriveGameAnalytics, describeEvent, formatClock, summarizeGame, zoneFromCoordinates } from '@/lib/game-iq';
import { getSupabaseClient } from '@/lib/supabase';
import type { Game, GameEvent, GameLineup, Player, PlayerGameStats, Roster, Team, TeamSeason } from '@/types/database';

type GameRow = Game & { home_team?: Team; away_team?: Team };
type Shot = { x: number; y: number; zone: string };

type StatAction = {
  label: string;
  event: GameEvent['event_type'];
  points?: number;
  shotValue?: 1 | 2 | 3;
  made?: boolean;
};

const actionGroups: Array<{ label: string; actions: StatAction[] }> = [
  {
    label: 'Scoring',
    actions: [
      { label: '2PT Made', event: 'shot_made', points: 2, shotValue: 2, made: true },
      { label: '2PT Miss', event: 'shot_missed', shotValue: 2 },
      { label: '3PT Made', event: 'shot_made', points: 3, shotValue: 3, made: true },
      { label: '3PT Miss', event: 'shot_missed', shotValue: 3 },
      { label: 'FT Made', event: 'free_throw_made', points: 1, shotValue: 1, made: true },
      { label: 'FT Miss', event: 'free_throw_missed', shotValue: 1 },
    ],
  },
  {
    label: 'Possession',
    actions: [
      { label: 'O-Rebound', event: 'rebound_off' },
      { label: 'D-Rebound', event: 'rebound_def' },
      { label: 'Assist', event: 'assist' },
      { label: 'Steal', event: 'steal' },
      { label: 'Block', event: 'block' },
      { label: 'Turnover', event: 'turnover' },
      { label: 'Foul', event: 'foul' },
    ],
  },
];

function lineupFromMetadata(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const raw = (metadata as Record<string, unknown>).starting_lineup;
  return Array.isArray(raw) ? raw.filter((value): value is string => typeof value === 'string') : [];
}

function clockToSeconds(value: string) {
  const [minutesRaw, secondsRaw] = value.split(':');
  const minutes = Math.max(0, Number(minutesRaw) || 0);
  const seconds = Math.min(59, Math.max(0, Number(secondsRaw) || 0));
  return (minutes * 60) + seconds;
}

export function ScorebookWorkspace() {
  const { profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [games, setGames] = useState<GameRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamSeasons, setTeamSeasons] = useState<TeamSeason[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [stats, setStats] = useState<PlayerGameStats[]>([]);
  const [lineups, setLineups] = useState<GameLineup[]>([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [assistPlayerId, setAssistPlayerId] = useState('');
  const [startingFive, setStartingFive] = useState<string[]>([]);
  const [subOut, setSubOut] = useState('');
  const [subIn, setSubIn] = useState('');
  const [period, setPeriod] = useState(1);
  const [clock, setClock] = useState('10:00');
  const [mode, setMode] = useState<'quick' | 'pro'>('quick');
  const [pendingShot, setPendingShot] = useState<Shot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachAnswer, setCoachAnswer] = useState('');
  const [coachBusy, setCoachBusy] = useState(false);
  const [insight, setInsight] = useState('');
  const [insightBusy, setInsightBusy] = useState(false);

  const role = profile?.role;
  const isStaff = role === 'admin' || role === 'staff';
  const isCoach = role === 'coach';
  const selectedGame = games.find((game) => game.id === selectedGameId) ?? null;
  const editable = Boolean(selectedGame && selectedGame.status !== 'completed' && selectedGame.scorebook_status !== 'final' && selectedGame.scorebook_status !== 'locked');
  const activeEvents = events.filter((event) => !event.voided_at);
  const summary = selectedGame ? summarizeGame(activeEvents, selectedGame.home_team_id, selectedGame.away_team_id) : null;
  const analytics = selectedGame ? deriveGameAnalytics(selectedGame, activeEvents, stats, lineups) : null;

  const teamPlayers = useMemo(() => {
    if (!selectedGame || !selectedTeamId) return [];
    const seasonTeamIds = new Set(
      teamSeasons
        .filter((item) => item.season_id === selectedGame.season_id && item.team_id === selectedTeamId)
        .map((item) => item.id),
    );
    const playerIds = new Set(
      rosters
        .filter((roster) => seasonTeamIds.has(roster.team_season_id) && !roster.left_at)
        .map((roster) => roster.player_id),
    );
    return players.filter((player) => playerIds.has(player.id));
  }, [players, rosters, selectedGame, selectedTeamId, teamSeasons]);

  const activeLineup = useMemo(() => {
    if (!selectedGame) return [];
    const candidates = lineups
      .filter((lineup) => lineup.game_id === selectedGame.id && lineup.team_id === selectedTeamId && lineup.period_number === period)
      .sort((a, b) => a.ended_clock_seconds - b.ended_clock_seconds || b.started_clock_seconds - a.started_clock_seconds);
    return candidates[0]?.player_ids ?? [];
  }, [lineups, period, selectedGame, selectedTeamId]);

  const teamName = (id: string) => teams.find((team) => team.id === id)?.name ?? 'Team';
  const playerName = (id: string | null) => {
    if (!id) return 'Team';
    const player = players.find((item) => item.id === id);
    return player ? `${player.first_name} ${player.last_name}` : 'Player';
  };

  async function refreshGameData(gameId: string, resetContext = false) {
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
    if (resetContext) {
      const game = games.find((item) => item.id === gameId);
      setSelectedTeamId(game?.home_team_id ?? '');
      setSelectedPlayerId('');
      setAssistPlayerId('');
      setSubOut('');
      setSubIn('');
      setPendingShot(null);
      setPeriod(1);
      setClock(game ? formatClock(game.period_length_seconds) : '10:00');
      setMode(game?.scorebook_mode ?? 'quick');
    }
  }

  useEffect(() => {
    if (authLoading || !supabase || !profile || (!isStaff && !isCoach)) return;
    let cancelled = false;
    async function load() {
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
        if (cancelled) return;
        const loadedGames = (gamesResult.data ?? []) as GameRow[];
        const coachTeamIds = new Set(((coachResult.data ?? []) as Array<{ team_id: string }>).map((item) => item.team_id));
        const visibleGames = isCoach ? loadedGames.filter((game) => coachTeamIds.has(game.home_team_id) || coachTeamIds.has(game.away_team_id)) : loadedGames;
        setGames(visibleGames);
        setTeams((teamsResult.data ?? []) as Team[]);
        setPlayers((playersResult.data ?? []) as Player[]);
        setRosters((rostersResult.data ?? []) as Roster[]);
        setTeamSeasons((teamSeasonsResult.data ?? []) as TeamSeason[]);
        if (visibleGames[0]) {
          setSelectedGameId(visibleGames[0].id);
          const [eventResult, statResult, lineupResult] = await Promise.all([
            supabase.from('game_events').select('*').eq('game_id', visibleGames[0].id).order('sequence_no', { ascending: false }),
            supabase.from('player_game_stats').select('*').eq('game_id', visibleGames[0].id),
            supabase.from('game_lineups').select('*').eq('game_id', visibleGames[0].id).order('period_number').order('started_clock_seconds', { ascending: false }),
          ]);
          if (!cancelled) {
            setEvents((eventResult.data ?? []) as GameEvent[]);
            setStats((statResult.data ?? []) as PlayerGameStats[]);
            setLineups((lineupResult.data ?? []) as GameLineup[]);
            setSelectedTeamId(visibleGames[0].home_team_id);
            setPeriod(1);
            setClock(formatClock(visibleGames[0].period_length_seconds));
            setMode(visibleGames[0].scorebook_mode ?? 'quick');
          }
        }
      } catch (reason) {
        console.error(reason);
        if (!cancelled) setError('Unable to load scorebook data.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [authLoading, isCoach, isStaff, profile, supabase]);

  useEffect(() => {
    if (!selectedGame) return;
    const latestStart = events.find((event) =>
      !event.voided_at
      && event.event_type === 'period_start'
      && event.team_id === selectedTeamId
      && event.period_number === period,
    );
    const saved = lineupFromMetadata(latestStart?.metadata);
    setStartingFive(saved.length === 5 ? saved : activeLineup.length === 5 ? activeLineup : []);
    setSelectedPlayerId('');
    setAssistPlayerId('');
    setSubOut('');
    setSubIn('');
    setPendingShot(null);
  }, [activeLineup, events, period, selectedGame, selectedTeamId]);

  async function selectGame(gameId: string) {
    if (!gameId || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setSelectedGameId(gameId);
      const game = games.find((item) => item.id === gameId);
      setSelectedTeamId(game?.home_team_id ?? '');
      setSelectedPlayerId('');
      setPeriod(1);
      setClock(game ? formatClock(game.period_length_seconds) : '10:00');
      setMode(game?.scorebook_mode ?? 'quick');
      await refreshGameData(gameId, false);
    } catch (reason) {
      console.error(reason);
      setError('Unable to open that game.');
    } finally {
      setBusy(false);
    }
  }

  async function changeMode(nextMode: 'quick' | 'pro') {
    if (!supabase || !selectedGame || nextMode === mode) return;
    setMode(nextMode);
    setPendingShot(null);
    if (!editable) return;
    const { error: rpcError } = await supabase.rpc('set_game_scorebook_mode' as never, {
      target_game_id: selectedGame.id,
      target_mode: nextMode,
    } as never);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setGames((current) => current.map((game) => game.id === selectedGame.id ? { ...game, scorebook_mode: nextMode } : game));
  }

  async function recordAction(action: StatAction) {
    if (!supabase || !selectedGame || !selectedTeamId || !selectedPlayerId || !editable || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { error: rpcError } = await supabase.rpc('record_game_event', {
        target_game_id: selectedGame.id,
        p_period_number: period,
        p_clock_seconds: clockToSeconds(clock),
        p_event_type: action.event,
        p_team_id: selectedTeamId,
        p_player_id: selectedPlayerId,
        p_secondary_player_id: action.event === 'shot_made' && assistPlayerId ? assistPlayerId : null,
        p_points: action.points ?? 0,
        p_shot_value: action.shotValue ?? null,
        p_shot_result: action.shotValue ? (action.made ? 'made' : 'missed') : null,
        p_shot_x: action.shotValue && pendingShot ? pendingShot.x : null,
        p_shot_y: action.shotValue && pendingShot ? pendingShot.y : null,
        p_shot_zone: action.shotValue && pendingShot ? pendingShot.zone : null,
        p_foul_type: action.event === 'foul' ? 'personal' : null,
        p_turnover_type: action.event === 'turnover' ? 'live_ball' : null,
        p_metadata: { entry_mode: mode },
      } as never);
      if (rpcError) throw rpcError;
      setAssistPlayerId('');
      setPendingShot(null);
      await refreshGameData(selectedGame.id);
      setMessage(`${action.label} recorded.`);
    } catch (reason) {
      console.error(reason);
      setError(reason instanceof Error ? reason.message : 'Unable to record that stat.');
    } finally {
      setBusy(false);
    }
  }

  async function saveStartingFive() {
    if (!supabase || !selectedGame || !editable || startingFive.length !== 5 || busy) return;
    setBusy(true);
    setError('');
    try {
      const { error: rpcError } = await supabase.rpc('set_starting_lineup', {
        target_game_id: selectedGame.id,
        target_team_id: selectedTeamId,
        target_period: period,
        target_player_ids: startingFive,
      } as never);
      if (rpcError) throw rpcError;
      await refreshGameData(selectedGame.id);
      setMessage(`${periodLabel(period)} starting five saved.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the starting five.');
    } finally {
      setBusy(false);
    }
  }

  async function saveSubstitution() {
    if (!supabase || !selectedGame || !editable || !subOut || !subIn || busy) return;
    setBusy(true);
    setError('');
    try {
      const { error: rpcError } = await supabase.rpc('record_substitution', {
        target_game_id: selectedGame.id,
        target_team_id: selectedTeamId,
        target_period: period,
        target_clock_seconds: clockToSeconds(clock),
        target_player_out: subOut,
        target_player_in: subIn,
      } as never);
      if (rpcError) throw rpcError;
      await refreshGameData(selectedGame.id);
      setMessage('Substitution recorded. Minutes and plus/minus recalculated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to record that substitution.');
    } finally {
      setBusy(false);
    }
  }

  async function undoLast() {
    if (!supabase || !editable || busy) return;
    const latest = activeEvents.find((event) => event.event_type !== 'period_start');
    if (!latest) return;
    setBusy(true);
    setError('');
    try {
      const { error: rpcError } = await supabase.rpc('void_game_event', { target_event_id: latest.id } as never);
      if (rpcError) throw rpcError;
      await refreshGameData(selectedGameId);
      setMessage('Last recorded play undone.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to undo the last play.');
    } finally {
      setBusy(false);
    }
  }

  async function finalizeGame() {
    if (!supabase || !selectedGame || !editable || busy) return;
    if (!window.confirm('Finalize this game? The official score, box score and standings will lock until staff reopens it.')) return;
    setBusy(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('finalize_game_scorebook', { target_game_id: selectedGame.id } as never);
      if (rpcError) throw rpcError;
      setGames((current) => current.map((game) => game.id === selectedGame.id ? { ...game, ...(data as Game) } : game));
      await refreshGameData(selectedGame.id);
      setMessage('Official game finalized. Stats and standings are locked.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to finalize this game.');
    } finally {
      setBusy(false);
    }
  }

  async function reopenGame() {
    if (!supabase || !selectedGame || !isStaff || editable || busy) return;
    if (!window.confirm('Reopen this final scorebook for correction? Standings will temporarily remove this result until it is finalized again.')) return;
    setBusy(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('reopen_game_scorebook' as never, { target_game_id: selectedGame.id } as never);
      if (rpcError) throw rpcError;
      setGames((current) => current.map((game) => game.id === selectedGame.id ? { ...game, ...(data as Game) } : game));
      setMessage('Scorebook reopened for staff correction.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to reopen this game.');
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

  async function askCoach() {
    if (!selectedGame || !coachQuestion.trim() || coachBusy) return;
    setCoachBusy(true);
    setError('');
    setCoachAnswer('');
    try {
      const response = await fetch('/api/game-iq/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ game_id: selectedGame.id, question: coachQuestion.trim() }),
      });
      const data = await response.json() as { answer?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Game IQ could not answer that question.');
      setCoachAnswer(data.answer ?? 'No answer returned.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Game IQ could not answer that question.');
    } finally {
      setCoachBusy(false);
    }
  }

  async function runInsight() {
    if (!selectedGame || insightBusy) return;
    setInsightBusy(true);
    setError('');
    try {
      const response = await fetch('/api/game-iq/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: selectedGame.id }),
      });
      const data = await response.json() as { insight?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Game IQ analysis failed.');
      setInsight(data.insight ?? '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Game IQ analysis failed.');
    } finally {
      setInsightBusy(false);
    }
  }

  const periodLabel = (value: number) => selectedGame?.period_count === 4 ? `Q${value}` : `P${value}`;
  const selectedTeamStats = stats.filter((stat) => stat.team_id === selectedTeamId).sort((a, b) => b.points - a.points || b.rebounds - a.rebounds);

  if (authLoading || !profile) {
    return <main><Container maxWidth="xl" className="py-16"><div className="h-56 animate-pulse rounded-3xl bg-white/5" /></Container></main>;
  }
  if (!isStaff && !isCoach) {
    return <main><Container maxWidth="lg" className="py-16"><h1 className="font-display text-3xl font-black uppercase">Scorebook access required</h1><p className="mt-3 text-white/50">The live RCL scorebook is limited to assigned coaches, staff and administrators.</p></Container></main>;
  }

  return (
    <main className="min-h-screen bg-[#05080d] text-white">
      <Container maxWidth="2xl" className="py-6 sm:py-10">
        <header className="border-b border-white/10 pb-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.28em] text-rcl-gold">RCL Game IQ™ · Coach Scorebook</p>
              <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight sm:text-6xl">One entry. Every stat.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">Run the game from top to bottom: choose the game, team and player, set the clock, record the play, then finalize once. Box scores, player stats, lineup data and standings rebuild from the same event stream.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void changeMode('quick')} className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest ${mode === 'quick' ? 'bg-rcl-orange text-black' : 'border border-white/10 bg-white/5'}`}>Quick entry</button>
              <button type="button" onClick={() => void changeMode('pro')} className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest ${mode === 'pro' ? 'bg-rcl-gold text-black' : 'border border-white/10 bg-white/5'}`}>Pro tracking</button>
            </div>
          </div>
        </header>

        {error && <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
        {message && <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</div>}

        <section className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_1.5fr_.95fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <label className="text-xs font-black uppercase tracking-widest text-white/40" htmlFor="scorebook-game">1 · Game</label>
            <select id="scorebook-game" value={selectedGameId} onChange={(event) => void selectGame(event.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white disabled:opacity-50">
              {!games.length && <option value="">No games available</option>}
              {games.map((game) => <option key={game.id} value={game.id}>{teamName(game.home_team_id)} vs {teamName(game.away_team_id)} · {new Date(game.scheduled_at).toLocaleDateString()}</option>)}
            </select>
            {selectedGame && <div className="mt-4 space-y-2 text-xs text-white/45"><p>{new Date(selectedGame.scheduled_at).toLocaleString()}</p><p>{selectedGame.period_count} periods · {Math.round(selectedGame.period_length_seconds / 60)} min each</p><p className="font-black uppercase tracking-widest text-white/65">{editable ? 'Open for scoring' : 'Final · read only'}</p></div>}
          </div>

          <div className={`rounded-3xl border p-5 ${editable ? 'border-white/10 bg-gradient-to-br from-white/[.06] to-white/[.02]' : 'border-emerald-400/20 bg-emerald-400/[.04]'}`}>
            <div className="grid grid-cols-3 items-center text-center">
              <div><p className="text-xs font-black uppercase tracking-widest text-white/40">{selectedGame ? teamName(selectedGame.home_team_id) : 'Home'}</p><p className="mt-1 font-display text-5xl font-black">{summary?.homeScore ?? selectedGame?.home_score ?? 0}</p></div>
              <div><p className="text-xs font-black uppercase tracking-widest text-rcl-orange">{periodLabel(period)}</p><input aria-label="Game clock" value={clock} onChange={(event) => setClock(event.target.value)} disabled={!editable} className="mt-2 w-24 rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-center font-mono text-xl font-black disabled:opacity-50" /><p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-white/25">Manual clock</p></div>
              <div><p className="text-xs font-black uppercase tracking-widest text-white/40">{selectedGame ? teamName(selectedGame.away_team_id) : 'Away'}</p><p className="mt-1 font-display text-5xl font-black">{summary?.awayScore ?? selectedGame?.away_score ?? 0}</p></div>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {Array.from({ length: selectedGame?.period_count ?? 4 }, (_, index) => index + 1).map((value) => <button key={value} type="button" onClick={() => { setPeriod(value); setClock(formatClock(selectedGame?.period_length_seconds ?? 600)); }} className={`rounded-lg px-3 py-2 text-xs font-black ${period === value ? 'bg-white text-black' : 'border border-white/10 bg-black/20 text-white/55'}`}>{periodLabel(value)}</button>)}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <p className="text-xs font-black uppercase tracking-widest text-white/40">Game controls</p>
            <p className="mt-2 text-xs leading-5 text-white/40">Quick captures the complete core box score. Pro adds shot locations, assisted-shot attribution, lineups, minutes, plus/minus and Game IQ.</p>
            <div className="mt-4 grid gap-2">
              {editable ? <button type="button" onClick={() => void finalizeGame()} disabled={!selectedGame || busy} className="rounded-xl bg-emerald-400 px-4 py-3 text-xs font-black uppercase tracking-widest text-black disabled:opacity-30">Finalize official game</button> : isStaff ? <button type="button" onClick={() => void reopenGame()} disabled={!selectedGame || busy} className="rounded-xl border border-rcl-orange/30 bg-rcl-orange/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-rcl-orange disabled:opacity-30">Reopen for correction</button> : <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs font-bold text-emerald-200">This official game is locked. Staff must reopen it before changes can be made.</div>}
              <button type="button" onClick={() => void undoLast()} disabled={!editable || !activeEvents.some((event) => event.event_type !== 'period_start') || busy} className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-white/60 disabled:opacity-30">Undo last play</button>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[.9fr_1.35fr_1.2fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <p className="text-xs font-black uppercase tracking-widest text-white/40">2 · Team</p>
            <div className="mt-3 grid gap-2">
              {[selectedGame?.home_team_id, selectedGame?.away_team_id].filter((value): value is string => Boolean(value)).map((teamId) => <button key={teamId} type="button" onClick={() => setSelectedTeamId(teamId)} className={`rounded-xl border px-4 py-3 text-left text-sm font-black ${selectedTeamId === teamId ? 'border-rcl-gold bg-rcl-gold/10 text-rcl-gold' : 'border-white/10 bg-black/20 text-white/65'}`}>{teamName(teamId)}</button>)}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-widest text-white/40">3 · Player</p><span className="text-[10px] font-bold uppercase tracking-widest text-white/25">{teamPlayers.length} active</span></div>
            <div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
              {teamPlayers.map((player) => <button key={player.id} type="button" onClick={() => { setSelectedPlayerId(player.id); setAssistPlayerId(''); }} className={`rounded-xl border p-3 text-left ${selectedPlayerId === player.id ? 'border-rcl-orange bg-rcl-orange/10' : 'border-white/10 bg-black/20'}`}><span className="text-xs font-black text-rcl-gold">#{player.jersey_number ?? '--'}</span><p className="mt-1 text-xs font-black">{player.first_name} {player.last_name}</p></button>)}
              {!teamPlayers.length && <p className="col-span-full rounded-xl bg-black/20 p-4 text-xs text-white/35">No active roster players are connected to this team and season.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <p className="text-xs font-black uppercase tracking-widest text-white/40">4 · Record play</p>
            <p className="mt-2 text-xs text-white/40">{selectedPlayerId ? `${playerName(selectedPlayerId)} selected · ${periodLabel(period)} ${clock}` : 'Select a player first.'}</p>
            <div className="mt-3 space-y-4">
              {actionGroups.map((group) => <div key={group.label}><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/25">{group.label}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{group.actions.map((action) => <button key={action.label} type="button" disabled={!editable || !selectedPlayerId || busy} onClick={() => void recordAction(action)} className="min-h-12 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-left text-xs font-black uppercase tracking-wide transition hover:border-rcl-orange/50 hover:bg-rcl-orange/10 disabled:cursor-not-allowed disabled:opacity-25">{action.label}</button>)}</div></div>)}
            </div>
          </div>
        </section>

        {mode === 'pro' && <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-rcl-gold">Pro · Shot location</p><p className="mt-1 text-xs leading-5 text-white/40">Tap the court before recording a field-goal attempt. The marker follows the same basket orientation used by Game IQ zones.</p></div>{pendingShot && <button type="button" onClick={() => setPendingShot(null)} className="text-xs font-bold text-white/40">Clear marker</button>}</div>
            <div className="mt-3" onClick={editable ? chooseCourtLocation : undefined}><ShotMap selectedShot={pendingShot} /></div>
            {pendingShot && <p className="mt-2 text-xs font-bold text-rcl-gold">Selected: {pendingShot.zone.replace(/_/g, ' ')}</p>}
            <label className="mt-4 block text-xs font-black uppercase tracking-widest text-white/35" htmlFor="scorebook-assist">Optional assist on next made field goal</label>
            <select id="scorebook-assist" value={assistPlayerId} onChange={(event) => setAssistPlayerId(event.target.value)} disabled={!editable || !selectedPlayerId} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white disabled:opacity-40"><option value="">No assist / not set</option>{teamPlayers.filter((player) => player.id !== selectedPlayerId).map((player) => <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>)}</select>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <p className="text-xs font-black uppercase tracking-widest text-rcl-gold">Pro · Lineup desk</p>
            <p className="mt-1 text-xs leading-5 text-white/40">Save five starters for this team and period, then record subs at the live clock. Minutes and plus/minus recalculate from lineup segments.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {teamPlayers.map((player) => {
                const selected = startingFive.includes(player.id);
                return <button key={player.id} type="button" disabled={!editable} onClick={() => setStartingFive((current) => selected ? current.filter((id) => id !== player.id) : current.length < 5 ? [...current, player.id] : current)} className={`rounded-xl border p-2 text-left text-xs ${selected ? 'border-emerald-300 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-black/20 text-white/55'} disabled:opacity-40`}>#{player.jersey_number ?? '--'} {player.first_name} {player.last_name}</button>;
              })}
            </div>
            <button type="button" onClick={() => void saveStartingFive()} disabled={!editable || startingFive.length !== 5 || busy} className="mt-3 w-full rounded-xl bg-rcl-gold px-4 py-3 text-xs font-black uppercase tracking-widest text-black disabled:opacity-30">Save {periodLabel(period)} starting five · {startingFive.length}/5</button>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <select aria-label="Player leaving the court" value={subOut} onChange={(event) => setSubOut(event.target.value)} disabled={!editable} className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white disabled:opacity-40"><option value="">Player out</option>{teamPlayers.filter((player) => activeLineup.includes(player.id)).map((player) => <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>)}</select>
              <select aria-label="Player entering the court" value={subIn} onChange={(event) => setSubIn(event.target.value)} disabled={!editable} className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white disabled:opacity-40"><option value="">Player in</option>{teamPlayers.filter((player) => !activeLineup.includes(player.id) && player.id !== subOut).map((player) => <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>)}</select>
            </div>
            <button type="button" onClick={() => void saveSubstitution()} disabled={!editable || !subOut || !subIn || busy} className="mt-2 w-full rounded-xl border border-rcl-orange/30 bg-rcl-orange/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-rcl-orange disabled:opacity-30">Record sub at {clock}</button>
          </div>
        </section>}

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-white/40">Live box score · {teamName(selectedTeamId)}</p><p className="mt-1 text-xs text-white/30">These rows are projections of the event stream and feed the public stats layer after the game is final.</p></div><span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white/35">{selectedTeamStats.length} players</span></div>
            <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="text-white/30"><tr><th className="py-2">Player</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>F</th><th>MIN</th><th>+/-</th></tr></thead><tbody>{selectedTeamStats.map((stat) => <tr key={stat.id} className="border-t border-white/5"><td className="py-2 font-bold">{playerName(stat.player_id)}</td><td>{stat.points}</td><td>{stat.rebounds}</td><td>{stat.assists}</td><td>{stat.steals}</td><td>{stat.blocks}</td><td>{stat.turnovers}</td><td>{stat.fouls}</td><td>{(stat.minutes ?? 0).toFixed(1)}</td><td>{stat.plus_minus >= 0 ? '+' : ''}{stat.plus_minus}</td></tr>)}</tbody></table></div>
            {!selectedTeamStats.length && <p className="rounded-xl bg-black/20 p-4 text-xs text-white/35">No stats recorded for this team yet.</p>}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
            <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-white/40">Play-by-play</p><p className="mt-1 text-xs text-white/30">The auditable source of truth.</p></div><span className="rounded-full border border-rcl-gold/20 bg-rcl-gold/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-rcl-gold">{activeEvents.length} live</span></div>
            <div className="mt-3 max-h-[380px] space-y-1 overflow-y-auto pr-1">
              {activeEvents.filter((event) => event.event_type !== 'period_start').map((event) => <div key={event.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2"><span className="w-12 shrink-0 font-mono text-xs text-rcl-gold">{formatClock(event.clock_seconds)}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{describeEvent(event, playerName(event.player_id), playerName(event.secondary_player_id))}</p><p className="text-[10px] uppercase tracking-widest text-white/25">{teamName(event.team_id ?? '')} · {periodLabel(event.period_number)}</p></div>{event.points > 0 && <span className="font-black text-emerald-300">+{event.points}</span>}</div>)}
              {!activeEvents.some((event) => event.event_type !== 'period_start') && <p className="py-10 text-center text-xs text-white/25">No plays recorded yet.</p>}
            </div>
          </div>
        </section>

        {mode === 'pro' && <details className="mt-4 rounded-3xl border border-white/10 bg-white/[.025] p-4">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-rcl-gold">Advanced Game IQ & AI Coach</summary>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-white/35">Deterministic game intelligence</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{analytics?.teams.map((team) => <div key={team.team_id} className="col-span-2 rounded-xl bg-white/[.035] p-3"><p className="text-xs font-black">{teamName(team.team_id)}</p><p className="mt-1 text-xs text-white/45">{team.points} PTS · {team.possessions} POSS · ORtg {team.offensive_rating} · DRtg {team.defensive_rating} · Net {team.net_rating >= 0 ? '+' : ''}{team.net_rating}</p></div>)}</div>
              <button type="button" onClick={() => void runInsight()} disabled={!selectedGame || insightBusy} className="mt-3 rounded-xl border border-rcl-gold/30 bg-rcl-gold/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-rcl-gold disabled:opacity-30">{insightBusy ? 'Analyzing…' : 'Generate postgame insight'}</button>
              {insight && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white/[.035] p-3 text-sm leading-6 text-white/65">{insight}</p>}
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-rcl-orange">Ask AI Coach</p>
              <div className="mt-3 flex gap-2"><input value={coachQuestion} onChange={(event) => setCoachQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void askCoach(); }} placeholder="What changed in the second half?" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25" /><button type="button" onClick={() => void askCoach()} disabled={!coachQuestion.trim() || coachBusy} className="rounded-xl bg-rcl-orange px-4 py-3 text-xs font-black uppercase tracking-widest text-black disabled:opacity-30">{coachBusy ? 'Thinking…' : 'Ask'}</button></div>
              {coachAnswer && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white/[.035] p-3 text-sm leading-6 text-white/65">{coachAnswer}</p>}
            </div>
          </div>
        </details>}
      </Container>
    </main>
  );
}

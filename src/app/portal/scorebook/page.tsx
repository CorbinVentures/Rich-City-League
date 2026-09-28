'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ShotMap } from '@/components/scorebook/ShotMap';
import { useAuth } from '@/hooks/useAuth';
import { deriveGameAnalytics, derivePlayerMetrics, describeEvent, formatClock, summarizeGame, zoneFromCoordinates } from '@/lib/game-iq';
import { getSupabaseClient } from '@/lib/supabase';
import type { Game, GameEvent, GameLineup, Player, PlayerGameStats, Roster, Team, TeamSeason } from '@/types/database';

type GameRow = Game & { home_team?: Team; away_team?: Team };
type ToolPanel = 'none' | 'shot' | 'lineup' | 'iq';

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
  const [pendingShot, setPendingShot] = useState<{ x: number; y: number; zone: string } | null>(null);
  const [toolPanel, setToolPanel] = useState<ToolPanel>('none');
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
  const activeEvents = events.filter((event) => !event.voided_at);

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
    setPendingShot(null);
    setToolPanel('none');
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

  if (authLoading || !profile) {
    return <main className="grid min-h-svh place-items-center bg-[#03070d] p-6 text-white"><div className="w-full max-w-2xl"><p className="text-xs font-black uppercase tracking-[.26em] text-rcl-orange">RCL Scorebook</p><div className="mt-4 h-40 animate-pulse rounded-3xl bg-white/5" /></div></main>;
  }
  if (!isAdmin && !isCoach) {
    return <main className="grid min-h-svh place-items-center bg-[#03070d] p-6 text-white"><div className="max-w-lg rounded-3xl border border-white/10 bg-[#071522] p-8"><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-orange">Restricted workspace</p><h1 className="mt-3 font-display text-3xl font-black uppercase">Scorebook access required</h1><p className="mt-3 text-sm leading-6 text-white/50">RCL Game IQ is limited to authorized coaches and administrators.</p><Link href="/" className="mt-6 inline-flex rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-white/70">Return to RCL</Link></div></main>;
  }

  return (
    <main className="min-h-svh bg-[#03070d] text-white">
      <div className="flex min-h-svh flex-col">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#03070d]/95 px-3 py-3 backdrop-blur-xl sm:px-4">
          <div className="mx-auto grid w-full max-w-[1900px] gap-3 xl:grid-cols-[minmax(260px,.8fr)_minmax(560px,1.45fr)_minmax(260px,.8fr)] xl:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/portal/operations" className="shrink-0 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[10px] font-black uppercase tracking-[.16em] text-white/55 transition hover:border-rcl-blue/40 hover:text-white">Exit</Link>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[9px] font-black uppercase tracking-[.2em] text-rcl-orange">RCL GAME IQ · SCOREBOOK</p>
                <select aria-label="Game" value={selectedGameId} onChange={(event) => { const game = games.find((item) => item.id === event.target.value); if (game) void activateGame(game); }} className="w-full truncate rounded-xl border border-white/10 bg-[#07111b] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-rcl-blue/50">
                  {games.length === 0 && <option value="">No games available</option>}
                  {games.map((game) => <option key={game.id} value={game.id}>{teamName(game.away_team_id)} @ {teamName(game.home_team_id)} · {new Date(game.scheduled_at).toLocaleDateString()}</option>)}
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#071522] px-3 py-2 sm:px-4">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                <button type="button" disabled={!selectedGame} onClick={() => { if (selectedGame) { setSelectedTeamId(selectedGame.home_team_id); setSelectedPlayerId(''); setPendingShot(null); } }} className={`rounded-xl px-2 py-1.5 transition ${selectedGame && selectedTeamId === selectedGame.home_team_id ? 'bg-rcl-blue/10 ring-1 ring-rcl-blue/35' : ''}`}>
                  <p className="truncate text-[10px] font-black uppercase tracking-widest text-white/45">{selectedGame ? teamName(selectedGame.home_team_id) : 'HOME'}</p>
                  <p className="font-display text-4xl font-black leading-none sm:text-5xl">{summary?.homeScore ?? 0}</p>
                </button>
                <div className="min-w-[128px]">
                  <div className="flex items-center justify-center gap-1.5">
                    {Array.from({ length: selectedGame?.period_count ?? 4 }, (_, index) => index + 1).map((value) => <button key={value} type="button" onClick={() => { setPeriod(value); setSelectedPlayerId(''); setPendingShot(null); }} className={`grid h-7 min-w-7 place-items-center rounded-lg px-1 text-[9px] font-black uppercase ${period === value ? 'bg-rcl-orange text-black' : 'border border-white/10 text-white/35'}`}>{periodLabel(value, selectedGame?.period_count ?? 4)}</button>)}
                  </div>
                  <input aria-label="Game clock" value={clock} onChange={(event) => setClock(event.target.value)} onBlur={() => { const seconds = parseClock(); if (seconds !== null) setClock(formatClock(seconds)); }} disabled={!selectedGame || locked} inputMode="numeric" className="mt-1.5 w-full bg-transparent text-center font-mono text-2xl font-black tracking-tight text-white outline-none disabled:opacity-50 sm:text-3xl" />
                </div>
                <button type="button" disabled={!selectedGame} onClick={() => { if (selectedGame) { setSelectedTeamId(selectedGame.away_team_id); setSelectedPlayerId(''); setPendingShot(null); } }} className={`rounded-xl px-2 py-1.5 transition ${selectedGame && selectedTeamId === selectedGame.away_team_id ? 'bg-rcl-blue/10 ring-1 ring-rcl-blue/35' : ''}`}>
                  <p className="truncate text-[10px] font-black uppercase tracking-widest text-white/45">{selectedGame ? teamName(selectedGame.away_team_id) : 'AWAY'}</p>
                  <p className="font-display text-4xl font-black leading-none sm:text-5xl">{summary?.awayScore ?? 0}</p>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 xl:justify-end">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-white/30">Status</p>
                <p className={`truncate text-xs font-black uppercase ${locked ? 'text-emerald-300' : 'text-rcl-orange'}`}>{locked ? 'Final · read only' : selectedGame?.scorebook_status?.replace(/_/g, ' ') ?? 'Ready'}</p>
              </div>
              {!locked && <button type="button" disabled={!selectedGameId || busy} onClick={() => void finalizeScorebook()} className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-300 disabled:opacity-30">Finalize</button>}
            </div>
          </div>
        </header>

        {(error || message) && <div className="mx-auto w-full max-w-[1900px] px-3 pt-3 sm:px-4">{error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs text-red-200">{error}</div>}{message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-200">{message}</div>}</div>}

        <div className="mx-auto grid w-full max-w-[1900px] flex-1 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
          <aside className="border-b border-white/10 bg-[#050b12] p-3 xl:border-b-0 xl:border-r xl:p-4">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[9px] font-black uppercase tracking-[.22em] text-rcl-orange">Team + roster</p><p className="mt-1 text-xs text-white/35">Tap a player, then record the play.</p></div>
              <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-1 text-[9px] font-black uppercase text-white/40">{teamPlayers.length} players</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">{selectedGame && [selectedGame.home_team_id, selectedGame.away_team_id].map((teamId) => <button type="button" key={teamId} onClick={() => { setSelectedTeamId(teamId); setSelectedPlayerId(''); setAssistPlayerId(''); setPendingShot(null); }} className={`rounded-xl px-3 py-3 text-left text-[10px] font-black uppercase tracking-wide transition ${selectedTeamId === teamId ? 'bg-rcl-orange text-black' : 'border border-white/10 bg-black/20 text-white/55 hover:border-white/25'}`}>{teamName(teamId)}</button>)}</div>

            <div className="mt-3 grid max-h-[260px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:max-h-[340px] xl:max-h-[calc(100svh-245px)] xl:grid-cols-1">
              {teamPlayers.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-white/10 p-5 text-center text-[10px] uppercase tracking-widest text-white/30">No active roster is attached to this team for this season.</div>}
              {teamPlayers.map((player) => {
                const stat = stats.find((item) => item.player_id === player.id);
                const active = selectedPlayerId === player.id;
                const onCourt = activeLineup.includes(player.id);
                return <button type="button" key={player.id} aria-pressed={active} onClick={() => { setSelectedPlayerId(player.id); setAssistPlayerId(''); setPendingShot(null); }} className={`rounded-xl border p-3 text-left transition ${active ? 'border-rcl-blue/60 bg-rcl-blue/10 ring-1 ring-rcl-blue/25' : 'border-white/10 bg-black/20 hover:border-white/25'}`}>
                  <div className="flex items-center justify-between gap-2"><span className={`text-xs font-black ${active ? 'text-rcl-blue' : 'text-rcl-orange'}`}>#{player.jersey_number ?? '--'}</span>{onCourt && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-300">On court</span>}</div>
                  <p className="mt-1 truncate text-xs font-black">{player.first_name} {player.last_name}</p>
                  <p className="mt-1 text-[10px] text-white/35">{stat?.points ?? 0} PTS · {stat?.rebounds ?? 0} REB · {stat?.assists ?? 0} AST</p>
                </button>;
              })}
            </div>
          </aside>

          <section className="min-w-0 p-3 sm:p-4 xl:p-5">
            <div className="rounded-3xl border border-white/10 bg-[#07111b] p-4 sm:p-5">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[.22em] text-rcl-orange">Record play</p>
                  <h1 className="mt-1 truncate font-display text-2xl font-black uppercase sm:text-3xl">{selectedPlayer ? `#${selectedPlayer.jersey_number ?? '--'} ${selectedPlayer.first_name} ${selectedPlayer.last_name}` : 'Select a player'}</h1>
                  <p className="mt-1 text-[11px] text-white/35">{selectedPlayer ? `${teamName(selectedTeamId)} · ${selectedGame ? periodLabel(period, selectedGame.period_count) : ''} · ${clock}` : 'Roster selection unlocks every stat button.'}</p>
                </div>
                {selectedPlayerId && <select aria-label="Assist player" value={assistPlayerId} onChange={(event) => setAssistPlayerId(event.target.value)} disabled={locked} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-white outline-none disabled:opacity-40 sm:w-56"><option value="">Assist: none</option>{assistOptions.map((player) => <option key={player.id} value={player.id}>Assist: {player.first_name} {player.last_name}</option>)}</select>}
              </div>

              {pendingShot && <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-rcl-orange/25 bg-rcl-orange/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-rcl-orange"><span>Shot location set · {pendingShot.zone.replace(/_/g, ' ')}</span><button type="button" onClick={() => setPendingShot(null)} className="rounded-lg border border-rcl-orange/25 px-2 py-1">Clear</button></div>}

              <div className="mt-4 space-y-5">
                {actionGroups.map((group) => <div key={group.label}>
                  <p className="mb-2 text-[9px] font-black uppercase tracking-[.22em] text-white/30">{group.label}</p>
                  <div className={`grid gap-2 ${group.label === 'SCORING' ? 'grid-cols-2 sm:grid-cols-3' : group.label === 'HUSTLE' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
                    {group.actions.map(([label, type, value, made]) => {
                      const scoring = type === 'shot_made' || type === 'shot_missed' || type === 'free_throw_made' || type === 'free_throw_missed';
                      const madeAction = type === 'shot_made' || type === 'free_throw_made';
                      const missAction = type === 'shot_missed' || type === 'free_throw_missed';
                      const tone = madeAction ? 'border-emerald-400/25 bg-emerald-400/[.07] hover:bg-emerald-400/12' : missAction ? 'border-rose-400/20 bg-rose-400/[.05] hover:bg-rose-400/10' : 'border-white/10 bg-white/[.025] hover:border-rcl-blue/40 hover:bg-rcl-blue/[.06]';
                      return <button type="button" key={label} disabled={!selectedPlayerId || busy || locked} onClick={() => void recordAction(type as GameEvent['event_type'], value, value ? value as 1 | 2 | 3 : null, made)} className={`min-h-16 rounded-2xl border px-3 py-3 text-left transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-25 ${tone}`}>
                        <span className="block text-sm font-black uppercase tracking-wide sm:text-base">{label}</span>
                        <span className="mt-1 block text-[9px] uppercase tracking-wider text-white/30">{locked ? 'Final' : scoring && !pendingShot && type !== 'free_throw_made' && type !== 'free_throw_missed' ? 'Location optional' : 'Record'}</span>
                      </button>;
                    })}
                  </div>
                </div>)}
              </div>

              <div className="mt-5 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-4">
                {[
                  ['Shot chart', 'shot' as ToolPanel],
                  ['Lineups + subs', 'lineup' as ToolPanel],
                  ['Game IQ', 'iq' as ToolPanel],
                ].map(([label, panel]) => <button type="button" key={panel} onClick={() => setToolPanel((current) => current === panel ? 'none' : panel)} className={`rounded-xl border px-3 py-3 text-[10px] font-black uppercase tracking-widest transition ${toolPanel === panel ? 'border-rcl-blue/50 bg-rcl-blue/10 text-rcl-blue' : 'border-white/10 bg-black/20 text-white/55 hover:text-white'}`}>{label}</button>)}
                <button type="button" disabled={!events.some((event) => !event.voided_at && event.event_type !== 'period_start') || busy || locked} onClick={() => void undoLast()} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-[10px] font-black uppercase tracking-widest text-white/55 transition hover:border-rose-400/30 hover:text-rose-200 disabled:opacity-25">Undo last play</button>
              </div>
            </div>
          </section>

          <aside className="border-t border-white/10 bg-[#050b12] p-3 xl:border-l xl:border-t-0 xl:p-4">
            <div className="rounded-2xl border border-white/10 bg-[#07111b] p-3">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-rcl-blue">Player line</p><p className="mt-1 truncate text-xs font-black">{selectedPlayer ? `${selectedPlayer.first_name} ${selectedPlayer.last_name}` : 'No player selected'}</p></div>{derived && <span className="text-2xl font-black text-rcl-orange">{derived.points}</span>}</div>
              {derived ? <div className="mt-3 grid grid-cols-4 gap-1.5">{[['REB', derived.rebounds], ['AST', derived.assists], ['STL', derived.steals], ['BLK', derived.blocks], ['TO', derived.turnovers], ['FG%', `${(derived.fg_pct * 100).toFixed(0)}%`], ['TS%', `${(derived.ts_pct * 100).toFixed(0)}%`], ['MIN', selectedStat?.minutes?.toFixed(1) ?? '0.0']].map(([label, value]) => <div key={label} className="rounded-lg bg-black/25 px-2 py-2 text-center"><p className="text-[8px] font-black uppercase text-white/25">{label}</p><p className="mt-0.5 text-xs font-black">{value}</p></div>)}</div> : <p className="mt-3 text-[10px] leading-5 text-white/30">Choose a player to see the live stat line.</p>}
            </div>

            <div className="mt-3 flex min-h-[320px] flex-col rounded-2xl border border-white/10 bg-[#07111b] p-3 xl:min-h-[calc(100svh-295px)]">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-rcl-orange">Recent plays</p><p className="mt-1 text-[10px] text-white/30">{activeEvents.length} events recorded</p></div><span className="rounded-full border border-white/10 px-2 py-1 text-[8px] font-black uppercase text-white/30">Live log</span></div>
              <div className="mt-3 flex-1 space-y-1 overflow-y-auto pr-1">{activeEvents.map((event) => <div key={event.id} className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-2.5 py-2"><span className="w-11 shrink-0 font-mono text-[10px] font-black text-rcl-orange">{formatClock(event.clock_seconds)}</span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold">{describeEvent(event, playerName(event.player_id), playerName(event.secondary_player_id))}</p><p className="truncate text-[8px] uppercase tracking-wide text-white/20">{teamName(event.team_id ?? '')} · {selectedGame ? periodLabel(event.period_number, selectedGame.period_count) : `P${event.period_number}`}</p></div>{event.points > 0 && <span className="text-xs font-black text-emerald-300">+{event.points}</span>}</div>)}{!activeEvents.length && <div className="grid h-full min-h-40 place-items-center text-center"><div><p className="text-xs font-black uppercase text-white/30">Ready for tip</p><p className="mt-1 text-[10px] text-white/20">Recorded plays appear here instantly.</p></div></div>}</div>
            </div>
          </aside>
        </div>

        {toolPanel !== 'none' && <section className="fixed inset-x-0 bottom-0 z-50 max-h-[78svh] overflow-y-auto border-t border-rcl-blue/25 bg-[#050b12]/98 shadow-[0_-24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl">
          <div className="mx-auto w-full max-w-[1900px] p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-rcl-blue">Scorebook tools</p><h2 className="mt-1 font-display text-xl font-black uppercase">{toolPanel === 'shot' ? 'Shot chart' : toolPanel === 'lineup' ? 'Lineups + substitutions' : 'Game IQ'}</h2></div><button type="button" onClick={() => setToolPanel('none')} className="rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/55">Close</button></div>

            {toolPanel === 'shot' && <div className="mx-auto max-w-3xl"><ShotMap events={shotMapEvents} pendingShot={pendingShot} onLocationSelect={(x, y) => !locked && setPendingShot({ x, y, zone: zoneFromCoordinates(x, y) })} /></div>}

            {toolPanel === 'lineup' && <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <div className="rounded-3xl border border-white/10 bg-[#07111b] p-4">
                <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-rcl-orange">Starting five</p><p className="mt-1 text-[10px] text-white/35">Set the five on the floor for {selectedGame ? periodLabel(period, selectedGame.period_count) : 'this period'}.</p></div><span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-black text-white/40">{startingFive.length}/5</span></div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{teamPlayers.map((player) => { const selected = startingFive.includes(player.id); return <button type="button" disabled={locked} key={player.id} onClick={() => setStartingFive((current) => selected ? current.filter((id) => id !== player.id) : current.length < 5 ? [...current, player.id] : current)} className={`rounded-xl border p-3 text-left disabled:opacity-40 ${selected ? 'border-emerald-300/40 bg-emerald-300/10' : 'border-white/10 bg-black/20'}`}><span className="text-xs font-black text-rcl-orange">#{player.jersey_number ?? '--'}</span><p className="mt-1 text-[10px] font-black">{player.first_name} {player.last_name}</p>{selected && <p className="mt-1 text-[8px] font-black uppercase text-emerald-300">Starter</p>}</button>; })}</div>
                <button type="button" disabled={startingFive.length !== 5 || busy || locked} onClick={() => void saveStartingFive()} className="mt-3 rounded-xl bg-rcl-blue px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-30">Save starting five</button>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#07111b] p-4">
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-rcl-orange">Substitution</p>
                {!activeLineup.length && <p className="mt-2 rounded-xl border border-white/10 bg-black/20 p-3 text-[10px] text-white/35">Save a starting five first.</p>}
                <div className="mt-3 grid grid-cols-2 gap-2"><select aria-label="Player leaving the court" value={subOut} onChange={(event) => setSubOut(event.target.value)} disabled={locked || !activeLineup.length} className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white disabled:opacity-40"><option value="">Player OUT</option>{teamPlayers.filter((player) => activeLineup.includes(player.id)).map((player) => <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>)}</select><select aria-label="Player entering the court" value={subIn} onChange={(event) => setSubIn(event.target.value)} disabled={locked || !activeLineup.length} className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white disabled:opacity-40"><option value="">Player IN</option>{teamPlayers.filter((player) => player.id !== subOut && !activeLineup.includes(player.id)).map((player) => <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>)}</select></div>
                <button type="button" disabled={!subOut || !subIn || busy || locked} onClick={() => void saveSubstitution()} className="mt-3 w-full rounded-xl border border-rcl-orange/30 bg-rcl-orange/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rcl-orange disabled:opacity-30">Record at {clock}</button>
                <div className="mt-4 grid grid-cols-2 gap-2">{stats.filter((stat) => stat.team_id === selectedTeamId).sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0)).slice(0, 6).map((stat) => <div key={stat.id} className="rounded-xl bg-black/20 p-3"><p className="truncate text-[9px] text-white/30">{playerName(stat.player_id)}</p><p className="mt-1 text-xs font-black">{(stat.minutes ?? 0).toFixed(1)} MIN · {stat.plus_minus >= 0 ? '+' : ''}{stat.plus_minus}</p></div>)}</div>
              </div>
            </div>}

            {toolPanel === 'iq' && <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
              <div className="rounded-3xl border border-white/10 bg-[#07111b] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-rcl-blue">Live analytics</p><p className="mt-1 text-[10px] text-white/35">Derived from the official event stream.</p></div><button type="button" disabled={!selectedGameId || aiBusy} onClick={() => void runGameIQ()} className="rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rcl-blue disabled:opacity-30">{aiBusy ? 'Analyzing…' : 'Generate report'}</button></div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[['PACE / 48', selectedTeamAnalytics?.pace_48 ?? 0], ['ORtg', selectedTeamAnalytics?.offensive_rating ?? 0], ['DRtg', selectedTeamAnalytics?.defensive_rating ?? 0], ['NET', selectedTeamAnalytics?.net_rating ?? 0], ['eFG%', `${selectedTeamAnalytics?.efg_pct ?? 0}%`], ['TS%', `${selectedTeamAnalytics?.ts_pct ?? 0}%`], ['TOV%', `${selectedTeamAnalytics?.turnover_rate ?? 0}%`], ['ORB%', `${selectedTeamAnalytics?.offensive_rebound_rate ?? 0}%`]].map(([label, value]) => <div key={label} className="rounded-xl bg-black/20 p-3"><p className="text-[8px] font-black uppercase text-white/25">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>)}</div>
                <div className="mt-4 grid grid-cols-4 gap-2">{[['EVENTS', summary?.totalEvents ?? 0], ['POSS', summary?.possessions ?? 0], ['REB', summary?.rebounds ?? 0], ['TO', summary?.turnovers ?? 0]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/5 bg-black/20 p-3 text-center"><p className="text-[8px] font-black text-white/25">{label}</p><p className="mt-1 text-base font-black">{value}</p></div>)}</div>
              </div>
              <div className="rounded-3xl border border-rcl-orange/20 bg-rcl-orange/[.05] p-4"><p className="text-[9px] font-black uppercase tracking-[.2em] text-rcl-orange">AI Coach</p><p className="mt-1 text-[10px] text-white/35">Ask against the event stream, box score and lineup data.</p><div className="mt-3 flex gap-2"><input aria-label="Ask Game IQ" value={coachQuestion} onChange={(event) => setCoachQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void askGameIQ(); }} placeholder="What changed in Q3?" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white" /><button type="button" disabled={!coachQuestion.trim() || coachAskBusy || !selectedGameId} onClick={() => void askGameIQ()} className="rounded-xl bg-rcl-orange px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-30">{coachAskBusy ? 'Thinking…' : 'Ask'}</button></div>{coachAnswer && <p className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-6 text-white/70">{coachAnswer}</p>}{aiInsight && <p className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-6 text-white/65">{aiInsight}</p>}</div>
            </div>}
          </div>
        </section>}
      </div>
    </main>
  );
}

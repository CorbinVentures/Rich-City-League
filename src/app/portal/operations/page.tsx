'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { Division, Game, PlayerGameStats, PublicPlayer, Registration, Roster, Team, TeamSeason } from '@/types/database';

export default function OperationsPage() {
  const { profile, loading: authLoading } = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamSeasons, setTeamSeasons] = useState<TeamSeason[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerGameStats[]>([]);
  const [assignedTeamIds, setAssignedTeamIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | Registration['status']>('all');
  const [selectedTeamSeason, setSelectedTeamSeason] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [statForm, setStatForm] = useState({ points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, minutes: 0, fouls: 0 });
  const [score, setScore] = useState({ home: 0, away: 0, status: 'scheduled' as Game['status'] });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const isStaff = profile?.role === 'staff' || profile?.role === 'admin';

  useEffect(() => {
    if (authLoading || !client || (!isStaff && profile?.role !== 'coach')) return;
    async function load() {
      const supabase = client;
      if (!supabase) return;
      try {
        const [registrationResult, gameResult, playerResult, teamResult, divisionsResult, teamSeasonResult, rosterResult, statResult, coachResult] = await Promise.all([
          isStaff ? supabase.from('registrations').select('*').order('submitted_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
          supabase.from('games').select('*').order('scheduled_at', { ascending: true }),
          supabase.from('public_players').select('*').order('last_name'),
          supabase.from('teams').select('*').eq('is_active', true).order('name'),
          supabase.from('divisions').select('*').order('name'),
          supabase.from('team_seasons').select('*'),
          supabase.from('rosters').select('*').is('left_at', null),
          supabase.from('player_game_stats').select('*'),
          profile?.role === 'coach' ? supabase.from('team_coaches').select('team_id').eq('profile_id', profile.id) : Promise.resolve({ data: [], error: null }),
        ]);
        const resultError = [registrationResult, gameResult, playerResult, teamResult, divisionsResult, teamSeasonResult, rosterResult, statResult, coachResult].find((result) => result.error)?.error;
        if (resultError) throw new Error('Unable to load league operations.');
        setRegistrations(registrationResult.data ?? []);
        const loadedGames = (gameResult.data ?? []) as Game[];
        setGames(profile?.role === 'coach'
          ? loadedGames.filter((game) => ((coachResult.data ?? []) as Array<{ team_id: string }>).some((item) => item.team_id === game.home_team_id || item.team_id === game.away_team_id))
          : loadedGames);
        setPlayers((playerResult.data ?? []) as PublicPlayer[]);
        setTeams(teamResult.data ?? []);
        setDivisions(divisionsResult.data ?? []);
        setTeamSeasons(teamSeasonResult.data ?? []);
        const loadedTeamIds = profile?.role === 'coach'
          ? ((coachResult.data ?? []) as Array<{ team_id: string }>).map((item) => item.team_id)
          : null;
        const loadedTeamSeasons = (teamSeasonResult.data ?? []) as TeamSeason[];
        const loadedRosters = (rosterResult.data ?? []) as Roster[];
        setRosters(loadedRosters.filter((roster) => {
          if (!loadedTeamIds) return true;
          const teamSeason = loadedTeamSeasons.find((item) => item.id === roster.team_season_id);
          return teamSeason ? loadedTeamIds.includes(teamSeason.team_id) : false;
        }));
        setPlayerStats(statResult.data ?? []);
        setAssignedTeamIds(profile?.role === 'coach' ? ((coachResult.data ?? []) as Array<{ team_id: string }>).map((item) => item.team_id) : []);
      } catch (reason) {
        console.error('Unable to load league operations', reason);
        setError('Unable to load league operations.');
      } finally {
        setBusy(false);
      }
    }
    void load();
  }, [authLoading, client, isStaff, profile?.id, profile?.role]);

  async function updateRegistration(id: string, changes: Partial<Pick<Registration, 'status' | 'division_id'>>) {
    if (!client || (profile?.role !== 'staff' && profile?.role !== 'admin')) return;
    const { error: updateError } = await client.from('registrations').update({ ...changes, reviewed_at: new Date().toISOString(), reviewed_by: profile?.id ?? null } as never).eq('id', id);
    if (updateError) setError('Unable to update registration.');
    else setRegistrations((items) => items.map((item) => item.id === id ? { ...item, ...changes } : item));
  }

  async function updateGame() {
    if (!client || !selectedGame || (profile?.role !== 'staff' && profile?.role !== 'admin')) return;
    const { error: updateError } = await client.from('games').update({ home_score: score.home, away_score: score.away, status: score.status } as never).eq('id', selectedGame);
    if (updateError) setError('Unable to update game.');
    else { setMessage('Game updated.'); setGames((items) => items.map((item) => item.id === selectedGame ? { ...item, home_score: score.home, away_score: score.away, status: score.status } : item)); }
  }

  async function addPlayer() {
    const teamSeason = teamSeasons.find((item) => item.id === selectedTeamSeason);
    if (!client || !teamSeason || !selectedPlayer || (!isStaff && !assignedTeamIds.includes(teamSeason.team_id))) return;
    const { data, error: insertError } = await client.from('rosters').insert({ team_season_id: selectedTeamSeason, player_id: selectedPlayer } as never).select().single();
    if (insertError) setError('Unable to add player to roster.');
    else if (data) { setRosters((items) => [...items, data as Roster]); setMessage('Player added to the roster.'); }
  }

  async function removePlayer(roster: Roster) {
    const teamSeason = teamSeasons.find((item) => item.id === roster.team_season_id);
    if (!client || !teamSeason || (!isStaff && !assignedTeamIds.includes(teamSeason.team_id))) return;
    const { error: deleteError } = await client.from('rosters').delete().eq('id', roster.id);
    if (deleteError) setError('Unable to remove player from roster.');
    else { setRosters((items) => items.filter((item) => item.id !== roster.id)); setMessage('Player removed from the roster.'); }
  }

  async function saveStats() {
    if (!client || !selectedGame || !selectedPlayer || !isStaff) return;
    const game = games.find((item) => item.id === selectedGame);
    const roster = rosters.find((item) => item.player_id === selectedPlayer);
    const teamSeason = roster ? teamSeasons.find((item) => item.id === roster.team_season_id) : undefined;
    if (!game || !teamSeason || (game.home_team_id !== teamSeason.team_id && game.away_team_id !== teamSeason.team_id)) { setError('Select a player rostered on a team playing in this game.'); return; }
    const existing = playerStats.find((item) => item.game_id === selectedGame && item.player_id === selectedPlayer);
    const payload = { ...statForm, team_id: teamSeason.team_id, game_id: selectedGame, player_id: selectedPlayer };
    const result = (existing ? await client.from('player_game_stats').update(payload as never).eq('id', existing.id).select().single() : await client.from('player_game_stats').insert(payload as never).select().single()) as unknown as { data: PlayerGameStats | null; error: { message: string } | null };
    if (result.error) setError('Unable to save player statistics.');
    else if (result.data) { const saved = result.data as PlayerGameStats; setPlayerStats((items) => existing ? items.map((item) => item.id === existing.id ? saved : item) : [...items, saved]); setMessage('Player statistics saved.'); }
  }

  const visibleTeamSeasons = teamSeasons.filter((item) => isStaff || assignedTeamIds.includes(item.team_id));
  const rosterForSelection = rosters.filter((item) => !selectedTeamSeason || item.team_season_id === selectedTeamSeason);
  const filtered = registrations.filter((registration) => (status === 'all' || registration.status === status) && `${registration.first_name} ${registration.last_name} ${registration.email}`.toLowerCase().includes(query.toLowerCase()));

  if (authLoading || busy) return <main><Container maxWidth="xl" className="py-16"><div className="h-8 w-64 animate-pulse rounded bg-white/10" /><div className="mt-8 h-64 animate-pulse rounded-2xl bg-white/5" /></Container></main>;
  if (!profile || (!isStaff && profile.role !== 'coach')) return <main><Container maxWidth="lg" className="py-16"><h1 className="font-display text-3xl font-bold">Operations access required</h1><p className="mt-3 text-gray-400">This workspace is limited to assigned coaches, league staff, and administrators.</p></Container></main>;
  if (error && !players.length) return <main><Container maxWidth="xl" className="py-16"><p className="text-red-300">{error}</p></Container></main>;

  return <main><Container maxWidth="xl" className="py-12"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">{profile.role} portal</p><h1 className="mt-2 font-display text-4xl font-bold">League operations</h1><p className="mt-3 text-gray-400">Manage authorized rosters and record official game statistics.</p>{message && <p className="mt-4 rounded-lg bg-emerald-400/10 p-3 text-sm text-emerald-300">{message}</p>}{error && <p className="mt-4 rounded-lg bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6"><h2 className="font-display text-2xl font-bold">Roster management</h2><p className="mt-2 text-sm text-gray-400">Roster changes are enforced by the existing Supabase RLS policies.</p><div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><select aria-label="Team season" value={selectedTeamSeason} onChange={(event) => setSelectedTeamSeason(event.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"><option value="">Select team and season</option>{visibleTeamSeasons.map((item) => <option key={item.id} value={item.id}>{teams.find((team) => team.id === item.team_id)?.name ?? 'Team'} · {item.season_id.slice(0, 8)}</option>)}</select><select aria-label="Player to add" value={selectedPlayer} onChange={(event) => setSelectedPlayer(event.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"><option value="">Select eligible player</option>{players.filter((player) => !rosterForSelection.some((roster) => roster.player_id === player.id)).map((player) => <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>)}</select><button type="button" onClick={() => void addPlayer()} disabled={!selectedTeamSeason || !selectedPlayer} className="rounded-lg bg-rcl-gold px-4 py-2 font-semibold text-black disabled:opacity-50">Add player</button></div><div className="mt-5 space-y-2">{rosterForSelection.length === 0 ? <p className="text-gray-500">Select a team season to view its roster.</p> : rosterForSelection.map((roster) => { const player = players.find((item) => item.id === roster.player_id); return <div key={roster.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3"><span>{player ? `${player.first_name} ${player.last_name}` : 'Player'}</span><button type="button" onClick={() => void removePlayer(roster)} className="text-sm text-red-300 hover:text-red-200">Remove</button></div>; })}</div></section>
    {isStaff && <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6"><h2 className="font-display text-2xl font-bold">Player statistics entry</h2><p className="mt-2 text-sm text-gray-400">Enter only non-negative values supported by the production schema.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><select aria-label="Game" value={selectedGame} onChange={(event) => setSelectedGame(event.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"><option value="">Select game</option>{games.map((game) => <option key={game.id} value={game.id}>{new Date(game.scheduled_at).toLocaleString()} · {game.id.slice(0, 8)}</option>)}</select><select aria-label="Player" value={selectedPlayer} onChange={(event) => setSelectedPlayer(event.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"><option value="">Select player</option>{players.map((player) => <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>)}</select>{(['points', 'rebounds', 'assists', 'steals', 'blocks', 'minutes', 'fouls'] as const).map((field) => <label key={field} className="text-sm capitalize text-gray-400">{field}<input type="number" min="0" step={field === 'minutes' ? '0.01' : '1'} value={statForm[field]} onChange={(event) => setStatForm({ ...statForm, [field]: Math.max(0, Number(event.target.value)) })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white" /></label>)}<button type="button" onClick={() => void saveStats()} className="rounded-lg bg-rcl-gold px-4 py-2 font-semibold text-black">Save statistics</button></div></section>}
    {isStaff && <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6"><h2 className="font-display text-2xl font-bold">Game management</h2><div className="mt-5 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"><select aria-label="Select game to update" value={selectedGame} onChange={(event) => { const game = games.find((item) => item.id === event.target.value); setSelectedGame(event.target.value); if (game) setScore({ home: game.home_score, away: game.away_score, status: game.status }); }} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"><option value="">Select a game</option>{games.map((game) => <option key={game.id} value={game.id}>{new Date(game.scheduled_at).toLocaleString()} · {game.id.slice(0, 8)}</option>)}</select><input aria-label="Home score" type="number" min="0" value={score.home} onChange={(event) => setScore({ ...score, home: Math.max(0, Number(event.target.value)) })} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white" /><input aria-label="Away score" type="number" min="0" value={score.away} onChange={(event) => setScore({ ...score, away: Math.max(0, Number(event.target.value)) })} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white" /><select aria-label="Game status" value={score.status} onChange={(event) => setScore({ ...score, status: event.target.value as Game['status'] })} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white">{(['scheduled', 'live', 'completed', 'cancelled', 'postponed'] as const).map((value) => <option key={value} value={value}>{value}</option>)}</select><button type="button" disabled={!selectedGame} onClick={() => void updateGame()} className="rounded-lg bg-rcl-gold px-4 py-2 font-semibold text-black disabled:opacity-50">Save</button></div></section>}
    {isStaff && <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6"><div className="flex flex-wrap gap-3"><input aria-label="Search registrations" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" className="min-w-64 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white" /><select aria-label="Filter registration status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"><option value="all">All statuses</option>{(['pending', 'approved', 'waitlisted', 'rejected', 'cancelled'] as const).map((value) => <option key={value} value={value}>{value}</option>)}</select></div><div className="mt-6 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-gray-500"><tr><th className="pb-3">Applicant</th><th className="pb-3">Submitted</th><th className="pb-3">Status</th><th className="pb-3">Review</th></tr></thead><tbody>{filtered.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-gray-500">No registrations match this filter.</td></tr> : filtered.map((registration) => <tr key={registration.id} className="border-t border-white/10"><td className="py-4"><p className="font-semibold">{registration.first_name} {registration.last_name}</p><p className="text-gray-500">{registration.email}</p></td><td className="py-4 text-gray-400">{new Date(registration.submitted_at).toLocaleDateString()}</td><td className="py-4 capitalize">{registration.status}</td><td className="py-4">    <select aria-label={`Update ${registration.first_name} ${registration.last_name}`} value={registration.status} onChange={(event) => void updateRegistration(registration.id, { status: event.target.value as Registration['status'] })} className="rounded border border-white/10 bg-black/20 px-2 py-1 text-white">{(['pending', 'approved', 'waitlisted', 'rejected', 'cancelled'] as const).map((value) => <option key={value} value={value}>{value}</option>)}</select><select aria-label={`Assign division for ${registration.first_name} ${registration.last_name}`} value={registration.division_id ?? ''} onChange={(event) => void updateRegistration(registration.id, { division_id: event.target.value || null })} className="ml-2 rounded border border-white/10 bg-black/20 px-2 py-1 text-white"><option value="">Division</option>{divisions.filter((division) => division.season_id === registration.season_id).map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select></td></tr>)}</tbody></table></div></section>}</Container></main>;
}

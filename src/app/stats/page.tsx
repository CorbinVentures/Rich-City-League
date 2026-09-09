import Link from 'next/link';
import { Container } from '@/components/Container';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';
import type { PlayerGameStats, PublicPlayer, Team, TeamGameStats } from '@/types/database';

export const revalidate = 60;

export default async function StatsPage() {
  const snapshot = await getLeagueSnapshot();
  const client = getPublicClient();
  let playerStats: PlayerGameStats[] = [];
  let teamStats: TeamGameStats[] = [];
  let players: PublicPlayer[] = [];
  let teams: Team[] = [];
  let error: string | null = null;
  if (client) {
    const [playerResult, teamResult, playersResult, teamsResult] = await Promise.all([
      client.from('player_game_stats').select('*'),
      client.from('team_game_stats').select('*'),
      client.from('public_players').select('*'),
      client.from('teams').select('*').eq('is_active', true),
    ]);
    error = [playerResult, teamResult, playersResult, teamsResult].find((result) => result.error) ? 'Statistics are temporarily unavailable.' : null;
    playerStats = playerResult.data ?? [];
    teamStats = teamResult.data ?? [];
    players = playersResult.data ?? [];
    teams = teamsResult.data ?? [];
  }
  const playerById = new Map(players.map((player) => [player.id, player]));
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const leaders = [...playerStats].sort((a, b) => b.points - a.points).slice(0, 10);
  const teamLeaders = [...teamStats].sort((a, b) => b.points - a.points).slice(0, 10);
  const totals = playerStats.reduce((result, stat) => ({ points: result.points + stat.points, rebounds: result.rebounds + stat.rebounds, assists: result.assists + stat.assists }), { points: 0, rebounds: 0, assists: 0 });

  return <main><Container maxWidth="xl" className="py-12"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">League leaders</p><h1 className="mt-2 font-display text-4xl font-bold">Statistics</h1><p className="mt-3 text-gray-400">Official player and team box scores recorded in the RCL database.</p>{error ? <p className="mt-8 rounded-xl border border-red-400/30 p-4 text-red-300">{error}</p> : <><div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 p-5"><p className="text-xs uppercase text-gray-500">Points recorded</p><p className="mt-2 text-3xl font-bold">{totals.points}</p></div><div className="rounded-2xl border border-white/10 p-5"><p className="text-xs uppercase text-gray-500">Rebounds recorded</p><p className="mt-2 text-3xl font-bold">{totals.rebounds}</p></div><div className="rounded-2xl border border-white/10 p-5"><p className="text-xs uppercase text-gray-500">Assists recorded</p><p className="mt-2 text-3xl font-bold">{totals.assists}</p></div></div><div className="mt-8 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-white/10 p-6"><h2 className="font-display text-2xl font-bold">Player leaders</h2>{leaders.length === 0 ? <p className="mt-5 text-gray-500">No player statistics have been recorded yet.</p> : <div className="mt-5 space-y-3">{leaders.map((stat, index) => { const player = playerById.get(stat.player_id); return <div key={stat.id} className="flex items-center justify-between gap-3 border-b border-white/10 pb-3"><span><span className="mr-2 text-gray-500">#{index + 1}</span>{player ? <Link href={`/players/${player.id}`} className="hover:text-rcl-gold">{player.first_name} {player.last_name}</Link> : 'Player unavailable'}</span><span className="text-right font-bold">{stat.points} pts<span className="block text-xs font-normal text-gray-500">{stat.rebounds} reb · {stat.assists} ast</span></span></div>; })}</div>}</section><section className="rounded-2xl border border-white/10 p-6"><h2 className="font-display text-2xl font-bold">Team leaders</h2>{teamLeaders.length === 0 ? <p className="mt-5 text-gray-500">No team statistics have been recorded yet.</p> : <div className="mt-5 space-y-3">{teamLeaders.map((stat) => <div key={stat.id} className="flex items-center justify-between border-b border-white/10 pb-3"><span>{teamById.get(stat.team_id)?.name ?? 'Team unavailable'}</span><span className="font-bold">{stat.points} pts<span className="block text-xs font-normal text-gray-500">{stat.rebounds} reb · {stat.assists} ast</span></span></div>)}</div>}</section></div></>}</Container></main>;
}

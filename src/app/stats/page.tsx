import Link from 'next/link';
import { Container } from '@/components/Container';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';
import type { PlayerGameStats, PublicPlayer, Team, TeamGameStats } from '@/types/database';

export const revalidate = 60;

type PlayerTotals = {
  playerId: string;
  games: number;
  points: number;
  rebounds: number;
  assists: number;
};

type TeamTotals = {
  teamId: string;
  games: number;
  points: number;
  rebounds: number;
  assists: number;
};

export default async function StatsPage() {
  const snapshot = await getLeagueSnapshot();
  const client = getPublicClient();
  const currentSeason = snapshot.seasons.find((season) => season.status === 'active')
    ?? snapshot.seasons.find((season) => season.status === 'registration')
    ?? snapshot.seasons[0]
    ?? null;
  const completedGameIds = new Set(
    snapshot.games
      .filter((game) => game.status === 'completed' && (!currentSeason || game.season_id === currentSeason.id))
      .map((game) => game.id),
  );

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
    error = [playerResult, teamResult, playersResult, teamsResult].find((result) => result.error)
      ? 'Statistics are temporarily unavailable.'
      : null;
    playerStats = (playerResult.data ?? []).filter((stat) => completedGameIds.has(stat.game_id));
    teamStats = (teamResult.data ?? []).filter((stat) => completedGameIds.has(stat.game_id));
    players = (playersResult.data ?? []).flatMap((row) => row.id ? [{
      id: row.id,
      first_name: row.first_name ?? '',
      last_name: row.last_name ?? '',
      jersey_number: row.jersey_number,
      position: row.position,
      height_inches: row.height_inches,
      hometown: row.hometown,
      photo_url: row.photo_url,
      is_active: row.is_active ?? true,
    }] : []);
    teams = teamsResult.data ?? [];
  }

  const playerById = new Map(players.map((player) => [player.id, player]));
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const playerTotals = new Map<string, PlayerTotals>();
  for (const stat of playerStats) {
    const current = playerTotals.get(stat.player_id) ?? { playerId: stat.player_id, games: 0, points: 0, rebounds: 0, assists: 0 };
    current.games += 1;
    current.points += stat.points;
    current.rebounds += stat.rebounds;
    current.assists += stat.assists;
    playerTotals.set(stat.player_id, current);
  }

  const teamTotals = new Map<string, TeamTotals>();
  for (const stat of teamStats) {
    const current = teamTotals.get(stat.team_id) ?? { teamId: stat.team_id, games: 0, points: 0, rebounds: 0, assists: 0 };
    current.games += 1;
    current.points += stat.points;
    current.rebounds += stat.rebounds;
    current.assists += stat.assists;
    teamTotals.set(stat.team_id, current);
  }

  const leaders = [...playerTotals.values()]
    .sort((a, b) => b.points - a.points || b.assists - a.assists || b.rebounds - a.rebounds)
    .slice(0, 10);
  const teamLeaders = [...teamTotals.values()]
    .sort((a, b) => b.points - a.points || b.assists - a.assists || b.rebounds - a.rebounds)
    .slice(0, 10);
  const totals = [...playerTotals.values()].reduce(
    (result, stat) => ({
      points: result.points + stat.points,
      rebounds: result.rebounds + stat.rebounds,
      assists: result.assists + stat.assists,
    }),
    { points: 0, rebounds: 0, assists: 0 },
  );

  return (
    <main>
      <Container maxWidth="xl" className="py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Official league statistics</p>
            <h1 className="mt-2 font-display text-4xl font-bold">Statistics</h1>
            <p className="mt-3 text-gray-400">
              {currentSeason ? `${currentSeason.name} totals from finalized RCL box scores.` : 'Finalized RCL box scores will appear here.'}
            </p>
          </div>
          <Link href="/leaderboards" className="text-xs font-black uppercase tracking-widest text-rcl-gold hover:text-white">
            Full leaderboards →
          </Link>
        </div>

        {error ? (
          <p className="mt-8 rounded-xl border border-red-400/30 p-4 text-red-300">{error}</p>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ['Points recorded', totals.points],
                ['Rebounds recorded', totals.rebounds],
                ['Assists recorded', totals.assists],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 p-5">
                  <p className="text-xs uppercase text-gray-500">{label}</p>
                  <p className="mt-2 text-3xl font-bold">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-white/10 p-6">
                <h2 className="font-display text-2xl font-bold">Player leaders</h2>
                <p className="mt-1 text-xs uppercase tracking-wider text-gray-500">Season totals · finalized games only</p>
                {leaders.length === 0 ? (
                  <p className="mt-5 text-gray-500">No finalized player statistics have been recorded for this season yet.</p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {leaders.map((stat, index) => {
                      const player = playerById.get(stat.playerId);
                      const ppg = stat.games ? stat.points / stat.games : 0;
                      return (
                        <div key={stat.playerId} className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                          <span>
                            <span className="mr-2 text-gray-500">#{index + 1}</span>
                            {player ? (
                              <Link href={`/players/${player.id}`} className="hover:text-rcl-gold">
                                {player.first_name} {player.last_name}
                              </Link>
                            ) : 'Player unavailable'}
                          </span>
                          <span className="text-right font-bold">
                            {stat.points} pts
                            <span className="block text-xs font-normal text-gray-500">
                              {stat.games} GP · {ppg.toFixed(1)} PPG · {stat.rebounds} REB · {stat.assists} AST
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 p-6">
                <h2 className="font-display text-2xl font-bold">Team leaders</h2>
                <p className="mt-1 text-xs uppercase tracking-wider text-gray-500">Season totals · finalized games only</p>
                {teamLeaders.length === 0 ? (
                  <p className="mt-5 text-gray-500">No finalized team statistics have been recorded for this season yet.</p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {teamLeaders.map((stat) => (
                      <div key={stat.teamId} className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <span>{teamById.get(stat.teamId)?.name ?? 'Team unavailable'}</span>
                        <span className="text-right font-bold">
                          {stat.points} pts
                          <span className="block text-xs font-normal text-gray-500">
                            {stat.games} GP · {stat.rebounds} REB · {stat.assists} AST
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </Container>
    </main>
  );
}

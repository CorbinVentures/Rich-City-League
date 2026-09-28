import Link from 'next/link';
import { Container } from '@/components/Container';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';
import type { PlayerGameStats, PublicPlayer, Team, TeamGameStats } from '@/types/database';

export const revalidate = 60;

type PlayerAggregate = {
  player_id: string;
  games: number;
  points: number;
  rebounds: number;
  assists: number;
};

type TeamAggregate = {
  team_id: string;
  games: number;
  points: number;
  rebounds: number;
  assists: number;
};

function aggregatePlayers(rows: PlayerGameStats[]) {
  const totals = new Map<string, PlayerAggregate>();
  for (const row of rows) {
    const current = totals.get(row.player_id) ?? { player_id: row.player_id, games: 0, points: 0, rebounds: 0, assists: 0 };
    current.games += 1;
    current.points += row.points;
    current.rebounds += row.rebounds;
    current.assists += row.assists;
    totals.set(row.player_id, current);
  }
  return [...totals.values()];
}

function aggregateTeams(rows: TeamGameStats[]) {
  const totals = new Map<string, TeamAggregate>();
  for (const row of rows) {
    const current = totals.get(row.team_id) ?? { team_id: row.team_id, games: 0, points: 0, rebounds: 0, assists: 0 };
    current.games += 1;
    current.points += row.points;
    current.rebounds += row.rebounds;
    current.assists += row.assists;
    totals.set(row.team_id, current);
  }
  return [...totals.values()];
}

export default async function StatsPage() {
  const snapshot = await getLeagueSnapshot();
  const client = getPublicClient();
  const season = snapshot.seasons.find((item) => item.status === 'active')
    ?? snapshot.seasons.find((item) => item.status === 'registration')
    ?? snapshot.seasons[0]
    ?? null;
  const completedGameIds = new Set(
    snapshot.games
      .filter((game) => game.status === 'completed' && (!season || game.season_id === season.id))
      .map((game) => game.id),
  );

  let playerStats: PlayerGameStats[] = [];
  let teamStats: TeamGameStats[] = [];
  let players: PublicPlayer[] = [];
  let teams: Team[] = [];
  let error: string | null = null;

  if (client) {
    const ids = [...completedGameIds];
    const [playerResult, teamResult, playersResult, teamsResult] = await Promise.all([
      ids.length ? client.from('player_game_stats').select('*').in('game_id', ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? client.from('team_game_stats').select('*').in('game_id', ids) : Promise.resolve({ data: [], error: null }),
      client.from('public_players').select('*').eq('is_active', true),
      client.from('teams').select('*').eq('is_active', true),
    ]);
    error = [playerResult, teamResult, playersResult, teamsResult].find((result) => result.error)
      ? 'Statistics are temporarily unavailable.'
      : null;
    playerStats = (playerResult.data ?? []) as PlayerGameStats[];
    teamStats = (teamResult.data ?? []) as TeamGameStats[];
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
  const playerAggregates = aggregatePlayers(playerStats);
  const teamAggregates = aggregateTeams(teamStats);
  const leaders = [...playerAggregates]
    .sort((a, b) => (b.games ? b.points / b.games : 0) - (a.games ? a.points / a.games : 0) || b.points - a.points)
    .slice(0, 10);
  const teamLeaders = [...teamAggregates]
    .sort((a, b) => (b.games ? b.points / b.games : 0) - (a.games ? a.points / a.games : 0) || b.points - a.points)
    .slice(0, 10);
  const totals = playerStats.reduce(
    (result, stat) => ({ points: result.points + stat.points, rebounds: result.rebounds + stat.rebounds, assists: result.assists + stat.assists }),
    { points: 0, rebounds: 0, assists: 0 },
  );

  return (
    <main>
      <Container maxWidth="xl" className="py-12">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">League leaders</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Statistics</h1>
        <p className="mt-3 text-gray-400">
          {season ? `${season.name} · official completed-game box scores.` : 'Official completed-game box scores recorded in the RCL database.'}
        </p>
        {error ? (
          <p className="mt-8 rounded-xl border border-red-400/30 p-4 text-red-300">{error}</p>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <StatCard label="Points recorded" value={totals.points} />
              <StatCard label="Rebounds recorded" value={totals.rebounds} />
              <StatCard label="Assists recorded" value={totals.assists} />
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-white/10 p-6">
                <h2 className="font-display text-2xl font-bold">Player leaders</h2>
                <p className="mt-1 text-xs text-gray-500">Ranked by points per game in completed games for this season.</p>
                {leaders.length === 0 ? (
                  <p className="mt-5 text-gray-500">No completed-game player statistics have been recorded for this season yet.</p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {leaders.map((stat, index) => {
                      const player = playerById.get(stat.player_id);
                      const ppg = stat.games ? stat.points / stat.games : 0;
                      const rpg = stat.games ? stat.rebounds / stat.games : 0;
                      const apg = stat.games ? stat.assists / stat.games : 0;
                      return (
                        <div key={stat.player_id} className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                          <span>
                            <span className="mr-2 text-gray-500">#{index + 1}</span>
                            {player ? <Link href={`/players/${player.id}`} className="hover:text-rcl-gold">{player.first_name} {player.last_name}</Link> : 'Player unavailable'}
                          </span>
                          <span className="text-right font-bold">
                            {ppg.toFixed(1)} PPG
                            <span className="block text-xs font-normal text-gray-500">{stat.games} GP · {rpg.toFixed(1)} RPG · {apg.toFixed(1)} APG</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
              <section className="rounded-2xl border border-white/10 p-6">
                <h2 className="font-display text-2xl font-bold">Team scoring</h2>
                <p className="mt-1 text-xs text-gray-500">Ranked by team points per completed game for this season.</p>
                {teamLeaders.length === 0 ? (
                  <p className="mt-5 text-gray-500">No completed-game team statistics have been recorded for this season yet.</p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {teamLeaders.map((stat) => {
                      const ppg = stat.games ? stat.points / stat.games : 0;
                      const rpg = stat.games ? stat.rebounds / stat.games : 0;
                      const apg = stat.games ? stat.assists / stat.games : 0;
                      return (
                        <div key={stat.team_id} className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                          <span>{teamById.get(stat.team_id)?.name ?? 'Team unavailable'}</span>
                          <span className="text-right font-bold">
                            {ppg.toFixed(1)} PPG
                            <span className="block text-xs font-normal text-gray-500">{stat.games} GP · {rpg.toFixed(1)} RPG · {apg.toFixed(1)} APG</span>
                          </span>
                        </div>
                      );
                    })}
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 p-5">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

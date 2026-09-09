import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, Division, Game, League, Player, PlayerGameStats, Roster, Season, Standing, Team, TeamCoach, TeamGameStats, TeamSeason, Venue } from '@/types/database';

type PublicClient = SupabaseClient<Database>;
type QueryResult<T> = { data: T; error: { message: string } | null };

export type LeagueSnapshot = {
  leagues: League[];
  seasons: Season[];
  teams: Team[];
  games: Game[];
  standings: Standing[];
  news: Database['public']['Tables']['news']['Row'][];
};

export type TeamDetailData = {
  team: Team;
  league: League | null;
  seasons: Season[];
  divisions: Division[];
  teamSeasons: TeamSeason[];
  rosters: Roster[];
  players: Player[];
  coaches: TeamCoach[];
  games: Game[];
  standings: Standing[];
  playerStats: PlayerGameStats[];
  teamStats: TeamGameStats[];
  venues: Venue[];
};

export type PlayerDetailData = {
  player: Player;
  rosters: Roster[];
  teamSeasons: TeamSeason[];
  teams: Team[];
  seasons: Season[];
  divisions: Division[];
  games: Game[];
  stats: PlayerGameStats[];
};

export function getPublicClient(): PublicClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getLeagueSnapshot(): Promise<LeagueSnapshot> {
  const client = getPublicClient();
  if (!client) return { leagues: [], seasons: [], teams: [], games: [], standings: [], news: [] };
  const [leagues, seasons, teams, games, standings, news] = await Promise.all([
    client.from('leagues').select('*').eq('is_active', true).order('name'),
    client.from('seasons').select('*').in('status', ['registration', 'active', 'completed']).order('start_date', { ascending: false }),
    client.from('teams').select('*').eq('is_active', true).order('name'),
    client.from('games').select('*').order('scheduled_at', { ascending: true }).limit(50),
    client.from('standings').select('*').order('rank', { ascending: true, nullsFirst: false }),
    client.from('news').select('*').eq('status', 'published').order('published_at', { ascending: false }).limit(6),
  ]);
  const firstError = [leagues, seasons, teams, games, standings, news].find((result) => result.error)?.error;
  if (firstError) throw new Error(firstError.message);
  return { leagues: leagues.data ?? [], seasons: seasons.data ?? [], teams: teams.data ?? [], games: games.data ?? [], standings: standings.data ?? [], news: news.data ?? [] };
}

export async function getTeamDetail(slug: string): Promise<TeamDetailData | null> {
  const client = getPublicClient();
  if (!client) return null;
  const teamResult = await client.from('teams').select('*').eq('slug', slug).eq('is_active', true).maybeSingle() as unknown as { data: Team | null; error: { message: string } | null };
  const { data: team, error: teamError } = teamResult;
  if (teamError) throw new Error(teamError.message);
  if (!team) return null;
  const results = await Promise.all([
    client.from('leagues').select('*').eq('id', team.league_id).maybeSingle(),
    client.from('team_seasons').select('*').eq('team_id', team.id),
    client.from('rosters').select('*').is('left_at', null),
    client.from('players').select('*').eq('is_active', true),
    client.from('team_coaches').select('*').eq('team_id', team.id),
    client.from('games').select('*').or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`).order('scheduled_at'),
    client.from('standings').select('*').eq('team_id', team.id),
    client.from('player_game_stats').select('*').eq('team_id', team.id),
    client.from('team_game_stats').select('*').eq('team_id', team.id),
    client.from('venues').select('*'),
  ]) as unknown as [QueryResult<League | null>, QueryResult<TeamSeason[]>, QueryResult<Roster[]>, QueryResult<Player[]>, QueryResult<TeamCoach[]>, QueryResult<Game[]>, QueryResult<Standing[]>, QueryResult<PlayerGameStats[]>, QueryResult<TeamGameStats[]>, QueryResult<Venue[]>];
  const [leagueResult, teamSeasonResult, rosterResult, playerResult, coachResult, gameResult, standingsResult, playerStatsResult, teamStatsResult, venueResult] = results;
  const firstError = [leagueResult, teamSeasonResult, rosterResult, playerResult, coachResult, gameResult, standingsResult, playerStatsResult, teamStatsResult, venueResult].find((result) => result.error)?.error;
  if (firstError) throw new Error(firstError.message);
  const teamSeasons = teamSeasonResult.data ?? [];
  const seasonIds = [...new Set(teamSeasons.map((item) => item.season_id))];
  const rosterIds = new Set(teamSeasons.map((item) => item.id));
  const rosters = (rosterResult.data ?? []).filter((item) => rosterIds.has(item.team_season_id));
  const playerIds = new Set(rosters.map((item) => item.player_id));
  const seasonsResult = seasonIds.length ? await client.from('seasons').select('*').in('id', seasonIds) : { data: [], error: null };
  const divisionsResult = seasonIds.length ? await client.from('divisions').select('*').in('season_id', seasonIds) : { data: [], error: null };
  if (seasonsResult.error || divisionsResult.error) throw new Error((seasonsResult.error ?? divisionsResult.error)?.message);
  const games = gameResult.data ?? [];
  return {
    team, league: leagueResult.data, seasons: seasonsResult.data ?? [], divisions: divisionsResult.data ?? [], teamSeasons, rosters,
    players: (playerResult.data ?? []).filter((item) => playerIds.has(item.id)), coaches: coachResult.data ?? [], games,
    standings: standingsResult.data ?? [], playerStats: (playerStatsResult.data ?? []).filter((item) => games.some((game) => game.id === item.game_id)),
    teamStats: (teamStatsResult.data ?? []).filter((item) => games.some((game) => game.id === item.game_id)), venues: venueResult.data ?? [],
  };
}

export async function getPlayerDetail(id: string): Promise<PlayerDetailData | null> {
  const client = getPublicClient();
  if (!client) return null;
  const playerResult = await client.from('players').select('*').eq('id', id).eq('is_active', true).maybeSingle() as unknown as { data: Player | null; error: { message: string } | null };
  const { data: player, error: playerError } = playerResult;
  if (playerError) throw new Error(playerError.message);
  if (!player) return null;
  const [rosterResult, statsResult] = await Promise.all([
    client.from('rosters').select('*').eq('player_id', id).is('left_at', null),
    client.from('player_game_stats').select('*').eq('player_id', id),
  ]) as unknown as [QueryResult<Roster[]>, QueryResult<PlayerGameStats[]>];
  if (rosterResult.error || statsResult.error) throw new Error((rosterResult.error ?? statsResult.error)?.message);
  const rosters = rosterResult.data ?? [];
  const teamSeasonIds = [...new Set(rosters.map((item) => item.team_season_id))];
  const teamSeasonResult = (teamSeasonIds.length ? await client.from('team_seasons').select('*').in('id', teamSeasonIds) : { data: [], error: null }) as unknown as QueryResult<TeamSeason[]>;
  if (teamSeasonResult.error) throw new Error(teamSeasonResult.error.message);
  const teamSeasons = teamSeasonResult.data ?? [];
  const teamIds = [...new Set(teamSeasons.map((item) => item.team_id))];
  const seasonIds = [...new Set(teamSeasons.map((item) => item.season_id))];
  const [teamsResult, seasonsResult, gamesResult] = await Promise.all([
    teamIds.length ? client.from('teams').select('*').in('id', teamIds) : { data: [], error: null },
    seasonIds.length ? client.from('seasons').select('*').in('id', seasonIds) : { data: [], error: null },
    statsResult.data?.length ? client.from('games').select('*').in('id', statsResult.data.map((item) => item.game_id)) : { data: [], error: null },
  ]);
  const divisionsResult = seasonIds.length ? await client.from('divisions').select('*').in('season_id', seasonIds) : { data: [], error: null };
  if (teamsResult.error || seasonsResult.error || gamesResult.error || divisionsResult.error) throw new Error((teamsResult.error ?? seasonsResult.error ?? gamesResult.error ?? divisionsResult.error)?.message);
  return { player, rosters, teamSeasons, teams: teamsResult.data ?? [], seasons: seasonsResult.data ?? [], divisions: divisionsResult.data ?? [], games: gamesResult.data ?? [], stats: statsResult.data ?? [] };
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type PublicClient = SupabaseClient<Database>;
type PublicTables = Database['public']['Tables'];
type TableRow<Name extends keyof PublicTables> = PublicTables[Name]['Row'];

export type LeagueSnapshot = {
  leagues: TableRow<'leagues'>[];
  seasons: TableRow<'seasons'>[];
  teams: TableRow<'teams'>[];
  games: TableRow<'games'>[];
  standings: TableRow<'standings'>[];
  news: TableRow<'news'>[];
};

export function getPublicClient(): PublicClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getLeagueSnapshot(): Promise<LeagueSnapshot> {
  const client = getPublicClient();
  if (!client) {
    return { leagues: [], seasons: [], teams: [], games: [], standings: [], news: [] };
  }

  const [leagues, seasons, teams, games, standings, news] = await Promise.all([
    client.from('leagues').select('*').eq('is_active', true).order('name'),
    client
      .from('seasons')
      .select('*')
      .in('status', ['registration', 'active', 'completed'])
      .order('start_date', { ascending: false }),
    client.from('teams').select('*').eq('is_active', true).order('name'),
    client
      .from('games')
      .select('*')
      .order('scheduled_at', { ascending: true })
      .limit(50),
    client.from('standings').select('*').order('rank', { ascending: true, nullsFirst: false }),
    client
      .from('news')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(6),
  ]);

  const firstError = [leagues, seasons, teams, games, standings, news].find(
    (result) => result.error
  )?.error;
  if (firstError) throw new Error(firstError.message);

  return {
    leagues: leagues.data ?? [],
    seasons: seasons.data ?? [],
    teams: teams.data ?? [],
    games: games.data ?? [],
    standings: standings.data ?? [],
    news: news.data ?? [],
  };
}

import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { getPublicClient } from '@/lib/public-data';
import LeaderboardExperience from '@/components/LeaderboardExperience';

export const metadata: Metadata = {
  title: 'RCL Rankings | Richmond Basketball Player Stats',
  description: 'Rich City League rankings, official player stats, team standings, Player IQ, badges, and community XP.',
  keywords: ['RCL rankings', 'Richmond basketball rankings', 'RCL player stats', 'Richmond basketball players'],
};

export const revalidate = 60;

export default async function LeaderboardsPage() {
  const client = getPublicClient();
  if (!client) {
    return <LeaderboardShell><LeaderboardExperience seasons={[]} players={[]} games={[]} stats={[]} teams={[]} rosters={[]} teamSeasons={[]} standings={[]} iq={[]} badges={[]} playerBadges={[]} community={[]} /></LeaderboardShell>;
  }

  const [seasons, players, games, stats, teams, rosters, teamSeasons, standings, iq, badges, playerBadges, community, profiles] = await Promise.all([
    client.from('seasons').select('*').in('status', ['registration', 'active', 'completed']).order('start_date', { ascending: false }),
    client.from('public_players').select('*').eq('is_active', true).order('last_name'),
    client.from('games').select('id, season_id, status, home_score, away_score').eq('status', 'completed'),
    client.from('player_game_stats').select('*'),
    client.from('teams').select('*').eq('is_active', true).order('name'),
    client.from('rosters').select('id, player_id, team_season_id').is('left_at', null),
    client.from('team_seasons').select('*'),
    client.from('standings').select('*').order('rank', { ascending: true, nullsFirst: false }),
    client.from('public_player_iq').select('*'),
    client.from('badges').select('*').eq('is_active', true),
    client.from('player_badges').select('id, player_id, badge_id, earned_at'),
    client.from('user_levels').select('profile_id, xp, level, current_streak'),
    client.from('profiles').select('id, display_name, username').eq('is_active', true),
  ]);
  const communityRows = (community.data ?? []) as { profile_id: string; xp: number; level: number; current_streak: number }[];

  return (
    <LeaderboardShell>
      <LeaderboardExperience
        seasons={seasons.data ?? []}
        players={players.data ?? []}
        games={games.data ?? []}
        stats={stats.data ?? []}
        teams={teams.data ?? []}
        rosters={rosters.data ?? []}
        teamSeasons={teamSeasons.data ?? []}
        standings={standings.data ?? []}
        iq={iq.data ?? []}
        badges={badges.data ?? []}
        playerBadges={playerBadges.data ?? []}
        community={communityRows.map((row) => {
          const profile = ((profiles.data ?? []) as { id: string; display_name: string | null; username: string | null }[]).find((item) => item.id === row.profile_id);
          return { ...row, displayName: profile?.display_name ?? profile?.username ?? 'RCL community member' };
        })}
      />
    </LeaderboardShell>
  );
}

function LeaderboardShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-rcl-black pb-24 text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_80%_10%,rgba(255,107,26,0.2),transparent_35%),linear-gradient(135deg,#07111f,#05070b_65%)]">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:42px_42px]" />
        <Container maxWidth="xl" className="relative py-16 sm:py-20">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-rcl-gold">Rich City League · Richmond, VA</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-black uppercase leading-[0.92] tracking-tight sm:text-7xl">
            RCL <span className="text-rcl-gold">Leaderboards</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg font-bold uppercase tracking-[0.12em] text-white">Real talent. Real impact.</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400">Stats. Competition. Community. Follow the players, teams, and people moving Richmond basketball forward.</p>
        </Container>
      </section>
      {children}
    </main>
  );
}

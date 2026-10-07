import type { Metadata } from 'next';
import { RCLHomeExperience } from '@/components/RCLHomeExperience';
import { MemberHomeRedirect } from '@/components/MemberHomeRedirect';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';

export const metadata: Metadata = {
  title: { absolute: 'Rich City Hoops | Virginia Basketball Network' },
  description: 'Connect with Virginia basketball through players, runs, organizations, media, community and Rich City League competition.',
  alternates: { canonical: '/' },
  openGraph: {
    images: [{ url:'https://www.richcityhoops.com/rcl-share-20261002.png', width:1200, height:630, alt:'Rich City Hoops — Virginia basketball network' }],
    url: '/',
    title: 'Rich City Hoops | Virginia Basketball Network',
    description: 'Players, runs, organizations, media, community and Rich City League competition in one basketball network.',
  },
};

export const revalidate = 60;

export default async function HomePage() {
  const { teams, games, standings, news, seasons, divisions } = await getLeagueSnapshot();
  const client = getPublicClient();
  const season = seasons.find(item=>item.status === 'active') ?? seasons.find(item=>item.status === 'registration') ?? seasons[0];
  const seasonStandings = standings.filter(item=>item.season_id === season?.id);
  const divisionId = seasonStandings[0]?.division_id;
  const previewStandings = seasonStandings.filter(item=>item.division_id === divisionId).slice(0, 8);
  const standingsLabel = [season?.name, divisions.find(item=>item.id === divisionId)?.name].filter(Boolean).join(' · ');
  const now = Date.now();
  const homeGames = games
    .filter(game=>!['completed','cancelled'].includes(game.status) && new Date(game.scheduled_at).getTime() >= now)
    .sort((a,b)=>new Date(a.scheduled_at).getTime()-new Date(b.scheduled_at).getTime())
    .slice(0, 8);
  const completedGameIds = games
    .filter(game => game.status === 'completed' && (!season || game.season_id === season.id))
    .map(game => game.id);

  const { data: playersRaw } = client
    ? await client.from('public_players')
        .select('id,first_name,last_name,photo_url,position,jersey_number')
        .eq('is_active', true)
        .order('last_name')
        .limit(6)
    : { data: [] };

  const playerIds = (playersRaw ?? [])
    .slice(0, 4)
    .map(player=>player.id)
    .filter((id): id is string => Boolean(id));
  const [{ data: statsRaw }, { data: postsRaw }] = client
    ? await Promise.all([
        playerIds.length && completedGameIds.length
          ? client.from('player_game_stats')
              .select('player_id,points,assists')
              .in('player_id', playerIds)
              .in('game_id', completedGameIds)
          : Promise.resolve({ data: [] }),
        client.from('posts')
          .select('id,body,created_at,author:profiles(display_name,first_name,last_name)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(3),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <>
      <MemberHomeRedirect />
      <RCLHomeExperience
        teams={teams}
        games={homeGames}
        standings={previewStandings}
        standingsLabel={standingsLabel}
        players={(playersRaw ?? []) as any}
        stats={(statsRaw ?? []) as any}
        news={news.slice(0, 3)}
        posts={(postsRaw ?? []) as any}
      />
    </>
  );
}

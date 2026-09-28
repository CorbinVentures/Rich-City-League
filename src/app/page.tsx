import type { Metadata } from 'next';
import { RCLHomeExperience } from '@/components/RCLHomeExperience';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';

export const metadata: Metadata = { title: { absolute: 'Rich City League | Richmond VA Basketball League' }, description: 'Join Richmond\'s basketball community. Rich City League combines competitive league play, player stats, profiles, runs, media, fantasy basketball and RVA hoops culture.', alternates:{canonical:'/'}, openGraph:{url:'/',title:'Rich City League | Richmond VA Basketball League',description:'Competitive Richmond basketball, player stats, runs, community and year-round RVA hoops culture.'} };

export const revalidate = 60;

export default async function HomePage() {
  const { teams, games, standings, news, seasons, divisions } = await getLeagueSnapshot();
  const client = getPublicClient();
  const season = seasons.find(item=>item.status === 'active') ?? seasons[0];
  const seasonStandings = standings.filter(item=>item.season_id === season?.id);
  const divisionId = seasonStandings[0]?.division_id;
  const previewStandings = seasonStandings.filter(item=>item.division_id === divisionId);
  const standingsLabel = [season?.name, divisions.find(item=>item.id === divisionId)?.name].filter(Boolean).join(' · ');

  const [{ data: playersRaw }, { data: iqRaw }, { data: statsRaw }, { data: postsRaw }] = client
    ? await Promise.all([
        client.from('public_players').select('id,first_name,last_name,photo_url,position,jersey_number').eq('is_active', true).order('last_name').limit(6),
        client.from('public_player_iq').select('player_id,rcl_rating,court_performance_score,exposure_index,player_archetype').order('rcl_rating', { ascending: false }).limit(20),
        client.from('player_game_stats').select('player_id,points,assists').limit(1000),
        client.from('posts').select('id,body,created_at,author:profiles(display_name,first_name,last_name)').eq('status', 'published').order('created_at', { ascending: false }).limit(3),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  return (
    <RCLHomeExperience
      teams={teams}
      games={games}
      standings={previewStandings}
      standingsLabel={standingsLabel}
      players={(playersRaw ?? []) as any}
      iq={(iqRaw ?? []) as any}
      stats={(statsRaw ?? []) as any}
      news={news}
      posts={(postsRaw ?? []) as any}
    />
  );
}

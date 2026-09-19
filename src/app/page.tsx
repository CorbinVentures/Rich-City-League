import { RCLHomeExperience } from '@/components/RCLHomeExperience';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';

export const revalidate = 60;

export default async function HomePage() {
  const { teams, games, standings, news } = await getLeagueSnapshot();
  const client = getPublicClient();

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
      standings={standings}
      players={(playersRaw ?? []) as any}
      iq={(iqRaw ?? []) as any}
      stats={(statsRaw ?? []) as any}
      news={news}
      posts={(postsRaw ?? []) as any}
    />
  );
}

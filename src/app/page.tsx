import type { Metadata } from 'next';
import { RCLHomeExperience } from '@/components/RCLHomeExperience';
import { RCHBrowserHomepage } from '@/components/RCHBrowserHomepage';
import { MemberHomeRedirect } from '@/components/MemberHomeRedirect';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';

export const metadata: Metadata = { title: { absolute: 'Rich City Hoops | Virginia Basketball Runs & Leagues' }, description: 'Find pickup basketball runs, 1v1 games, courts and competition in Richmond and across Virginia. Join Rich City Hoops free to connect with players and crews.', alternates:{canonical:'/'}, openGraph:{images:[{url:'https://www.richcityhoops.com/opengraph-image?v=20261014',width:1200,height:630,alt:'Rich City Hoops basketball community'}],url:'/',title:'Rich City Hoops | Virginia Basketball Runs & Leagues',description:'Find local pickup basketball runs, 1v1 challenges, courts, crews and leagues in Virginia. Free to join.'} };

export const revalidate = 60;

export default async function HomePage() {
  const { teams, games, standings, news, seasons, divisions } = await getLeagueSnapshot();
  const client = getPublicClient();
  const season = seasons.find(item=>item.status === 'active') ?? seasons.find(item=>item.status === 'registration') ?? seasons[0];
  const seasonStandings = standings.filter(item=>item.season_id === season?.id);
  const divisionId = seasonStandings[0]?.division_id;
  const previewStandings = seasonStandings.filter(item=>item.division_id === divisionId);
  const standingsLabel = [season?.name, divisions.find(item=>item.id === divisionId)?.name].filter(Boolean).join(' · ');
  const completedGameIds = new Set(games.filter(game => game.status === 'completed' && (!season || game.season_id === season.id)).map(game => game.id));

  // The landing page displays just six players and three posts. Never fetch an
  // unused player-IQ ranking or 1,000 unrelated game-stat rows for first paint.
  const [{ data: playersRaw }, { data: postsRaw }, { data: eventsRaw }, { data: runsRaw }] = client
    ? await Promise.all([
        client.from('public_players').select('id,first_name,last_name,photo_url,position,jersey_number').eq('is_active', true).order('last_name').limit(6),
        client.from('posts').select('id,body,created_at,author:profiles!posts_author_id_fkey!inner(display_name,first_name,last_name)')
          .eq('author.profile_visibility', 'public').eq('author.is_active', true)
          .eq('status', 'published').is('target_profile_id', null)
          .order('created_at', { ascending: false }).limit(3),
        (client as any).from('network_events').select('id,slug,title,starts_at,city,state,event_type').eq('status','published').gte('starts_at',new Date().toISOString()).order('starts_at',{ascending:true}).limit(8),
        (client as any).from('runs').select('id,title,starts_at,location,game_format').eq('status','open').gte('starts_at',new Date().toISOString()).order('starts_at',{ascending:true}).limit(8),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const playerIds = (playersRaw ?? []).map(player => player.id).filter((id): id is string => Boolean(id));
  const { data: statsRaw } = client && playerIds.length && completedGameIds.size
    ? await client.from('player_game_stats').select('game_id,player_id,points,assists')
        .in('player_id', playerIds).in('game_id', [...completedGameIds]).limit(250)
    : { data: [] };
  const currentStats = statsRaw ?? [];

  return (
    <>
      <div className="rch-browser-home-target">
        <RCHBrowserHomepage
          news={news as any}
          events={(eventsRaw ?? []) as any}
          runs={(runsRaw ?? []) as any}
          players={(playersRaw ?? []) as any}
        />
      </div>
      <MemberHomeRedirect />
      <RCLHomeExperience
        teams={teams}
        games={games}
        standings={previewStandings}
        standingsLabel={standingsLabel}
        players={(playersRaw ?? []) as any}
        stats={currentStats as any}
        news={news}
        posts={(postsRaw ?? []) as any}
      />
    </>
  );
}

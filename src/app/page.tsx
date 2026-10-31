import type { Metadata } from 'next';
import { RCLHomeExperience } from '@/components/RCLHomeExperience';
import { RCHBrowserHomepage } from '@/components/RCHBrowserHomepage';
import { MemberHomeRedirect } from '@/components/MemberHomeRedirect';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';
import { isRclProSeasonRecord, RCL_PRO_SEASON } from '@/lib/rcl-pro-season';

export const metadata: Metadata = { title: { absolute: 'Rich City Hoops | Virginia Basketball Runs & Leagues' }, description: 'Find pickup basketball runs, 1v1 games, courts and competition in Richmond and across Virginia. Join Rich City Hoops free to connect with players and crews.', alternates:{canonical:'/'}, openGraph:{images:[{url:'https://www.richcityhoops.com/opengraph-image?v=20261014',width:1200,height:630,alt:'Rich City Hoops basketball community'}],url:'/',title:'Rich City Hoops | Virginia Basketball Runs & Leagues',description:'Find local pickup basketball runs, 1v1 challenges, courts, crews and leagues in Virginia. Free to join.'} };

export const revalidate = 60;

export default async function HomePage() {
  const { teams, games, standings, news, seasons, divisions } = await getLeagueSnapshot();
  const client = getPublicClient();
  const proSeasons = seasons.filter(isRclProSeasonRecord);
  const season = proSeasons.find(item=>item.status === 'active') ?? proSeasons.find(item=>item.status === 'registration') ?? proSeasons[0];
  const seasonStandings = standings.filter(item=>item.season_id === season?.id);
  const divisionId = seasonStandings[0]?.division_id;
  const previewStandings = seasonStandings.filter(item=>item.division_id === divisionId);
  const standingsLabel = [season?.name ?? `Pro season planned · ${RCL_PRO_SEASON.startLabel}`, divisions.find(item=>item.id === divisionId)?.name].filter(Boolean).join(' · ');
  const proSeasonGames = season ? games.filter(game => game.season_id === season.id) : [];
  const completedGameIds = new Set(proSeasonGames.filter(game => game.status === 'completed').map(game => game.id));

  // The landing page displays just six players and three posts. Never fetch an
  // unused player-IQ ranking or 1,000 unrelated game-stat rows for first paint.
  const [{ data: playersRaw }, { data: postsRaw }, { data: eventsRaw }, { data: runsRaw }, { data: membersRaw }] = client
    ? await Promise.all([
        client.from('public_players').select('id,first_name,last_name,photo_url,position,jersey_number').eq('is_active', true).order('last_name').limit(6),
        (client as any).from('posts').select('id,body,created_at,author:profiles!posts_author_id_fkey!inner(display_name,first_name,last_name)')
          .eq('author.profile_visibility', 'public').eq('author.is_active', true)
          .eq('status', 'published').eq('is_automated', false).is('target_profile_id', null)
          .order('created_at', { ascending: false }).limit(3),
        (client as any).from('network_events').select('id,slug,title,starts_at,city,state,event_type').eq('status','published').gte('starts_at',new Date().toISOString()).order('starts_at',{ascending:true}).limit(8),
        (client as any).from('runs').select('id,title,starts_at,location,court_name,game_format,host_id,max_players').eq('status','open').gte('starts_at',new Date().toISOString()).order('starts_at',{ascending:true}).limit(32),
        (client as any).from('profiles').select('id,display_name,first_name,last_name,avatar_url,role').eq('is_active',true).eq('profile_visibility','public').eq('is_system_account',false).not('avatar_url','is',null).order('updated_at',{ascending:false}).limit(12),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  type RunRow = {id:string;host_id:string;title:string;starts_at:string;location:string;court_name:string|null;game_format:string|null;max_players:number|null};
  type MemberRow = {id:string;display_name:string|null;first_name:string|null;last_name:string|null;avatar_url:string|null;role:string|null};
  type PostRow = {id:string;body:string;author:{display_name:string|null;first_name:string|null;last_name:string|null}|null};
  const runRows=(runsRaw ?? []) as RunRow[];
  const memberRows=(membersRaw ?? []) as MemberRow[];
  const postRows=(postsRaw ?? []) as PostRow[];
  const runIds = runRows.map(run=>run.id);
  const hostIds = [...new Set(runRows.map(run=>run.host_id).filter((id):id is string=>Boolean(id)))];
  const [{data:registrations,error:rsvpError},{data:hosts}] = client ? await Promise.all([
    runIds.length ? (client as any).from('run_players').select('run_id').in('run_id',runIds).limit(1000) : Promise.resolve({data:[],error:null}),
    hostIds.length ? client.from('profiles').select('id,display_name,first_name,last_name').in('id',hostIds).eq('profile_visibility','public').eq('is_active',true) : Promise.resolve({data:[]}),
  ]) : [{data:[],error:null},{data:[]}];
  const rsvpCounts=new Map<string,number>();
  for(const row of registrations ?? []) rsvpCounts.set(row.run_id,(rsvpCounts.get(row.run_id) || 0)+1);
  const hostNames=new Map((hosts ?? []).map(row=>[row.id,row.display_name || [row.first_name,row.last_name].filter(Boolean).join(' ')]));
  const enrichedRuns=runRows.map(row=>({...row,host_name:hostNames.get(row.host_id)||null,rsvp_count:rsvpError ? null : rsvpCounts.get(row.id)||0}));
  // Suggestions are NOT confirmed hosted games. Exclude them from the event
  // preview and personalized opportunity recommendations. If the ledger cannot
  // be read, fail closed rather than present unclassified Runs as confirmed.
  const {data:suggestionLedger,error:suggestionError} = client && runIds.length
    ? await (client as any).from('rch_weekend_circuit_events').select('run_id').in('run_id',runIds)
    : {data:[],error:null};
  const suggestionsKnown=!suggestionError;
  const suggestionIds=new Set<string>((suggestionLedger??[]).map((row:{run_id:string})=>row.run_id));
  const confirmedRuns=suggestionsKnown?enrichedRuns.filter(row=>!suggestionIds.has(row.id)):[];
  const suggestedRuns=suggestionsKnown?enrichedRuns.filter(row=>suggestionIds.has(row.id)):[];

  const publicMembers=memberRows.filter(row=>Boolean(row.avatar_url?.trim())).slice(0,6);
  const publicActivity=postRows.filter(row=>typeof row.body==='string' && row.body.trim()).map(row=>({
    id:row.id,body:row.body.slice(0,220),author_name:row.author?.display_name || [row.author?.first_name,row.author?.last_name].filter(Boolean).join(' ') || 'RCH Member',
  }));

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
          runs={confirmedRuns as any}
          suggestedRuns={suggestedRuns as any}
          listingsVerified={suggestionsKnown}
          members={publicMembers as any}
          activity={publicActivity}
        />
      </div>
      <MemberHomeRedirect />
      <RCLHomeExperience
        teams={teams}
        games={proSeasonGames}
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

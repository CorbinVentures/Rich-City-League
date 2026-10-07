import Link from 'next/link';
import { formatDate, formatTime } from '@/utils/helpers';
import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';

export const revalidate=60;

export default async function SchedulePage(){
 const {games,teams,venues}=await getLeagueSnapshot();
 const teamMap=new Map(teams.map(t=>[t.id,t.name]));
 const orderedGames=[...games].sort((a,b)=>new Date(a.scheduled_at).getTime()-new Date(b.scheduled_at).getTime());
 return <main className="rcl-platform-page rcl-schedule-page min-h-screen pb-24 text-white"><section className="rcl-cinematic-page-hero compact"><Container maxWidth="xl"><p className="rcl-page-kicker">THE COURT · ALL GAMES</p><h1>SCHEDULE</h1><p>Never miss a game. Browse the Rich City League calendar and upcoming matchups.</p></Container></section><Container maxWidth="xl" className="rcl-page-content"><section className="rcl-platform-panel"><div className="rcl-panel-heading"><span>UPCOMING & RECENT</span><b>{orderedGames.length} GAMES</b></div><div className="rcl-schedule-list">{orderedGames.map(game=><Link href={`/games/${game.id}`} className="rcl-schedule-row" key={game.id}><span className="rcl-date">{formatDate(game.scheduled_at)}</span><span><b>{teamMap.get(game.home_team_id)??'Home Team'}</b><small>vs</small><b>{teamMap.get(game.away_team_id)??'Away Team'}</b></span><span><b>{formatTime(game.scheduled_at)}</b><small>{venues.find(v=>v.id===game.venue_id)?.name??'Richmond, VA'}</small></span><span>→</span></Link>)}</div></section></Container></main>;
}
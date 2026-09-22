import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';

export const revalidate=60;

export default async function SchedulePage(){
 const {games,teams,venues}=await getLeagueSnapshot();
 const teamMap=new Map(teams.map(t=>[t.id,t.name]));
 const orderedGames=[...games].sort((a,b)=>new Date(a.scheduled_at).getTime()-new Date(b.scheduled_at).getTime());
 return <main className="rcl-platform-page rcl-schedule-page min-h-screen pb-24 text-white"><section className="rcl-cinematic-page-hero compact"><Container maxWidth="xl"><p className="rcl-page-kicker">THE COURT · ALL GAMES</p><h1>SCHEDULE</h1><p>Never miss a game. Browse the Rich City League calendar and upcoming matchups.</p></Container></section><Container maxWidth="xl" className="rcl-page-content"><section className="rcl-platform-panel"><div className="rcl-panel-heading"><span>UPCOMING & RECENT</span><b>{orderedGames.length} GAMES</b></div><div className="rcl-schedule-list">{orderedGames.map(game=><div className="rcl-schedule-row" key={game.id}><span className="rcl-date">{new Date(game.scheduled_at).toLocaleDateString('en-US',{month:'short',day:'2-digit'})}</span><span><b>{teamMap.get(game.home_team_id)??'Home Team'}</b><small>vs</small><b>{teamMap.get(game.away_team_id)??'Away Team'}</b></span><span><b>{new Date(game.scheduled_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</b><small>{venues.find(v=>v.id===game.venue_id)?.name??'Richmond, VA'}</small></span><span>→</span></div>)}</div></section></Container></main>;
}
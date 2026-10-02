'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import {
  FaArrowRight, FaBasketball, FaComments, FaCompass, FaLocationDot,
  FaPeopleGroup, FaPlay, FaShirt, FaSparkles, FaTrophy, FaUserGroup
} from 'react-icons/fa6';

type Team={id:string;name:string;logo_url?:string|null};
type Game={id:string;home_team_id:string;away_team_id:string;scheduled_at:string;venue_id?:string|null;status:string;home_score:number;away_score:number};
type Standing={id:string;team_id:string;wins:number;losses:number;rank?:number|null};
type Player={id:string;first_name:string;last_name:string;photo_url?:string|null;position?:string|null;jersey_number?:string|null};
type IQ={player_id:string;rcl_rating:number;court_performance_score:number;exposure_index:number;player_archetype?:string|null};
type News={id:string;slug:string;title:string;published_at?:string|null};
type Post={id:string;body:string;author?:{display_name?:string|null;first_name?:string|null;last_name?:string|null}|null};
type Stat={player_id:string;points:number;assists:number};
type Props={teams:Team[];games:Game[];standings:Standing[];players:Player[];iq:IQ[];stats:Stat[];news:News[];posts:Post[];standingsLabel?:string};

const worldCards=[
  {title:'Social',copy:'Highlights, conversations, stories and the people shaping basketball around you.',href:'/social',icon:FaComments},
  {title:'Discover',copy:'Find players, teams, organizations, events and basketball opportunities without digging through ten different apps.',href:'/explore',icon:FaCompass},
  {title:'Runs',copy:'See where people are hooping, join the run and keep the night alive through Run Tape.',href:'/runs',icon:FaLocationDot},
];

export function RCLHomeExperience({teams,games,standings,players,stats,news,posts,standingsLabel}:Props){
  const {user}=useAuth();
  const team=(id:string)=>teams.find(item=>item.id===id);
  const now=Date.now();
  const next=[...games].filter(game=>!['completed','cancelled'].includes(game.status)&&new Date(game.scheduled_at).getTime()>=now)
    .sort((a,b)=>new Date(a.scheduled_at).getTime()-new Date(b.scheduled_at).getTime()).slice(0,2);
  const topStandings=[...standings].sort((a,b)=>(a.rank??99)-(b.rank??99)).slice(0,4);
  const featured=players.slice(0,4);
  const statMap=new Map<string,{gp:number;points:number;assists:number}>();
  for(const row of stats){
    const current=statMap.get(row.player_id)??{gp:0,points:0,assists:0};
    current.gp+=1;current.points+=Number(row.points)||0;current.assists+=Number(row.assists)||0;statMap.set(row.player_id,current);
  }

  return <main className="rcl-social-landing">
    <section className="rcl-social-landing-hero">
      <div className="rcl-landing-copy">
        <p className="rcl-landing-kicker">RCL · Richmond basketball social</p>
        <h1>Your basketball world.<br/><span>All in one place.</span></h1>
        <p className="rcl-landing-lede">Connect with players. Share highlights. Find runs. Follow what matters. Rich City League lives here as the flagship competition inside a bigger basketball community.</p>
        <div className="rcl-landing-actions">
          <Link href={user?'/social':'/register'} className="rcl-landing-primary">{user?'Open your feed':'Join free'} <FaArrowRight/></Link>
          <Link href="/social" className="rcl-landing-secondary"><FaPlay/> See what&apos;s happening</Link>
        </div>
        <div className="rcl-landing-proof"><span>Social</span><span>Runs</span><span>Players</span><span>League</span><span>Merch</span></div>
      </div>

      <div className="rcl-landing-phone" aria-label="Preview of the RCL social experience">
        <div className="rcl-landing-phone-top"><b>RCL</b><span>For You</span><i>•••</i></div>
        <div className="rcl-landing-story-row">{featured.slice(0,4).map(player=><span key={player.id}>{player.photo_url?<Image src={player.photo_url} alt="" width={64} height={64}/>:<b>{player.first_name[0]}{player.last_name[0]}</b>}</span>)}</div>
        <div className="rcl-landing-preview-post">
          <div><span className="rcl-preview-avatar">R</span><p><b>Rich City League</b><small>Flagship League · Richmond</small></p></div>
          <strong>Basketball here is bigger than a schedule.</strong>
          <p>Follow the people, runs, stories and competition that make the city move.</p>
          <div className="rcl-preview-actions"><span>🏀 React</span><span>💬 Comment</span><span>↗ Share</span></div>
        </div>
      </div>
    </section>

    <section className="rcl-landing-section">
      <div className="rcl-landing-section-head"><div><p>Start here</p><h2>A social world built for basketball.</h2></div><Link href="/explore">Discover basketball <FaArrowRight/></Link></div>
      <div className="rcl-world-card-grid">{worldCards.map(({title,copy,href,icon:Icon})=><Link href={href} key={title} className="rcl-world-card"><span><Icon/></span><h3>{title}</h3><p>{copy}</p><b>Open <FaArrowRight/></b></Link>)}</div>
    </section>

    <section className="rcl-landing-section rcl-league-feature">
      <div className="rcl-league-copy">
        <p className="rcl-landing-kicker">Premier competition</p>
        <h2>Rich City League</h2>
        <p>The flagship league of the RCL platform. Games, stats, rankings, stories and league history get a premium stage without making the entire platform feel like a league-management website.</p>
        <div className="rcl-landing-actions"><Link href="/league" className="rcl-landing-primary">Enter League Center <FaArrowRight/></Link><Link href="/standings" className="rcl-landing-secondary"><FaTrophy/> Standings</Link></div>
      </div>
      <div className="rcl-league-scoreboard">
        <p>{standingsLabel||'Rich City League'}</p>
        {next.length?next.map(game=><Link href={'/games/'+game.id} key={game.id}><small>{new Date(game.scheduled_at).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'America/New_York'})}</small><div><b>{team(game.away_team_id)?.name??'Away'}</b><span>vs</span><b>{team(game.home_team_id)?.name??'Home'}</b></div></Link>):<div className="rcl-calm-empty">Upcoming league games will appear here.</div>}
        {topStandings.length>0&&<div className="rcl-mini-standings">{topStandings.map((row,index)=><span key={row.id}><i>{index+1}</i><b>{team(row.team_id)?.name??'RCL Team'}</b><small>{row.wins}-{row.losses}</small></span>)}</div>}
      </div>
    </section>

    <section className="rcl-landing-section">
      <div className="rcl-landing-section-head"><div><p>People first</p><h2>Faces make the network feel alive.</h2></div><Link href="/players">See players <FaArrowRight/></Link></div>
      <div className="rcl-people-row">{featured.map(player=>{
        const s=statMap.get(player.id);
        const ppg=s&&s.gp?s.points/s.gp:0;
        return <Link href={'/players/'+player.id} key={player.id} className="rcl-person-card">
          <div>{player.photo_url?<Image src={player.photo_url} alt={`${player.first_name} ${player.last_name}`} width={540} height={540}/>:<span>{player.first_name[0]}{player.last_name[0]}</span>}</div>
          <p><small>{player.position??'Player'}{player.jersey_number?` · #${player.jersey_number}`:''}</small><b>{player.first_name} {player.last_name}</b><em>{s?.gp?`${ppg.toFixed(1)} PPG`:'RCL Profile'}</em></p>
        </Link>;
      })}{!featured.length&&<div className="rcl-calm-empty">Player profiles will appear here as the community grows.</div>}</div>
    </section>

    <section className="rcl-landing-section rcl-community-pulse">
      <div className="rcl-landing-section-head"><div><p>Community pulse</p><h2>What basketball is talking about.</h2></div><Link href="/social">Open feed <FaArrowRight/></Link></div>
      <div className="rcl-pulse-grid">{posts.slice(0,4).map(post=><Link href="/social" key={post.id}><span><FaUserGroup/></span><div><b>{post.author?.display_name||post.author?.first_name||'RCL Community'}</b><p>{post.body}</p></div></Link>)}{!posts.length&&<div className="rcl-calm-empty">Community posts will appear here.</div>}</div>
    </section>

    <section className="rcl-landing-section rcl-revenue-lifestyle">
      <div className="rcl-landing-section-head"><div><p>More from RCL</p><h2>Membership and merch without interrupting the game.</h2></div></div>
      <div className="rcl-lifestyle-grid">
        <Link href="/membership" className="rcl-lifestyle-card"><span><FaSparkles/></span><div><small>RCL+</small><h3>Your basketball life, organized.</h3><p>My Hoops, Passport tools, analytics, saves and premium basketball utility.</p><b>Explore membership <FaArrowRight/></b></div></Link>
        <Link href="/shop" className="rcl-lifestyle-card"><span><FaShirt/></span><div><small>RCL Drops</small><h3>Wear the culture.</h3><p>Limited league and community releases presented like drops, not banner ads.</p><b>Shop RCL <FaArrowRight/></b></div></Link>
        <Link href="/runs" className="rcl-lifestyle-card"><span><FaBasketball/></span><div><small>On court</small><h3>Find your next run.</h3><p>Basketball activity gives the social world a real-life heartbeat.</p><b>See runs <FaArrowRight/></b></div></Link>
      </div>
    </section>

    {news.length>0&&<section className="rcl-landing-section">
      <div className="rcl-landing-section-head"><div><p>From RCL</p><h2>Stories worth knowing.</h2></div><Link href="/news">All news <FaArrowRight/></Link></div>
      <div className="rcl-editorial-row">{news.slice(0,3).map(item=><Link href={'/news/'+item.slug} key={item.id}><small>RCL</small><b>{item.title}</b><FaArrowRight/></Link>)}</div>
    </section>}
  </main>;
}

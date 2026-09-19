'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  FaArrowRight, FaBars, FaBell, FaCalendarDays, FaChartLine, FaComments, FaCrown,
  FaFlask, FaFolderOpen, FaHouse, FaNewspaper, FaPeopleGroup, FaRankingStar, FaPlay,
  FaShirt, FaTrophy, FaUser, FaUsers, FaXmark, FaBasketball, FaMagnifyingGlass, FaListOl, FaUserTie, FaGear
} from 'react-icons/fa6';

type NavItem = { label:string; href:string; icon: any };
const nav: NavItem[] = [
  {label:'Home',href:'/',icon:FaHouse},{label:'The Lab',href:'/lab',icon:FaFlask},
  {label:'Players',href:'/players',icon:FaUser},{label:'Teams',href:'/teams',icon:FaUsers},
  {label:'Schedule',href:'/schedule',icon:FaCalendarDays},{label:'Games',href:'/games',icon:FaBasketball},
  {label:'Standings',href:'/standings',icon:FaFolderOpen},{label:'Stats',href:'/stats',icon:FaChartLine},
  {label:'Draft Night',href:'/draft',icon:FaCrown},{label:'Social',href:'/social',icon:FaPeopleGroup},
  {label:'News',href:'/news',icon:FaNewspaper},{label:'Media',href:'/media',icon:FaPlay},
  {label:'Community',href:'/communities',icon:FaPeopleGroup},{label:'Rankings',href:'/rankings',icon:FaListOl},
  {label:'Fantasy',href:'/fantasy',icon:FaTrophy},{label:'Leaderboards',href:'/leaderboards',icon:FaListOl},
  {label:'Game IQ',href:'/game-iq',icon:FaChartLine},{label:'Messages',href:'/messages',icon:FaComments},
  {label:'Friends',href:'/friends',icon:FaUsers},{label:'Coaches',href:'/coaches',icon:FaUserTie},
  {label:'Awards',href:'/badges',icon:FaTrophy},{label:'Shop',href:'/shop',icon:FaShirt},
  {label:'Notifications',href:'/notifications',icon:FaBell},{label:'About',href:'/about',icon:FaBasketball}
];
const quick = [
  {title:'THE LAB',sub:'TRAIN. IMPROVE.',href:'/lab',icon:FaFlask,image:'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=700&q=82'},
  {title:'DRAFT NIGHT',sub:'NEXT CHAPTER.',href:'/draft',icon:FaCrown,image:'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&w=700&q=82'},
  {title:'JOIN A LEAGUE',sub:"MEN'S · WOMEN'S · YOUTH",href:'/register',icon:FaTrophy,image:'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=700&q=82'},
];

type Team = {id:string;name:string;logo_url?:string|null};
type Game = {id:string;home_team_id:string;away_team_id:string;scheduled_at:string;venue_id?:string|null;status:string;home_score:number;away_score:number};
type Standing = {id:string;team_id:string;wins:number;losses:number;rank?:number|null};
type Player = {id:string;first_name:string;last_name:string;photo_url?:string|null;position?:string|null;jersey_number?:string|null};
type IQ = {player_id:string;rcl_rating:number;court_performance_score:number;exposure_index:number;player_archetype?:string|null};
type News = {id:string;slug:string;title:string;published_at?:string|null};
type Post = {id:string;body:string;author?:{display_name?:string|null;first_name?:string|null;last_name?:string|null}|null};
type Stat={player_id:string;points:number;assists:number};
type Props = {teams:Team[];games:Game[];standings:Standing[];players:Player[];iq:IQ[];stats:Stat[];news:News[];posts:Post[]};

const fallbackPlayers = [
  'https://images.unsplash.com/photo-1519861531473-920026218c5e?auto=format&fit=crop&w=700&q=85',
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=700&q=85',
  'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&w=700&q=85'
];

export function RCLHomeExperience({teams,games,standings,players,iq,stats,news,posts}:Props) {
  const [menuOpen,setMenuOpen]=useState(false);
  const team = (id:string) => teams.find(t=>t.id===id);
  const next = games.filter(g=>g.status!=='completed').slice(0,3);
  const featured = players.slice(0,3);
  const rankMap = new Map(iq.map(x=>[x.player_id,x]));
  const statMap = new Map<string,{gp:number;points:number;assists:number}>();
  for(const s of stats){const cur=statMap.get(s.player_id)??{gp:0,points:0,assists:0};cur.gp+=1;cur.points+=Number(s.points)||0;cur.assists+=Number(s.assists)||0;statMap.set(s.player_id,cur);}
  const topStandings = [...standings].sort((a,b)=>(a.rank??99)-(b.rank??99)).slice(0,4);
  return <main className="rcl-mock-home">
    <aside className="rcl-home-sidebar">
      <div className="rcl-home-sidebar-brand"><div className="rcl-home-logo">RCL</div><div><b>RICH CITY</b><strong>LEAGUE</strong><small>804 · RVA</small></div></div>
      <nav>{nav.map(item=>{const Icon=item.icon;return <Link key={item.href+item.label} href={item.href} className={item.href==='/'?'active':''}><Icon/><span>{item.label}</span></Link>})}</nav>
      <div className="rcl-home-sidebar-bottom">
        <Link href="/dashboard" className="rcl-home-profile"><span className="rcl-avatar">HI</span><span><b>HI FI</b><small>View Profile</small></span><FaArrowRight/></Link>
        <Link href="/settings"><span className="rcl-settings-dot">⚙</span>Settings</Link>
      </div>
      <div className="rcl-sidebar-motto"><b>PLAY.</b><span>COMPETE.</span><b>CONNECT.</b><span>GROW.</span><small>RICHMOND<br/>VIRGINIA</small></div>
    </aside>

    <div className="rcl-home-main">
      <header className="rcl-home-topbar">
        <Link href="/" className="rcl-home-wordmark"><span>R</span><b>RICH CITY <i>LEAGUE</i></b></Link>
        <div className="rcl-home-tools"><Link href="/search" aria-label="Search"><FaMagnifyingGlass/></Link><Link href="/notifications" aria-label="Notifications"><FaBell/><em/></Link><button onClick={()=>setMenuOpen(true)} aria-label="Open navigation"><FaBars/></button></div>
      </header>

      <section className="rcl-home-hero">
        <div className="rcl-home-hero-image"/>
        <div className="rcl-home-grid"/>
        <div className="rcl-home-hero-copy">
          <p className="rcl-home-kicker">⚡ 804 · RICHMOND, VIRGINIA</p>
          <h1>RICH CITY<br/><span>BUILDS<br/>DIFFERENT.</span></h1>
          <p className="rcl-home-tagline">PLAY. COMPETE. CONNECT. GROW.</p>
          <Link href="/city" className="rcl-home-cta">ENTER THE CITY <FaArrowRight/></Link>
        </div>
        <small className="rcl-home-code">RCL / 804</small>
      </section>

      <div className="rcl-home-content">
        <section className="rcl-home-quick">
          <div className="rcl-home-section-head"><div><p>STEP INTO THE WORLD</p><h2>FIND YOUR COURT</h2></div><b>01</b></div>
          <div className="rcl-home-quick-grid">{quick.map(q=>{const Icon=q.icon;return <Link href={q.href} key={q.title} className="rcl-home-quick-card" style={{backgroundImage:'linear-gradient(90deg,rgba(3,8,13,.96),rgba(3,8,13,.48)),url('+q.image+')'}}><span><Icon/></span><div><b>{q.title}</b><small>{q.sub}</small></div><FaArrowRight/></Link>})}</div>
        </section>

        <section>
          <div className="rcl-home-section-head"><div><p>THE COURT</p><h2>NEXT GAME</h2></div><Link href="/games">VIEW ALL <FaArrowRight/></Link></div>
          <div className="rcl-home-game-card">
            {next.length ? <div className="rcl-home-game-grid">{next.map(g=><Link href={'/games/'+g.id} key={g.id}><small>{new Date(g.scheduled_at).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'America/New_York'})} · {new Date(g.scheduled_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'})}</small><div><b>{team(g.away_team_id)?.name??'AWAY'}</b><strong>VS</strong><b>{team(g.home_team_id)?.name??'HOME'}</b></div><span>RICHMOND, VIRGINIA</span></Link>)}</div> : <div className="rcl-home-empty">Schedules are loading. Check back soon.</div>}
          </div>
        </section>

        <section>
          <div className="rcl-home-section-head"><div><p>THE LEAGUE</p><h2>STANDINGS</h2></div><Link href="/standings">VIEW ALL <FaArrowRight/></Link></div>
          <div className="rcl-home-standings"><div className="rcl-standing-head"><span>#</span><span>TEAM</span><span>W</span><span>L</span><span>PCT</span><span>GB</span></div>{topStandings.map((s,i)=><Link href="/standings" key={s.id}><b>{i+1}</b><span>{team(s.team_id)?.name??'RCL Team'}</span><strong>{s.wins}</strong><strong>{s.losses}</strong><strong>{(s.wins+s.losses)?(s.wins/(s.wins+s.losses)).toFixed(3).replace('0.','.'):'—'}</strong><small>{i?'1.0':'—'}</small></Link>)}{!topStandings.length&&<div className="rcl-home-empty">Standings appear after games are logged.</div>}</div>
        </section>

        <section>
          <div className="rcl-home-section-head"><div><p>THE CITY</p><h2>FEATURED PLAYERS</h2></div><Link href="/players">VIEW ALL <FaArrowRight/></Link></div>
          <div className="rcl-home-player-row">{featured.map((p,i)=>{const q=rankMap.get(p.id); const s=statMap.get(p.id); const ppg=s&&s.gp?s.points/s.gp:0; const apg=s&&s.gp?s.assists/s.gp:0;return <Link href={'/players/'+p.id} key={p.id} className="rcl-home-player-card"><img src={p.photo_url||fallbackPlayers[i%fallbackPlayers.length]} alt=""/><div/><small>#{p.jersey_number??i+1} · {p.position??'PLAYER'}</small><h3>{p.first_name}<br/>{p.last_name}</h3><span><b>{ppg?ppg.toFixed(1):'—'} PPG</b><b>{apg?apg.toFixed(1):'—'} APG</b></span></Link>})}{!featured.length&&<div className="rcl-home-empty">Featured players will appear here.</div>}</div>
        </section>

        <section className="rcl-home-news">
          <div className="rcl-home-section-head"><div><p>804 NOW</p><h2>WHAT&apos;S HAPPENING</h2></div><Link href="/social">VIEW ALL <FaArrowRight/></Link></div>
          <div className="rcl-home-news-grid">{posts.length?posts.map(p=><Link href="/social" key={p.id}><span>{(p.author?.display_name||p.author?.first_name||'RCL')[0]}</span><div><b>{p.author?.display_name||[p.author?.first_name,p.author?.last_name].filter(Boolean).join(' ')||'RCL COMMUNITY'}</b><small>RCL COMMUNITY</small><p>{p.body}</p></div></Link>):<div className="rcl-home-empty">No community updates yet.</div>}</div>
        </section>

        <section className="rcl-home-latest">
          <div><p>THE STAGE</p><h2>LATEST FROM RCL</h2></div>
          <div>{news.slice(0,3).map(n=><Link href={'/news/'+n.slug} key={n.id}><small>RCL NEWS</small><b>{n.title}</b></Link>)}</div>
        </section>
      </div>
    </div>

    {menuOpen&&<div className="rcl-home-drawer-backdrop" onClick={()=>setMenuOpen(false)}>
      <aside className="rcl-home-drawer" onClick={e=>e.stopPropagation()}>
        <div className="rcl-drawer-head"><div className="rcl-home-logo">RCL</div><div><b>RICH CITY <i>LEAGUE</i></b><small>804 · RICHMOND, VIRGINIA</small></div><button onClick={()=>setMenuOpen(false)}><FaXmark/></button></div>
        <nav>{nav.map(item=>{const Icon=item.icon;return <Link onClick={()=>setMenuOpen(false)} key={item.href+item.label} href={item.href} className={item.href==='/'?'active':''}><Icon/><span>{item.label}</span></Link>})}</nav>
        <div className="rcl-drawer-foot"><Link href="/dashboard">HI FI · VIEW PROFILE <FaArrowRight/></Link><Link href="/settings">⚙ SETTINGS</Link></div>
      </aside>
    </div>}

    <nav className="rcl-home-bottom"><Link className="active" href="/"><FaHouse/><span>HOME</span></Link><Link href="/players"><FaUser/><span>PLAYERS</span></Link><Link href="/games"><FaCalendarDays/><span>GAMES</span></Link><Link href="/social"><FaPeopleGroup/><span>SOCIAL</span></Link><button onClick={()=>setMenuOpen(true)}><FaBars/><span>MORE</span></button></nav>
  </main>;
}

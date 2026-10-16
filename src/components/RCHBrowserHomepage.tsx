import Link from 'next/link';
import {
  FaArrowRight, FaBasketball, FaCalendarDays, FaCamera,
  FaCompass, FaLocationDot, FaPlay, FaTrophy,
  FaUserGroup, FaUsers, FaVideo,
} from 'react-icons/fa6';

type News = {
  id: string; slug: string; title: string;
  published_at?: string | null; cover_image_url?: string | null;
  category?: string | null;
};
type Event = {
  id: string; slug: string; title: string; starts_at: string;
  city?: string | null; state?: string | null; event_type?: string | null;
};
type Run = {
  id: string; title: string; starts_at: string;
  location: string; game_format?: string | null;
};
type Player = {
  id: string; first_name: string; last_name: string; photo_url?: string | null;
};

type Props = { news: News[]; events: Event[]; runs: Run[]; players: Player[] };

const cards = [
  { title: 'Runs', label: 'Find your next game', detail: 'Find and organize runs near you.', href: '/runs', icon: FaBasketball, variant: 'runs' },
  { title: 'Leagues', label: 'The next era of hoops', detail: 'Virginia competition, teams and standings.', href: '/league', icon: FaTrophy, variant: 'leagues' },
  { title: 'Discover', label: 'Your basketball world', detail: 'Training, tryouts and opportunities.', href: '/discover', icon: FaCompass, variant: 'discover' },
  { title: 'RCH TV', label: 'Every story matters', detail: 'Games, highlights and original content.', href: '/media', icon: FaVideo, variant: 'media' },
  { title: 'Community', label: 'Stay connected', detail: 'Players, coaches and basketball culture.', href: '/community', icon: FaUsers, variant: 'social' },
] as const;

function dateParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { month: 'TBA', day: '--', label: 'Date to be announced' };
  return {
    month: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'America/New_York' }).format(date).toUpperCase(),
    day: new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: 'America/New_York' }).format(date),
    label: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }).format(date),
  };
}

function SectionTitle({ label, title, href, action }: {label: string; title: string; href: string; action: string}) {
  return <div className="rch-browser-section-head">
    <div><span>{label}</span><h2>{title}</h2></div>
    <Link href={href}>{action} <FaArrowRight aria-hidden="true" /></Link>
  </div>;
}

export function RCHBrowserHomepage({ news, events, runs, players }: Props) {
  const opportunities = [
    ...runs.map(item => ({ id: 'run-' + item.id, href: '/runs/' + item.id, title: item.title, starts_at: item.starts_at, location: item.location, type: 'Run', art: 'run' })),
    ...events.map(item => ({ id: 'event-' + item.id, href: '/network/events/' + item.slug, title: item.title, starts_at: item.starts_at, location: [item.city, item.state].filter(Boolean).join(', ') || 'Virginia', type: item.event_type?.replace(/_/g, ' ') || 'Event', art: 'event' })),
  ].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()).slice(0, 4);

  return <main className="rch-browser-home">
    <section className="rch-browser-hero" aria-labelledby="rch-browser-hero-heading">
      <div className="rch-browser-hero-art" aria-hidden="true" />
      <div className="rch-browser-hero-container">
        <div className="rch-browser-hero-copy">
          <p className="rch-browser-eyebrow">RICH CITY HOOPS <span>·</span> VIRGINIA BASKETBALL</p>
          <h1 id="rch-browser-hero-heading">VIRGINIA<br/>BASKETBALL<br/><em>LIVES HERE.</em></h1>
          <p className="rch-browser-hero-mantra">PLAY <i>•</i> CONNECT <i>•</i> COMPETE <i>•</i> GET DISCOVERED</p>
          <p className="rch-browser-hero-description">Players. Runs. Leagues. Coaches. Training. Media. The entire Virginia basketball community, all in one place.</p>
          <div className="rch-browser-hero-actions">
            <Link className="rch-browser-button rch-browser-button-primary" href="/auth/sign-up">Join the Community <FaArrowRight aria-hidden="true" /></Link>
            <Link className="rch-browser-button rch-browser-button-outline" href="/discover">Explore Basketball <FaCompass aria-hidden="true" /></Link>
          </div>
          <p className="rch-browser-hero-footnote">Free to explore. Free to join. Built for the culture.</p>
        </div>
        <div className="rch-browser-hero-quick" aria-label="Popular places to start">
          <Link href="/runs"><FaLocationDot/><span><b>FIND RUNS</b><small>See where Virginia hoops</small></span><FaArrowRight/></Link>
          <Link href="/league"><FaTrophy/><span><b>EXPLORE THE LEAGUE</b><small>Virginia&apos;s premier league vision</small></span><FaArrowRight/></Link>
          <Link href="/players"><FaUsers/><span><b>FIND PLAYERS</b><small>Meet the basketball community</small></span><FaArrowRight/></Link>
          <Link href="/community"><FaUserGroup/><span><b>CONNECT</b><small>Culture, creators and fans</small></span><FaArrowRight/></Link>
        </div>
      </div>
      <div className="rch-browser-hero-corner" aria-hidden="true">MORE THAN<br/>A GAME</div>
    </section>

    <section className="rch-browser-category-strip" aria-label="Explore RCH">
      <Link href="/community"><FaUserGroup/><b>COMMUNITY</b><small>Connect with hoopers</small></Link>
      <Link href="/runs"><FaBasketball/><b>RUNS</b><small>Find your next game</small></Link>
      <Link href="/league"><FaTrophy/><b>LEAGUES</b><small>Teams, standings, stats</small></Link>
      <Link href="/discover"><FaCompass/><b>DISCOVER</b><small>Opportunities in Virginia</small></Link>
      <Link href="/players"><FaUsers/><b>PLAYERS</b><small>Profiles and highlights</small></Link>
      <Link href="/media"><FaPlay/><b>RCH TV</b><small>Stories and media</small></Link>
    </section>

    <section className="rch-browser-culture-strip" aria-label="One Virginia basketball community">
      <span><FaBasketball/> PICKUP CULTURE</span>
      <span><FaLocationDot/> ALL OF VIRGINIA</span>
      <span><FaTrophy/> REAL COMPETITION</span>
      <span><FaCamera/> ORIGINAL CONTENT</span>
    </section>

    <section className="rch-browser-section rch-browser-feature-section">
      <div className="rch-browser-feature-grid">
        {cards.map(item => {
          const Icon = item.icon;
          return <Link href={item.href} key={item.title} className={'rch-browser-feature rch-browser-feature-' + item.variant}>
            <div className="rch-browser-feature-art" aria-hidden="true" />
            <div className="rch-browser-feature-content">
              <span className="rch-browser-feature-icon"><Icon aria-hidden="true" /></span>
              <div><small>{item.label}</small><h2>{item.title}</h2><p>{item.detail}</p></div>
              <span className="rch-browser-feature-arrow"><FaArrowRight aria-hidden="true" /></span>
            </div>
          </Link>;
        })}
      </div>
    </section>

    <section className="rch-browser-app-promo" aria-labelledby="rch-browser-app-title">
      <div className="rch-browser-phone-art" aria-hidden="true">
        <div className="rch-browser-phone"><div className="rch-browser-phone-notch"/><div className="rch-browser-phone-screen">
          <b>RCH</b><span>GOOD EVENING, HOOPER.</span><div className="rch-browser-phone-mosaic"><i/><i/><i/><i/></div>
          <small>RUNS &nbsp; • &nbsp; LEAGUES &nbsp; • &nbsp; SOCIAL</small>
        </div></div>
      </div>
      <div className="rch-browser-app-copy">
        <span className="rch-browser-eyebrow">THE FULL EXPERIENCE</span>
        <h2 id="rch-browser-app-title">TAKE <em>RCH</em> ANYWHERE.</h2>
        <p>Enjoy the same basketball network from your home screen. Install the RCH web app for fast access to your feeds, Runs and personal basketball tools.</p>
        <Link href="/app" className="rch-browser-button rch-browser-button-primary">Get the RCH App <FaArrowRight aria-hidden="true"/></Link>
        <small>No download required to explore the website.</small>
      </div>
      <div className="rch-browser-app-basketball" aria-hidden="true">R</div>
    </section>

    <section className="rch-browser-section" id="whats-happening">
      <SectionTitle label="GET IN THE GAME" title="UPCOMING RUNS & EVENTS" href="/discover" action="Discover all" />
      {opportunities.length ? <div className="rch-browser-event-grid">
        {opportunities.map((item, index) => {
          const date = dateParts(item.starts_at);
          return <Link key={item.id} href={item.href} className={'rch-browser-event rch-browser-event-' + (index % 4 + 1)}>
            <div className="rch-browser-event-art"><div className="rch-browser-event-date"><b>{date.month}</b><strong>{date.day}</strong></div></div>
            <div className="rch-browser-event-details"><small>{item.type}</small><h3>{item.title}</h3><p><FaLocationDot/> {item.location}</p><span>{date.label} <FaArrowRight/></span></div>
          </Link>;
        })}
      </div> : <div className="rch-browser-empty"><FaCalendarDays/><p>New Runs and basketball events will appear as hosts publish them.</p><Link href="/discover">Explore what&apos;s available <FaArrowRight/></Link></div>}
    </section>

    <section className="rch-browser-section">
      <SectionTitle label="THE PEOPLE BEHIND THE GAME" title="THE COMMUNITY" href="/community" action="Explore the community" />
      <div className="rch-browser-community-grid">
        <Link className="rch-browser-community-tile rch-browser-community-tile-courts" href="/runs"><span>THE COURTS</span></Link>
        <Link className="rch-browser-community-tile rch-browser-community-tile-players" href="/players"><span>THE PLAYERS</span></Link>
        <Link className="rch-browser-community-tile rch-browser-community-tile-coaches" href="/coaches"><span>THE COACHES</span></Link>
        <Link className="rch-browser-community-tile rch-browser-community-tile-culture" href="/news"><span>THE CULTURE</span></Link>
        {players.slice(0, 2).map(player => <Link key={player.id} className="rch-browser-community-tile rch-browser-community-person" href={'/players/' + player.id}>
          {player.photo_url ? <img src={player.photo_url} alt="" loading="lazy"/> : <span className="rch-browser-community-initial">{player.first_name.slice(0, 1)}{player.last_name.slice(0, 1)}</span>}
          <span>{player.first_name} {player.last_name}</span>
        </Link>)}
      </div>
    </section>

    <section className="rch-browser-section">
      <SectionTitle label="THE STORIES WE LIVE" title="LATEST FROM RCH" href="/news" action="All news" />
      {news.length ? <div className="rch-browser-news-grid">
        {news.slice(0, 3).map((item, index) => <Link href={'/news/' + item.slug} key={item.id} className={'rch-browser-news rch-browser-news-' + (index + 1)}>
          <div className="rch-browser-news-art">{item.cover_image_url ? <img src={item.cover_image_url} alt="" loading="lazy"/> : null}</div>
          <div><small>{item.category?.replace(/-/g,' ') || 'RCH NEWS'}</small><h3>{item.title}</h3><p>{item.published_at ? new Intl.DateTimeFormat('en-US', {dateStyle: 'medium'}).format(new Date(item.published_at)) : 'Rich City Hoops'}</p></div>
        </Link>)}
      </div> : <div className="rch-browser-empty"><FaCamera/><p>Stories from Virginia basketball will be featured here as they are published.</p><Link href="/news">Visit the newsroom <FaArrowRight/></Link></div>}
    </section>

    <section className="rch-browser-last-call">
      <div className="rch-browser-last-call-mantra">PLAY<br/><em>CONNECT</em><br/>COMPETE<br/><em>CREATE</em></div>
      <div><span>RICH CITY HOOPS</span><h2>VIRGINIA BASKETBALL. ALWAYS ON.</h2></div>
      <Link className="rch-browser-button rch-browser-button-primary" href="/auth/sign-up">JOIN FREE <FaArrowRight/></Link>
    </section>
  </main>;
}

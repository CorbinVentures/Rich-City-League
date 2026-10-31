import Link from 'next/link';
import { RCHDiscoveryStarter } from '@/components/RCHDiscoveryStarter';
import { RCHBrowserAccountLink } from '@/components/RCHBrowserAccountLink';
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
  { title: 'Leagues', label: 'Pro season · Nov 2027', detail: 'Virginia franchises preparing for the November 2027 season.', href: '/league', icon: FaTrophy, variant: 'leagues' },
  { title: 'Discover', label: 'Your basketball world', detail: 'Training, tryouts and opportunities.', href: '/discover', icon: FaCompass, variant: 'discover' },
  { title: 'RCH TV', label: 'Every story matters', detail: 'Games, highlights and original content.', href: '/media', icon: FaVideo, variant: 'media' },
  { title: 'Social', label: 'Stay connected', detail: 'Players, coaches and basketball culture.', href: '/pulse', icon: FaUsers, variant: 'social' },
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
    ...events.map(item => ({ id: 'event-' + item.id, href: `/network/events/${item.slug}`, title: item.title, starts_at: item.starts_at, location: [item.city, item.state].filter(Boolean).join(', ') || 'Virginia', type: item.event_type?.replace(/_/g, ' ') || 'Event', art: 'event' })),
  ].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()).slice(0, 4);

  return <main className="rch-browser-home">
    <section className="rch-browser-hero" aria-labelledby="rch-browser-hero-heading">
      <div className="rch-browser-hero-art" aria-hidden="true" />
      <div className="rch-browser-hero-container">
        <div className="rch-browser-hero-copy">
          <p className="rch-browser-eyebrow">RICH CITY HOOPS <span>·</span> VIRGINIA BASKETBALL</p>
          <h1 id="rch-browser-hero-heading">YOUR CITY.<br/>YOUR COURT.<br/><em>YOUR LEGACY.</em></h1>
          <p className="rch-browser-hero-mantra">FIND A RUN <i>•</i> BUILD YOUR NAME <i>•</i> STAY CONNECTED</p>
          <p className="rch-browser-hero-description">Find real basketball runs, connect with Virginia players and build your basketball identity—all in one community.</p>
          <div className="rch-browser-hero-actions">
            <RCHBrowserAccountLink className="rch-browser-button rch-browser-button-primary" guestHref="/auth/sign-up?next=%2Fruns" guestLabel="Join Free" trackingContext="home_hero" memberLabel="My Basketball" memberHref="/my-hoops" />
            <Link className="rch-browser-button rch-browser-button-outline" href="/runs">Explore Runs <FaCompass aria-hidden="true" /></Link>
          </div>
          <p className="rch-browser-hero-footnote">Community membership is free. Explore before signing up.</p>
        </div>
        <div className="rch-browser-hero-quick" aria-label="Popular places to start">
          <Link href="/runs"><FaLocationDot/><span><b>FIND RUNS</b><small>Explore upcoming games</small></span><FaArrowRight/></Link>
          <Link href="/league"><FaTrophy/><span><b>EXPLORE THE LEAGUE</b><small>Pro season planned · Nov 2027</small></span><FaArrowRight/></Link>
          <Link href="/players"><FaUsers/><span><b>FIND PLAYERS</b><small>See real player profiles</small></span><FaArrowRight/></Link>
          <Link href="/pulse"><FaUserGroup/><span><b>CONNECT</b><small>Culture, creators and fans</small></span><FaArrowRight/></Link>
        </div>
      </div>
      <div className="rch-browser-hero-corner" aria-hidden="true">MORE THAN<br/>A GAME</div>
    </section>

    <RCHDiscoveryStarter mode="web" opportunities={opportunities} />

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

    <section className="mx-auto w-[calc(100%-28px)] max-w-[1450px] py-8" aria-labelledby="rch-benefits-title">
      <p className="text-xs font-black uppercase tracking-[.18em] text-rose-400">Why create a free basketball profile?</p>
      <h2 id="rch-benefits-title" className="mt-2 font-display text-3xl font-black uppercase text-white sm:text-4xl">More than another feed.</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-white/15 bg-white/[.035] p-5 text-white"><FaBasketball aria-hidden="true" className="text-2xl text-rose-400"/><h3 className="mt-3 text-lg font-black">Find where to play</h3><p className="mt-2 text-sm leading-6 text-white/70">Explore upcoming local Runs and save your next basketball opportunity.</p></article>
        <article className="rounded-2xl border border-white/15 bg-white/[.035] p-5 text-white"><FaUsers aria-hidden="true" className="text-2xl text-rose-400"/><h3 className="mt-3 text-lg font-black">Meet your basketball people</h3><p className="mt-2 text-sm leading-6 text-white/70">Follow players, connect with your crew and see what your community shares.</p></article>
        <article className="rounded-2xl border border-white/15 bg-white/[.035] p-5 text-white"><FaTrophy aria-hidden="true" className="text-2xl text-rose-400"/><h3 className="mt-3 text-lg font-black">Build your basketball identity</h3><p className="mt-2 text-sm leading-6 text-white/70">Create a shareable profile and earn recognition through verified basketball activity.</p></article>
      </div>
      <RCHBrowserAccountLink className="rch-browser-button rch-browser-button-primary mt-5 inline-flex" guestHref="/auth/sign-up?next=%2Fruns" guestLabel="Create Free Profile" trackingContext="home_benefits" memberLabel="Open My Basketball" memberHref="/my-hoops" />
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

    <section className="mx-auto mt-7 flex w-[calc(100%-28px)] max-w-[1450px] flex-col items-start justify-between gap-5 rounded-3xl border border-sky-400/30 bg-[linear-gradient(120deg,#102b40,#081322)] p-6 text-white sm:flex-row sm:items-center sm:p-9" aria-labelledby="rch-sites-title">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[.19em] text-sky-300">RCH Sites · Website Creator</p>
        <h2 id="rch-sites-title" className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">Your basketball business. Your website.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">For coaches, trainers, teams and organizers. Start with a free site draft. Amateur and Professional options are separate website subscriptions.</p>
      </div>
      <Link href="/website-creator" className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-black text-[#071522] hover:bg-sky-300">Build a website <FaArrowRight aria-hidden="true"/></Link>
    </section>

    {players.length > 0 && <section className="rch-browser-section" aria-label="Real Rich City Hoops player profiles">
      <SectionTitle label="REAL BASKETBALL PEOPLE" title="MEET THE COMMUNITY" href="/players" action="Explore player profiles" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {players.slice(0, 6).map(player => <Link href={'/players/' + player.id} key={player.id} className="overflow-hidden rounded-xl border border-white/15 bg-white/[.04] text-white hover:border-rose-400/70">
          <div className="flex aspect-square items-center justify-center bg-[#1a2533] text-3xl font-black">{player.photo_url ? <img src={player.photo_url} alt={player.first_name + ' ' + player.last_name} className="h-full w-full object-cover" loading="lazy"/> : player.first_name.slice(0, 1) + player.last_name.slice(0, 1)}</div>
          <p className="px-3 py-3 text-sm font-bold">{player.first_name} {player.last_name}</p>
        </Link>)}
      </div>
    </section>}

    <section className="rch-browser-section">
      <SectionTitle label="THE STORIES WE LIVE" title="LATEST FROM RCH" href="/news" action="All news" />
      {news.length ? <div className="rch-browser-news-grid">
        {news.slice(0, 3).map((item, index) => <Link href={'/news/' + item.slug} key={item.id} className={'rch-browser-news rch-browser-news-' + (index + 1)}>
          <div className="rch-browser-news-art">{item.cover_image_url ? <img src={item.cover_image_url} alt="" loading="lazy"/> : null}</div>
          <div><small>{item.category?.replace(/-/g,' ') || 'RCH NEWS'}</small><h3>{item.title}</h3><p>{item.published_at ? new Intl.DateTimeFormat('en-US', {dateStyle: 'medium'}).format(new Date(item.published_at)) : 'Rich City Hoops'}</p></div>
        </Link>)}
      </div> : <div className="rch-browser-empty"><FaCamera/><p>Stories from Virginia basketball will be featured here as they are published.</p><Link href="/news">Visit the newsroom <FaArrowRight/></Link></div>}
    </section>

    <section className="rch-browser-app-promo" aria-labelledby="rch-browser-app-title">
      <div className="rch-browser-app-copy">
        <span className="rch-browser-eyebrow">THE FULL EXPERIENCE</span>
        <h2 id="rch-browser-app-title">TAKE <em>RCH</em> ANYWHERE.</h2>
        <p>Keep your basketball community close. Browse and join directly on the web, then add the RCH app to your home screen when you&apos;re ready.</p>
        <Link href="/app" className="rch-browser-button rch-browser-button-primary">Explore the RCH App <FaArrowRight aria-hidden="true"/></Link>
        <small>No app installation required to create an account or explore basketball.</small>
      </div>
    </section>

    <section className="rch-browser-last-call">
      <div className="rch-browser-last-call-mantra">PLAY<br/><em>CONNECT</em><br/>COMPETE<br/><em>CREATE</em></div>
      <div><span>RICH CITY HOOPS</span><h2>YOUR BASKETBALL WORLD STARTS HERE.</h2></div>
      <RCHBrowserAccountLink className="rch-browser-button rch-browser-button-primary" guestHref="/auth/sign-up?next=%2Fruns" guestLabel="Join Free" trackingContext="home_footer" memberLabel="Go to My Hoops" memberHref="/my-hoops" />
    </section>
  </main>;
}

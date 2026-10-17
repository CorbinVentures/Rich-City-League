'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaArrowRight, FaArrowRotateRight, FaBasketball, FaBolt, FaCrown,
  FaFilm, FaGift, FaLocationDot, FaMedal, FaPeopleGroup, FaShieldHalved
} from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { useGravityLocation } from '@/hooks/useGravityLocation';
import { getSupabaseClient } from '@/lib/supabase';
import {
  buildWorldEvents, filterWorldEvents, type WorldCategory, type WorldEvent,
  type TerritoryRow, type ChallengeRow, type HighlightRow, type RunRow
} from '@/lib/living-world';
import './world.css';

type Tab = 'all' | WorldCategory;
type Profile = { id: string; username: string | null; display_name: string | null; is_active: boolean; profile_visibility: string | null };
type Court = { slug: string; name: string; locality: string | null };
type Crew = { id: string; name: string };
type PlayerStats = { wallet: number | null; earned: number | null; level: number | null; xp: number | null; badges: number | null };
const emptyStats: PlayerStats = { wallet: null, earned: null, level: null, xp: null, badges: null };
const tabs: { key: Tab; title: string }[] = [
  { key: 'all', title: 'The Pulse' }, { key: 'territory', title: 'Territories' },
  { key: 'highlights', title: 'Highlights' }, { key: 'runs', title: 'Runs' },
];
const categories: Record<WorldCategory, { title: string; icon: typeof FaCrown }> = {
  territory: { title: 'Territory', icon: FaCrown },
  highlights: { title: 'Highlight', icon: FaFilm },
  runs: { title: 'Upcoming', icon: FaBasketball },
};

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
    : 'Date unavailable';
}

function WorldEventCard({ event }: { event: WorldEvent }) {
  const detail = categories[event.category];
  const Icon = detail.icon;
  return <article className={'rch-world-event rch-world-event-' + event.category}>
    <div className="rch-world-event-symbol" aria-hidden="true"><Icon /></div>
    <div className="rch-world-event-copy">
      <div className="rch-world-event-meta"><span>{event.label}</span><time dateTime={event.occurredAt}>{dateLabel(event.occurredAt)} ET</time></div>
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <div className="rch-world-event-bottom">
        <span><FaLocationDot aria-hidden="true"/> {event.place}</span>
        <Link href={event.href} aria-label={'View ' + event.title}>View details <FaArrowRight aria-hidden="true"/></Link>
      </div>
    </div>
  </article>;
}

export default function LivingWorldPage() {
  const { user, loading: authLoading } = useAuth();
  const { location } = useGravityLocation();
  const selectedCity = location.cityId || null;
  const db = useMemo(() => getSupabaseClient(true) as any, []);
  const [events, setEvents] = useState<WorldEvent[]>([]);
  const [stats, setStats] = useState<PlayerStats>(emptyStats);
  const [tab, setTab] = useState<Tab>('all');
  const [nearby, setNearby] = useState(false);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');

  useEffect(() => { setNearby(Boolean(selectedCity)); }, [selectedCity]);

  const refresh = useCallback(async () => {
    if (!db) { setWarning('RCH activity is temporarily unavailable.'); setLoading(false); return; }
    setLoading(true);
    setWarning('');
    try {
      const now = new Date().toISOString();
      const empty = Promise.resolve({ data: [], error: null });
      const [territoriesResult, challengesResult, highlightsResult, runsResult, walletResult, levelResult, gameBadgesResult, statBadgesResult] = await Promise.all([
        db.from('rch_court_territories').select('court_slug,crew_id,since_at,successful_defenses').order('since_at', { ascending: false }).limit(24),
        db.from('rch_court_takeovers').select('id,court_slug,challenger_crew_id,defender_crew_id,winning_crew_id,status,created_at,resolved_at,run_id').in('status', ['requested', 'accepted', 'resolved']).order('created_at', { ascending: false }).limit(24),
        db.from('posts').select('id,author_id,body,media_urls,created_at').eq('status', 'published').eq('is_automated', false).order('created_at', { ascending: false }).limit(28),
        db.from('runs').select('id,title,location,location_slug,game_format,starts_at,status').eq('status', 'open').gte('starts_at', now).order('starts_at').limit(24),
        user ? db.from('rch_rep_wallets').select('balance,lifetime_earned').eq('profile_id', user.id).maybeSingle() : empty,
        user ? db.from('user_levels').select('xp,level').eq('profile_id', user.id).maybeSingle() : empty,
        user ? db.from('rch_run_badge_awards').select('badge_code').eq('profile_id', user.id) : empty,
        user ? db.from('rch_run_stat_badges').select('badge_code').eq('profile_id', user.id) : empty,
      ]);
      const sources = [territoriesResult, challengesResult, highlightsResult, runsResult];
      const partial = sources.some(result => !!result.error);
      const territories = (territoriesResult.data || []) as TerritoryRow[];
      const challenges = (challengesResult.data || []) as ChallengeRow[];
      const highlights = (highlightsResult.data || []) as HighlightRow[];
      const runs = (runsResult.data || []) as RunRow[];
      const courtSlugs = [...new Set([
        ...territories.map(t => t.court_slug),
        ...challenges.map(c => c.court_slug),
        ...runs.map(r => r.location_slug || ''),
      ].filter(Boolean))];
      const crewIds = [...new Set([
        ...territories.map(t => t.crew_id),
        ...challenges.flatMap(c => [c.challenger_crew_id, c.defender_crew_id, c.winning_crew_id || '']),
      ].filter(Boolean))];
      const authorIds = [...new Set(highlights.map(h => h.author_id).filter(Boolean))];
      const [courtsResult, crewsResult, authorsResult] = await Promise.all([
        courtSlugs.length ? db.from('basketball_locations').select('slug,name,locality').in('slug', courtSlugs).limit(100) : empty,
        crewIds.length ? db.from('commonwealth_crews').select('id,name').in('id', crewIds).limit(100) : empty,
        authorIds.length ? db.from('profiles').select('id,username,display_name,is_active,profile_visibility').in('id', authorIds).limit(100) : empty,
      ]);
      const courts = (courtsResult.data || []) as Court[];
      const crews = (crewsResult.data || []) as Crew[];
      const authors = (authorsResult.data || []) as Profile[];
      const courtNames = Object.fromEntries(courts.map(c => [c.slug, c.name + (c.locality ? ' · ' + c.locality : '')]));
      const crewNames = Object.fromEntries(crews.map(c => [c.id, c.name]));
      const authorNames = Object.fromEntries(authors.filter(a => a.is_active && !['private', 'only_me'].includes(a.profile_visibility || '')).map(a => [a.id, a.display_name || a.username || 'RCH member']));
      setEvents(buildWorldEvents({ territories, challenges, highlights, runs, courtNames, crewNames, authorNames }));
      const badgeCount = !gameBadgesResult.error && !statBadgesResult.error
        ? (gameBadgesResult.data || []).length + (statBadgesResult.data || []).length : null;
      setStats(user ? {
        wallet: walletResult.error ? null : (walletResult.data ? Number(walletResult.data.balance) : 0),
        earned: walletResult.error ? null : (walletResult.data ? Number(walletResult.data.lifetime_earned) : 0),
        level: levelResult.error ? null : (levelResult.data ? Number(levelResult.data.level) : 1),
        xp: levelResult.error ? null : (levelResult.data ? Number(levelResult.data.xp) : 0),
        badges: badgeCount,
      } : emptyStats);
      if (partial || courtsResult.error || crewsResult.error || authorsResult.error) {
        setWarning('Some updates could not be retrieved. Only available records are shown.');
      }
    } catch {
      setWarning('We could not refresh the Living World. Try again.');
    } finally {
      setLoading(false);
    }
  }, [db, user?.id]);

  useEffect(() => { void refresh(); }, [refresh]);
  const filtered = useMemo(() => filterWorldEvents(events, tab, selectedCity, nearby), [events, tab, selectedCity, nearby]);
  const cityLabel = selectedCity?.split('-').map(word => word[0]?.toUpperCase() + word.slice(1)).join(' ') || 'Virginia';
  const nextRun = events.find(event => event.category === 'runs' && (!selectedCity || (event.title + ' ' + event.place + ' ' + event.description).toLowerCase().includes(selectedCity.replace(/-/g, ' ')))) ||
    events.find(event => event.category === 'runs');

  return <main className="rch-living-world min-h-screen pb-24" aria-label="RCH Living World">
    <div className="rch-world-wrap">
      <header className="rch-world-hero">
        <div className="rch-world-hero-body">
          <span className="rch-world-kicker"><FaBolt aria-hidden="true"/> RCH LIVING WORLD · VIRGINIA BASKETBALL</span>
          <h1>THE GAME<br/><em>NEVER STOPS.</em></h1>
          <p>Real courts. Real crews. Real achievements. Follow the stories unfolding across Virginia, then make your next move.</p>
          <div className="rch-world-hero-actions">
            <Link href="/runs" className="rch-world-primary"><FaBasketball aria-hidden="true"/> Find your next Run <FaArrowRight aria-hidden="true"/></Link>
            <Link href="/discover" className="rch-world-secondary"><FaLocationDot aria-hidden="true"/> Explore Virginia</Link>
          </div>
        </div>
        <div className="rch-world-hero-art" aria-hidden="true">
          <div className="rch-world-ring ring-outer"/><div className="rch-world-ring ring-inner"/>
          <div className="rch-world-monogram">R</div>
          <div className="rch-world-art-caption">MAKE YOUR MARK.</div>
        </div>
      </header>

      <nav className="rch-world-jump" aria-label="Living World destinations">
        <Link href="/crews"><FaPeopleGroup/> My crew <FaArrowRight/></Link>
        <Link href="/badges"><FaMedal/> Badge vault <FaArrowRight/></Link>
        <Link href="/rep"><FaGift/> REP rewards <FaArrowRight/></Link>
        <Link href="/commonwealth"><FaCrown/> Commonwealth Cup <FaArrowRight/></Link>
      </nav>

      <div className="rch-world-columns">
        <div className="rch-world-main-column">
          <section className="rch-world-feed" aria-labelledby="world-feed-heading">
            <div className="rch-world-section-head">
              <div><span className="rch-world-eyebrow">AROUND THE COMMONWEALTH</span><h2 id="world-feed-heading">World Pulse<span>.</span></h2><p>Recorded takeovers, member highlights, and upcoming runs. No simulated wins or artificial activity.</p></div>
              <button type="button" className="rch-world-refresh" onClick={() => void refresh()} disabled={loading} aria-label="Refresh latest RCH activity"><FaArrowRotateRight aria-hidden="true"/> {loading ? 'Loading…' : 'Refresh'}</button>
            </div>
            <div className="rch-world-feed-controls">
              <div className="rch-world-tabs" role="group" aria-label="Activity type">
                {tabs.map(item => <button key={item.key} type="button" aria-pressed={tab === item.key} className={tab === item.key ? 'selected' : ''} onClick={() => setTab(item.key)}>{item.title}</button>)}
              </div>
              <div className="rch-world-geo">
                <span><FaLocationDot aria-hidden="true"/> {cityLabel}</span>
                {selectedCity && <button type="button" aria-pressed={nearby} onClick={() => setNearby(!nearby)}>{nearby ? 'Nearby' : 'Statewide'} <span aria-hidden="true">⇄</span></button>}
                {!selectedCity && <Link href="/settings/discovery">Choose my area <FaArrowRight aria-hidden="true"/></Link>}
              </div>
            </div>
            {warning && <p className="rch-world-warning" role="status">{warning}</p>}
            <div className="rch-world-stream" aria-busy={loading}>
              {loading && events.length === 0 && <p className="rch-world-empty" role="status">Loading real activity from RCH…</p>}
              {!loading && filtered.length === 0 && <div className="rch-world-empty">
                <strong>{nearby ? 'No updates in this area yet.' : 'No matching activity yet.'}</strong>
                <p>Try another category or discover upcoming basketball opportunities across Virginia.</p>
                <div className="rch-world-empty-actions">
                  {nearby && <button type="button" onClick={() => setNearby(false)}>View all Virginia</button>}
                  <Link href="/runs">Browse Runs <FaArrowRight aria-hidden="true"/></Link>
                </div>
              </div>}
              {filtered.slice(0, 30).map(event => <WorldEventCard key={event.id} event={event}/>)}
            </div>
            <p className="rch-world-footnote"><FaShieldHalved aria-hidden="true"/> Posts are community submissions, not verified game results. Territory transfers depend on confirmed match outcomes. Upcoming events can change; review the event page before attending.</p>
          </section>
        </div>
        <aside className="rch-world-side-column" aria-label="Your basketball journey">
          <section className="rch-world-panel">
            <span className="rch-world-eyebrow">YOUR PLAYER CARD</span>
            <h2>Build your legacy.</h2>
            {authLoading ? <p className="rch-world-muted">Checking your session…</p> : user ? <>
              <div className="rch-world-player">
                <div><span>Social level</span><strong>{stats.level === null ? '—' : stats.level}</strong><small>{stats.xp === null ? 'XP unavailable' : stats.xp.toLocaleString() + ' social XP'}</small></div>
                <div><span>Career wallet earnings</span><strong>{stats.earned === null ? '—' : stats.earned.toLocaleString()}</strong><small>Lifetime earned REP</small></div>
              </div>
              <div className="rch-world-balance"><div><span>Spendable REP</span><strong>{stats.wallet === null ? '—' : stats.wallet.toLocaleString()}</strong></div><FaBolt aria-hidden="true"/></div>
              <p className="rch-world-muted">{stats.badges === null ? 'Badge data unavailable' : stats.badges + ' verified Run achievement badges'} · Your earned achievements and competition rankings are not reduced when you redeem REP.</p>
              <div className="rch-world-side-actions"><Link href="/badges">See badges <FaArrowRight/></Link><Link href="/rep">Spend REP <FaArrowRight/></Link></div>
            </> : <>
              <p className="rch-world-muted">Watch public achievements now. Create a free profile to develop your own identity, badge collection, crew history and REP wallet.</p>
              <Link className="rch-world-signup" href="/auth/sign-up">Create my free profile <FaArrowRight/></Link>
            </>}
          </section>

          <section className="rch-world-panel rch-world-next">
            <span className="rch-world-eyebrow">YOUR NEXT MOVE</span>
            <h2>{nextRun ? 'The court is calling.' : 'Start a new chapter.'}</h2>
            <p>{nextRun ? nextRun.title + ' · ' + nextRun.place + ' · ' + dateLabel(nextRun.occurredAt) + ' ET' : 'Find an open Run, create a crew, or explore a new court. There is no daily-login penalty.'}</p>
            <Link href={nextRun?.href || '/runs'}>{nextRun ? 'View available Run' : 'Find basketball'} <FaArrowRight/></Link>
          </section>
          <section className="rch-world-panel rch-world-principles">
            <span className="rch-world-eyebrow">THE RULES</span>
            <h2>Respect the game.</h2>
            <p>Verified basketball results earn court status. Content promotion and cosmetics never purchase wins, rankings or trophies. Promoted content is always identified.</p>
          </section>
        </aside>
      </div>
    </div>
  </main>;
}

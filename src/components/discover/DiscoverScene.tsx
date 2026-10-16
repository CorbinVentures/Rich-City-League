'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  FaArrowRight, FaArrowUpRightFromSquare, FaBasketball, FaBookmark, FaCalendarDays,
  FaCompass, FaDumbbell, FaLocationDot, FaMagnifyingGlass, FaPeopleGroup, FaTrophy
} from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { cityForText } from '@/lib/virginia-world';
import { GravityLocationPicker } from '@/components/GravityLocationPicker';
import { useGravityLocation } from '@/hooks/useGravityLocation';
import {
  classifySceneOpportunity, sceneMatchesWhen,
  type SceneCategory, type SceneGoal, type SceneWhen
} from '@/lib/discover-scene';
import { isGravityIntent, rankGravityCandidates, type GravityCategory, type GravityIntent } from '@/lib/rch-gravity';
import './the-scene.css';

type Opportunity = {
  id: string; title: string; description: string; category: SceneCategory; city: string;
  venue: string; startsAt: string; href: string; featured: boolean; organizer?: string;
  verified?: boolean; full?: boolean;
};
type RunRow = {
  id: string; title: string; description: string | null; location: string | null; location_slug: string | null;
  starts_at: string; run_type: string; status: string;
};
type EventRow = {
  id: string; slug: string; title: string; description: string | null; event_type: string;
  city: string | null; venue_name: string | null; starts_at: string;
  organization_id: string; is_featured: boolean;
};
type OrganizationRow = { id: string; name: string; is_verified: boolean };
type LocationRow = {slug: string; name: string; locality: string};

const CATEGORIES: {id: SceneCategory; title: string; caption: string; icon: typeof FaBasketball}[] = [
  { id: 'runs', title: 'Open runs', caption: 'Find your next game', icon: FaBasketball },
  { id: 'tournaments', title: 'Tournaments', caption: 'Play to win', icon: FaTrophy },
  { id: 'training', title: 'Training', caption: 'Build your game', icon: FaDumbbell },
  { id: 'leagues', title: 'Leagues', caption: 'Find your team', icon: FaPeopleGroup },
  { id: 'aau', title: 'AAU tryouts', caption: 'Find a program', icon: FaCompass },
  { id: 'pro', title: 'Pro tryouts', caption: 'Pursue the next level', icon: FaArrowUpRightFromSquare },
];
const CATEGORY_LABELS: Record<SceneCategory, string> = {
  runs: 'Open run', tournaments: 'Tournament', training: 'Training', leagues: 'League',
  aau: 'AAU tryout', pro: 'Pro tryout', tryouts: 'Tryout', events: 'Basketball event'
};
const GOALS: {id: SceneGoal; label: string; detail: string}[] = [
  {id:'hoop', label:'Find a game', detail:'Runs and local competition'},
  {id:'compete', label:'Compete', detail:'Tournaments and leagues'},
  {id:'improve', label:'Get better', detail:'Training and clinics'},
  {id:'noticed', label:'Get noticed', detail:'Tryouts and showcases'}
];
const WHEN: {id: SceneWhen; label: string}[] = [
  {id:'any', label:'Upcoming'}, {id:'today', label:'Today'},
  {id:'weekend', label:'This weekend'}, {id:'week', label:'Next 7 days'}
];
const CITIES = ['Richmond','Petersburg','Charlottesville','Norfolk','Virginia Beach','Newport News','Hampton','Alexandria','Fairfax','Roanoke'];
const GRAVITY_CATEGORY: Record<SceneCategory,GravityCategory> = {
  runs:'run', tournaments:'tournament', training:'training',
  leagues:'league', aau:'tryout', pro:'tryout', tryouts:'tryout', events:'event'
};
const GOAL_STORAGE = 'rch-scene-goal-v1';
const SAVED_STORAGE = 'rch-scene-saved-v1';

function readableDate(iso: string) {
  const date = new Date(iso);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('en-US', {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})
    : 'Date to be confirmed';
}
function cityMatches(actual: string, chosen: string) {
  return actual.toLocaleLowerCase() === chosen.toLocaleLowerCase();
}

export default function DiscoverScene() {
  const {location} = useGravityLocation();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SceneCategory | 'all'>('all');
  const [city, setCity] = useState('all');
  const [when, setWhen] = useState<SceneWhen>('any');
  const [goal, setGoal] = useState<SceneGoal>('hoop');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sortPersonalized, setSortPersonalized] = useState(true);
  const [sharedIntent, setSharedIntent] = useState<GravityIntent|null>(null);

  useEffect(() => {
    try {
      const storedIntent = window.localStorage.getItem('rch-next-move-intent-v1');
      if (isGravityIntent(storedIntent)) setSharedIntent(storedIntent);
      const storedGoal = window.localStorage.getItem(GOAL_STORAGE);
      if (GOALS.some(item => item.id === storedGoal)) setGoal(storedGoal as SceneGoal);
      const storedIds = JSON.parse(window.localStorage.getItem(SAVED_STORAGE) || '[]');
      if (Array.isArray(storedIds)) setSavedIds(storedIds.filter((id): id is string => typeof id === 'string').slice(0, 200));
    } catch { /* private browsing may deny storage; filtering still works */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const db = getSupabaseClient() as any;
      if (!db) {
        if (!cancelled) {setLoadError('The opportunity feed is unavailable right now.'); setLoading(false);}
        return;
      }
      const now = new Date().toISOString();
      try {
        const [runsResponse, eventsResponse] = await Promise.all([
          db.from('runs').select('id,title,description,location,location_slug,starts_at,run_type,status')
            .in('status', ['open','full']).gte('starts_at', now).order('starts_at').limit(250),
          db.from('network_events')
            .select('id,slug,title,description,event_type,city,venue_name,starts_at,organization_id,is_featured')
            .eq('status','published').eq('state','VA').gte('starts_at',now).order('starts_at').limit(250)
        ]);
        if (runsResponse.error && eventsResponse.error) throw new Error('Both opportunity sources failed');
        const runs = (runsResponse.data || []) as RunRow[];
        const events = (eventsResponse.data || []) as EventRow[];
        const locationSlugs = [...new Set(runs.map(item => item.location_slug).filter((value): value is string => !!value))];
        const organizationIds = [...new Set(events.map(item => item.organization_id).filter(Boolean))];
        const [locationsResponse, organizationsResponse] = await Promise.all([
          locationSlugs.length ? db.from('basketball_locations').select('slug,name,locality').in('slug', locationSlugs.slice(0,250)) : Promise.resolve({data:[]}),
          organizationIds.length ? db.from('network_organizations').select('id,name,is_verified').eq('status','active').in('id', organizationIds.slice(0,250)) : Promise.resolve({data:[]})
        ]);
        const locations = new Map<string,LocationRow>(((locationsResponse.data || []) as LocationRow[]).map(item => [item.slug,item]));
        const organizations = new Map<string,OrganizationRow>(((organizationsResponse.data || []) as OrganizationRow[]).map(item => [item.id,item]));
        const result: Opportunity[] = [];
        for (const run of runs) {
          const place = run.location_slug ? locations.get(run.location_slug) : undefined;
          const knownCity = cityForText(place?.locality || run.location || '');
          result.push({
            id:'run:'+run.id, title:run.title, description:run.description || '',
            category:classifySceneOpportunity('run', run.run_type, run.title),
            city:place?.locality || knownCity?.name || 'Virginia',
            venue:place?.name || run.location || 'View run details',
            startsAt:run.starts_at, href:'/runs/'+encodeURIComponent(run.id),
            featured:false, full:run.status==='full'
          });
        }
        for (const event of events) {
          // Organization pages require an active organizer, so don't surface dead destinations.
          const org = organizations.get(event.organization_id);
          if (!org) continue;
          result.push({
            id:'event:'+event.id, title:event.title, description:event.description || '',
            category:classifySceneOpportunity('event', event.event_type, event.title),
            city:event.city || 'Virginia', venue:event.venue_name || 'View event details',
            startsAt:event.starts_at, href:['','network','events',encodeURIComponent(event.slug)].join('/'),
            featured:!!event.is_featured, organizer:org.name, verified:!!org.is_verified
          });
        }
        if (!cancelled) {
          setItems(result);
          if (runsResponse.error || eventsResponse.error || locationsResponse.error || organizationsResponse.error) {
            setLoadError('Some listings could not be loaded. Results may be incomplete.');
          }
        }
      } catch {
        if (!cancelled) setLoadError('Upcoming opportunities could not be loaded. Please try again shortly.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {cancelled = true;};
  }, []);

  const cities = useMemo(() => [...new Set(items.map(item => item.city).filter(value => value !== 'Virginia'))]
    .sort((a,b) => a.localeCompare(b)), [items]);
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const filtered = items
      .filter(item => category === 'all' || item.category === category)
      .filter(item => city === 'all' || cityMatches(item.city,city))
      .filter(item => sceneMatchesWhen(item.startsAt,when))
      .filter(item => !savedOnly || savedIds.includes(item.id))
      .filter(item => !needle || [item.title,item.description,item.city,item.venue,item.organizer || '',CATEGORY_LABELS[item.category]]
        .some(value => value.toLocaleLowerCase().includes(needle)));
    // Soonest first always remains available and never uses personalization.
    if (!sortPersonalized) return filtered.sort((a,b) => a.startsAt.localeCompare(b.startsAt));

    // The same engine ranks opportunity, feed and mission candidates. Preserve
    // the original opportunity objects so their card metadata remains intact.
    const priority = rankGravityCandidates(filtered.map(item => ({
      id:item.id, category:GRAVITY_CATEGORY[item.category],
      title:item.title, keywords:item.description,
      city:item.city, startsAt:item.startsAt,
      unavailable:item.full, isSaved:savedIds.includes(item.id), isVerified:item.verified
    })), {intent:sharedIntent,goal,cityId:location.cityId,radiusMiles:location.radiusMiles});
    const order = new Map(priority.map((item,index) => [item.id,index]));
    // Preserve full runs as clearly labeled listings rather than silently
    // hiding them. Available opportunities still come first.
    return filtered.sort((a,b) => Number(Boolean(a.full))-Number(Boolean(b.full))
      || (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity)
      || a.startsAt.localeCompare(b.startsAt));
  }, [items,category,city,when,query,goal,sharedIntent,sortPersonalized,savedOnly,savedIds,location.cityId,location.radiusMiles]);

  const pulse = useMemo(() => [...items].filter(item => sceneMatchesWhen(item.startsAt,'any'))
    .sort((a,b) => a.startsAt.localeCompare(b.startsAt)).slice(0,3),[items]);
  const spotlight = useMemo(() => [...items].filter(item => sceneMatchesWhen(item.startsAt,'any'))
    .sort((a,b) => Number(b.featured)-Number(a.featured) || a.startsAt.localeCompare(b.startsAt))[0], [items]);

  function chooseGoal(next: SceneGoal) {
    setGoal(next);
    setSortPersonalized(true);
    try {window.localStorage.setItem(GOAL_STORAGE,next);} catch {}
  }
  function toggleSave(id: string) {
    const next = savedIds.includes(id) ? savedIds.filter(value => value !== id) : [...savedIds,id];
    setSavedIds(next);
    try {window.localStorage.setItem(SAVED_STORAGE,JSON.stringify(next));} catch {}
  }
  function selectCategory(next: SceneCategory | 'all') {
    setCategory(next);
    document.getElementById('scene-feed')?.scrollIntoView({block:'start',behavior:'smooth'});
  }
  function selectCity(next: string) {
    setCity(next);
    setCategory('all');
    document.getElementById('scene-feed')?.scrollIntoView({block:'start',behavior:'smooth'});
  }
  function clearFilters() {
    setCategory('all');setCity('all');setWhen('any');setSavedOnly(false);setQuery('');
  }

  return <main className="rch-scene-page">
    <div className="rch-scene-container">
      <section className="rch-scene-hero" aria-labelledby="scene-title">
        <div className="rch-scene-hero-copy">
          <p className="rch-scene-eyebrow"><span className="rch-scene-orbit" aria-hidden="true"/> RICH CITY HOOPS / THE SCENE</p>
          <h1 id="scene-title">Find your <em>next play.</em></h1>
          <p>Runs, tournaments, training, leagues and tryouts — your basketball world across Virginia, all in one place.</p>
          <div className="rch-scene-hero-links">
            <a href="#scene-categories" className="rch-scene-hero-action">Explore opportunities <FaArrowRight aria-hidden="true"/></a>
            <Link href="/discover/radar" className="rch-scene-hero-radar"><FaCompass aria-hidden="true"/> Open Court Radar</Link>
          </div>
        </div>
        <div className="rch-scene-hero-visual" aria-hidden="true">
          <span className="rch-scene-visual-circle rch-scene-circle-one"/>
          <span className="rch-scene-visual-circle rch-scene-circle-two"/>
          <span className="rch-scene-visual-circle rch-scene-circle-three"/>
          <FaBasketball className="rch-scene-visual-ball"/>
          <span className="rch-scene-visual-label">VIRGINIA / YOUR COURT IS CALLING</span>
        </div>
      </section>

      <section className="rch-scene-searchbar" aria-label="Search basketball opportunities">
        <label className="rch-scene-search-input"><FaMagnifyingGlass aria-hidden="true"/>
          <span className="sr-only">Search Virginia basketball opportunities</span>
          <input type="search" value={query} onChange={event => setQuery(event.target.value)}
            placeholder="Search a run, tryout, city, organizer..." />
        </label>
        <label className="rch-scene-location-input"><FaLocationDot aria-hidden="true"/>
          <span className="sr-only">Choose a Virginia city</span>
          <select value={city} onChange={event => setCity(event.target.value)}>
            <option value="all">All Virginia</option>
            {cities.map(name => <option value={name} key={name}>{name}</option>)}
          </select>
        </label>
      </section>

      <GravityLocationPicker className="mb-5" />
      <section id="scene-categories" className="rch-scene-section">
        <div className="rch-scene-section-title">
          <div><span className="rch-scene-kicker">YOUR NEXT MOVE</span><h2>What brings you to the court?</h2></div>
          <p>Jump straight into what matters to you.</p>
        </div>
        <div className="rch-scene-categories">
          {CATEGORIES.map(item => {
            const Icon = item.icon;
            return <button key={item.id} type="button" className={'rch-scene-category'+(category === item.id?' is-active':'')}
              onClick={() => selectCategory(category === item.id ? 'all' : item.id)} aria-pressed={category === item.id}>
              <span className="rch-scene-category-icon"><Icon aria-hidden="true"/></span>
              <strong>{item.title}</strong><small>{item.caption}</small>
              <FaArrowRight className="rch-scene-category-arrow" aria-hidden="true"/>
            </button>;
          })}
        </div>
      </section>

      <section className="rch-scene-path" aria-label="Personalize your discovery">
        <div className="rch-scene-path-head"><span className="rch-scene-kicker">MY PATH</span><strong>Your game. Your goals.</strong><p>Choose what you want next. We’ll prioritize related opportunities on this device.</p></div>
        <div className="rch-scene-goals" role="group" aria-label="Your basketball goal">
          {GOALS.map(item => <button type="button" aria-pressed={goal === item.id} key={item.id}
            className={goal === item.id ? 'is-active' : ''} onClick={() => chooseGoal(item.id)}
            title={item.detail}>{item.label}</button>)}
        </div>
      </section>

      <section className="rch-scene-content" id="scene-feed">
        <div className="rch-scene-main-column">
          <div className="rch-scene-section-title rch-scene-feed-title">
            <div><span className="rch-scene-kicker">OPPORTUNITY FEED</span><h2>The latest in your scene.</h2></div>
            {!loading&&<p aria-live="polite">{visible.length} {visible.length===1?'opportunity':'opportunities'}</p>}
          </div>
          <div className="rch-scene-toolbar">
            <div className="rch-scene-when" role="group" aria-label="When to play">
              {WHEN.map(item => <button key={item.id} type="button" aria-pressed={when === item.id}
                className={when===item.id?'is-active':''} onClick={() => setWhen(item.id)}>{item.label}</button>)}
            </div>
            <div className="rch-scene-toolbar-secondary">
              <button type="button" aria-pressed={sortPersonalized} onClick={() => setSortPersonalized(value => !value)}
                className={sortPersonalized?'is-active':''}>{sortPersonalized?'For you':'Soonest first'}</button>
              <button type="button" aria-pressed={savedOnly} className={savedOnly?'is-active':''}
                onClick={() => setSavedOnly(value => !value)}><FaBookmark aria-hidden="true"/> Saved</button>
            </div>
          </div>
          {category!=='all'&&<div className="rch-scene-active-filter">Showing {CATEGORY_LABELS[category]} opportunities <button type="button" onClick={()=>setCategory('all')}>Show all ×</button></div>}
          {loadError&&<p className="rch-scene-message rch-scene-error" role="status">{loadError}</p>}
          {loading ? <div className="rch-scene-message" role="status">Finding upcoming basketball opportunities across Virginia…</div>
            : visible.length ? <div className="rch-scene-cards">
              {visible.map(item => <article key={item.id} className="rch-scene-card">
                <div className="rch-scene-card-top">
                  <span className="rch-scene-card-kind">{CATEGORY_LABELS[item.category]}</span>
                  {item.featured&&<span className="rch-scene-card-featured">Featured</span>}
                  {item.full&&<span className="rch-scene-card-full">Full</span>}
                  <button type="button" className={'rch-scene-save'+(savedIds.includes(item.id)?' is-saved':'')}
                    onClick={() => toggleSave(item.id)}
                    aria-label={(savedIds.includes(item.id)?'Remove saved opportunity: ':'Save opportunity on this device: ')+item.title}
                    title="Saved opportunities stay on this device"><FaBookmark aria-hidden="true"/></button>
                </div>
                <h3><Link href={item.href}>{item.title}</Link></h3>
                {item.organizer&&<p className="rch-scene-organizer">{item.organizer}{item.verified&&<span className="rch-scene-verified"> · Verified organization</span>}</p>}
                {item.description&&<p className="rch-scene-description">{item.description}</p>}
                <div className="rch-scene-meta">
                  <span><FaCalendarDays aria-hidden="true"/>{readableDate(item.startsAt)}</span>
                  <span><FaLocationDot aria-hidden="true"/>{item.venue}{item.city&&item.city!=='Virginia'?' · '+item.city:''}</span>
                </div>
                <Link href={item.href} className="rch-scene-card-action">View opportunity <FaArrowRight aria-hidden="true"/></Link>
              </article>)}
            </div> : <div className="rch-scene-empty">
              <FaCompass aria-hidden="true"/>
              <h3>{savedOnly?'Nothing saved yet':'No matching opportunities right now'}</h3>
              <p>{savedOnly?'Tap the bookmark on a listing to save it to this device.':'Try another category, date or city. As organizers publish new opportunities, they’ll appear here.'}</p>
              <button type="button" onClick={clearFilters}>Explore all opportunities <FaArrowRight aria-hidden="true"/></button>
            </div>}
          <p className="rch-scene-footnote">Listings come from published RCH Network events and upcoming RCH runs. Verify fees, age eligibility and registration details with the organizer before attending. Saved items stay on this device; saving does not register you or send alerts.</p>
        </div>
        <aside className="rch-scene-rail" aria-label="Explore more Virginia basketball">
          <div className="rch-scene-rail-card rch-scene-pulse">
            <p className="rch-scene-kicker">VA PULSE</p>
            <h2>Coming up across Virginia</h2>
            {pulse.length ? <ol>{pulse.map(item => <li key={item.id}>
              <span className="rch-scene-pulse-date">{readableDate(item.startsAt)}</span>
              <Link href={item.href}>{item.title} <FaArrowRight aria-hidden="true"/></Link>
              <small>{item.city}</small>
            </li>)}</ol> : <p className="rch-scene-rail-empty">{loading?'Finding published events…':'New activity will appear here as organizers publish it.'}</p>}
          </div>
          {spotlight&&<div className="rch-scene-rail-card rch-scene-spotlight">
            <p className="rch-scene-kicker">OPPORTUNITY SPOTLIGHT</p>
            <span>{CATEGORY_LABELS[spotlight.category]}</span>
            <h2>{spotlight.title}</h2>
            <p><FaCalendarDays aria-hidden="true"/> {readableDate(spotlight.startsAt)}</p>
            <Link href={spotlight.href}>Explore opportunity <FaArrowRight aria-hidden="true"/></Link>
          </div>}
          <div className="rch-scene-rail-card">
            <p className="rch-scene-kicker">CITY PORTALS</p>
            <h2>Explore your side of Virginia</h2>
            <div className="rch-scene-city-list">
              {CITIES.map(name => <button type="button" key={name} onClick={() => selectCity(name)}>
                <FaLocationDot aria-hidden="true"/>{name}<FaArrowRight aria-hidden="true"/>
              </button>)}
            </div>
          </div>
          <Link href="/discover/radar" className="rch-scene-radar-card">
            <FaCompass aria-hidden="true"/><span><strong>Court Radar</strong><small>Take discovery to the Virginia map</small></span>
            <FaArrowRight aria-hidden="true"/>
          </Link>
          <Link href="/runs?create=1" className="rch-scene-create">Have a run to share? <strong>Host a run <FaArrowRight aria-hidden="true"/></strong></Link>
        </aside>
      </section>
    </div>
  </main>;
}

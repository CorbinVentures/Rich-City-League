'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaArrowRight, FaBasketball, FaCompass, FaPlay, FaUsers } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { useGravityLocation } from '@/hooks/useGravityLocation';
import { VIRGINIA_CITIES } from '@/lib/virginia-world';
import {
  isStarterIntent, starterDestination, starterPreview, STARTER_ACTIONS,
  type StarterIntent, type StarterOpportunity,
} from '@/lib/rch-discovery-starter';

const INTENT_KEY = 'rch-next-move-intent-v1';
const COMPLETED_KEY = 'rch-discovery-started-v1';

type Props = { mode: 'web' | 'pwa'; opportunities?: StarterOpportunity[] };
const INTENT_ICONS = { play: FaBasketball, watch: FaPlay, connect: FaUsers };
const INTENT_ORDER: StarterIntent[] = ['play', 'watch', 'connect'];

export function RCHDiscoveryStarter({ mode, opportunities = [] }: Props) {
  const { location, city, chooseCity, statewide } = useGravityLocation();
  const { user, loading } = useAuth();
  const [intent, setIntent] = useState<StarterIntent>('play');
  const [completed, setCompleted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(INTENT_KEY);
      if (isStarterIntent(saved)) setIntent(saved);
      setCompleted(window.localStorage.getItem(COMPLETED_KEY) === '1');
    } catch { /* Full experience is available when local storage is blocked. */ }
    setReady(true);
  }, []);

  function chooseIntent(next: StarterIntent) {
    setIntent(next);
    try { window.localStorage.setItem(INTENT_KEY, next); } catch {}
  }
  function markStarted() {
    setCompleted(true);
    try {
      window.localStorage.setItem(COMPLETED_KEY, '1');
      window.localStorage.setItem(INTENT_KEY, intent);
    } catch {}
  }

  // The installed app already offers its regular feed and ActionGuide.
  // Do not repeatedly interrupt members after they take their first step.
  if (!ready || (mode === 'pwa' && completed)) return null;

  const action = STARTER_ACTIONS[intent];
  const destination = starterDestination(intent, mode);
  const nearby = starterPreview(opportunities, location.cityId);
  const locationLabel = city ? city.name : 'Virginia';
  const signupHref = '/auth/sign-up?next=' + encodeURIComponent(destination);

  return (
    <section className={'rch-starter rch-starter-' + mode} aria-label="Explore Virginia basketball your way">
      <div className="rch-starter-inner">
        <div className="rch-starter-intro">
          <p className="rch-starter-kicker"><FaCompass aria-hidden="true"/> START WITH YOUR BASKETBALL WORLD</p>
          <h2>{completed ? 'YOUR CITY. YOUR NEXT MOVE.' : 'FIND YOUR PLACE IN THE GAME.'}</h2>
          <p>Pick a city and what you want to do. Browse freely before deciding to join—no account or location permission needed to explore.</p>
        </div>
        <div className="rch-starter-controls">
          <label htmlFor={'rch-starter-city-' + mode}>YOUR CITY</label>
          <select id={'rch-starter-city-' + mode} value={location.cityId ?? ''} onChange={event => event.target.value ? chooseCity(event.target.value) : statewide()}>
            <option value="">All Virginia</option>
            {[...VIRGINIA_CITIES].sort((a, b) => a.name.localeCompare(b.name)).map(item => (
              <option value={item.id} key={item.id}>{item.name}</option>
            ))}
          </select>
          <span>Only your selected city is saved on this device. Change it anytime.</span>
        </div>
        <fieldset className="rch-starter-intents">
          <legend>I'M HERE TO</legend>
          <div className="rch-starter-options">
            {INTENT_ORDER.map(id => {
              const Icon = INTENT_ICONS[id];
              return <button type="button" key={id} aria-pressed={intent === id} onClick={() => chooseIntent(id)} className={intent === id ? 'selected' : ''}>
                <Icon aria-hidden="true"/>{STARTER_ACTIONS[id].label}
              </button>;
            })}
          </div>
        </fieldset>
        <div className="rch-starter-result" aria-live="polite">
          <div>
            <span>YOUR STARTING POINT · {locationLabel.toUpperCase()}</span>
            <h3>{action.title}</h3>
            <p>{action.description}</p>
          </div>
          <div className="rch-starter-actions">
            <Link className="rch-starter-primary" href={destination} onClick={markStarted}>{action.button} <FaArrowRight aria-hidden="true"/></Link>
            {loading ? null : user
              ? <Link className="rch-starter-secondary" href="/my-hoops" onClick={markStarted}>My Basketball</Link>
              : <Link className="rch-starter-secondary" href={signupHref} onClick={markStarted}>Create Free Profile</Link>}
          </div>
          {mode === 'web' && (nearby.length > 0 || location.cityId) && (
            <div className="rch-starter-preview" aria-label="Scheduled activity preview">
              {nearby.length ? <>
                <span>UPCOMING IN {locationLabel.toUpperCase()} {location.cityId ? 'AREA' : ''} · FROM THE SITE PREVIEW</span>
                {nearby.map(item => <Link key={item.id} href={item.href} onClick={markStarted}>
                  <strong>{item.title}</strong><small>{item.type} · {item.location}</small><FaArrowRight aria-hidden="true"/>
                </Link>)}
              </> : <p>No nearby listings in this short preview. <Link href="/runs" onClick={markStarted}>Explore all available runs <FaArrowRight aria-hidden="true"/></Link></p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

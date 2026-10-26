'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaCheck, FaCrosshairs, FaLocationDot, FaMagnifyingGlass } from 'react-icons/fa6';
import { useGravityLocation } from '@/hooks/useGravityLocation';
import { getSupabaseClient } from '@/lib/supabase';
import { milesBetween, VIRGINIA_CITIES } from '@/lib/virginia-world';

export type CrewHomeCourt = {
  slug: string;
  name: string;
  locality: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  access_type: string | null;
  verification_status: string | null;
  distance_miles: number | null;
};

type Coordinates = { lat: number; lon: number };
type Props = { selected: CrewHomeCourt | null; onSelect: (court: CrewHomeCourt) => void };

/**
 * Crew identity may use any active Virginia court in the RCH directory.
 * GPS is strictly opt-in; exact coordinates are never saved to user settings.
 * Official Commonwealth Cup challenge venues stay separately restricted.
 */
export function CrewHomeCourtPicker({ selected, onSelect }: Props) {
  const db = useMemo(() => getSupabaseClient(true) as any, []);
  const { city: preferredCity } = useGravityLocation();
  const [cityId, setCityId] = useState('');
  const [devicePoint, setDevicePoint] = useState<Coordinates | null>(null);
  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState(25);
  const [results, setResults] = useState<CrewHomeCourt[]>([]);
  const [visible, setVisible] = useState(6);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');

  const selectedCity = VIRGINIA_CITIES.find(item => item.id === cityId) || (cityId ? null : preferredCity);
  const point = devicePoint || (selectedCity ? { lat: selectedCity.lat, lon: selectedCity.lon } : null);
  const latitude = point?.lat ?? null;
  const longitude = point?.lon ?? null;
  const searchTerm = query.trim();
  const canSearch = Boolean(point) || searchTerm.length >= 2;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!canSearch) { setResults([]); setBusy(false); setError(''); return; }
      if (!db) { setError('Court search is unavailable right now.'); setBusy(false); return; }
      setBusy(true);
      setError('');
      try {
        // Named court, city, and ZIP searches are statewide; empty searches rank by distance.
        const useDistance = searchTerm.length < 2;
        const { data, error: lookupError } = await db.rpc('search_basketball_locations', {
          p_lat: useDistance ? latitude : null,
          p_lon: useDistance ? longitude : null,
          p_radius_miles: radius,
          p_search: searchTerm,
          p_limit: 48,
          p_offset: 0,
        });
        if (lookupError) throw lookupError;
        if (!cancelled) {
          setResults((data || []) as CrewHomeCourt[]);
          setVisible(6);
        }
      } catch {
        if (!cancelled) { setResults([]); setError('Could not load courts. Try a different city or search again.'); }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, searchTerm ? 280 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [db, canSearch, searchTerm, latitude, longitude, radius]);

  const useMyLocation = () => {
    setLocationMessage('');
    if (!navigator.geolocation) {
      setLocationMessage('Location unavailable. Choose a city or search by ZIP.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setDevicePoint({ lat: coords.latitude, lon: coords.longitude });
        setCityId('');
        setQuery('');
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationMessage('Location not shared. Choose a city or search by ZIP.');
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 },
    );
  };

  const chooseCity = (nextId: string) => {
    setCityId(nextId);
    setDevicePoint(null);
    setQuery('');
    setLocationMessage('');
  };
  const distanceFor = (item: CrewHomeCourt) => {
    if (typeof item.distance_miles === 'number' && Number.isFinite(item.distance_miles))
      return item.distance_miles;
    if (point && typeof item.latitude === 'number' && typeof item.longitude === 'number')
      return milesBetween(point, { lat: item.latitude, lon: item.longitude });
    return null;
  };

  return <section aria-label="Choose a nearby crew home court" className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={useMyLocation} disabled={locating}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#ff768c] bg-[#50202a] px-3 text-xs font-black text-white disabled:opacity-50">
        <FaCrosshairs aria-hidden="true"/>{locating ? 'Locating…' : 'Near me'}
      </button>
      <select value={devicePoint ? '' : (cityId || preferredCity?.id || '')}
        onChange={event => chooseCity(event.target.value)}
        aria-label="Choose a Virginia city" className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#666a70] bg-[#202326] px-3 text-sm text-white">
        <option value="">Choose city</option>
        {VIRGINIA_CITIES.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
      </select>
      {point && <select value={radius} onChange={event => setRadius(Number(event.target.value))}
        aria-label="Distance radius" className="min-h-11 rounded-lg border border-[#666a70] bg-[#202326] px-2 text-xs font-bold text-white">
        {[10,25,50,100].map(miles => <option key={miles} value={miles}>{miles} mi</option>)}
      </select>}
    </div>
    <label className="flex min-h-12 items-center gap-2 rounded-lg border border-[#666a70] bg-[#202326] px-3 focus-within:border-[#ff768c]">
      <FaMagnifyingGlass className="shrink-0 text-[#c0c1c7]" aria-hidden="true"/>
      <input type="search" aria-label="Search courts by name, city, or ZIP"
        autoComplete="off" value={query} onChange={event => setQuery(event.target.value)}
        placeholder="Court, park, city or ZIP"
        className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white placeholder:text-[#aaaeb7] focus:outline-none"/>
    </label>
    {selected && <div role="status" className="flex items-center gap-2 rounded-lg border border-[#ff768c] bg-[#50202a] px-3 py-3">
      <FaCheck className="shrink-0 text-[#ff8ba0]" aria-hidden="true"/>
      <div className="min-w-0 flex-1"><strong className="block truncate text-sm">{selected.name}</strong>
        <span className="text-xs text-[#e3c5cc]">Your selected home court · {selected.locality || 'Virginia'}</span></div>
    </div>}
    {locationMessage && <p role="status" className="text-xs text-[#ffd8a2]">{locationMessage}</p>}
    {busy && <p role="status" className="py-3 text-sm text-[#d0d1d4]">Finding courts…</p>}
    {error && <p role="alert" className="text-xs text-[#ffbec8]">{error}</p>}
    {!canSearch && <p className="py-2 text-sm text-[#c1c3c8]">Find the court your crew calls home.</p>}
    {!busy && canSearch && !error && <>
      <div className="grid gap-2" role="group" aria-label="Nearby courts">
        {results.slice(0, visible).map(site => {
          const active = selected?.slug === site.slug;
          const distance = distanceFor(site);
          const unverified = site.verification_status === 'community' || site.access_type === 'varies';
          return <button key={site.slug} type="button" aria-pressed={active} onClick={() => onSelect(site)}
            className={'flex min-h-16 items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ' +
              (active ? 'border-[#ff768c] bg-[#50202a]' : 'border-[#484d52] bg-[#202326] hover:border-[#91959b]')}>
            <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-lg ' + (active ? 'bg-[#813048] text-[#ffb2c0]' : 'bg-[#34383e] text-[#d5d6d9]')}>
              {active ? <FaCheck aria-hidden="true"/> : <FaLocationDot aria-hidden="true"/>}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block break-words text-sm leading-snug">{site.name}</strong>
              <span className="mt-1 block text-xs text-[#c1c3c8]">{site.locality || 'Virginia'}{unverified ? ' · Access unconfirmed' : ''}</span>
            </span>
            {distance !== null && <span className="shrink-0 text-xs font-bold text-[#ffc1cd]">{distance < 0.1 ? '<0.1' : distance.toFixed(1)} mi</span>}
          </button>;
        })}
      </div>
      {results.length > visible && <button type="button" onClick={() => setVisible(n => n + 12)}
        className="min-h-11 w-full rounded-lg border border-[#5d6067] text-sm font-bold text-white">Show more courts ({results.length - visible})</button>}
      {!results.length && <p role="status" className="py-3 text-sm text-[#d0d1d4]">No courts found. Try a wider radius or search another city.</p>}
    </>}
    <p className="text-[11px] leading-4 text-[#b7bac1]">Home court is crew identity, not a reservation or ownership claim. Verify access before playing. Some listings: <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors (ODbL)</a>.</p>
  </section>;
}

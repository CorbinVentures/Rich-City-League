'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import {
  FaArrowUpRightFromSquare, FaBasketball, FaCircleCheck, FaClock,
  FaCompass, FaLocationArrow, FaLocationDot, FaMap, FaMedal,
  FaPeopleGroup, FaRotate, FaShieldHalved, FaTrophy,
} from 'react-icons/fa6';

type Court = {
  slug: string; name: string; address: string; locality: string; area: string;
  latitude: number | null; longitude: number | null; venue_type: string;
  verification_status: string; access_type: string; hours_text: string | null;
  open_gym_text: string | null; source_label: string | null; source_url: string | null;
};
type Run = {
  id: string; title: string; location: string; location_slug: string | null;
  starts_at: string; run_type: string; game_format: string; status: string;
};
type CourtCommunity = { slug: string; name: string; location_slug: string };
type HistoryRow = { court_slug: string; checked_in_on: string };
type LatLon = { latitude: number; longitude: number };
type RadarCourt = Court & { miles: number | null };
type RadarRun = Run & { miles: number | null; court: Pick<Court, 'slug' | 'latitude' | 'longitude'> | undefined };
type Tab = 'courts' | 'runs';

const RAD = Math.PI / 180;
const EARTH_MILES = 3958.7613;
function distanceMiles(a: LatLon, b: LatLon): number {
  const dLat = (b.latitude - a.latitude) * RAD;
  const dLon = (b.longitude - a.longitude) * RAD;
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(a.latitude * RAD) * Math.cos(b.latitude * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.min(1, Math.sqrt(x)));
}
function locate(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('This device does not support location access.')); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true, maximumAge: 0, timeout: 15000,
    });
  });
}
function localVirginiaDate(): string {
  const bits = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => bits.find(x => x.type === type)?.value ?? '';
  return part('year') + '-' + part('month') + '-' + part('day');
}
const miLabel = (m: number | null) => m === null ? 'Distance unknown' : m.toFixed(1) + ' mi';
const mapsUrl = (c: Court) => 'https://www.google.com/maps/search/?api=1&query='
  + encodeURIComponent(c.address.startsWith('Street address not provided') || c.address.startsWith('Park court') || c.address.startsWith('See map coordinates')
    ? (c.latitude !== null && c.longitude !== null ? c.latitude + ',' + c.longitude : c.name + ', ' + c.locality + ', VA')
    : c.name + ', ' + c.address + ', ' + c.locality + ', VA');
const isCheckinEligible = (c: Court) =>
  c.latitude !== null && c.longitude !== null && ['official', 'provider'].includes(c.verification_status);

export default function BasketballRadarPage() {
  const { user } = useAuth();
  const db = useMemo(() => getSupabaseClient() as any, []);
  const memberId = user?.id;
  const [courts, setCourts] = useState<Court[]>([]);
  const [hasMoreCourts, setHasMoreCourts] = useState(false);
  const [loadingMoreCourts, setLoadingMoreCourts] = useState(false);
  const [runLocations, setRunLocations] = useState<Array<Pick<Court, 'slug' | 'latitude' | 'longitude'>>>([]);
  const courtPageSize = 60;
  const [runs, setRuns] = useState<Run[]>([]);
  const [communities, setCommunities] = useState<CourtCommunity[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [origin, setOrigin] = useState<LatLon | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'requesting' | 'ready' | 'unavailable'>('idle');
  const [radius, setRadius] = useState(15);
  const [tab, setTab] = useState<Tab>('courts');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!db) { setError('Basketball services are unavailable.'); setLoading(false); return; }
    setLoading(true);
    try {
      const [courtResult, runResult, communityResult, historyResult] = await Promise.all([
        db.rpc('search_basketball_locations', {
          p_lat: origin?.latitude ?? null, p_lon: origin?.longitude ?? null,
          p_radius_miles: radius, p_search: search.trim(), p_limit: courtPageSize, p_offset: 0,
        }),
        db.from('runs')
          .select('id,title,location,location_slug,starts_at,run_type,game_format,status')
          .in('status', ['open', 'full'])
          .gte('starts_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
          .order('starts_at', { ascending: true }).limit(100),
        db.from('communities')
          .select('slug,name,location_slug')
          .not('location_slug', 'is', null).limit(300),
        memberId ? db.from('court_checkins').select('court_slug,checked_in_on').eq('profile_id', memberId).limit(500)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (courtResult.error || runResult.error) throw courtResult.error || runResult.error;
      setCourts((courtResult.data ?? []) as Court[]);
      setHasMoreCourts((courtResult.data ?? []).length === courtPageSize);
      setRuns((runResult.data ?? []) as Run[]);
      const runSlugs = [...new Set(((runResult.data ?? []) as Run[]).map(run => run.location_slug).filter((value): value is string => Boolean(value)))];
      if (runSlugs.length) {
        const locationResult = await db.from('basketball_locations').select('slug,latitude,longitude').in('slug',runSlugs);
        if (!locationResult.error) setRunLocations(locationResult.data ?? []);
      } else setRunLocations([]);
      if (!communityResult.error) setCommunities((communityResult.data ?? []) as CourtCommunity[]);
      if (!historyResult.error) setHistory((historyResult.data ?? []) as HistoryRow[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the basketball radar.');
    } finally {
      setLoading(false);
    }
  }, [db, memberId, origin?.latitude, origin?.longitude, radius, search]);

  useEffect(() => { void reload(); }, [reload]);

  async function loadMoreCourts() {
    if (!db || !hasMoreCourts || loadingMoreCourts) return;
    setLoadingMoreCourts(true);
    try {
      const { data, error: pageError } = await db.rpc('search_basketball_locations', {
        p_lat: origin?.latitude ?? null, p_lon: origin?.longitude ?? null,
        p_radius_miles: radius, p_search: search.trim(), p_limit: courtPageSize, p_offset: courts.length,
      });
      if (pageError) throw pageError;
      setCourts(current => {
        const seen = new Set(current.map(court => court.slug));
        return [...current, ...((data ?? []) as Court[]).filter(court => !seen.has(court.slug))];
      });
      setHasMoreCourts((data ?? []).length === courtPageSize);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load more basketball courts.');
    } finally {
      setLoadingMoreCourts(false);
    }
  }

  async function requestLocation() {
    setLocationState('requesting');
    setError('');
    try {
      const found = await locate();
      setOrigin({ latitude: found.coords.latitude, longitude: found.coords.longitude });
      setLocationState('ready');
    } catch {
      setLocationState('unavailable');
      setOrigin(null);
      setNotice('Location was not available. You can still browse the regional court directory.');
    }
  }

  const visibleCourts = useMemo<RadarCourt[]>(() => {
    const q = search.trim().toLowerCase();
    return courts.map(court => ({
      ...court, miles: origin && court.latitude !== null && court.longitude !== null
        ? distanceMiles(origin, { latitude: court.latitude, longitude: court.longitude }) : null,
    }))
      .filter(court => !origin || (court.miles !== null && court.miles <= radius))
      .filter(court => !q || (court.name + ' ' + court.area + ' ' + court.locality + ' ' + court.address).toLowerCase().includes(q))
      .sort((a, b) => origin
        ? (a.miles ?? Infinity) - (b.miles ?? Infinity)
        : a.name.localeCompare(b.name));
  }, [courts, origin, radius, search]);

  const visibleRuns = useMemo<RadarRun[]>(() => {
    const bySlug = new Map([...runLocations, ...courts].map(c => [c.slug, c]));
    const q = search.trim().toLowerCase();
    return runs.map(run => {
      const court = run.location_slug ? bySlug.get(run.location_slug) : undefined;
      return {
        ...run, court, miles: court && origin && court.latitude !== null && court.longitude !== null
          ? distanceMiles(origin, { latitude: court.latitude, longitude: court.longitude }) : null,
      };
    })
      .filter(run => !origin || (run.miles !== null && run.miles <= radius))
      .filter(run => !q || (run.title + ' ' + run.location).toLowerCase().includes(q))
      .sort((a, b) => origin
        ? (a.miles ?? Infinity) - (b.miles ?? Infinity) || a.starts_at.localeCompare(b.starts_at)
        : a.starts_at.localeCompare(b.starts_at));
  }, [runs, courts, runLocations, origin, radius, search]);

  const communityByCourt = useMemo(() => new Map(communities.map(c => [c.location_slug, c])), [communities]);
  const visited = new Set(history.map(h => h.court_slug));
  const checkedToday = new Set(history.filter(h => h.checked_in_on === localVirginiaDate()).map(h => h.court_slug));

  async function checkIn(court: Court) {
    if (!user) {
      window.location.assign('/auth/sign-in?next=' + encodeURIComponent('/radar'));
      return;
    }
    if (!isCheckinEligible(court)) return;
    setBusy(court.slug);
    setNotice('');
    setError('');
    try {
      // Obtain a new, high accuracy reading at the moment of check-in.
      // Never persist a visitor's raw GPS coordinates in RCH.
      const position = await locate();
      if (position.coords.accuracy > 100) {
        setError('GPS is not precise enough yet (' + Math.round(position.coords.accuracy)
          + 'm accuracy). Move outdoors and retry.');
        return;
      }
      const { data, error: rpcError } = await db.rpc('check_in_to_court', {
        p_court_slug: court.slug,
        p_lat: position.coords.latitude,
        p_lon: position.coords.longitude,
        p_accuracy: position.coords.accuracy,
      });
      if (rpcError) throw rpcError;
      const result = data?.[0];
      setOrigin({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLocationState('ready');
      setNotice(result?.rep_awarded
        ? 'Court verified! +10 REP earned. ' + (result.unlocked_badges ? 'New badge: ' + result.unlocked_badges : 'Keep exploring courts!')
        : 'You have already checked in here today.');
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Check-in could not be completed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="rcl-social-secondary min-h-screen bg-[#05080d] pb-28 text-white">
      <header className="border-b border-sky-300/15 bg-[#08131f]">
        <Container maxWidth="xl" className="py-7">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-sky-300">
            <FaLocationDot /> RCH Location Hub
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Basketball Radar</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">
            Find courts, runs and basketball communities around you. Show up, check in and build your REP.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => void requestLocation()} disabled={locationState === 'requesting'}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">
              <FaLocationArrow /> {locationState === 'requesting' ? 'Locating…' : origin ? 'Refresh my location' : 'Find near me'}
            </button>
            <Link href="/runs?create=1" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-300/30 px-4 py-2 text-sm font-semibold text-sky-100">
              <FaBasketball /> Host a run
            </Link>
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-300">
            <FaShieldHalved className="mt-0.5 shrink-0 text-sky-300" />
            Location is optional, requested only when you tap, and not published to your profile or feed. No background tracking.
          </p>
        </Container>
      </header>

      <Container maxWidth="xl" className="py-6">
        {notice && <div role="status" className="mb-4 rounded-xl border border-sky-300/30 bg-sky-950/70 px-4 py-3 text-sm text-sky-100">{notice}</div>}
        {error && <div role="alert" className="mb-4 rounded-xl border border-red-300/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">{error}</div>}
        <section className="rounded-2xl border border-white/15 bg-[#0b1722] p-4 sm:p-5" aria-label="Radar filters">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">{origin ? 'Near your current location' : 'Explore basketball courts across Virginia'}</p>
            <button type="button" onClick={() => void reload()} className="flex items-center gap-2 text-xs font-semibold text-sky-300"><FaRotate /> Refresh results</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <input aria-label="Search courts and runs" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search courts, cities or runs…" className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/20 bg-[#06101a] px-4 text-sm text-white placeholder:text-slate-400 outline-none focus:border-sky-300" />
            <select aria-label="Search radius" value={radius} disabled={!origin} onChange={e => setRadius(Number(e.target.value))}
              className="min-h-11 rounded-xl border border-white/20 bg-[#06101a] px-3 text-sm text-white disabled:opacity-50">
              {[5, 15, 30, 50, 100, 250].map(mi => <option key={mi} value={mi}>{mi} miles</option>)}
            </select>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => setTab('courts')} className={tab === 'courts'
              ? 'rounded-xl bg-sky-300 px-3 py-3 text-sm font-bold text-slate-950'
              : 'rounded-xl border border-white/20 px-3 py-3 text-sm font-semibold text-slate-200'}>
              Courts ({visibleCourts.length})
            </button>
            <button onClick={() => setTab('runs')} className={tab === 'runs'
              ? 'rounded-xl bg-sky-300 px-3 py-3 text-sm font-bold text-slate-950'
              : 'rounded-xl border border-white/20 px-3 py-3 text-sm font-semibold text-slate-200'}>
              Live runs ({visibleRuns.length})
            </button>
          </div>
        </section>

        {loading ? <p className="py-10 text-center text-sm text-slate-300">Loading basketball activity…</p> : (
          <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-3">
              {tab === 'courts' && <>
                {visibleCourts.length === 0 && <EmptyResult isNearby={Boolean(origin)} onReset={() => { setOrigin(null); setSearch(''); setLocationState('idle'); }} />}
                {visibleCourts.map(court => {
                  const community = communityByCourt.get(court.slug);
                  return <article key={court.slug} className="rounded-2xl border border-white/15 bg-[#0b1722] p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-sky-300">{court.area} · {court.venue_type} court</p>
                        <h2 className="mt-1 text-lg font-bold text-white">{court.name}</h2>
                        <p className="mt-1 text-xs leading-5 text-slate-300">{court.address}, {court.locality}, VA</p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-sky-300/10 px-2 py-1 text-xs font-bold text-sky-200">
                        {court.miles !== null ? miLabel(court.miles) : 'Court'}
                      </span>
                    </div>
                    {court.verification_status === 'community' && <p className="mt-2 text-xs font-semibold text-amber-200">Mapped court · Access and playability not confirmed. Check before visiting.</p>}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
                      <span className="rounded-lg border border-white/15 px-2 py-1.5">{court.access_type === 'public' ? 'Listed public' : court.access_type === 'varies' ? 'Access not confirmed' : court.access_type.replaceAll('_', ' ')}</span>
                      {court.open_gym_text && <span className="rounded-lg border border-white/15 px-2 py-1.5">Open-gym schedule</span>}
                      {visited.has(court.slug) && <span className="flex items-center gap-1 rounded-lg border border-sky-300/30 px-2 py-1.5 text-sky-200"><FaCircleCheck /> Visited</span>}
                      {court.source_label && (court.source_url
                        ? <a href={court.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1.5 text-sky-200">Source: {court.source_label} <FaArrowUpRightFromSquare /></a>
                        : <span className="rounded-lg border border-white/15 px-2 py-1.5">Source: {court.source_label}</span>)}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSelected(court)} className="min-h-10 rounded-xl border border-white/25 px-3 text-xs font-semibold text-white">
                        <FaMap className="mr-1 inline" /> View map
                      </button>
                      <a href={mapsUrl(court)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/25 px-3 text-xs font-semibold text-slate-100">
                        Directions <FaArrowUpRightFromSquare />
                      </a>
                      {community && <Link href={'/communities/' + encodeURIComponent(community.slug)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/25 px-3 text-xs font-semibold text-slate-100"><FaPeopleGroup /> Community</Link>}
                      <Link href={'/runs?court=' + encodeURIComponent(court.slug)} className="inline-flex min-h-10 items-center rounded-xl border border-white/25 px-3 text-xs font-semibold text-slate-100">Plan a run</Link>
                      {isCheckinEligible(court) && <button type="button" disabled={busy !== null || checkedToday.has(court.slug)}
                        onClick={() => void checkIn(court)}
                        className="min-h-10 rounded-xl bg-sky-300 px-4 text-xs font-bold text-slate-950 disabled:opacity-50">
                        {checkedToday.has(court.slug) ? 'Checked in today ✓' : busy === court.slug ? 'Verifying GPS…' : 'Check in · +10 REP'}
                      </button>}
                    </div>
                  </article>;
                })}
                {hasMoreCourts && <button type="button" onClick={() => void loadMoreCourts()} disabled={loadingMoreCourts} className="w-full rounded-xl border border-sky-300/30 bg-[#0b1722] px-4 py-3 text-sm font-bold text-sky-200 disabled:opacity-60">{loadingMoreCourts ? 'Loading more courts…' : 'Load more basketball courts'}</button>}
              </>}
              {tab === 'runs' && <>
                {visibleRuns.length === 0 && <div className="rounded-2xl border border-dashed border-sky-300/25 bg-[#0b1722] p-8 text-center">
                  <FaBasketball className="mx-auto text-3xl text-sky-300" />
                  <h2 className="mt-3 text-xl font-bold">No active runs in this area yet</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Bring your crew together and get your court on the radar.</p>
                  <Link href="/runs?create=1" className="mt-4 inline-flex rounded-xl bg-sky-300 px-5 py-3 text-sm font-bold text-slate-950">Post the first run</Link>
                </div>}
                {visibleRuns.map(run => <article key={run.id} className="rounded-2xl border border-white/15 bg-[#0b1722] p-5">
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold text-sky-300">
                    <span className="capitalize">{run.run_type} · {run.game_format}</span><span>{miLabel(run.miles)}</span>
                  </div>
                  <h2 className="mt-2 text-lg font-bold">{run.title}</h2>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-200"><FaClock /> {new Date(run.starts_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  <p className="mt-1 flex items-start gap-2 text-sm text-slate-300"><FaLocationDot className="mt-1 shrink-0" /> {run.location}</p>
                  <Link href={'/runs/' + encodeURIComponent(run.id)} className="mt-4 inline-flex rounded-xl bg-sky-300 px-4 py-2.5 text-xs font-bold text-slate-950">View run / RSVP</Link>
                </article>)}
              </>}
            </div>
            <aside className="space-y-4">
              <div className="rounded-2xl border border-sky-300/20 bg-[#0b1722] p-5">
                <div className="flex items-center gap-2 text-sky-300"><FaTrophy /><h2 className="font-bold text-white">Court Passport</h2></div>
                <p className="mt-2 text-sm leading-6 text-slate-200">Visit new verified courts to unlock badges and earn +10 REP per approved check-in.</p>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-[#06101a] p-4">
                  <div><p className="text-2xl font-bold text-white">{visited.size}</p><p className="text-xs text-slate-300">Unique courts explored</p></div>
                  <FaMedal className="text-3xl text-sky-300" />
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-300">
                  One rewarded check-in per court per day. Up to three courts daily.
                  GPS accuracy must be within 100m, and you must be within 200m of the venue.
                </p>
                <Link href="/badges" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-sky-300">View all REP and badges <FaArrowUpRightFromSquare /></Link>
              </div>
              {selected && <div className="rounded-2xl border border-sky-300/20 bg-[#0b1722] p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="min-w-0 truncate text-sm font-bold">Map: {selected.name}</h2>
                  <button type="button" onClick={() => setSelected(null)} className="text-xs font-bold text-sky-300">Close</button>
                </div>
                <iframe title={'Map of ' + selected.name} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                  src={'https://www.google.com/maps?q=' + encodeURIComponent(selected.latitude !== null && selected.longitude !== null ? selected.latitude + ',' + selected.longitude : selected.name + ', ' + selected.address + ', ' + selected.locality + ', VA') + '&output=embed'}
                  className="h-64 w-full rounded-xl border-0" />
              </div>}
              <div className="rounded-2xl border border-white/15 bg-[#0b1722] p-5">
                <div className="flex items-center gap-2"><FaCompass className="text-sky-300" /><h2 className="font-bold">Connect locally</h2></div>
                <p className="mt-2 text-sm leading-6 text-slate-200">Each court can connect to its own community, runs, and local players. Join a court community to keep up with plans and updates.</p>
                <Link href="/communities" className="mt-3 inline-flex gap-2 text-xs font-semibold text-sky-300">Explore communities <FaArrowUpRightFromSquare /></Link>
              </div>
            </aside>
          </div>
        )}
        <p className="mt-8 text-center text-xs leading-5 text-slate-400">
          Community map data © <a className="underline hover:text-sky-200" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>, licensed under ODbL 1.0.
          Mapped locations are not guarantees of public access or playable conditions.
        </p>
      </Container>
    </main>
  );
}

function EmptyResult({ isNearby, onReset }: { isNearby: boolean; onReset: () => void }) {
  return <div className="rounded-2xl border border-dashed border-white/20 bg-[#0b1722] p-8 text-center">
    <FaLocationDot className="mx-auto text-3xl text-sky-300" />
    <h2 className="mt-3 text-lg font-bold">No matching courts</h2>
    <p className="mt-2 text-sm leading-6 text-slate-300">
      {isNearby ? 'Try expanding your search radius or browsing the full region.' : 'Try another court, address, or city.'}
    </p>
    <button onClick={onReset} className="mt-4 rounded-xl border border-sky-300/40 px-4 py-2 text-sm font-semibold text-sky-300">Browse all courts</button>
  </div>;
}
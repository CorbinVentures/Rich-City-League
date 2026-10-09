'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaArrowUpRightFromSquare, FaCircleCheck, FaLocationDot, FaMagnifyingGlass } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';

export type RunVenue = {
  slug: string;
  name: string;
  address: string;
  locality: string;
  region: string;
  postal_code: string | null;
  area: string;
  venue_type: 'outdoor' | 'indoor' | 'mixed';
  access_type: 'public' | 'free_pass' | 'membership' | 'reservation' | 'varies';
  court_count: number | null;
  lights: boolean | null;
  latitude: number | null;
  longitude: number | null;
  hours_text: string | null;
  open_gym_text: string | null;
  source_label: string | null;
  source_url: string | null;
  last_verified_on: string | null;
  verification_status: 'official' | 'provider' | 'community';
  notes: string | null;
};

function missingAddress(venue: RunVenue) {
  return venue.address.startsWith('Street address not provided') ||
    venue.address.startsWith('Park court') ||
    venue.address.startsWith('See map coordinates');
}

export function runVenueDirections(venue: RunVenue) {
  const destination = missingAddress(venue) && venue.latitude !== null && venue.longitude !== null
    ? venue.latitude + ',' + venue.longitude
    : venue.name + ', ' + venue.address + ', ' + venue.locality + ', VA';
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(destination);
}

export function runVenueLocation(venue: RunVenue) {
  if (missingAddress(venue)) {
    return venue.name + ' — ' + venue.locality + ', VA' +
      (venue.latitude !== null && venue.longitude !== null ? ' (' + venue.latitude.toFixed(5) + ', ' + venue.longitude.toFixed(5) + ')' : '');
  }
  return venue.name + ' — ' + venue.address + ', ' + venue.locality + ', VA';
}

export function RunVenuePicker({ selected, onSelect, onClear }: {
  selected: RunVenue | null;
  onSelect: (venue: RunVenue) => void;
  onClear: () => void;
}) {
  const db = useMemo(() => getSupabaseClient() as any, []);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(!selected);
  const [results, setResults] = useState<RunVenue[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSearching) return;
    let cancelled = false;
    if (query.trim().length === 1) {
      setResults([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    setError('');
    const timer = setTimeout(async () => {
      if (!db) { if (!cancelled) { setError('Venue search is unavailable. You can enter a custom location.'); setBusy(false); } return; }
      try {
        const { data, error: lookupError } = await db.rpc('search_run_venues', { p_search: query.trim(), p_limit: 24 });
        if (lookupError) throw lookupError;
        if (!cancelled) setResults((data ?? []) as RunVenue[]);
      } catch {
        if (!cancelled) { setResults([]); setError('Unable to search venues. You can still enter the venue manually.'); }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, query ? 260 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [db, query, isSearching]);

  return <div className="sm:col-span-2">
    <p className="text-xs font-semibold text-white/70">Court / venue</p>
    {selected && <div className="mt-2 rounded-xl border border-rcl-blue/30 bg-rcl-blue/[.065] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white"><FaCircleCheck className="shrink-0 text-rcl-blue"/>{selected.name}</p>
          <p className="mt-1 text-xs text-white/65">{missingAddress(selected) ? selected.locality + ', VA · Map pin only' : selected.address + ', ' + selected.locality + ', VA'}</p>
        </div>
        <button type="button" onClick={() => { onClear(); setQuery(''); setIsSearching(true); }} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white">Change</button>
      </div>
      {selected.verification_status === 'community' || selected.access_type === 'varies'
        ? <p className="mt-3 text-xs leading-5 text-amber-200">Location is mapped, but access or playable conditions are not confirmed. Check before scheduling a run.</p>
        : <p className="mt-3 text-xs leading-5 text-slate-200">Access listing: {selected.access_type.replaceAll('_',' ')}. Confirm hours or permissions with the facility.</p>}
      <a href={runVenueDirections(selected)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rcl-blue">View directions <FaArrowUpRightFromSquare/></a>
    </div>}
    {isSearching && <div className="mt-2 rounded-xl border border-white/15 bg-[#070e17] p-3">
      <label className="relative block">
        <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50"/>
        <input type="search" autoComplete="off" aria-label="Search basketball venues"
          value={query} onChange={event => setQuery(event.target.value)}
          placeholder="Search a court, gym, park, or Virginia city"
          className="min-h-11 w-full rounded-lg border border-white/20 bg-[#030b13] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/45 outline-none focus:border-rcl-blue"/>
      </label>
      <p className="mt-2 text-[11px] leading-5 text-white/55">{query.trim() ? 'Named venues that match your search' : 'Suggested venues · Type to search statewide'}</p>
      {busy && <p role="status" className="px-2 py-3 text-xs text-white/65">Finding venues…</p>}
      {error && <p role="alert" className="px-2 py-3 text-xs text-amber-200">{error}</p>}
      {!busy && !error && query.trim().length !== 1 && <div className="mt-2 max-h-52 space-y-1 overflow-y-auto" role="group" aria-label="Court search results">
        {results.map(venue => <button type="button" key={venue.slug} onClick={() => { onSelect(venue); setIsSearching(false); setQuery(''); }}
          className="flex w-full items-start gap-3 rounded-lg border border-transparent px-3 py-3 text-left hover:border-rcl-blue/30 hover:bg-white/[.06] focus:border-rcl-blue/50">
          <FaLocationDot className="mt-0.5 shrink-0 text-rcl-blue"/>
          <span className="min-w-0 flex-1">
            <span className="block break-words text-sm font-semibold text-white">{venue.name}</span>
            <span className="mt-1 block break-words text-xs text-white/65">{venue.locality}, VA · {venue.venue_type}
              {venue.access_type === 'varies' || venue.verification_status === 'community' ? ' · Access unconfirmed' : ''}
            </span>
          </span>
        </button>)}
        {!results.length && <p className="px-2 py-3 text-xs leading-5 text-white/65">No named venues found. Try a city or another name—or type a custom location below.</p>}
      </div>}
    </div>}
    <button type="button" onClick={() => { onClear(); setQuery(''); setIsSearching(false); }} className="mt-3 text-xs font-semibold text-rcl-blue">
      Use my own address or an unlisted court instead
    </button>
    <p className="mt-2 text-[11px] leading-5 text-white/45">Court data is for choosing a location for a game, not a guarantee a facility is available to play.</p>
  </div>;
}
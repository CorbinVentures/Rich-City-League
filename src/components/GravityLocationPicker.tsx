'use client';

import Link from 'next/link';
import { FaArrowRight, FaCrosshairs, FaLocationDot } from 'react-icons/fa6';
import { VIRGINIA_CITIES } from '@/lib/virginia-world';
import { GRAVITY_RADII, type GravityRadius } from '@/lib/rch-gravity-location';
import { useGravityLocation } from '@/hooks/useGravityLocation';

type Props = { compact?: boolean; className?: string };

/**
 * Explicit, reversible, coarse location preference shared by RCH surfaces.
 * No geolocation request on render/mount. No server/IP geolocation fallback.
 */
export function GravityLocationPicker({compact = false,className = ''}: Props) {
  const {
    location, city, chooseCity, chooseRadius, statewide,
    chooseApproximateDeviceCity, pending, error
  } = useGravityLocation();

  return <section aria-label="Local basketball discovery preferences" className={`min-w-0 rounded-2xl border border-[var(--rch-brand-border)] bg-[var(--rch-brand-surface)] p-4 text-white ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <FaLocationDot aria-hidden="true" className="mt-1 shrink-0 text-[var(--rch-brand-accent-text)]"/>
        <div>
          <h2 className="text-sm font-bold text-white">{city ? `Around ${city.name}` : 'Explore all of Virginia'}</h2>
          {!compact&&<p className="mt-1 text-xs leading-5 text-[var(--rch-brand-copy)]">Choose an area to highlight nearby basketball. Statewide opportunities remain visible.</p>}
        </div>
      </div>
      {city&&<button type="button" onClick={statewide} className="text-xs font-semibold text-[var(--rch-brand-accent-text)] underline underline-offset-2">All Virginia</button>}
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label className="min-w-[150px] flex-1 text-xs font-semibold text-[var(--rch-brand-copy)]">
        <span className="sr-only">Preferred Virginia city</span>
        <select aria-label="Preferred Virginia city" value={location.cityId || ''} onChange={event=>event.target.value ? chooseCity(event.target.value) : statewide()} className="min-h-11 w-full rounded-lg border border-[var(--rch-brand-border)] bg-[var(--rch-brand-raised)] px-3 text-sm text-white focus:outline-2 focus:outline-offset-2 focus:outline-[var(--rch-brand-accent-text)]">
          <option value="">All Virginia</option>
          {VIRGINIA_CITIES.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-[var(--rch-brand-copy)]">
        <span className="sr-only">Nearby discovery distance</span>
        <select aria-label="Nearby discovery distance" disabled={!city} value={location.radiusMiles} onChange={event=>chooseRadius(Number(event.target.value) as GravityRadius)} className="min-h-11 rounded-lg border border-[var(--rch-brand-border)] bg-[var(--rch-brand-raised)] px-3 text-sm text-white disabled:opacity-50">
          {GRAVITY_RADII.map(radius=><option key={radius} value={radius}>{radius} mi</option>)}
        </select>
      </label>
      <button type="button" disabled={pending} onClick={()=>void chooseApproximateDeviceCity()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--rch-brand-accent-text)] bg-[var(--rch-brand-accent)] px-3 text-xs font-bold text-white hover:bg-[var(--rch-brand-accent)] disabled:opacity-50" title="Asks for device location only after you choose this button">
        <FaCrosshairs aria-hidden="true"/>{pending?'Finding area…':'Use my location'}
      </button>
    </div>
    {error&&<p role="alert" className="mt-3 text-xs font-semibold text-[#ffb7b7]">{error}</p>}
    {!compact&&<div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--rch-brand-copy)]">
      <span>Only a broad Virginia city and search radius are saved on this device. No GPS history.</span>
      <Link href="/settings/discovery" className="inline-flex items-center gap-1 font-bold text-[var(--rch-brand-accent-text)]">Location controls <FaArrowRight aria-hidden="true"/></Link>
    </div>}
  </section>;
}

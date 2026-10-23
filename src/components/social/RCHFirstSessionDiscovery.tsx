'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaArrowRight, FaBasketball, FaPeopleGroup, FaPlay, FaXmark } from 'react-icons/fa6';
import { useGravityLocation } from '@/hooks/useGravityLocation';

const DISCOVERY_COMPLETE_KEY = 'rch:first-session-discovery:v1';

/** A dismissible first-visit guide. This is navigation preference, not authorization. */
export function RCHFirstSessionDiscovery() {
  const { city } = useGravityLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(DISCOVERY_COMPLETE_KEY) !== 'done');
    } catch {
      setVisible(true);
    }
  }, []);

  function finish() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISCOVERY_COMPLETE_KEY, 'done');
    } catch {
      // Links and dismiss work even when persistent storage is unavailable.
    }
  }

  if (!visible) return null;

  return (
    <section aria-label="Discover Rich City Hoops" className="mb-5 rounded-2xl border border-[var(--rch-brand-border)] bg-[var(--rch-brand-surface)] p-4 text-white sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--rch-brand-accent-text)]">New to RCH?</p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">Your city. Your next move.</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--rch-brand-copy)]">
            {city ? 'Explore basketball around ' + city.name + ' or discover the rest of Virginia.' : 'Select your city above or discover basketball across Virginia.'}
            {' '}Start with something happening, then build your player identity.
          </p>
        </div>
        <button type="button" onClick={finish} aria-label="Dismiss getting started" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 text-white">
          <FaXmark aria-hidden="true" />
        </button>
      </div>
      <nav aria-label="Choose your first RCH activity" className="mt-4 grid gap-2 sm:grid-cols-3">
        <Link href="/runs?view=list#rch-upcoming-runs" onClick={finish} className="flex min-h-20 items-center gap-3 rounded-xl border border-[var(--rch-brand-accent-text)] bg-[var(--rch-brand-accent)] px-4 py-3 text-white hover:brightness-110">
          <FaBasketball aria-hidden="true" className="shrink-0 text-xl" />
          <span className="min-w-0 flex-1"><strong className="block text-sm font-black">Find a real run</strong><small className="mt-1 block text-xs text-white/80">See events and players</small></span>
          <FaArrowRight aria-hidden="true" className="shrink-0" />
        </Link>
        <Link href="/clips" onClick={finish} className="flex min-h-20 items-center gap-3 rounded-xl border border-white/15 bg-white/[.04] px-4 py-3 text-white hover:bg-white/[.08]">
          <FaPlay aria-hidden="true" className="shrink-0 text-lg" />
          <span className="min-w-0 flex-1"><strong className="block text-sm font-black">Watch highlights</strong><small className="mt-1 block text-xs text-white/65">See the basketball scene</small></span>
          <FaArrowRight aria-hidden="true" className="shrink-0" />
        </Link>
        <Link href="/discover" onClick={finish} className="flex min-h-20 items-center gap-3 rounded-xl border border-white/15 bg-white/[.04] px-4 py-3 text-white hover:bg-white/[.08]">
          <FaPeopleGroup aria-hidden="true" className="shrink-0 text-xl" />
          <span className="min-w-0 flex-1"><strong className="block text-sm font-black">Meet hoopers</strong><small className="mt-1 block text-xs text-white/65">Find your community</small></span>
          <FaArrowRight aria-hidden="true" className="shrink-0" />
        </Link>
      </nav>
    </section>
  );
}

'use client';

import type { PointerEvent } from 'react';
import type { GameEvent } from '@/types/database';

type PendingShot = {
  x: number;
  y: number;
  zone: string;
};

type ShotMapProps = {
  events: GameEvent[];
  pendingShot: PendingShot | null;
  onLocationSelect: (x: number, y: number) => void;
};

function courtPoint(event: PointerEvent<HTMLDivElement>, element: HTMLDivElement) {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
    y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100)),
  };
}

export function ShotMap({ events, pendingShot, onLocationSelect }: ShotMapProps) {
  const shots = events
    .filter(
      (event) =>
        !event.voided_at &&
        event.shot_x !== null &&
        event.shot_y !== null &&
        ['shot_made', 'shot_missed'].includes(event.event_type),
    )
    .slice(0, 120);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const point = courtPoint(event, event.currentTarget);
    onLocationSelect(point.x, point.y);
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Shot map</p>
          <p className="mt-1 text-xs text-white/40">Tap the court, then record the shot.</p>
        </div>
        {pendingShot && (
          <span className="shrink-0 rounded-full bg-rcl-orange/15 px-3 py-1 text-[9px] font-black uppercase text-rcl-orange">
            {pendingShot.zone}
          </span>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Basketball shot location map"
        onPointerDown={handlePointerDown}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
        }}
        className="relative mt-4 aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-[#080d14] touch-none select-none focus:outline-none focus:ring-2 focus:ring-rcl-orange/60"
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <pattern id="court-boards" width="7" height="7" patternUnits="userSpaceOnUse">
              <rect width="7" height="7" fill="#0a1018" />
              <path d="M0 0V7" stroke="rgba(255,255,255,.025)" strokeWidth=".35" />
            </pattern>
            <filter id="court-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation=".7" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <rect x="0" y="0" width="100" height="100" rx="2" fill="url(#court-boards)" />
          <rect x="3" y="4" width="94" height="92" fill="none" stroke="rgba(255,255,255,.78)" strokeWidth=".75" />
          <path d="M3 92H97" stroke="rgba(255,255,255,.78)" strokeWidth=".75" />
          <rect x="31" y="60" width="38" height="36" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.72)" strokeWidth=".7" />
          <path d="M31 60H69" stroke="rgba(255,255,255,.72)" strokeWidth=".7" />
          <circle cx="50" cy="60" r="11.5" fill="none" stroke="rgba(255,255,255,.72)" strokeWidth=".7" />
          <path d="M38.5 60A11.5 11.5 0 0 0 61.5 60" fill="none" stroke="rgba(255,255,255,.72)" strokeWidth=".7" strokeDasharray="2 2" />
          <path d="M42 90A8 8 0 0 1 58 90" fill="none" stroke="rgba(255,255,255,.72)" strokeWidth=".7" />
          <path d="M12 92V82A38 38 0 0 1 88 82V92" fill="none" stroke="#ff6b1a" strokeWidth="1.05" filter="url(#court-glow)" />
          <path d="M12 92V82M88 82V92" stroke="#ff6b1a" strokeWidth="1.05" />
          <rect x="43" y="84" width="14" height="3.5" rx=".7" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth=".8" />
          <circle cx="50" cy="89" r="2.2" fill="none" stroke="#ff6b1a" strokeWidth="1.1" />
          <path d="M48.2 90.3L49 92.3L50 90.3L51 92.3L52 90.3" fill="none" stroke="rgba(255,255,255,.65)" strokeWidth=".45" />
          <circle cx="50" cy="4" r="4" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth=".65" />
        </svg>

        {shots.map((shot) => (
          <span
            key={shot.id}
            aria-hidden="true"
            className={[
              'absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-lg',
              shot.event_type === 'shot_made'
                ? 'border-emerald-300 bg-emerald-300/55 shadow-emerald-300/20'
                : 'border-red-300 bg-red-300/35 shadow-red-300/20',
            ].join(' ')}
            style={{ left: `${shot.shot_x}%`, top: `${shot.shot_y}%` }}
          />
        ))}

        {pendingShot && (
          <span
            aria-hidden="true"
            className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-rcl-gold bg-rcl-gold/25 shadow-[0_0_16px_rgba(255,196,0,.35)]"
            style={{ left: `${pendingShot.x}%`, top: `${pendingShot.y}%` }}
          />
        )}

        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-white/45 backdrop-blur">
          {pendingShot ? 'Location selected' : 'Tap court to choose location'}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 px-1 text-[9px] font-black uppercase tracking-widest text-white/45">
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full border-2 border-emerald-300 bg-emerald-300/40" />Made</span>
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full border-2 border-red-300 bg-red-300/30" />Missed</span>
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full border-2 border-rcl-gold bg-rcl-gold/20" />Selected</span>
      </div>
    </div>
  );
}

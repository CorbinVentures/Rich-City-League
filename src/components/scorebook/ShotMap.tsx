'use client';

import { useMemo, useState } from 'react';
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

type ShotFilter = 'all' | 'made' | 'missed';
type ViewMode = 'shots' | 'heat';

const shotEvents = (events: GameEvent[]) =>
  events.filter(
    (event) =>
      !event.voided_at &&
      event.shot_x !== null &&
      event.shot_y !== null &&
      ['shot_made', 'shot_missed'].includes(event.event_type),
  );

function courtPoint(event: PointerEvent<HTMLDivElement>, element: HTMLDivElement) {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
    y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100)),
  };
}

function zoneLabel(zone: string) {
  return zone.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ShotDot({
  shot,
  selected,
  onSelect,
}: {
  shot: GameEvent;
  selected: boolean;
  onSelect: () => void;
}) {
  const made = shot.event_type === 'shot_made';
  return (
    <button
      type="button"
      aria-label={`${made ? 'Made' : 'Missed'} ${shot.shot_value ?? 2}-point shot${shot.shot_zone ? ` from ${zoneLabel(shot.shot_zone)}` : ''}`}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      className={[
        'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-150',
        made
          ? 'border-emerald-200 bg-emerald-300/80 shadow-[0_0_14px_rgba(52,211,153,.55)]'
          : 'border-rose-200 bg-rose-400/65 shadow-[0_0_12px_rgba(251,113,133,.4)]',
        selected ? 'z-20 h-7 w-7 ring-2 ring-rcl-gold ring-offset-2 ring-offset-[#111821]' : 'z-10 h-4 w-4 hover:z-20 hover:h-6 hover:w-6',
      ].join(' ')}
      style={{ left: `${shot.shot_x}%`, top: `${shot.shot_y}%` }}
    >
      {selected && <span className="absolute inset-[4px] rounded-full bg-white/80" />}
    </button>
  );
}

export function ShotMap({ events, pendingShot, onLocationSelect }: ShotMapProps) {
  const [filter, setFilter] = useState<ShotFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('shots');
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);

  const shots = useMemo(() => shotEvents(events).slice(0, 160), [events]);
  const filteredShots = useMemo(
    () => shots.filter((shot) => filter === 'all' || (filter === 'made' ? shot.event_type === 'shot_made' : shot.event_type === 'shot_missed')),
    [shots, filter],
  );

  const made = shots.filter((shot) => shot.event_type === 'shot_made').length;
  const attempts = shots.length;
  const fgPct = attempts ? Math.round((made / attempts) * 100) : 0;
  const threes = shots.filter((shot) => shot.shot_value === 3);
  const threesMade = threes.filter((shot) => shot.event_type === 'shot_made').length;
  const twos = shots.filter((shot) => shot.shot_value !== 3);
  const twosMade = twos.filter((shot) => shot.event_type === 'shot_made').length;
  const threePct = threes.length ? Math.round((threesMade / threes.length) * 100) : 0;
  const twoPct = twos.length ? Math.round((twosMade / twos.length) * 100) : 0;
  const selectedShot = shots.find((shot) => shot.id === selectedShotId) ?? null;

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const point = courtPoint(event, event.currentTarget);
    setSelectedShotId(null);
    onLocationSelect(point.x, point.y);
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0f16] shadow-[0_20px_60px_rgba(0,0,0,.25)]">
      <div className="border-b border-white/10 bg-gradient-to-r from-white/[.055] to-transparent p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rcl-orange shadow-[0_0_10px_rgba(255,107,26,.8)]" />
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-rcl-orange">Game IQ · Shot chart</p>
            </div>
            <h3 className="mt-1 text-lg font-black uppercase tracking-tight text-white">Shot map</h3>
            <p className="mt-0.5 text-[10px] text-white/35">Tap anywhere on the floor to set the next shot location.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">FG</p>
            <p className="text-xl font-black text-white">{fgPct}<span className="text-xs text-white/30">%</span></p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ['2PT', `${twosMade}/${twos.length}`, twoPct],
            ['3PT', `${threesMade}/${threes.length}`, threePct],
            ['ATT', attempts, null],
          ].map(([label, value, pct]) => (
            <div key={label} className="rounded-xl border border-white/5 bg-white/[.025] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/30">{label}</span>
                {typeof pct === 'number' && <span className="text-[8px] font-black text-white/55">{pct}%</span>}
              </div>
              <p className="mt-0.5 text-xs font-black text-white/85">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
            {(['all', 'made', 'missed'] as ShotFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-lg px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition ${filter === item ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
            {(['shots', 'heat'] as ViewMode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setViewMode(item)}
                className={`rounded-lg px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition ${viewMode === item ? 'bg-rcl-orange/15 text-rcl-orange' : 'text-white/30 hover:text-white/60'}`}
              >
                {item === 'shots' ? 'Shots' : 'Heat'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Basketball shot location map"
        onPointerDown={handlePointerDown}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
        }}
        className="relative mx-3 my-3 aspect-[4/5] overflow-hidden rounded-[22px] border border-white/10 bg-[#111821] touch-none select-none focus:outline-none focus:ring-2 focus:ring-rcl-orange/60"
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="court-floor" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#16212c" />
              <stop offset="50%" stopColor="#111a23" />
              <stop offset="100%" stopColor="#0d151d" />
            </linearGradient>
            <pattern id="court-lines" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M0 0V8" stroke="rgba(255,255,255,.018)" strokeWidth=".5" />
            </pattern>
            <filter id="orange-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation=".9" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="paint-fill" cx="50%" cy="70%" r="75%">
              <stop offset="0%" stopColor="rgba(255,107,26,.09)" />
              <stop offset="100%" stopColor="rgba(255,107,26,0)" />
            </radialGradient>
          </defs>

          <rect width="100" height="100" fill="url(#court-floor)" />
          <rect width="100" height="100" fill="url(#court-lines)" />
          <rect x="3" y="4" width="94" height="92" rx="1.5" fill="none" stroke="rgba(255,255,255,.78)" strokeWidth=".8" />

          {/* Basket is at the TOP baseline, matching the coaching view. */}
          <rect x="31" y="4" width="38" height="37" fill="url(#paint-fill)" stroke="rgba(255,255,255,.7)" strokeWidth=".75" />
          <circle cx="50" cy="41" r="11.5" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth=".75" />
          <path d="M38.5 41A11.5 11.5 0 0 1 61.5 41" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth=".7" strokeDasharray="2 2" />

          {/* Three-point line opens toward midcourt. */}
          <path d="M12 4V18.5A38 38 0 0 0 88 18.5V4" fill="none" stroke="rgba(255,107,26,.9)" strokeWidth="1.25" filter="url(#orange-glow)" />
          <path d="M12 4V18.5M88 18.5V4" stroke="rgba(255,107,26,.95)" strokeWidth="1.25" />

          {/* Restricted area, backboard, rim and net */}
          <path d="M42 9A8 8 0 0 0 58 9" fill="none" stroke="rgba(255,255,255,.78)" strokeWidth=".75" />
          <rect x="42" y="13" width="16" height="1.5" rx=".4" fill="none" stroke="rgba(255,255,255,.92)" strokeWidth=".85" />
          <circle cx="50" cy="16.5" r="2.3" fill="none" stroke="rgba(255,107,26,1)" strokeWidth="1.15" filter="url(#orange-glow)" />
          <path d="M48.2 17.7L49 20L50 17.7L51 20L51.8 17.7" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth=".45" />

          {/* Midcourt reference at the bottom edge. */}
          <path d="M39 96A11 11 0 0 1 61 96" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".65" />
        </svg>

        {viewMode === 'heat' && filteredShots.map((shot) => (
          <span
            key={`heat-${shot.id}`}
            aria-hidden="true"
            className="absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rcl-orange/15 blur-xl"
            style={{ left: `${shot.shot_x}%`, top: `${shot.shot_y}%` }}
          />
        ))}

        {viewMode === 'shots' && filteredShots.map((shot) => (
          <ShotDot
            key={shot.id}
            shot={shot}
            selected={selectedShotId === shot.id}
            onSelect={() => setSelectedShotId(shot.id)}
          />
        ))}

        {pendingShot && (
          <span
            aria-hidden="true"
            className="absolute z-30 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-rcl-gold bg-rcl-gold/20 shadow-[0_0_24px_rgba(255,196,0,.45)]"
            style={{ left: `${pendingShot.x}%`, top: `${pendingShot.y}%` }}
          >
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rcl-gold" />
          </span>
        )}

        {pendingShot && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-40 -translate-x-1/2 rounded-full border border-rcl-gold/30 bg-[#10151d]/90 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-rcl-gold backdrop-blur">
            {zoneLabel(pendingShot.zone)} · Location selected
          </div>
        )}

        {!pendingShot && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-white/45 backdrop-blur">
            Tap floor to place shot
          </div>
        )}

        {selectedShot && (
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-40 rounded-2xl border border-white/10 bg-[#0b1119]/90 p-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Selected play</p>
                <p className="mt-1 text-xs font-black text-white">
                  {selectedShot.event_type === 'shot_made' ? 'MADE' : 'MISSED'} · {selectedShot.shot_value ?? 2}PT
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] uppercase text-white/25">{zoneLabel(selectedShot.shot_zone ?? 'unclassified')}</p>
                <p className="mt-1 text-[9px] font-black text-white/60">Q{selectedShot.period_number} · {Math.floor(selectedShot.clock_seconds / 60)}:{String(selectedShot.clock_seconds % 60).padStart(2, '0')}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 pb-4 text-[8px] font-black uppercase tracking-widest text-white/40">
        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full border border-emerald-200 bg-emerald-300/75" />Made</span>
        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full border border-rose-200 bg-rose-400/65" />Missed</span>
        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full border border-rcl-orange bg-rcl-orange/30" />Next shot</span>
        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full border border-dashed border-rcl-gold" />Player zone</span>
        <span className="ml-auto text-white/20">{filteredShots.length}/{shots.length} shown</span>
      </div>

      <div className="mx-3 mb-3 overflow-hidden rounded-[22px] border border-white/10 bg-[#0b1119]">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-white">How to use the shot chart</p>
        </div>
        <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['1', 'Select a player', 'Choose the team and player before logging a play.'],
            ['2', 'Tap the court', 'Tap the exact shot location. Orange marks the pending shot.'],
            ['3', 'Set the result', 'Use 2PT/3PT Made or Miss. The chart saves location, zone and result.'],
            ['4', 'View & analyze', 'Filter All, Made or Missed. Heat view reveals shooting concentration.'],
          ].map(([step, title, copy]) => (
            <div key={step} className="bg-[#0b1119] p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full border border-rcl-orange/60 text-[9px] font-black text-rcl-orange">{step}</span>
                <p className="text-[9px] font-black uppercase tracking-wider text-white">{title}</p>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-white/45">{copy}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 p-4">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-white">Court zones</p>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              ['At rim', '0–3 ft', 'Inside the paint around the basket.'],
              ['Midrange', '3–16 ft', 'Paint edge, elbows and midrange.'],
              ['Three point', 'Beyond arc', 'Shots outside the 3PT line.'],
              ['Key lines', 'Reference', 'Paint, free-throw line, rim and 3PT arc.'],
            ].map(([title, range, copy]) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/[.025] p-3">
                <p className="text-[9px] font-black uppercase text-white">{title}</p>
                <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-rcl-orange">{range}</p>
                <p className="mt-2 text-[9px] leading-4 text-white/35">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

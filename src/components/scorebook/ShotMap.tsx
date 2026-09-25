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
            <linearGradient id="arena-shell" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#05090d" /><stop offset="48%" stopColor="#101419" /><stop offset="100%" stopColor="#030609" />
            </linearGradient>
            <linearGradient id="hardwood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a8652f" /><stop offset="45%" stopColor="#c28243" /><stop offset="100%" stopColor="#8f5229" />
            </linearGradient>
            <linearGradient id="paint-dark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#18110e" /><stop offset="100%" stopColor="#101216" />
            </linearGradient>
            <pattern id="wood-planks" width="12" height="7" patternUnits="userSpaceOnUse">
              <rect width="12" height="7" fill="url(#hardwood)" />
              <path d="M0 0H12M0 7H12M6 0V7" stroke="rgba(32,15,7,.28)" strokeWidth=".25" />
              <path d="M1 2.2C3 1.6 4 2.8 6 2.1S9 1.8 11 2.4M1 5C3 4.5 5 5.5 7 4.8S10 4.4 12 5" fill="none" stroke="rgba(255,224,170,.10)" strokeWidth=".22" />
            </pattern>
            <pattern id="black-planks" width="10" height="7" patternUnits="userSpaceOnUse">
              <rect width="10" height="7" fill="#111216" />
              <path d="M0 0H10M0 7H10M5 0V7" stroke="rgba(255,255,255,.035)" strokeWidth=".25" />
            </pattern>
            <filter id="court-orange-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation=".85" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="rim-glow" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation=".65" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Industrial arena shell + hardwood playing surface. */}
          <rect width="100" height="100" fill="url(#arena-shell)" />
          <rect x="2" y="2" width="96" height="96" rx="2" fill="#090b0e" stroke="#ff641f" strokeWidth=".7" filter="url(#court-orange-glow)" />
          <rect x="8" y="6" width="84" height="88" fill="url(#wood-planks)" stroke="rgba(255,255,255,.88)" strokeWidth=".55" />
          <rect x="8" y="6" width="9" height="88" fill="url(#black-planks)" />
          <rect x="83" y="6" width="9" height="88" fill="url(#black-planks)" />
          <path d="M17 6V94M83 6V94" stroke="#ff641f" strokeWidth=".55" filter="url(#court-orange-glow)" />

          {/* RCL black paint and regulation half-court geometry. */}
          <rect x="36" y="6" width="28" height="37" fill="url(#paint-dark)" stroke="rgba(255,255,255,.92)" strokeWidth=".6" />
          <circle cx="50" cy="43" r="10.5" fill="none" stroke="rgba(255,255,255,.92)" strokeWidth=".6" />
          <path d="M39.5 43A10.5 10.5 0 0 0 60.5 43" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth=".55" strokeDasharray="1.7 1.7" />
          <path d="M18 6V22A36 36 0 0 0 82 22V6" fill="none" stroke="#ff641f" strokeWidth=".85" filter="url(#court-orange-glow)" />
          <path d="M18 6V22M82 22V6" stroke="rgba(255,255,255,.95)" strokeWidth=".42" />
          <path d="M43 13A7 7 0 0 0 57 13" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth=".55" />

          {/* Physical backboard, rim and net treatment from approved mockup. */}
          <rect x="43" y="8.5" width="14" height="2.1" rx=".25" fill="#e9e9e7" stroke="#fff" strokeWidth=".35" />
          <rect x="46.5" y="9.1" width="7" height="1" fill="none" stroke="#9d9d9b" strokeWidth=".25" />
          <path d="M50 10.6V13.1" stroke="#d9d9d6" strokeWidth=".6" />
          <ellipse cx="50" cy="14" rx="3.2" ry="1.35" fill="none" stroke="#ff641f" strokeWidth=".8" filter="url(#rim-glow)" />
          <path d="M47.2 14.6L48.3 18M48.5 14.9L49.4 18.5M50 15.2V18.8M51.5 14.9L50.6 18.5M52.8 14.6L51.7 18M48.3 18H51.7" fill="none" stroke="rgba(255,255,255,.88)" strokeWidth=".28" />

          {/* Midcourt mark and Richmond skyline silhouette. */}
          <path d="M39 94A11 11 0 0 1 61 94" fill="#121419" stroke="rgba(255,255,255,.8)" strokeWidth=".55" />
          <path d="M17 88L20 88V85H22V87H24V82H26V86H29V83H31V87H34V84H36V88H39V85H41V87H44V83H46V88H49V84H51V87H54V82H56V86H59V84H61V88H64V85H67V87H70V83H72V88H75V85H78V87H83V94H17Z" fill="#101216" opacity=".94" />
          <text x="12.6" y="72" transform="rotate(-90 12.6 72)" fill="rgba(255,255,255,.9)" fontSize="4.1" fontWeight="900" letterSpacing=".8">RICH CITY</text>
          <text x="87.4" y="29" transform="rotate(90 87.4 29)" fill="rgba(255,255,255,.9)" fontSize="4.1" fontWeight="900" letterSpacing=".65">LEAGUE</text>
          <text x="50" y="92.1" textAnchor="middle" fill="#ff641f" fontSize="4.8" fontWeight="900" fontStyle="italic">RCL</text>
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
            className="absolute z-30 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-rcl-orange bg-rcl-orange/20 shadow-[0_0_24px_rgba(255,100,31,.65)]"
            style={{ left: `${pendingShot.x}%`, top: `${pendingShot.y}%` }}
          >
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rcl-orange" />
          </span>
        )}

        {pendingShot && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-40 -translate-x-1/2 rounded-full border border-rcl-orange/40 bg-[#10151d]/95 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-rcl-orange backdrop-blur">
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

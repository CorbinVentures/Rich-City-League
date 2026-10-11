import type { CSSProperties } from 'react';
import type { RchTvBroadcast, RchTvMode } from '@/lib/rch-tv-broadcast';

export function RchBroadcastOverlay({ mode, config, showLive = false }: {
  mode: RchTvMode;
  config: RchTvBroadcast;
  showLive?: boolean;
}) {
  const styles = { '--rch-tv-accent': config.accent } as CSSProperties;
  const minimal = config.preset === 'minimal';
  const cinematic = config.preset === 'cinematic';

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between overflow-hidden text-white" style={styles} aria-label="RCH TV broadcast graphics">
      <div className="flex flex-wrap items-start justify-between gap-2 p-[3%]">
        <div className="rounded-lg border border-white/20 bg-[#071523]/90 px-3 py-2 shadow-xl backdrop-blur-sm">
          <span className="text-[clamp(9px,1.5vw,14px)] font-black tracking-[.14em]">RCH <span style={{ color: config.accent }}>TV</span></span>
          <span className="ml-2 text-[clamp(8px,1.1vw,11px)] font-bold uppercase opacity-70">{mode === 'the_pulse' ? 'THE PULSE' : 'GAME DAY'}</span>
        </div>
        {showLive && <div className="rounded-md bg-red-600 px-3 py-1.5 text-[clamp(9px,1.5vw,12px)] font-black tracking-widest">● LIVE</div>}
      </div>

      <div className="space-y-2 px-[3%] pb-[3%]">
        {mode === 'live_games' && config.showScoreboard && (
          <div className={`w-full max-w-[610px] overflow-hidden rounded-lg border border-white/20 bg-[#06121e]/95 shadow-2xl ${minimal ? 'ml-auto' : 'mx-auto'}`}>
            <div className="flex items-center justify-center gap-3 px-3 py-1 text-[clamp(9px,1.25vw,12px)] font-black tracking-widest" style={{ backgroundColor: config.accent, color: '#08121c' }}>
              <span>RCH TV</span><span className="opacity-70">•</span><span>{config.period}</span><span className="opacity-70">•</span><span>{config.clock}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 sm:py-3">
              <div className="min-w-0 truncate text-left text-[clamp(9px,1.7vw,17px)] font-black uppercase">{config.away}</div>
              <div className="flex items-center gap-2 font-mono text-[clamp(18px,3.5vw,38px)] font-black tabular-nums"><span>{config.awayScore}</span><span className="opacity-35">–</span><span>{config.homeScore}</span></div>
              <div className="min-w-0 truncate text-right text-[clamp(9px,1.7vw,17px)] font-black uppercase">{config.home}</div>
            </div>
          </div>
        )}

        {mode === 'the_pulse' && (
          <div className={`max-w-[85%] rounded-xl border border-white/20 bg-[#06121e]/90 px-4 py-2.5 shadow-xl ${minimal ? 'ml-auto' : ''}`}>
            <p className="text-[clamp(9px,1.2vw,12px)] font-black uppercase tracking-[.18em]" style={{ color: config.accent }}>RCH TV PRESENTS</p>
            <p className="mt-1 text-[clamp(14px,2.9vw,29px)] font-black uppercase tracking-tight">{config.title}</p>
            {config.topic && <p className="text-[clamp(9px,1.4vw,13px)] opacity-75">{config.topic}</p>}
            {config.guest && <p className="mt-1 text-[clamp(9px,1.5vw,14px)] font-bold" style={{ color: config.accent }}>GUEST: {config.guest}</p>}
          </div>
        )}

        {config.showLowerThird && config.lowerThird && (
          <div className={`inline-block max-w-[90%] rounded-r-md border-l-[5px] bg-[#071523]/90 px-4 py-2 text-[clamp(10px,1.6vw,17px)] font-black uppercase shadow-xl ${cinematic ? 'tracking-widest' : ''}`} style={{ borderLeftColor: config.accent }}>{config.lowerThird}</div>
        )}
        {config.showSponsor && config.sponsor && (
          <div className="w-fit rounded-lg border border-white/20 bg-black/85 px-3 py-1.5 text-[clamp(9px,1.3vw,12px)] font-bold">PRESENTED BY {config.sponsor}</div>
        )}
        {config.showTicker && config.ticker && (
          <div className="overflow-hidden rounded-md bg-[#071523]/95 px-4 py-2 text-[clamp(9px,1.45vw,14px)] font-semibold shadow-xl" style={{ borderBottom: `2px solid ${config.accent}` }}><span style={{ color: config.accent }} className="mr-3 font-black">RCH UPDATE</span>{config.ticker}</div>
        )}
      </div>
    </div>
  );
}

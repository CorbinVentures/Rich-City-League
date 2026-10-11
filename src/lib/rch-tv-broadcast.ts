export type RchTvMode = 'live_games' | 'the_pulse';
export type RchOverlayPreset = 'broadcast' | 'minimal' | 'cinematic';
export type RchTvBroadcast = {
  active: boolean;
  title: string;
  preset: RchOverlayPreset;
  accent: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  period: string;
  clock: string;
  showScoreboard: boolean;
  showLowerThird: boolean;
  showSponsor: boolean;
  showTicker: boolean;
  lowerThird: string;
  sponsor: string;
  ticker: string;
  topic: string;
  guest: string;
};

export const RCH_TV_MODES: Record<RchTvMode, { label: string; room: string; key: string }> = {
  live_games: { label: 'Live Games', room: 'rch-tv-live-games', key: 'rch_tv_broadcast_games' },
  the_pulse: { label: 'The Pulse', room: 'rch-tv-the-pulse', key: 'rch_tv_broadcast_pulse' },
};

export function isRchTvMode(value: unknown): value is RchTvMode {
  return value === 'live_games' || value === 'the_pulse';
}

const clean = (x: unknown, max: number, fallback = ''): string =>
  typeof x === 'string' ? x.trim().slice(0, max) : fallback;
const score = (x: unknown): number =>
  typeof x === 'number' && Number.isInteger(x) ? Math.min(999, Math.max(0, x)) : 0;

export function defaultRchTvBroadcast(mode: RchTvMode): RchTvBroadcast {
  return {
    active: false,
    title: mode === 'the_pulse' ? 'The Pulse — Weekly RCH TV Podcast' : 'RCH TV Live Basketball',
    preset: 'broadcast',
    accent: mode === 'the_pulse' ? '#f49b43' : '#91cef2',
    home: 'HOME', away: 'AWAY', homeScore: 0, awayScore: 0,
    period: '1ST', clock: '10:00', showScoreboard: true,
    showLowerThird: true, showSponsor: false, showTicker: false,
    lowerThird: mode === 'the_pulse' ? 'THE PULSE · RCH TV' : 'RICH CITY HOOPS · LIVE',
    sponsor: '', ticker: '',
    topic: 'Virginia basketball, every week', guest: '',
  };
}

export function parseRchTvBroadcast(mode: RchTvMode, value: unknown): RchTvBroadcast {
  const defaults = defaultRchTvBroadcast(mode);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const src = value as Record<string, unknown>;
  return {
    active: src.active === true,
    title: clean(src.title, 100, defaults.title) || defaults.title,
    preset: src.preset === 'minimal' || src.preset === 'cinematic' ? src.preset : 'broadcast',
    accent: typeof src.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(src.accent) ? src.accent : defaults.accent,
    home: clean(src.home, 22, defaults.home) || defaults.home,
    away: clean(src.away, 22, defaults.away) || defaults.away,
    homeScore: score(src.homeScore),
    awayScore: score(src.awayScore),
    period: clean(src.period, 12, defaults.period) || defaults.period,
    clock: clean(src.clock, 12, defaults.clock) || defaults.clock,
    showScoreboard: src.showScoreboard !== false,
    showLowerThird: src.showLowerThird !== false,
    showSponsor: src.showSponsor === true,
    showTicker: src.showTicker === true,
    lowerThird: clean(src.lowerThird, 90, defaults.lowerThird),
    sponsor: clean(src.sponsor, 80),
    ticker: clean(src.ticker, 160),
    topic: clean(src.topic, 100, defaults.topic),
    guest: clean(src.guest, 80),
  };
}

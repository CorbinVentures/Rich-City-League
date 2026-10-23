'use client';

import { useMemo, useState } from 'react';
import { FaArrowTrendUp, FaBrain, FaChartLine, FaCircleInfo, FaShieldHalved } from 'react-icons/fa6';
import { calculateFantasyPoints } from '../../lib/rcl-algorithms';

export type FantasyGameStat = {
  game_id: string;
  player_id: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
};
export type FantasyScoringRules = {
  points: number; rebounds: number; assists: number;
  steals: number; blocks: number; turnovers: number;
};

type RosterPlayer = {
  player_id: string;
  roster_slot: string;
  player?: { first_name: string; last_name: string; position: string | null } | null;
};
type Forecast = {
  player_id: string;
  games: number;
  estimate: number | null;
  low: number | null;
  high: number | null;
  confidence: 'early' | 'developing' | 'established' | 'none';
};

const positions = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
function n(value: number) { return Number(value.toFixed(1)); }

/** A transparent smoothed baseline, not a betting line or a guaranteed result.
 * Until games are complete, no forecast is displayed. Shrink sparse samples to
 * the official league-wide historical average (three pseudo-observations).
 */
export function buildFantasyForecasts(stats: FantasyGameStat[], rules: FantasyScoringRules): Map<string, Forecast> {
  const playerGames = new Map<string, number[]>();
  const leagueGames: number[] = [];
  const seen = new Set<string>();
  for (const row of stats) {
    const key = row.player_id + ':' + row.game_id;
    if (seen.has(key)) continue;
    seen.add(key);
    const score = calculateFantasyPoints(row, rules);
    if (!Number.isFinite(score)) continue;
    leagueGames.push(score);
    const games = playerGames.get(row.player_id) ?? [];
    games.push(score);
    playerGames.set(row.player_id, games);
  }
  const leagueMean = leagueGames.length
    ? leagueGames.reduce((a, b) => a + b, 0) / leagueGames.length : 0;
  const result = new Map<string, Forecast>();
  for (const [player_id, games] of playerGames) {
    const count = games.length;
    const avg = games.reduce((a, b) => a + b, 0) / count;
    const smoothed = (avg * count + leagueMean * 3) / (count + 3);
    const variance = count > 1
      ? games.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (count - 1)
      : 0;
    // Early samples get a wide provisional range; they are not statistically
    // calibrated prediction intervals and must not be labeled as such.
    const spread = Math.max(Math.sqrt(variance) * 1.28, smoothed * (count < 4 ? .5 : .25));
    result.set(player_id, {
      player_id, games: count, estimate: n(smoothed),
      low: n(Math.max(0, smoothed - spread)),
      high: n(smoothed + spread),
      confidence: count >= 8 ? 'established' : count >= 4 ? 'developing' : 'early',
    });
  }
  return result;
}

export function FantasyIntelligencePanel({
  roster, stats, scoringRules,
}: {
  roster: RosterPlayer[];
  stats: FantasyGameStat[];
  scoringRules: FantasyScoringRules;
}) {
  const [tab, setTab] = useState<'scout' | 'lineup'>('scout');
  const forecasts = useMemo(() => buildFantasyForecasts(stats, scoringRules), [stats, scoringRules]);
  const entries = useMemo(() => roster.map(item => ({
    ...item, forecast: forecasts.get(item.player_id),
    name: item.player ? item.player.first_name + ' ' + item.player.last_name : 'RCH athlete',
  })), [roster, forecasts]);
  const ranked = [...entries].sort((a, b) =>
    (b.forecast?.estimate ?? -1) - (a.forecast?.estimate ?? -1));
  const withData = entries.filter(item => item.forecast?.estimate !== undefined).length;
  const tips = positions.flatMap(position => {
    const starter = entries.find(item => item.roster_slot === 'starter'
      && item.player?.position?.toUpperCase() === position);
    const alternative = entries.filter(item => item.roster_slot === 'bench'
      && item.player?.position?.toUpperCase() === position)
      .sort((a, b) => (b.forecast?.estimate ?? 0) - (a.forecast?.estimate ?? 0))[0];
    if (!starter || !alternative) return [];
    if ((starter.forecast?.games ?? 0) < 3 || (alternative.forecast?.games ?? 0) < 3) return [];
    const advantage = (alternative.forecast?.estimate ?? 0) - (starter.forecast?.estimate ?? 0);
    return advantage >= 2 ? [{ position, starter: starter.name, alternative: alternative.name, advantage: n(advantage) }] : [];
  });

  return <section aria-labelledby="fantasy-intelligence-title" className="rounded-3xl border border-rcl-blue/25 bg-[linear-gradient(145deg,#071c2c,#05090f)] p-5 text-white shadow-[0_18px_70px_rgba(0,0,0,.22)] sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue"><FaBrain/> RCH Intelligence</p>
        <h2 id="fantasy-intelligence-title" className="mt-2 font-display text-3xl font-black uppercase">Your Front Office</h2>
        <p className="mt-2 max-w-xl text-xs leading-5 text-white/55">Scout the athletes on your roster with official completed-game data. Every estimate shows its evidence.</p>
      </div>
      <div className="rounded-xl border border-rcl-blue/20 bg-rcl-blue/10 px-3 py-2 text-xs font-bold text-rcl-blue">
        {withData}/{roster.length} players with history
      </div>
    </div>
    <div role="tablist" aria-label="Fantasy intelligence views" className="mt-5 flex gap-2 border-b border-white/10 pb-3">
      <button role="tab" aria-selected={tab === 'scout'} onClick={() => setTab('scout')} className={'min-h-11 rounded-xl px-4 text-xs font-black uppercase tracking-wider '+(tab==='scout'?'bg-rcl-orange text-black':'bg-white/5 text-white/65')}>Player Scout</button>
      <button role="tab" aria-selected={tab === 'lineup'} onClick={() => setTab('lineup')} className={'min-h-11 rounded-xl px-4 text-xs font-black uppercase tracking-wider '+(tab==='lineup'?'bg-rcl-orange text-black':'bg-white/5 text-white/65')}>Lineup IQ</button>
    </div>
    {tab === 'scout' ? <div role="tabpanel" className="mt-4 space-y-2">
      {ranked.map(item => <div key={item.player_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><strong className="truncate text-sm">{item.name}</strong><span className="text-[10px] text-white/40">{item.player?.position || '—'}</span></div>
          <p className="mt-1 text-[11px] text-white/45">{item.forecast
            ? item.forecast.games+' completed game'+(item.forecast.games===1?'':'s')+' · '+item.forecast.confidence+' sample'
            : 'Awaiting official completed games'}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase text-white/35">Est. fantasy pts/game</p>
          <strong className="font-display text-xl text-rcl-gold">{item.forecast ? item.forecast.estimate?.toFixed(1) : '—'}</strong>
          <p className="text-[10px] text-white/40">{item.forecast ? item.forecast.low+'–'+item.forecast.high+' provisional range' : 'Not enough data'}</p>
        </div>
      </div>)}
      {!entries.length && <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-white/45">Add athletes to your franchise to begin scouting.</p>}
    </div> : <div role="tabpanel" className="mt-4">
      <div className="grid gap-2 sm:grid-cols-5">
        {positions.map(position => {
          const item = entries.find(row => row.roster_slot === 'starter' && row.player?.position?.toUpperCase() === position);
          return <div key={position} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-rcl-blue">{position}</span>
            <p className="mt-2 text-xs font-bold">{item?.name || 'Open slot'}</p>
            <p className="mt-2 text-lg font-black text-rcl-gold">{item?.forecast?.estimate?.toFixed(1) ?? '—'}<span className="ml-1 text-[10px] font-normal text-white/35">est.</span></p>
          </div>;
        })}
      </div>
      <div className="mt-4 rounded-xl border border-rcl-blue/20 bg-rcl-blue/5 p-4">
        <p className="flex items-center gap-2 text-xs font-black uppercase text-rcl-blue"><FaArrowTrendUp/> Scouting notes</p>
        {tips.length ? <div className="mt-3 space-y-2">{tips.map(tip => <p key={tip.position} className="text-xs leading-6 text-white/75">{tip.position}: <strong>{tip.alternative}</strong> projects {tip.advantage} points above {tip.starter}. Consider a substitution before tip-off.</p>)}</div>
          : <p className="mt-2 text-xs leading-6 text-white/55">No evidence-backed positional swap is available yet. Build your roster and collect at least three completed games per compared athlete.</p>}
      </div>
    </div>}
    <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-black/25 p-3 text-[11px] leading-5 text-white/45">
      <FaCircleInfo className="mt-1 shrink-0 text-rcl-blue"/>
      <span>Estimates blend an athlete’s scored games with the league average to avoid overreacting to one performance. Ranges are illustrative, not calibrated odds. Only official finalized games are used; roster decisions remain yours.</span>
    </div>
    <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/35"><FaShieldHalved/><span>No sportsbook odds, wagers or artificial certainty.</span><FaChartLine/></div>
  </section>;
}

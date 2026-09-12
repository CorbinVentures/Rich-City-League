'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Game, Season, Standing, Team, Venue } from '@/types/database';
import { formatDate, formatTime } from '@/utils/helpers';

type View = 'schedule' | 'live' | 'results' | 'standings';
type Timeframe = 'all' | 'today' | 'this-week' | 'next-week';

export function GameCenterExperience({
  games,
  teams,
  seasons,
  standings,
  venues,
}: {
  games: Game[];
  teams: Team[];
  seasons: Season[];
  standings: Standing[];
  venues: Venue[];
}) {
  const [view, setView] = useState<View>('schedule');
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? '');
  const [timeframe, setTimeframe] = useState<Timeframe>('all');
  const [search, setSearch] = useState('');
  const selectedSeason = seasons.find((season) => season.id === seasonId);
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const venueById = useMemo(() => new Map(venues.map((venue) => [venue.id, venue])), [venues]);

  const seasonGames = games.filter((game) => !seasonId || game.season_id === seasonId);
  const filteredGames = seasonGames.filter((game) => {
    const date = new Date(game.scheduled_at);
    const now = new Date();
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const gameDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const days = Math.round((gameDay.getTime() - day.getTime()) / 86_400_000);
    const timeframeMatches = timeframe === 'all' || (timeframe === 'today' && days === 0) || (timeframe === 'this-week' && days >= 0 && days < 7) || (timeframe === 'next-week' && days >= 7 && days < 14);
    const haystack = `${teamById.get(game.home_team_id)?.name ?? ''} ${teamById.get(game.away_team_id)?.name ?? ''} ${venueById.get(game.venue_id ?? '')?.name ?? ''}`.toLowerCase();
    return timeframeMatches && (!search.trim() || haystack.includes(search.toLowerCase().trim()));
  });
  const liveGames = filteredGames.filter((game) => game.status === 'live');
  const results = filteredGames.filter((game) => game.status === 'completed').sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  const upcoming = filteredGames.filter((game) => !['completed', 'cancelled'].includes(game.status)).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const selectedStandings = standings.filter((standing) => !seasonId || standing.season_id === seasonId).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const todayGames = seasonGames.filter((game) => new Date(game.scheduled_at).toDateString() === new Date().toDateString());

  return (
    <main className="min-h-screen bg-[#080a0f]">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_80%_20%,rgba(244,120,32,.2),transparent_35%),linear-gradient(115deg,#080a0f,#101b31)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-rcl-gold">RCL Game Center</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-black uppercase leading-[.9] tracking-tight sm:text-7xl">Every game<br /><span className="text-rcl-gold">builds tomorrow.</span></h1>
          <p className="mt-6 max-w-xl text-sm uppercase tracking-[0.2em] text-gray-300">Scores. Schedule. Standings.<br />Richmond basketball. All year.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-2 overflow-x-auto border-b border-white/10 pb-2">
          {(['schedule', 'live', 'results', 'standings'] as View[]).map((item) => (
            <button key={item} onClick={() => setView(item)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] ${view === item ? 'border-rcl-gold text-rcl-gold' : 'border-transparent text-gray-500 hover:text-white'}`}>
              {item === 'live' ? `Live${liveGames.length ? ` · ${liveGames.length}` : ''}` : item}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[180px_1fr_280px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Season
            <select value={seasonId} onChange={(event) => setSeasonId(event.target.value)} className="mt-2 w-full border border-white/10 bg-white/[.04] px-3 py-3 text-sm text-white outline-none">
              {seasons.map((season) => <option key={season.id} value={season.id} className="bg-[#10131a]">{season.name}</option>)}
            </select>
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 pt-5">
            {(['all', 'today', 'this-week', 'next-week'] as Timeframe[]).map((item) => <button key={item} onClick={() => setTimeframe(item)} className={`whitespace-nowrap border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${timeframe === item ? 'border-rcl-gold bg-rcl-gold text-black' : 'border-white/10 text-gray-400'}`}>{item.replace('-', ' ')}</button>)}
          </div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Search teams, games
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search teams, venues..." className="mt-2 w-full border border-white/10 bg-white/[.04] px-3 py-3 text-sm text-white outline-none placeholder:text-gray-600" />
          </label>
        </div>

        <section className="mt-10 border border-white/10 bg-white/[.025] p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-gold">Today in RCL</p><h2 className="mt-2 font-display text-3xl font-black uppercase">{todayGames.length} {todayGames.length === 1 ? 'game' : 'games'} on deck</h2></div>
            <p className="text-xs uppercase tracking-widest text-gray-500">{todayGames.filter((game) => game.status === 'live').length} live · {todayGames.filter((game) => game.status === 'completed').length} final</p>
          </div>
        </section>

        {view === 'standings' ? <StandingsTable standings={selectedStandings} teamById={teamById} season={selectedSeason} /> : (
          <div className="mt-10 space-y-10">
            {view !== 'results' && liveGames.length > 0 && <section><SectionTitle title="Live now" /><div className="grid gap-4 md:grid-cols-2">{liveGames.map((game) => <GameCard key={game.id} game={game} teamById={teamById} venueById={venueById} live />)}</div></section>}
            {view !== 'results' && <section><SectionTitle title="Upcoming games" /><div className="grid gap-4 lg:grid-cols-2">{upcoming.map((game) => <GameCard key={game.id} game={game} teamById={teamById} venueById={venueById} />)}</div></section>}
            {view !== 'live' && <section><SectionTitle title="Recent results" /><div className="grid gap-4 lg:grid-cols-2">{results.map((game) => <GameCard key={game.id} game={game} teamById={teamById} venueById={venueById} />)}</div></section>}
            {!liveGames.length && !upcoming.length && !results.length && <EmptyState />}
          </div>
        )}
      </div>
    </main>
  );
}

function SectionTitle({ title }: { title: string }) { return <div className="mb-4 flex items-center gap-3"><span className="h-2 w-2 bg-rcl-gold" /><h2 className="font-display text-2xl font-black uppercase">{title}</h2></div>; }

function GameCard({ game, teamById, venueById, live }: { game: Game; teamById: Map<string, Team>; venueById: Map<string, Venue>; live?: boolean }) {
  const home = teamById.get(game.home_team_id);
  const away = teamById.get(game.away_team_id);
  const venue = venueById.get(game.venue_id ?? '');
  return <Link href={`/games/${game.id}`} className={`block border p-5 transition hover:border-rcl-gold/70 ${live ? 'border-rcl-gold/60 bg-rcl-gold/[.06]' : 'border-white/10 bg-white/[.025]'}`}>
    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500"><span className={game.status === 'live' ? 'text-red-400' : 'text-rcl-gold'}>{game.status === 'live' ? '● Live now' : game.status}</span><span>{formatDate(game.scheduled_at)} · {formatTime(game.scheduled_at)}</span></div>
    <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div><p className="font-display text-xl font-black uppercase">{away?.short_name ?? away?.name ?? 'Away team'}</p>{game.status === 'completed' && <p className="mt-1 font-display text-4xl font-black">{game.away_score}</p>}</div><span className="text-xs font-black text-gray-600">VS</span><div className="text-right"><p className="font-display text-xl font-black uppercase">{home?.short_name ?? home?.name ?? 'Home team'}</p>{game.status === 'completed' && <p className="mt-1 font-display text-4xl font-black">{game.home_score}</p>}</div></div>
    <p className="mt-5 border-t border-white/10 pt-3 text-xs uppercase tracking-wider text-gray-500">{venue?.name ?? 'Venue TBA'}{venue?.city ? ` · ${venue.city}` : ''}<span className="float-right text-rcl-gold">Game details →</span></p>
  </Link>;
}

function StandingsTable({ standings, teamById, season }: { standings: Standing[]; teamById: Map<string, Team>; season?: Season }) {
  return <section className="mt-10"><SectionTitle title={`RCL standings${season ? ` · ${season.name}` : ''}`} /><div className="overflow-x-auto border border-white/10"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-white/[.04] text-[10px] uppercase tracking-widest text-gray-500"><tr>{['#', 'Team', 'W', 'L', 'Win %', 'PF', 'PA', 'Diff', 'Streak'].map((heading) => <th key={heading} className="px-4 py-4">{heading}</th>)}</tr></thead><tbody>{standings.map((standing) => { const games = standing.wins + standing.losses; return <tr key={standing.id} className="border-t border-white/5"><td className="px-4 py-4 text-rcl-gold">{standing.rank ?? '—'}</td><td className="px-4 py-4 font-bold">{teamById.get(standing.team_id)?.name ?? 'Team'}</td><td className="px-4 py-4">{standing.wins}</td><td className="px-4 py-4">{standing.losses}</td><td className="px-4 py-4">{games ? `${Math.round((standing.wins / games) * 100)}%` : '—'}</td><td className="px-4 py-4">{standing.points_for}</td><td className="px-4 py-4">{standing.points_against}</td><td className="px-4 py-4">{standing.points_for - standing.points_against}</td><td className="px-4 py-4 text-gray-400">{standing.streak ?? '—'}</td></tr>; })}</tbody></table>{!standings.length && <p className="p-10 text-center text-gray-500">Standings will appear after official results are recorded.</p>}</div></section>;
}

function EmptyState() { return <div className="border border-dashed border-white/15 px-6 py-16 text-center"><p className="text-xs font-black uppercase tracking-[.3em] text-rcl-gold">Game center</p><h2 className="mt-3 font-display text-3xl font-black uppercase">The season is loading.</h2><p className="mx-auto mt-3 max-w-lg text-sm text-gray-500">Official RCL games, schedules, and results will appear here once the league schedule is published.</p><p className="mt-8 text-xs font-black uppercase tracking-widest text-gray-400">Schedule → Tipoff → Live → Final → Stats → Standings</p></div>; }

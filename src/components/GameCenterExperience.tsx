'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { Game, Season, Standing, Team, Venue } from '@/types/database';
import { formatDate, formatTime } from '@/utils/helpers';
import { FaArrowRight, FaBasketball, FaLocationDot } from 'react-icons/fa6';

type View = 'schedule' | 'live' | 'results' | 'standings';
type Timeframe = 'all' | 'today' | 'this-week' | 'next-week';

export function GameCenterExperience({ games, teams, seasons, standings, venues }: { games: Game[]; teams: Team[]; seasons: Season[]; standings: Standing[]; venues: Venue[] }) {
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

  return <main className="rcl-mock-page rcl-games-page min-h-screen bg-rcl-black pb-24 text-white">
    <header className="border-b border-rcl-blue/12 bg-[#071018]/88">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:py-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-rcl-blue/65">Competition</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Game Center</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">Schedule, live scores, results and standings in one official view.</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-lg border border-rcl-blue/15 bg-rcl-blue/[.05] px-3 py-2 text-white/55"><b className="mr-1 text-white">{todayGames.length}</b> today</span>
          <span className="rounded-lg border border-rcl-blue/15 bg-rcl-blue/[.05] px-3 py-2 text-white/55"><b className="mr-1 text-rcl-blue">{todayGames.filter((game) => game.status === 'live').length}</b> live</span>
        </div>
      </div>
    </header>

    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/50">
        <div className="flex flex-wrap gap-1 border-b border-white/10 p-2">
          {(['schedule', 'live', 'results', 'standings'] as View[]).map((item) => <button key={item} onClick={() => setView(item)} className={`min-h-11 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-[.08em] transition ${view === item ? 'bg-rcl-blue text-[#071018]' : 'text-white/40 hover:bg-rcl-blue/5 hover:text-white'}`}>{item === 'live' ? `Live${liveGames.length ? ` · ${liveGames.length}` : ''}` : item}</button>)}
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[190px_1fr_280px] md:p-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/35">Season<select value={seasonId} onChange={(event) => setSeasonId(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-rcl-blue/15 bg-[#050b12] px-3 text-sm text-white outline-none focus:border-rcl-blue/60">{seasons.map((season) => <option key={season.id} value={season.id} className="bg-[#071522]">{season.name}</option>)}</select></label>
          <div className="flex flex-wrap gap-2 pb-1 pt-5">{(['all', 'today', 'this-week', 'next-week'] as Timeframe[]).map((item) => <button key={item} onClick={() => setTimeframe(item)} className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[.06em] transition ${timeframe === item ? 'border-rcl-blue/45 bg-rcl-blue text-[#071018]' : 'border-white/10 text-white/40 hover:border-rcl-blue/35 hover:text-white'}`}>{item.replace('-', ' ')}</button>)}</div>
          <label className="text-xs font-semibold uppercase tracking-wider text-white/35">Search teams, games<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search teams, venues..." className="mt-2 h-12 w-full rounded-xl border border-rcl-blue/15 bg-[#050b12] px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-rcl-blue/60" /></label>
        </div>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <SnapshotCard label="Games today" value={todayGames.length} accent="blue" />
        <SnapshotCard label="Live now" value={todayGames.filter((game) => game.status === 'live').length} accent="blue" />
        <SnapshotCard label="Final today" value={todayGames.filter((game) => game.status === 'completed').length} />
      </section>

      {view === 'standings' ? <StandingsTable standings={selectedStandings} teamById={teamById} season={selectedSeason} /> : <div className="mt-10 space-y-10">
        {view !== 'results' && liveGames.length > 0 && <section><SectionTitle title="Live now" eyebrow="On court" /><div className="grid gap-4 md:grid-cols-2">{liveGames.map((game) => <GameCard key={game.id} game={game} teamById={teamById} venueById={venueById} live />)}</div></section>}
        {view !== 'results' && <section><SectionTitle title="Upcoming games" eyebrow="Next up" /><div className="grid gap-4 lg:grid-cols-2">{upcoming.map((game) => <GameCard key={game.id} game={game} teamById={teamById} venueById={venueById} />)}</div></section>}
        {view !== 'live' && <section><SectionTitle title="Recent results" eyebrow="Official finals" /><div className="grid gap-4 lg:grid-cols-2">{results.map((game) => <GameCard key={game.id} game={game} teamById={teamById} venueById={venueById} />)}</div></section>}
        {!liveGames.length && !upcoming.length && !results.length && <EmptyState />}
      </div>}
    </div>
  </main>;
}

function SnapshotCard({ label, value, accent }: { label: string; value: number; accent?: 'blue' }) {
  return <div className="rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-5"><p className="text-xs font-semibold uppercase tracking-[.12em] text-white/35">{label}</p><div className="mt-2 flex items-end justify-between"><p className="font-display text-4xl font-semibold">{value}</p><FaBasketball className={accent === 'blue' ? 'text-rcl-blue/55' : 'text-white/15'} /></div></div>;
}

function SectionTitle({ title, eyebrow }: { title: string; eyebrow: string }) { return <div className="mb-4"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-rcl-blue/60">{eyebrow}</p><h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{title}</h2></div>; }

function GameCard({ game, teamById, venueById, live }: { game: Game; teamById: Map<string, Team>; venueById: Map<string, Venue>; live?: boolean }) {
  const home = teamById.get(game.home_team_id);
  const away = teamById.get(game.away_team_id);
  const venue = venueById.get(game.venue_id ?? '');
  return <Link href={`/games/${game.id}`} className={`group block overflow-hidden rounded-2xl border p-5 shadow-[0_16px_45px_rgba(0,0,0,.14)] transition hover:-translate-y-1 ${live ? 'border-rcl-blue/35 bg-rcl-blue/[.04]' : 'border-rcl-blue/15 bg-[#071522]/55 hover:border-rcl-blue/40'}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-white/35"><span className={game.status === 'live' ? 'text-rcl-blue' : 'text-white/45'}>{game.status === 'live' ? '● Live now' : game.status}</span><span>{formatDate(game.scheduled_at)} · {formatTime(game.scheduled_at)}</span></div>
    <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <TeamScore team={away} score={game.status === 'completed' ? game.away_score : undefined} />
      <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-white/25">VS</span>
      <TeamScore team={home} score={game.status === 'completed' ? game.home_score : undefined} align="right" />
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs uppercase tracking-wider text-white/35"><span className="inline-flex items-center gap-2"><FaLocationDot className="text-rcl-blue" />{venue?.name ?? 'Venue TBA'}{venue?.city ? ` · ${venue.city}` : ''}</span><span className="inline-flex items-center gap-2 font-semibold text-rcl-blue">Game details <FaArrowRight className="transition group-hover:translate-x-1"/></span></div>
  </Link>;
}

function TeamScore({ team, score, align = 'left' }: { team?: Team; score?: number | null; align?: 'left' | 'right' }) {
  const logo = team?.logo_url ? <Image src={team.logo_url} alt={`${team.name} logo`} width={48} height={48} sizes="48px" className="h-12 w-12 shrink-0 rounded-xl border border-white/10 bg-black/35 object-contain p-1" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-rcl-blue/5 font-display text-sm font-semibold text-rcl-blue">{(team?.short_name ?? team?.name ?? 'RCL').slice(0,2).toUpperCase()}</span>;
  const copy = <div className={align === 'right' ? 'text-right' : ''}><p className="font-display text-lg font-semibold leading-tight sm:text-xl">{team?.short_name ?? team?.name ?? (align === 'right' ? 'Home team' : 'Away team')}</p>{score !== undefined && <p className="mt-1 font-display text-4xl font-semibold">{score}</p>}</div>;
  return <div className={`flex min-w-0 items-center gap-3 ${align === 'right' ? 'justify-end' : ''}`}>{align === 'right' ? <>{copy}{logo}</> : <>{logo}{copy}</>}</div>;
}

function StandingsTable({ standings, teamById, season }: { standings: Standing[]; teamById: Map<string, Team>; season?: Season }) {
  return <section className="mt-10"><SectionTitle title={`RCL standings${season ? ` · ${season.name}` : ''}`} eyebrow="League table"/><div className="overflow-x-auto rounded-2xl border border-rcl-blue/15 bg-[#071522]/55"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-rcl-blue/[.055] text-xs uppercase tracking-widest text-white/35"><tr>{['#', 'Team', 'W', 'L', 'Win %', 'PF', 'PA', 'Diff', 'Streak'].map((heading) => <th key={heading} className="px-4 py-4">{heading}</th>)}</tr></thead><tbody>{standings.map((standing) => { const games = standing.wins + standing.losses; return <tr key={standing.id} className="border-t border-white/10 transition hover:bg-rcl-blue/[.035]"><td className="px-4 py-4 font-display font-semibold text-rcl-blue">{standing.rank ?? '—'}</td><td className="px-4 py-4 font-bold">{teamById.get(standing.team_id)?.name ?? 'Team'}</td><td className="px-4 py-4">{standing.wins}</td><td className="px-4 py-4">{standing.losses}</td><td className="px-4 py-4">{games ? `${Math.round((standing.wins / games) * 100)}%` : '—'}</td><td className="px-4 py-4">{standing.points_for}</td><td className="px-4 py-4">{standing.points_against}</td><td className="px-4 py-4">{standing.points_for - standing.points_against}</td><td className="px-4 py-4 text-white/45">{standing.streak ?? '—'}</td></tr>; })}</tbody></table>{!standings.length && <p className="p-10 text-center text-sm text-white/40">Standings will appear after official results are recorded.</p>}</div></section>;
}

function EmptyState() { return <div className="rounded-2xl border border-dashed border-rcl-blue/25 bg-rcl-blue/[.035] px-6 py-14 text-center"><FaBasketball className="mx-auto text-3xl text-rcl-blue/55"/><h2 className="mt-3 font-display text-2xl font-semibold">The schedule is being built.</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/40">Official RCL games, schedules and results will appear here once the league schedule is published.</p></div>; }

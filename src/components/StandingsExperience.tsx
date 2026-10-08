'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Division, Game, Season, Standing, Team, TeamSeason, Venue } from '@/types/database';
import { formatDate } from '@/utils/helpers';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { FaArrowRight, FaChartSimple, FaShieldHalved, FaTrophy } from 'react-icons/fa6';

type Props = {
  seasons: Season[];
  divisions: Division[];
  teams: Team[];
  teamSeasons: TeamSeason[];
  standings: Standing[];
  games: Game[];
  venues: Venue[];
};

export function StandingsExperience({ seasons, divisions, teams, teamSeasons, standings, games, venues }: Props) {
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? '');
  const [divisionId, setDivisionId] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const selectedSeason = seasons.find((season) => season.id === seasonId);
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const divisionById = useMemo(() => new Map(divisions.map((division) => [division.id, division])), [divisions]);
  const seasonDivisions = divisions.filter((division) => division.season_id === seasonId);
  const seasonStandings = standings
    .filter((standing) => standing.season_id === seasonId && (divisionId === 'all' || standing.division_id === divisionId))
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || b.wins - a.wins || b.points_for - b.points_against - (a.points_for - a.points_against) || a.team_id.localeCompare(b.team_id));
  const officialGames = games.filter((game) => game.season_id === seasonId && game.status === 'completed');
  const recentGames = [...officialGames].sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)).slice(0, 5);
  const stats = seasonStandings.map((standing) => ({ standing, team: teamById.get(standing.team_id), currentStreak: currentStreak(standing.team_id, officialGames) })).filter((item) => item.team);
  const topOffense = [...stats].sort((a, b) => b.standing.points_for - a.standing.points_for)[0];
  const topDefense = [...stats].sort((a, b) => a.standing.points_against - b.standing.points_against)[0];
  const longestStreak = [...stats].sort((a, b) => streakValue(b.currentStreak) - streakValue(a.currentStreak))[0];
  const updatedAt = [...seasonStandings].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]?.updated_at;
  const hasTeams = teamSeasons.some((item) => item.season_id === seasonId && (divisionId === 'all' || item.division_id === divisionId));
  const noResults = hasTeams && officialGames.length === 0;

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow="Official RCL League Table"
      title="Standings"
      accent="The race through Richmond"
      description="Official records, division placement, point differential, streaks, and recent results—calculated from completed RCL games."
      assetKey="league.cover"
      meta={<div className="min-w-48 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.18em] text-white/35">Season</p><p className="mt-1 font-display text-xl font-black uppercase">{selectedSeason?.name ?? 'RCL'}</p><p className="mt-2 text-xs text-rcl-blue">{officialGames.length} official finals</p></div>}
    />

    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <nav aria-label="Standings navigation" className="flex gap-2 overflow-x-auto rounded-2xl border border-rcl-blue/15 bg-[#071522]/45 p-2 text-xs font-black uppercase tracking-[.12em]">
        <span className="whitespace-nowrap rounded-xl bg-rcl-orange px-4 py-3 text-black">Standings</span>
        <Link href="/rankings" className="whitespace-nowrap rounded-xl px-4 py-3 text-white/40 transition hover:bg-rcl-blue/5 hover:text-white">Rankings</Link>
        <Link href="/stats" className="whitespace-nowrap rounded-xl px-4 py-3 text-white/40 transition hover:bg-rcl-blue/5 hover:text-white">Stats</Link>
        <Link href="/games" className="whitespace-nowrap rounded-xl px-4 py-3 text-white/40 transition hover:bg-rcl-blue/5 hover:text-white">Game Center</Link>
      </nav>

      <section className="mt-6 grid gap-3 rounded-2xl border border-rcl-blue/15 bg-[#071522]/45 p-4 md:grid-cols-3">
        <Filter label="Season" value={seasonId} onChange={(value) => { setSeasonId(value); setDivisionId('all'); }} options={seasons.map((season) => [season.id, season.name])} />
        <Filter label="Division" value={divisionId} onChange={setDivisionId} options={[['all', 'All divisions'], ...seasonDivisions.map((division) => [division.id, division.name] as [string, string])]} />
        <div className="rounded-xl border border-rcl-blue/15 bg-[#050b12] px-4 py-3"><p className="text-xs font-black uppercase tracking-widest text-white/30">View</p><p className="mt-2 text-sm font-black uppercase">Regular season</p></div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <FeatureCard icon={<FaChartSimple/>} label="Top offense" value={topOffense ? topOffense.standing.points_for.toLocaleString() : '—'} suffix="PTS" team={topOffense?.team} />
        <FeatureCard icon={<FaShieldHalved/>} label="Top defense" value={topDefense ? topDefense.standing.points_against.toLocaleString() : '—'} suffix="PTS ALLOWED" team={topDefense?.team} />
        <FeatureCard icon={<FaTrophy/>} label={longestStreak ? 'Current streak' : 'Longest streak'} value={longestStreak?.standing.streak ?? '—'} suffix="" team={longestStreak?.team} />
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">Official results</p><h2 className="mt-1 font-display text-3xl font-black uppercase sm:text-4xl">League standings</h2></div><p className="text-xs font-black uppercase tracking-wider text-white/30">{updatedAt ? `Updated ${formatDate(updatedAt)}` : 'Awaiting official results'}</p></div>
        {stats.length > 0 ? <div className="mt-5 overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/55">
          <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="bg-rcl-blue/[.055] text-xs uppercase tracking-widest text-white/35"><tr>{['#', 'Team', 'Div', 'W', 'L', 'PCT', 'PF', 'PA', 'DIFF', 'Streak'].map((heading) => <th key={heading} className="px-4 py-4">{heading}</th>)}</tr></thead><tbody>{stats.map(({ standing, team, currentStreak }, index) => <DesktopRow key={standing.id} standing={standing} team={team!} division={divisionById.get(standing.division_id ?? '')?.name} streak={currentStreak} rank={index + 1} />)}</tbody></table></div>
          <div className="divide-y divide-white/10 md:hidden">{stats.map(({ standing, team, currentStreak }, index) => <MobileRow key={standing.id} standing={standing} team={team!} division={divisionById.get(standing.division_id ?? '')?.name} streak={currentStreak} rank={index + 1} open={expanded === standing.id} onToggle={() => setExpanded(expanded === standing.id ? null : standing.id)} />)}</div>
        </div> : <EmptyState hasTeams={hasTeams} noResults={noResults} />}
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div><div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">Latest finals</p><h2 className="mt-1 font-display text-3xl font-black uppercase">Recent games</h2></div><Link href="/games" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rcl-blue">Game Center <FaArrowRight/></Link></div><div className="mt-4 space-y-2">{recentGames.length ? recentGames.map((game) => <RecentGame key={game.id} game={game} teamById={teamById} venue={venues.find((venue) => venue.id === game.venue_id)} />) : <div className="rounded-2xl border border-dashed border-rcl-blue/20 bg-rcl-blue/[.03] p-8 text-sm text-white/35">No official games for this selection yet.</div>}</div></div>
        <aside className="rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-7 sm:p-9"><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">Rich City League</p><h2 className="mt-4 font-display text-4xl font-black uppercase leading-[.9]">More than a league.<br/><span className="text-rcl-blue">A stronger Richmond.</span></h2><p className="mt-5 text-sm leading-6 text-white/40">Every official result moves the table. Every game adds another chapter to the city.</p><p className="mt-6 text-xs font-black uppercase tracking-[.16em] text-white/55">Competition · Opportunity · Community</p></aside>
      </section>
    </div>
  </main>;
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="rounded-xl border border-rcl-blue/15 bg-[#050b12] px-4 py-3 text-xs font-black uppercase tracking-widest text-white/30">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 block h-8 w-full bg-transparent text-sm font-bold uppercase tracking-normal text-white outline-none">{options.map(([key, name]) => <option key={key} value={key} className="bg-[#071522]">{name}</option>)}</select></label>;
}

function FeatureCard({ icon, label, value, suffix, team }: { icon: React.ReactNode; label: string; value: string; suffix: string; team?: Team }) {
  return <div className="rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-5"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">{label}</p><span className="text-rcl-blue/45">{icon}</span></div>{team ? <Link href={`/teams/${team.slug}`} className="mt-4 block font-display text-xl font-black uppercase transition hover:text-rcl-blue">{team.name}</Link> : <p className="mt-4 text-sm text-white/35">No official results</p>}<p className="mt-3 font-display text-4xl font-black">{value} <span className="text-xs text-white/30">{suffix}</span></p></div>;
}

function DesktopRow({ standing, team, division, streak, rank }: { standing: Standing; team: Team; division?: string; streak: string | null; rank: number }) {
  const pct = percentage(standing); const diff = standing.points_for - standing.points_against;
  return <tr className={`border-t border-white/10 transition hover:bg-rcl-blue/[.035] ${rank === 1 ? 'bg-rcl-orange/[.04]' : ''}`}><td className="px-4 py-5 font-display text-xl font-black text-rcl-orange">{rank}</td><td className="px-4 py-5"><TeamLink team={team} /></td><td className="px-4 py-5 text-xs uppercase text-white/35">{division ?? '—'}</td><td className="px-4 py-5 font-bold">{standing.wins}</td><td className="px-4 py-5">{standing.losses}</td><td className="px-4 py-5 font-bold">{pct}</td><td className="px-4 py-5">{standing.points_for}</td><td className="px-4 py-5">{standing.points_against}</td><td className={diff >= 0 ? 'px-4 py-5 text-emerald-400' : 'px-4 py-5 text-rose-400'}>{diff >= 0 ? '+' : ''}{diff}</td><td className="px-4 py-5 font-bold text-white/55">{streak ?? '—'}</td></tr>;
}

function MobileRow({ standing, team, division, streak, rank, open, onToggle }: { standing: Standing; team: Team; division?: string; streak: string | null; rank: number; open: boolean; onToggle: () => void }) {
  const diff = standing.points_for - standing.points_against;
  return <button type="button" onClick={onToggle} aria-expanded={open} className="block w-full p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-rcl-blue"><span className="grid grid-cols-[2rem_1fr_auto] items-center gap-3"><span className="font-display text-xl font-black text-rcl-orange">{rank}</span><span><TeamLink team={team} /><span className="block text-xs uppercase tracking-wider text-white/30">{division ?? 'All divisions'}</span></span><span className="text-right"><strong>{standing.wins}–{standing.losses}</strong><small className="block text-xs text-white/30">{percentage(standing)}</small></span></span>{open && <span className="mt-4 grid grid-cols-4 gap-2 border-t border-white/10 pt-4 text-center text-xs uppercase tracking-wider text-white/30"><span>PF<strong className="mt-1 block text-white">{standing.points_for}</strong></span><span>PA<strong className="mt-1 block text-white">{standing.points_against}</strong></span><span>Diff<strong className={`mt-1 block ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{diff >= 0 ? '+' : ''}{diff}</strong></span><span>Streak<strong className="mt-1 block text-white">{streak ?? '—'}</strong></span></span>}</button>;
}

function TeamLink({ team }: { team: Team }) {
  return <Link href={`/teams/${team.slug}`} onClick={(event) => event.stopPropagation()} className="flex items-center gap-3 font-bold uppercase transition hover:text-rcl-blue">{team.logo_url ? <Image src={team.logo_url} alt="" width={28} height={28} className="h-7 w-7 rounded-lg border border-white/10 object-cover" /> : <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 text-xs font-black text-white" style={{ backgroundColor: team.primary_color ?? '#071522' }} aria-hidden="true">{team.name.slice(0,1)}</span>}{team.name}</Link>;
}

function RecentGame({ game, teamById, venue }: { game: Game; teamById: Map<string, Team>; venue?: Venue }) {
  const home = teamById.get(game.home_team_id); const away = teamById.get(game.away_team_id);
  return <Link href={`/games/${game.id}`} className="group grid gap-3 rounded-xl border border-rcl-blue/15 bg-[#071522]/45 p-4 transition hover:border-rcl-blue/40 sm:grid-cols-[5rem_1fr_auto_1fr] sm:items-center"><span className="text-xs font-black uppercase tracking-wider text-white/30">{formatDate(game.scheduled_at)}</span><span className="font-bold uppercase sm:text-right">{away?.short_name ?? away?.name ?? 'Away'}</span><span className="font-display text-xl font-black">{game.away_score}–{game.home_score}</span><span className="font-bold uppercase">{home?.short_name ?? home?.name ?? 'Home'}<small className="mt-1 block text-xs font-normal uppercase text-white/30">{venue?.name ?? 'Venue TBA'}</small></span></Link>;
}

function EmptyState({ hasTeams, noResults }: { hasTeams: boolean; noResults: boolean }) {
  return <div className="mt-5 rounded-2xl border border-dashed border-rcl-blue/25 bg-rcl-blue/[.035] p-10 text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">{hasTeams ? 'Season opens soon' : 'RCL standings'}</p><h3 className="mt-4 font-display text-3xl font-black uppercase">{hasTeams ? 'The table is waiting.' : 'No teams registered'}</h3><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/40">{noResults ? 'Teams are registered, but official standings begin once games are completed.' : hasTeams ? 'Official standings will populate as RCL games are completed and results are recorded.' : 'The official RCL standings will appear once teams are assigned to this season.'}</p></div>;
}

function percentage(standing: Standing) { const games = standing.wins + standing.losses; return games ? (standing.wins / games).toFixed(3).replace(/^0/, '') : '.000'; }
function streakValue(streak: string | null) { const match = streak?.match(/([WL])(\d+)/i); return match ? Number(match[2]) * (match[1].toUpperCase() === 'W' ? 1 : 0) : 0; }
function currentStreak(teamId: string, games: Game[]) { const teamGames = games.filter((game) => game.home_team_id === teamId || game.away_team_id === teamId).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)); if (!teamGames.length) return null; const firstResult = resultFor(teamId, teamGames[0]); let count = 0; for (const game of teamGames) { if (resultFor(teamId, game) !== firstResult) break; count += 1; } return `${firstResult}${count}`; }
function resultFor(teamId: string, game: Game) { const score = game.home_team_id === teamId ? game.home_score : game.away_score; const opponentScore = game.home_team_id === teamId ? game.away_score : game.home_score; return score === opponentScore ? 'T' : score > opponentScore ? 'W' : 'L'; }

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Division, Game, Season, Standing, Team, TeamSeason, Venue } from '@/types/database';
import { formatDate } from '@/utils/helpers';

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
  const filteredTeamIds = new Set(seasonStandings.map((standing) => standing.team_id));
  const stats = seasonStandings.map((standing) => ({
    standing,
    team: teamById.get(standing.team_id),
  })).filter((item) => item.team);
  const topOffense = [...stats].sort((a, b) => b.standing.points_for - a.standing.points_for)[0];
  const topDefense = [...stats].sort((a, b) => a.standing.points_against - b.standing.points_against)[0];
  const longestStreak = [...stats].sort((a, b) => streakValue(b.standing.streak) - streakValue(a.standing.streak))[0];
  const updatedAt = [...seasonStandings].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]?.updated_at;
  const hasTeams = teamSeasons.some((item) => item.season_id === seasonId && (divisionId === 'all' || item.division_id === divisionId));
  const noResults = hasTeams && officialGames.length === 0;

  return (
    <main className="min-h-screen bg-rcl-black text-white">
      <section className="rcl-standings-hero relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 opacity-25 [background:repeating-linear-gradient(115deg,transparent_0_5rem,rgba(255,107,26,.25)_5.1rem_5.2rem,transparent_5.3rem_10rem)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <p className="rcl-kicker">Official RCL league table</p>
          <h1 className="rcl-display mt-5 max-w-3xl text-6xl uppercase leading-[.86] sm:text-8xl">RCL<br /><span className="text-rcl-gold">Standings</span></h1>
          <p className="mt-6 max-w-lg text-sm font-bold uppercase tracking-[.18em] text-gray-300">A stronger Richmond.<br />Competition builds community.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <nav aria-label="Standings navigation" className="flex gap-6 overflow-x-auto border-b border-white/10 pb-4 text-xs font-black uppercase tracking-[.16em]">
          <span className="border-b-2 border-rcl-gold pb-4 text-rcl-gold">Standings</span>
          <Link href="/rankings" className="pb-4 text-gray-500 hover:text-white">Player stats</Link>
          <Link href="/games" className="pb-4 text-gray-500 hover:text-white">Recent games</Link>
          <Link href="/games" className="pb-4 text-gray-500 hover:text-white">Game center →</Link>
        </nav>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <Filter label="Season" value={seasonId} onChange={(value) => { setSeasonId(value); setDivisionId('all'); }} options={seasons.map((season) => [season.id, season.name])} />
          <Filter label="Division" value={divisionId} onChange={setDivisionId} options={[['all', 'All divisions'], ...seasonDivisions.map((division) => [division.id, division.name] as [string, string])]} />
          <div className="border border-white/10 bg-white/[.03] px-4 py-3"><p className="text-[10px] font-black uppercase tracking-widest text-gray-500">View</p><p className="mt-2 text-sm font-bold uppercase">Regular season</p></div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <FeatureCard label="Top offense" value={topOffense ? topOffense.standing.points_for.toLocaleString() : '—'} suffix="PTS" team={topOffense?.team} />
          <FeatureCard label="Top defense" value={topDefense ? topDefense.standing.points_against.toLocaleString() : '—'} suffix="PTS ALLOWED" team={topDefense?.team} />
          <FeatureCard label={longestStreak ? 'Current streak' : 'Longest streak'} value={longestStreak?.standing.streak ?? '—'} suffix="" team={longestStreak?.team} />
        </div>

        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="rcl-kicker">Official results</p><h2 className="rcl-display mt-2 text-4xl uppercase">League standings</h2></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{updatedAt ? `Updated ${formatDate(updatedAt)}` : 'Awaiting official results'}</p>
          </div>
          {stats.length > 0 ? (
            <div className="mt-5 overflow-hidden border border-white/10 bg-white/[.025]">
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[.05] text-[10px] uppercase tracking-widest text-gray-500"><tr>{['#', 'Team', 'Div', 'W', 'L', 'PCT', 'PF', 'PA', 'DIFF', 'Streak'].map((heading) => <th key={heading} className="px-4 py-4">{heading}</th>)}</tr></thead>
                  <tbody>{stats.map(({ standing, team }, index) => <DesktopRow key={standing.id} standing={standing} team={team!} division={divisionById.get(standing.division_id ?? '')?.name} rank={index + 1} />)}</tbody>
                </table>
              </div>
              <div className="divide-y divide-white/10 md:hidden">{stats.map(({ standing, team }, index) => <MobileRow key={standing.id} standing={standing} team={team!} division={divisionById.get(standing.division_id ?? '')?.name} rank={index + 1} open={expanded === standing.id} onToggle={() => setExpanded(expanded === standing.id ? null : standing.id)} />)}</div>
            </div>
          ) : <EmptyState hasTeams={hasTeams} noResults={noResults} />}
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div><SectionTitle title="Recent games" /><div className="mt-4 space-y-2">{recentGames.length ? recentGames.map((game) => <RecentGame key={game.id} game={game} teamById={teamById} venue={venues.find((venue) => venue.id === game.venue_id)} />) : <p className="border border-dashed border-white/15 p-8 text-sm text-gray-500">No official games for this selection yet.</p>}</div></div>
          <div className="rcl-editorial p-7 sm:p-9"><p className="rcl-kicker">Rich City League</p><h2 className="rcl-display mt-4 text-4xl uppercase">More than a league.<br /><span className="text-rcl-gold">A stronger Richmond.</span></h2><p className="mt-5 text-sm leading-6 text-gray-400">Every game matters. Every win moves the culture forward.</p><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-white">Competition · Opportunity · Community</p><p className="mt-8 font-display text-xl font-black uppercase text-rcl-gold">The city is the court.</p></div>
        </section>
      </div>
    </main>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="border border-white/10 bg-white/[.03] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 block w-full bg-transparent text-sm font-bold uppercase tracking-normal text-white outline-none">{options.map(([key, name]) => <option key={key} value={key} className="bg-[#101c2d]">{name}</option>)}</select></label>;
}

function FeatureCard({ label, value, suffix, team }: { label: string; value: string; suffix: string; team?: Team }) {
  return <div className="border border-white/10 bg-[linear-gradient(145deg,rgba(16,28,45,.95),rgba(7,9,13,.9))] p-5"><p className="rcl-kicker">{label}</p>{team ? <Link href={`/teams/${team.slug}`} className="mt-4 block font-display text-xl font-black uppercase hover:text-rcl-gold">{team.name}</Link> : <p className="mt-4 text-sm text-gray-500">No official results</p>}<p className="mt-3 font-display text-4xl font-black text-rcl-gold">{value} <span className="text-xs text-gray-400">{suffix}</span></p></div>;
}

function DesktopRow({ standing, team, division, rank }: { standing: Standing; team: Team; division?: string; rank: number }) {
  const pct = percentage(standing);
  const diff = standing.points_for - standing.points_against;
  return <tr className={`border-t border-white/10 ${rank === 1 ? 'bg-rcl-gold/[.06]' : ''}`}><td className="px-4 py-5 font-display text-xl font-black text-rcl-gold">{rank}</td><td className="px-4 py-5"><TeamLink team={team} /></td><td className="px-4 py-5 text-xs uppercase text-gray-500">{division ?? '—'}</td><td className="px-4 py-5 font-bold">{standing.wins}</td><td className="px-4 py-5">{standing.losses}</td><td className="px-4 py-5 font-bold">{pct}</td><td className="px-4 py-5">{standing.points_for}</td><td className="px-4 py-5">{standing.points_against}</td><td className={diff >= 0 ? 'px-4 py-5 text-emerald-400' : 'px-4 py-5 text-rose-400'}>{diff >= 0 ? '+' : ''}{diff}</td><td className="px-4 py-5 font-bold text-gray-300">{standing.streak ?? '—'}</td></tr>;
}

function MobileRow({ standing, team, division, rank, open, onToggle }: { standing: Standing; team: Team; division?: string; rank: number; open: boolean; onToggle: () => void }) {
  const diff = standing.points_for - standing.points_against;
  return <button type="button" onClick={onToggle} aria-expanded={open} className="block w-full p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-rcl-gold"><span className="grid grid-cols-[2rem_1fr_auto] items-center gap-3"><span className="font-display text-xl font-black text-rcl-gold">{rank}</span><span><TeamLink team={team} /><span className="block text-[10px] uppercase tracking-widest text-gray-500">{division ?? 'All divisions'}</span></span><span className="text-right"><strong>{standing.wins}–{standing.losses}</strong><small className="block text-xs text-gray-500">{percentage(standing)}</small></span></span>{open && <span className="mt-4 grid grid-cols-4 gap-2 border-t border-white/10 pt-4 text-center text-[10px] uppercase tracking-widest text-gray-500"><span>PF<strong className="mt-1 block text-white">{standing.points_for}</strong></span><span>PA<strong className="mt-1 block text-white">{standing.points_against}</strong></span><span>Diff<strong className={`mt-1 block ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{diff >= 0 ? '+' : ''}{diff}</strong></span><span>Streak<strong className="mt-1 block text-white">{standing.streak ?? '—'}</strong></span></span>}</button>;
}

function TeamLink({ team }: { team: Team }) {
  return <Link href={`/teams/${team.slug}`} onClick={(event) => event.stopPropagation()} className="flex items-center gap-3 font-bold uppercase hover:text-rcl-gold">{team.logo_url ? <Image src={team.logo_url} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" /> : <span className="h-7 w-7 shrink-0 rounded-full" style={{ backgroundColor: team.primary_color ?? '#ff6b1a' }} aria-hidden="true" />}{team.name}</Link>;
}

function RecentGame({ game, teamById, venue }: { game: Game; teamById: Map<string, Team>; venue?: Venue }) {
  const home = teamById.get(game.home_team_id);
  const away = teamById.get(game.away_team_id);
  return <Link href={`/games/${game.id}`} className="grid grid-cols-[5rem_1fr_auto_1fr] items-center gap-3 border border-white/10 bg-white/[.025] p-4 hover:border-rcl-gold/60"><span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{formatDate(game.scheduled_at)}</span><span className="text-right font-bold uppercase">{away?.short_name ?? away?.name ?? 'Away'}</span><span className="font-display text-xl font-black">{game.away_score}–{game.home_score}</span><span className="font-bold uppercase">{home?.short_name ?? home?.name ?? 'Home'}<small className="mt-1 block text-[10px] font-normal uppercase text-gray-500">{venue?.name ?? 'Venue TBA'}</small></span></Link>;
}

function SectionTitle({ title }: { title: string }) { return <h2 className="rcl-display text-3xl uppercase">{title}</h2>; }
function EmptyState({ hasTeams, noResults }: { hasTeams: boolean; noResults: boolean }) {
  return <div className="border border-dashed border-white/15 p-10 text-center"><p className="rcl-kicker justify-center">{hasTeams ? 'Season opens soon' : 'RCL standings'}</p><h3 className="rcl-display mt-4 text-3xl uppercase">{hasTeams ? 'The season is waiting.' : 'No teams registered'}</h3><p className="mx-auto mt-3 max-w-lg text-sm text-gray-500">{noResults ? 'Teams are registered, but official standings begin once games are completed.' : hasTeams ? 'Official standings will populate as RCL games are completed and results are recorded.' : 'The official RCL standings will appear once teams are assigned to this season.'}</p><p className="mt-7 text-xs font-black uppercase tracking-[.2em] text-gray-400">Play → Record → Calculate → Rank → Compete</p></div>;
}

function percentage(standing: Standing) {
  const games = standing.wins + standing.losses;
  return games ? (standing.wins / games).toFixed(3).replace(/^0/, '') : '.000';
}

function streakValue(streak: string | null) {
  const match = streak?.match(/([WL])(\d+)/i);
  return match ? Number(match[2]) * (match[1].toUpperCase() === 'W' ? 1 : 0) : 0;
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { FaArrowRight, FaBasketball, FaCalendarDays, FaLayerGroup, FaTrophy } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { getLeagueSnapshot } from '@/lib/public-data';
import { formatDate } from '@/utils/helpers';

export const revalidate = 300;

export default async function SeasonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const snapshot = await getLeagueSnapshot();
  const { slug } = await params;
  const season = snapshot.seasons.find((item) => item.slug === slug || item.id === slug);
  if (!season) notFound();

  const divisions = snapshot.divisions.filter((item) => item.season_id === season.id);
  const teamSeasons = snapshot.teamSeasons.filter((item) => item.season_id === season.id);
  const games = snapshot.games.filter((item) => item.season_id === season.id);
  const completedGames = games.filter((item) => item.status === 'completed').length;
  const status = season.status.replace(/_/g, ' ').toUpperCase();

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow={`RCL SEASON · ${status}`}
      title={season.name}
      accent={season.registration_open ? 'Registration open' : 'Season hub'}
      description="Follow the season from registration through the final result. Teams, divisions, games, standings, and official statistics stay connected here."
      assetKey="league.cover"
      actions={<>{season.registration_open ? <Link href="/register" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Register now <FaArrowRight /></Link> : null}<Link href="/schedule" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 px-5 text-xs font-black uppercase tracking-wider text-white">View schedule <FaCalendarDays /></Link></>}
      meta={<div className="min-w-64 rounded-2xl border border-rcl-blue/20 bg-[#071522]/80 p-5"><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-blue">SEASON WINDOW</p><p className="mt-3 font-display text-xl font-black uppercase">{formatDate(season.start_date)}</p><p className="my-1 text-xs font-black uppercase tracking-wider text-white/30">through</p><p className="font-display text-xl font-black uppercase">{formatDate(season.end_date)}</p></div>}
    />

    <Container maxWidth="xl" className="py-10">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<FaLayerGroup />} label="Divisions" value={divisions.length} />
        <Metric icon={<FaTrophy />} label="Teams" value={teamSeasons.length} />
        <Metric icon={<FaBasketball />} label="Games" value={games.length} />
        <Metric icon={<FaCalendarDays />} label="Completed" value={completedGames} />
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-3xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#071522,#05090f)] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange">SEASON STATUS</p>
          <h2 className="mt-3 font-display text-3xl font-black uppercase">{season.registration_open ? 'The door is open.' : status}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">{season.registration_open ? 'Registration is currently open. Join the season, build your RCL identity, and follow official league activity from one platform.' : games.length ? 'Registration is closed. Follow the schedule, results, standings, and official player performance as the season develops.' : 'Registration is currently closed. League updates and the next competition window will appear across RCL when published.'}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/standings" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 text-xs font-black uppercase tracking-wider transition hover:border-rcl-blue/45">Standings <FaArrowRight /></Link>
            <Link href="/stats" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 text-xs font-black uppercase tracking-wider transition hover:border-rcl-blue/45">Official stats <FaArrowRight /></Link>
            <Link href="/teams" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 text-xs font-black uppercase tracking-wider transition hover:border-rcl-blue/45">Teams <FaArrowRight /></Link>
          </div>
        </div>

        <aside className="rounded-3xl border border-rcl-orange/20 bg-rcl-orange/[.045] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange">COMPETITION STRUCTURE</p>
          <h2 className="mt-3 font-display text-2xl font-black uppercase">{divisions.length ? `${divisions.length} division${divisions.length === 1 ? '' : 's'}` : 'Structure pending'}</h2>
          <div className="mt-5 space-y-3">{divisions.length ? divisions.map((division) => <div key={division.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="font-black uppercase">{division.name}</p><p className="mt-1 text-xs text-white/40">{division.age_group ?? 'Open age group'}{division.gender ? ` · ${division.gender}` : ''}</p></div>) : <p className="text-sm leading-6 text-white/45">Divisions will appear here once the league publishes the season structure.</p>}</div>
        </aside>
      </section>
    </Container>
  </main>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl border border-rcl-blue/15 bg-white/[.025] p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue">{icon}</span><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-white/30">{label}</p><p className="mt-1 font-display text-4xl font-black">{value}</p></div>;
}

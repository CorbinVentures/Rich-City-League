import Link from 'next/link';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { getLeagueSnapshot } from '@/lib/public-data';
import { formatDate } from '@/utils/helpers';
import { FaArrowRight, FaCalendarDays } from 'react-icons/fa6';
import { RCL_PRO_SEASON, isRclProSeasonRecord } from '@/lib/rcl-pro-season';

export const revalidate = 300;

export default async function SeasonsPage() {
  const { seasons } = await getLeagueSnapshot();
  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero eyebrow="League Calendar" title="Seasons" accent="The RCL timeline" description="Browse published seasons, registration windows, and the official competitive timeline of Rich City League." assetKey="league.cover" />
    <Container maxWidth="xl" className="py-10 sm:py-12"><section aria-label="Professional season timeline" className="mb-7 rounded-2xl border border-rcl-orange/25 bg-rcl-orange/[.035] p-6"><p className="text-xs font-black uppercase tracking-widest text-rcl-orange">Upcoming pro season</p><h2 className="mt-2 font-display text-3xl font-black uppercase">{RCL_PRO_SEASON.startLabel}</h2><p className="mt-2 text-sm leading-6 text-white/65">{RCL_PRO_SEASON.tryoutLabel}. Draft Night follows official evaluations. The exact opening-night date and game schedule have not been announced. Older dates below are historical/imported league records, not the pro launch.</p><Link href="/league/join" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-rcl-orange">Explore the path <FaArrowRight/></Link></section>
      {seasons.length === 0 ? <div className="rounded-2xl border border-dashed border-rcl-blue/25 bg-rcl-blue/[.035] p-12 text-center"><FaCalendarDays className="mx-auto text-3xl text-rcl-blue/60"/><h2 className="mt-4 font-display text-2xl font-black uppercase">No seasons published</h2><p className="mt-2 text-sm text-white/40">Official RCL seasons will appear here when they are published.</p></div> : <div className="grid gap-4 md:grid-cols-2">{seasons.map((season) => <Link key={season.id} href={`/seasons/${season.slug}`} className="group rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-6 transition hover:-translate-y-1 hover:border-rcl-blue/45"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">{isRclProSeasonRecord(season)?season.status:'Historical record'}</p><h2 className="mt-2 font-display text-2xl font-black uppercase group-hover:text-rcl-blue">{season.name}</h2></div><FaArrowRight className="mt-1 shrink-0 text-xs text-white/20 transition group-hover:translate-x-1 group-hover:text-rcl-orange"/></div><div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4 text-sm text-white/40"><FaCalendarDays className="text-rcl-blue"/>{formatDate(season.start_date)} — {formatDate(season.end_date)}</div></Link>)}</div>}
    </Container>
  </main>;
}

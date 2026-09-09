import Link from 'next/link';
import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';
import { formatDate } from '@/utils/helpers';

export const revalidate = 300;

export default async function SeasonsPage() {
  const { seasons } = await getLeagueSnapshot();
  return <main><Container maxWidth="xl" className="py-12">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">League calendar</p><h1 className="mt-2 font-display text-4xl font-bold">Seasons</h1>
    <div className="mt-10 grid gap-4 md:grid-cols-2">{seasons.length === 0 && <p className="col-span-full rounded-2xl border border-dashed border-white/15 p-10 text-center text-gray-500">No seasons are currently published.</p>}{seasons.map((season) => <Link key={season.id} href={`/seasons/${season.slug}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 hover:border-rcl-gold/50"><div className="flex items-center justify-between gap-4"><h2 className="font-display text-2xl font-bold">{season.name}</h2><span className="rounded-full bg-rcl-gold/15 px-3 py-1 text-xs font-bold uppercase text-rcl-gold">{season.status}</span></div><p className="mt-4 text-sm text-gray-400">{formatDate(season.start_date)} — {formatDate(season.end_date)}</p></Link>)}</div>
  </Container></main>;
}

import { notFound } from 'next/navigation';
import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';
import { formatDate } from '@/utils/helpers';

export const revalidate = 300;

export default async function SeasonDetailPage({ params }: { params: { slug: string } }) {
  const { seasons } = await getLeagueSnapshot();
  const season = seasons.find((item) => item.slug === params.slug || item.id === params.slug);
  if (!season) notFound();
  return <main><Container maxWidth="lg" className="py-16"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">{season.status}</p><h1 className="mt-2 font-display text-5xl font-bold">{season.name}</h1><p className="mt-5 text-gray-400">{formatDate(season.start_date)} — {formatDate(season.end_date)}</p><p className="mt-8 max-w-2xl text-gray-300">{season.registration_open ? 'Registration is currently open.' : 'Registration is currently closed.'}</p></Container></main>;
}

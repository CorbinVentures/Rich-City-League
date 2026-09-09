import { notFound } from 'next/navigation';
import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';

export const revalidate = 300;

export default async function TeamDetailPage({ params }: { params: { slug: string } }) {
  const { teams } = await getLeagueSnapshot();
  const team = teams.find((item) => item.slug === params.slug);
  if (!team) notFound();
  return <main><Container maxWidth="lg" className="py-16"><div className="mb-8 h-3 w-24 rounded-full" style={{ backgroundColor: team.primary_color ?? '#FFD700' }} /><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">RCL team</p><h1 className="mt-2 font-display text-5xl font-bold">{team.name}</h1><p className="mt-4 text-gray-400">{team.city ?? 'Richmond'}, Virginia</p>{team.description && <p className="mt-8 max-w-2xl text-lg text-gray-300">{team.description}</p>}</Container></main>;
}

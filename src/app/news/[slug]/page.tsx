import { notFound } from 'next/navigation';
import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';
import { formatDate } from '@/utils/helpers';

export const revalidate = 300;

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { news } = await getLeagueSnapshot();
  const { slug } = await params;
  const item = news.find((entry) => entry.slug === slug);
  if (!item) notFound();
  return <main><Container maxWidth="lg" className="py-16"><p className="text-xs text-rcl-gold">{item.published_at ? formatDate(item.published_at) : 'RCL News'}</p><h1 className="mt-3 max-w-3xl font-display text-5xl font-bold">{item.title}</h1>{item.excerpt && <p className="mt-6 max-w-2xl text-xl text-gray-400">{item.excerpt}</p>}<article className="prose prose-invert mt-10 max-w-3xl whitespace-pre-wrap text-gray-300">{item.body}</article></Container></main>;
}

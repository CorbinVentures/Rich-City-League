import Link from 'next/link';
import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';
import { formatDate } from '@/utils/helpers';

export const revalidate = 300;

export default async function NewsPage() {
  const { news } = await getLeagueSnapshot();
  return <main><Container maxWidth="xl" className="py-12"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">From the league</p><h1 className="mt-2 font-display text-4xl font-bold">News</h1><div className="mt-10 grid gap-4 md:grid-cols-2">{news.length === 0 && <p className="col-span-full rounded-2xl border border-dashed border-white/15 p-10 text-center text-gray-500">No news has been published yet.</p>}{news.map((item) => <Link key={item.id} href={`/news/${item.slug}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 hover:border-rcl-gold/50"><p className="text-xs text-gray-500">{item.published_at ? formatDate(item.published_at) : 'RCL News'}</p><h2 className="mt-3 font-display text-2xl font-bold">{item.title}</h2>{item.excerpt && <p className="mt-3 text-gray-400">{item.excerpt}</p>}</Link>)}</div></Container></main>;
}

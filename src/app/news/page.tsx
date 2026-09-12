import Link from 'next/link';
import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';
import { NewsDirectory } from '@/components/PublicDirectory';

export const revalidate = 300;

export default async function NewsPage() {
  const { news } = await getLeagueSnapshot();
  const items = news.map((item) => ({ id: item.id, slug: item.slug, title: item.title, excerpt: item.excerpt, category: 'League News', publishedAt: item.published_at, coverImageUrl: item.cover_image_url }));
  return <main className="min-h-screen bg-rcl-black pb-24"><section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top,rgba(255,107,26,0.16),transparent_60%)] py-16"><Container maxWidth="xl"><p className="text-xs font-bold uppercase tracking-[0.25em] text-rcl-gold">From the league</p><h1 className="mt-3 font-display text-5xl font-bold sm:text-7xl">RCL <span className="text-rcl-gold">NEWS</span></h1><p className="mt-4 max-w-xl text-gray-400">Stories, updates, and impact from Richmond basketball.</p></Container></section><Container maxWidth="xl" className="py-10"><NewsDirectory items={items} /></Container></main>;
}

import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { getLeagueSnapshot } from '@/lib/public-data';
import { NewsDirectory } from '@/components/PublicDirectory';

export const metadata: Metadata = { title:{ absolute:'Richmond Basketball News | RCL Newsroom' }, description:'Rich City League news, Richmond basketball stories, league updates, player features and community coverage from the 804.', alternates:{canonical:'/news'} };

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewsPage() {
  const { news } = await getLeagueSnapshot();
  const items = news.map((item) => ({ id: item.id, slug: item.slug, title: item.title, excerpt: item.excerpt, category: 'League News', publishedAt: item.published_at, coverImageUrl: item.cover_image_url }));
  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow="Official RCL Newsroom"
      title="RCL News"
      accent="Stories from the 804"
      description="League updates, player stories, announcements, and the people shaping Richmond basketball—published from one official newsroom."
      assetKey="news.cover"
      meta={<div className="min-w-44 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.18em] text-white/35">Published</p><p className="mt-1 font-display text-3xl font-black">{items.length}<span className="ml-2 text-xs text-white/35">stories</span></p><p className="mt-2 text-xs text-rcl-blue">Official RCL coverage</p></div>}
    />
    <Container maxWidth="xl" className="py-10 sm:py-12"><NewsDirectory items={items} /></Container>
  </main>;
}

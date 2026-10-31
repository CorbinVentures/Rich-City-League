import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { getPublishedNews } from '@/lib/public-data';
import { NewsDirectory } from '@/components/PublicDirectory';

export const metadata: Metadata = {
  title:{ absolute:'Virginia Basketball News | RCH Newsroom' },
  description:'Virginia basketball reporting, Rich City League announcements, sourced local stories and independent community coverage from the RCH Newsroom.',
  alternates:{canonical:'/news'},
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function categoryLabel(value?: string | null) {
  if (value === 'rich-city-league') return 'Rich City League';
  if (value === 'richmond-basketball') return 'Richmond Basketball';
  if (value === 'richmond-culture') return 'Richmond Culture';
  if (value === 'rcl-insider') return 'RCL Insider';
  return 'League News';
}

export default async function NewsPage() {
  const news = await getPublishedNews(120);
  const items = news.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt,
    category: categoryLabel(item.category),
    publishedAt: item.published_at,
    coverImageUrl: item.cover_image_url || `/api/news-cover/${encodeURIComponent(item.slug)}`,
  }));

  const automatedCount = news.filter(item => item.is_automated).length;

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow="RCH Newsroom"
      title="Virginia basketball news"
      accent="Every city. Every court. Every story."
      description="Statewide basketball reporting, local stories, official Rich City League updates, and the people shaping Virginia basketball. Automated articles are labeled, and external source links appear when supplied."
      assetKey="news.cover"
      meta={<div className="min-w-44 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.18em] text-white/35">Published</p><p className="mt-1 font-display text-3xl font-black">{items.length}<span className="ml-2 text-xs text-white/35">stories</span></p><p className="mt-2 text-xs text-rcl-blue">{automatedCount ? 'Includes AI-assisted reporting' : 'Published basketball reporting'}</p></div>}
    />
    <Container maxWidth="xl" className="py-10 sm:py-12">
      <NewsDirectory items={items} />
    </Container>
  </main>;
}

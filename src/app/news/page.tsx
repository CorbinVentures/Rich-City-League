import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { getPublishedNews } from '@/lib/public-data';
import { NewsDirectory } from '@/components/PublicDirectory';

export const metadata: Metadata = {
  title:{ absolute:'Richmond Basketball & Culture News | RCL Newsroom' },
  description:'Daily Rich City League reporting, RCL product and business updates, sourced Richmond basketball news and Richmond culture coverage from the RCL Newsroom.',
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
    coverImageUrl: item.cover_image_url,
  }));

  const automatedCount = news.filter(item => item.is_automated).length;

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow="RCL Newsroom"
      title="Richmond news"
      accent="Basketball. Culture. RCL."
      description="Daily Rich City League reporting, RCL feature and business updates, sourced Richmond basketball news and Richmond culture coverage built for the people who live the 804."
      assetKey="news.cover"
      meta={<div className="min-w-44 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.18em] text-white/35">Published</p><p className="mt-1 font-display text-3xl font-black">{items.length}<span className="ml-2 text-xs text-white/35">stories</span></p><p className="mt-2 text-xs text-rcl-blue">{automatedCount ? 'Daily newsroom active' : 'Official RCL coverage'}</p></div>}
    />
    <Container maxWidth="xl" className="py-10 sm:py-12">
      <div className="mb-6 rounded-2xl border border-rcl-blue/15 bg-rcl-blue/[.045] p-5 text-sm leading-6 text-white/50">
        <b className="text-white">How the RCL Newsroom works:</b> League stories use official platform data. RCL Insider rotates through approved live, preview and roadmap topics without inventing launch promises. Richmond basketball and culture stories use current public sources and must clear sourcing, duplication and confidence checks before publication. AI-assisted stories are labeled on the article page and link back to their reporting sources.
      </div>
      <NewsDirectory items={items} />
    </Container>
  </main>;
}

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';
import { formatDate } from '@/utils/helpers';
import Image from 'next/image';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { news } = await getLeagueSnapshot();
  const { slug } = await params;
  const item = news.find((entry) => entry.slug === slug);
  if (!item) return { title: 'RCL News', robots: { index: false, follow: false } };
  const description = item.excerpt || `${item.title} — news and stories from Rich City League and Richmond basketball.`;
  return {
    title: item.title,
    description,
    alternates: { canonical: `/news/${item.slug}` },
    openGraph: { type:'article', url:`/news/${item.slug}`, title:item.title, description, publishedTime:item.published_at || undefined, images:item.cover_image_url?[{url:item.cover_image_url,alt:item.title}]:undefined },
    twitter: { card:'summary_large_image', title:item.title, description, images:item.cover_image_url?[item.cover_image_url]:undefined },
  };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { news } = await getLeagueSnapshot();
  const { slug } = await params;
  const item = news.find((entry) => entry.slug === slug);
  if (!item) notFound();
  const articleSchema={ '@context':'https://schema.org','@type':'NewsArticle',headline:item.title,description:item.excerpt||undefined,image:item.cover_image_url?[item.cover_image_url]:undefined,datePublished:item.published_at||undefined,mainEntityOfPage:`https://richcityhoops.com/news/${item.slug}`,publisher:{'@type':'Organization',name:'Rich City League',url:'https://richcityhoops.com'} };
  return <main><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(articleSchema)}} /><Container maxWidth="lg" className="py-16"><p className="text-xs text-rcl-gold">{item.published_at ? formatDate(item.published_at) : 'RCL News'}</p><h1 className="mt-3 max-w-3xl font-display text-5xl font-bold">{item.title}</h1>{item.excerpt && <p className="mt-6 max-w-2xl text-xl text-gray-400">{item.excerpt}</p>}{item.cover_image_url && <div className="relative mt-8 aspect-[16/9] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"><Image src={item.cover_image_url} alt={item.title} fill priority sizes="(max-width: 1024px) 100vw, 896px" className="object-cover" /></div>}<article className="prose prose-invert mt-10 max-w-3xl whitespace-pre-wrap text-gray-300">{item.body}</article></Container></main>;
}

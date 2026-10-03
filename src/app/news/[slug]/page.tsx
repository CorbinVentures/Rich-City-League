import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { getNewsBySlug } from '@/lib/public-data';
import { formatDate } from '@/utils/helpers';
import Image from 'next/image';
import Link from 'next/link';
import { FaArrowUpRightFromSquare, FaCircleCheck } from 'react-icons/fa6';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function categoryLabel(value?: string | null) {
  if (value === 'rich-city-league') return 'Rich City League';
  if (value === 'richmond-basketball') return 'Richmond Basketball';
  if (value === 'richmond-culture') return 'Richmond Culture';
  if (value === 'rcl-insider') return 'RCL Insider';
  return 'League News';
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getNewsBySlug(slug);
  if (!item) return { title: 'RCL News', robots: { index: false, follow: false } };

  const description = item.seo_description || item.excerpt || `${item.title} — reporting from the RCL Newsroom.`;
  const title = item.seo_title || `${item.title} | RCL News`;
  const keywords = item.seo_keywords?.length ? item.seo_keywords : undefined;

  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical: `/news/${item.slug}` },
    openGraph: {
      type:'article',
      url:`/news/${item.slug}`,
      title:item.title,
      description,
      publishedTime:item.published_at || undefined,
      section:categoryLabel(item.category),
      images:item.cover_image_url
        ? [{url:item.cover_image_url,alt:item.title}]
        : [{url:'https://richcityhoops.com/rcl-share-20261002.png',width:1200,height:630,alt:'RCL — Richmond basketball social'}],
    },
    twitter: {
      card:'summary_large_image',
      title:item.title,
      description,
      images:item.cover_image_url ? [item.cover_image_url] : ['https://richcityhoops.com/rcl-share-20261002.png'],
    },
  };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getNewsBySlug(slug);
  if (!item) notFound();

  const sourceUrls = stringArray(item.source_urls);
  const sourceNames = stringArray(item.source_names);
  const sources = sourceUrls.map((url, index) => ({
    url,
    name: sourceNames[index] || (() => { try { return new URL(url).hostname.replace(/^www\./,''); } catch { return 'Source'; } })(),
  }));
  const section = categoryLabel(item.category);
  const paragraphs = item.body.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
  const confidence = item.editorial_confidence === null || item.editorial_confidence === undefined
    ? null
    : Number(item.editorial_confidence);

  const breadcrumbSchema={
    '@context':'https://schema.org',
    '@type':'BreadcrumbList',
    itemListElement:[
      {'@type':'ListItem',position:1,name:'Rich City League',item:'https://richcityhoops.com/'},
      {'@type':'ListItem',position:2,name:'RCL Newsroom',item:'https://richcityhoops.com/news'},
      {'@type':'ListItem',position:3,name:item.title,item:`https://richcityhoops.com/news/${item.slug}`},
    ],
  };
  const articleSchema={
    '@context':'https://schema.org',
    '@type':'NewsArticle',
    headline:item.title,
    description:item.seo_description || item.excerpt || undefined,
    image:item.cover_image_url ? [item.cover_image_url] : ['https://richcityhoops.com/rcl-share-20261002.png'],
    datePublished:item.published_at || undefined,
    dateModified:item.updated_at || item.published_at || undefined,
    articleSection:section,
    keywords:item.seo_keywords?.length ? item.seo_keywords.join(', ') : undefined,
    mainEntityOfPage:`https://richcityhoops.com/news/${item.slug}`,
    author:{'@type':'Organization',name:'RCL Newsroom',url:'https://richcityhoops.com/news'},
    publisher:{'@type':'Organization',name:'Rich City League',url:'https://richcityhoops.com'},
    isAccessibleForFree:true,
  };

  const related = item.category === 'richmond-culture'
    ? [['/discover','Discover RCL'],['/communities','Communities'],['/network','Virginia basketball network']]
    : item.category === 'rcl-insider'
      ? [['/about','About RCL'],['/membership','Membership'],['/network','RCL Network'],['/media','RCH TV']]
      : item.category === 'rich-city-league'
        ? [['/league','League home'],['/games','Game Center'],['/standings','Standings'],['/runs','RCL Runs']]
        : [['/richmond-basketball-league','Richmond basketball'],['/players','Players'],['/runs','Find runs'],['/media','RCH TV']];

  return <main className="min-h-screen bg-rcl-black text-white">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify([articleSchema,breadcrumbSchema])}} />
    <Container maxWidth="lg" className="py-14 sm:py-16">
      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[.16em]">
          <span className="text-rcl-orange">{section}</span>
          <span className="text-white/20">•</span>
          <span className="text-white/35">{item.published_at ? formatDate(item.published_at) : 'RCL Newsroom'}</span>
        </div>

        <h1 className="mt-4 font-display text-4xl font-black leading-[.98] sm:text-6xl">{item.title}</h1>
        {item.excerpt && <p className="mt-6 text-lg leading-8 text-white/55 sm:text-xl">{item.excerpt}</p>}

        {item.is_automated && <div className="mt-7 rounded-2xl border border-rcl-blue/18 bg-rcl-blue/[.05] p-4 text-xs leading-5 text-white/45">
          <div className="flex items-start gap-3"><FaCircleCheck className="mt-0.5 shrink-0 text-rcl-blue"/><p><b className="text-white/75">RCL Newsroom disclosure:</b> This story was AI-assisted and generated through RCL&apos;s source-grounded newsroom system. League reporting is based on official RCL data; external reporting links to the public sources used. The system is instructed not to invent quotes or unsupported facts.</p></div>
          {confidence !== null && <p className="mt-2 pl-6 text-[10px] uppercase tracking-wider text-white/25">Automated editorial confidence · {Math.round(confidence * 100)}%</p>}
        </div>}
      </div>

      {item.cover_image_url && <div className="relative mt-8 aspect-[16/9] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"><Image src={item.cover_image_url} alt={item.title} fill priority sizes="(max-width: 1024px) 100vw, 896px" className="object-cover" /></div>}

      <article className="mt-10 max-w-3xl space-y-6 text-[17px] leading-8 text-white/72">
        {paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}
      </article>

      {sources.length > 0 && <section className="mt-12 max-w-3xl rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">Reporting sources</p>
        <p className="mt-2 text-xs leading-5 text-white/35">RCL links to the reporting or official information used to ground this article. Source links open on the original publisher&apos;s site.</p>
        <div className="mt-4 space-y-2">{sources.map((source,index)=><a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer noopener" className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm font-bold transition hover:border-rcl-blue/35 hover:text-rcl-blue"><span>{source.name}</span><FaArrowUpRightFromSquare className="shrink-0 text-xs"/></a>)}</div>
      </section>}

      <aside className="mt-12 max-w-3xl border-t border-white/10 pt-8">
        <p className="text-xs font-black uppercase tracking-[.22em] text-rcl-gold">Keep exploring the 804</p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold">{related.map(([href,label])=><Link href={href} key={href}>{label} →</Link>)}</div>
      </aside>
    </Container>
  </main>;
}

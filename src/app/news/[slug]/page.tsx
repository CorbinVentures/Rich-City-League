import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { NetworkSponsoredPlacement } from '@/components/network/NetworkSponsoredPlacement';
import { getNewsBySlug, type PublicNews } from '@/lib/public-data';
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

function FeatureInterviewQuestionList({
  questions,
  startAt = 0,
}: {
  questions: NonNullable<PublicNews['feature_interview']>['questions'];
  startAt?: number;
}) {
  return <div className="divide-y divide-white/10 border-y border-white/10">
    {questions.map((item, index) => <section key={item.question} className="grid gap-4 py-7 sm:grid-cols-[3rem_1fr] sm:gap-6">
      <p className="font-display text-2xl font-black text-rcl-orange">{String(startAt + index + 1).padStart(2, '0')}</p>
      <div>
        <h3 className="font-display text-xl font-black leading-tight text-white sm:text-2xl">{item.question}</h3>
        <p className="mt-4 text-base leading-7 text-white/65 sm:text-[17px] sm:leading-8">{item.answer}</p>
      </div>
    </section>)}
  </div>;
}

function FeatureInterviewArticle({
  item,
  section,
  coverImageUrl,
}: {
  item: PublicNews;
  section: string;
  coverImageUrl: string;
}) {
  const feature = item.feature_interview;
  if (!feature) return null;
  const paragraphs = item.body.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
  const firstHalf = feature.questions.slice(0, 5);
  const secondHalf = feature.questions.slice(5);
  const communityPhoto = feature.photos[0];
  const eventPhoto = feature.photos[1];

  return <article className="mx-auto w-full max-w-6xl">
    <header className="mx-auto max-w-5xl text-center">
      <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[.18em]">
        <span className="text-rcl-orange">{section}</span><span className="text-white/20">•</span>
        <span className="text-white/40">{item.published_at ? formatDate(item.published_at) : 'RCH Newsroom'}</span>
        <span className="text-white/20">•</span><span className="text-white/40">A Rich City Hoops founder interview</span>
      </div>
      <p className="mt-7 text-xs font-black uppercase tracking-[.24em] text-rcl-blue">{feature.kicker}</p>
      <h1 className="mx-auto mt-5 max-w-5xl font-display text-4xl font-black leading-[.98] sm:text-6xl lg:text-7xl">{item.title}</h1>
      {item.excerpt && <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/55 sm:text-xl">{item.excerpt}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[10px] font-black uppercase tracking-[.16em] text-white/35">
        <span>Virginia-wide</span><span>Free to join</span><span>Built for the basketball community</span>
      </div>
    </header>

    <div className="mt-10 grid items-center gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
      <figure className="relative mx-auto aspect-square w-full max-w-[620px] overflow-hidden rounded-3xl border border-white/10 bg-[#08090c] shadow-2xl">
        <Image src={coverImageUrl} alt="Founder portrait of De’Vaughn Corbin in Rich City League campaign artwork." fill priority sizes="(max-width: 1024px) 100vw, 620px" className="object-contain" />
      </figure>
      <div className="mx-auto max-w-xl">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-rcl-orange">The vision</p>
        <div className="mt-5 space-y-5 text-base leading-7 text-white/70 sm:text-[17px] sm:leading-8">
          {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </div>
        <div className="mt-7 flex flex-wrap gap-2">
          {['Find a Run', 'Track your games', 'Build your community'].map((label) => <span key={label} className="rounded-full border border-white/10 bg-white/[.03] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white/55">{label}</span>)}
        </div>
      </div>
    </div>

    <div className="mt-14 grid items-center gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-12">
      <blockquote className="rounded-3xl border border-rcl-orange/25 bg-gradient-to-br from-rcl-orange/[.12] to-white/[.02] p-7 sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">The reason behind the work</p>
        <p className="mt-5 font-display text-3xl font-black leading-tight text-white sm:text-4xl">{feature.pullQuote}</p>
        <footer className="mt-6 text-xs font-black uppercase tracking-[.18em] text-white/40">De’Vaughn Corbin · Founder, Rich City Hoops</footer>
      </blockquote>
      {communityPhoto && <figure className="mx-auto w-full max-w-[460px]">
        <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-white/10 bg-white/[.03]">
          <Image src={communityPhoto.src} alt={communityPhoto.alt} fill sizes="(max-width: 1024px) 100vw, 460px" className="object-cover" />
        </div>
        <figcaption className="mt-3 text-xs leading-5 text-white/40">{communityPhoto.caption}</figcaption>
      </figure>}
    </div>

    <section className="mx-auto mt-16 max-w-4xl">
      <div className="mb-7"><p className="text-[10px] font-black uppercase tracking-[.22em] text-rcl-blue">The conversation</p><h2 className="mt-2 font-display text-3xl font-black sm:text-4xl">A platform built from the ground up</h2></div>
      <FeatureInterviewQuestionList questions={firstHalf} />
    </section>

    {eventPhoto && <section className="mt-16 grid items-center gap-8 rounded-3xl border border-white/10 bg-white/[.025] p-5 sm:p-8 lg:grid-cols-[.85fr_1.15fr] lg:gap-12">
      <figure className="mx-auto w-full max-w-[390px]">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <Image src={eventPhoto.src} alt={eventPhoto.alt} fill sizes="(max-width: 1024px) 100vw, 390px" className="object-cover" />
        </div>
        <figcaption className="mt-3 text-xs leading-5 text-white/40">{eventPhoto.caption}</figcaption>
      </figure>
      <div className="max-w-xl"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">The statewide play</p><h2 className="mt-3 font-display text-3xl font-black leading-tight sm:text-4xl">One home court can connect you to the whole state.</h2><p className="mt-5 text-base leading-7 text-white/60 sm:text-lg sm:leading-8">Start at the park or local gym where you already hoop. From there, follow players in other cities, meet new groups through organized Runs, and give your usual crew a place to build its identity through Runs Crews and territory challenges.</p></div>
    </section>}

    <section className="mx-auto mt-16 max-w-4xl">
      <div className="mb-7"><p className="text-[10px] font-black uppercase tracking-[.22em] text-rcl-blue">Open to every level</p><h2 className="mt-2 font-display text-3xl font-black sm:text-4xl">What players and organizers should know</h2></div>
      <FeatureInterviewQuestionList questions={secondHalf} startAt={firstHalf.length} />
    </section>

    <aside className="mt-16 overflow-hidden rounded-3xl border border-rcl-blue/20 bg-gradient-to-br from-[#102336] via-[#090c11] to-[#15100b] p-7 sm:p-10">
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">Your next move</p>
      <div className="mt-3 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
        <div><h2 className="font-display text-3xl font-black sm:text-4xl">Bring your people to the court.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">Create a free profile, find or host a Run, and invite the friends you already play with. Organizations can register to explore the website builder, scorebook and promotion resources.</p></div>
        <div className="flex flex-wrap gap-3">
          <Link href="/runs" className="rounded-xl bg-rcl-blue px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:brightness-110">Explore Runs <span aria-hidden="true">→</span></Link>
          <Link href="/register" className="rounded-xl border border-white/20 bg-white/[.04] px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:border-white/40">Create a profile</Link>
        </div>
      </div>
    </aside>
  </article>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getNewsBySlug(slug);
  if (!item) return { title: 'RCL News', robots: { index: false, follow: false } };

  const description = item.seo_description || item.excerpt || `${item.title} — reporting from Rich City Hoops.`;
  const title = item.seo_title || `${item.title} | RCH News`;
  const keywords = item.seo_keywords?.length ? item.seo_keywords : undefined;
  const cover = item.cover_image_url || `/api/news-cover/${encodeURIComponent(item.slug)}`;
  const socialCover = new URL(cover, 'https://www.richcityhoops.com').toString();

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
      images:[{url:socialCover,width:item.feature_interview ? 1254 : 1200,height:item.feature_interview ? 1254 : 630,alt:item.feature_interview ? 'Founder portrait of De’Vaughn Corbin in Rich City League campaign artwork.' : `Editorial cover: ${item.title}`}],
    },
    twitter: {
      card:'summary_large_image',
      title:item.title,
      description,
      images:[socialCover],
    },
  };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getNewsBySlug(slug);
  if (!item) notFound();

  const sourceUrls = stringArray(item.source_urls);
  const sourceNames = stringArray(item.source_names);
  // Only genuine HTTP(S) references can be published as clickable sources.
  const sources = sourceUrls.flatMap((url, index) => {
    try {
      const parsed=new URL(url);
      if(!['http:','https:'].includes(parsed.protocol))return [];
      return [{url:parsed.toString(),name:sourceNames[index] || parsed.hostname.replace(/^www\./,'')}];
    } catch {return [];}
  });
  const section = categoryLabel(item.category);
  const coverImageUrl = item.cover_image_url || `/api/news-cover/${encodeURIComponent(item.slug)}`;
  const paragraphs = item.body.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
  const confidence = item.editorial_confidence === null || item.editorial_confidence === undefined
    ? null
    : Number(item.editorial_confidence);

  const breadcrumbSchema={
    '@context':'https://schema.org',
    '@type':'BreadcrumbList',
    itemListElement:[
      {'@type':'ListItem',position:1,name:'Rich City Hoops',item:'https://www.richcityhoops.com/'},
      {'@type':'ListItem',position:2,name:'RCH Newsroom',item:'https://www.richcityhoops.com/news'},
      {'@type':'ListItem',position:3,name:item.title,item:`https://www.richcityhoops.com/news/${item.slug}`},
    ],
  };
  const articleSchema={
    '@context':'https://schema.org',
    '@type':'NewsArticle',
    headline:item.title,
    description:item.seo_description || item.excerpt || undefined,
    image:[coverImageUrl,...(item.feature_interview?.photos.map(photo => photo.src) ?? [])].map((url) => new URL(url, 'https://www.richcityhoops.com').toString()),
    datePublished:item.published_at || undefined,
    dateModified:item.updated_at || item.published_at || undefined,
    articleSection:section,
    keywords:item.seo_keywords?.length ? item.seo_keywords.join(', ') : undefined,
    mainEntityOfPage:`https://www.richcityhoops.com/news/${item.slug}`,
    author:{'@type':'Organization',name:'RCH Newsroom',url:'https://www.richcityhoops.com/news'},
    publisher:{'@type':'Organization',name:'Rich City Hoops',url:'https://www.richcityhoops.com'},
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
    {item.feature_interview ? (
      <Container maxWidth="xl" className="py-14 sm:py-16">
        <FeatureInterviewArticle item={item} section={section} coverImageUrl={coverImageUrl} />
      </Container>
    ) : (
      <Container maxWidth="lg" className="py-14 sm:py-16">
      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[.16em]">
          <span className="text-rcl-orange">{section}</span>
          <span className="text-white/20">•</span>
          <span className="text-white/35">{item.published_at ? formatDate(item.published_at) : 'RCH Newsroom'}</span>
        </div>

        <h1 className="mt-4 font-display text-4xl font-black leading-[.98] sm:text-6xl">{item.title}</h1>
        {item.excerpt && <p className="mt-6 text-lg leading-8 text-white/55 sm:text-xl">{item.excerpt}</p>}

        {item.is_automated && <div className="mt-7 rounded-2xl border border-rcl-blue/18 bg-rcl-blue/[.05] p-4 text-xs leading-5 text-white/45">
          <div className="flex items-start gap-3"><FaCircleCheck className="mt-0.5 shrink-0 text-rcl-blue"/><p><b className="text-white/75">RCH Newsroom disclosure:</b> This article was AI-assisted. Linked references, where available, are shown below; the presence of automation is not proof that every claim was independently verified. Corrections and source reviews may be requested through the newsroom.</p></div>
          {confidence !== null && <p className="mt-2 pl-6 text-[10px] uppercase tracking-wider text-white/25">Automated editorial confidence · {Math.round(confidence * 100)}%</p>}
        </div>}
      </div>

      <div className="relative mt-8 aspect-[16/9] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"><Image src={coverImageUrl} alt={`Editorial cover: ${item.title}`} fill priority sizes="(max-width: 1024px) 100vw, 896px" unoptimized={coverImageUrl.startsWith('/api/news-cover/')} className="object-cover" /></div>

      <article className="mt-10 max-w-3xl space-y-6 text-[17px] leading-8 text-white/72">
        {paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}
      </article>

      <NetworkSponsoredPlacement
        placement="news-feature"
        surface="news-article-inline"
        variant="inline"
        slotKey="news-article"
        dailyCap={2}
        sessionCap={1}
        brandLabel="News partner"
        ctaLabel="Visit sponsor"
        className="mt-10 max-w-3xl"
      />

      {sources.length===0 && <p className="mt-10 max-w-3xl rounded-xl border border-amber-300/25 bg-amber-300/[.04] p-4 text-xs leading-5 text-amber-100">No external reporting sources are linked for this article. Treat independent claims as uncorroborated until sources are provided; official Rich City League announcements should be confirmed against league records.</p>}
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
    )}
  </main>;
}

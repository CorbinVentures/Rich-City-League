import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/Container';
import {
  FaArrowRight, FaBolt, FaBullhorn, FaChartLine, FaCircleCheck, FaGlobe,
  FaHandshake, FaPeopleGroup, FaRectangleAd, FaTrophy,
} from 'react-icons/fa6';

export const metadata: Metadata = {
  title: 'Community Partners & Advertising',
  description: 'Join the RCH Community Network for free or promote your organization, event, or business through measurable Rich City Hoops advertising and sponsorship inventory.',
  alternates: { canonical: '/network/partners' },
  openGraph: {
    type: 'website',
    url: '/network/partners',
    title: 'Community Partners & Advertising',
    description: 'Join the RCH Community Network for free or promote your organization, event, or business through measurable Rich City Hoops advertising and sponsorship inventory.',
    siteName: 'Rich City Hoops',
    images: [{ url: 'https://www.richcityhoops.com/opengraph-image?v=20261014', width: 1200, height: 630, alt: 'Rich City Hoops — Virginia basketball community' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Community Partners & Advertising',
    description: 'Join the RCH Community Network for free or promote your organization, event, or business through measurable Rich City Hoops advertising and sponsorship inventory.',
    images: ['https://www.richcityhoops.com/opengraph-image?v=20261014'],
  },
};

const partnerProducts = [
  {
    name:'Community Partner',
    price:'Free',
    code:'community',
    accent:'blue' as const,
    tagline:'Join the network, keep your identity, and give your community another place to be discovered.',
    features:[
      'RCH organization profile and directory presence',
      'Website and social destination links',
      'Eligible community event listings',
      'Standard Network discovery',
      'Claimable organization profile',
      'Optional paid promotion only when you want more reach',
    ],
  },
  {
    name:'Promotion Boost',
    price:'From $49',
    code:'boost',
    accent:'orange' as const,
    tagline:'Push one important event, launch, offer, or community moment without committing to a monthly plan.',
    features:[
      'Time-limited sponsored distribution',
      'Featured event or organization inventory',
      'Eligible social-feed placement',
      'Regional or Community Network promotion',
      'Campaign reach and click reporting where available',
      'Clearly labeled sponsored placement',
    ],
  },
  {
    name:'Partner Pro',
    price:'From $149/mo',
    code:'partner-pro',
    accent:'blue' as const,
    tagline:'Built for organizations that have something happening every month.',
    features:[
      'Everything in Community Partner',
      'Recurring priority distribution inventory',
      'Monthly event-promotion opportunities',
      'Enhanced discovery and organization visibility',
      'Exposure analytics for views, clicks, shares, and reach',
      'Priority consideration for community/editorial spotlights',
    ],
  },
];

const advertiserProducts = [
  {
    name:'Business Advertising',
    price:'From $250/mo',
    code:'business-advertising',
    copy:'Reach the combined RCH basketball and community audience through sponsored placements, featured content, community inventory, events, RCH TV, and eligible digest/email distribution.',
  },
  {
    name:'Major Sponsor',
    price:'Custom',
    code:'major-sponsor',
    copy:'Own a recurring RCH product or category through naming rights and deeper activations such as RCH Runs, the Weekend Guide, Community Spotlight, RCH TV, or other premium inventory.',
  },
];

const inventory = [
  ['Sponsored Feed','Native, disclosed placement inside eligible RCH feeds.'],
  ['Featured Event','Priority visibility for a major event or activation.'],
  ['Community Feature','Placement inside RCH Community discovery and editorial surfaces.'],
  ['RCH TV','Eligible sponsor or partner visibility around RCH video/media inventory.'],
  ['Digest / Email','Eligible inclusion in recurring RCH communications when inventory is available.'],
  ['Category Sponsorship','Recurring “presented by” ownership around an RCH product or content series.'],
];

export default function NetworkPartnersPage(){
  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_82%_8%,rgba(44,166,255,.12),transparent_28%),linear-gradient(145deg,#071522,#03070d)]">
      <Container maxWidth="xl" className="py-12 sm:py-16">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCH Network</p>
        <h1 className="mt-3 max-w-5xl font-display text-5xl font-black uppercase leading-[.94] tracking-[-.04em] sm:text-7xl">Community partners.<br/><span className="text-rcl-blue">Real visibility.</span></h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-white/55">Join the RCH Community Network for free or promote your organization, event, or business through eligible Rich City Hoops placements.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/network/partners/apply" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-sm font-black text-black">Join the Network <FaArrowRight aria-hidden="true"/></Link>
          <Link href="/sponsors/start" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-bold">Sponsor RCH</Link>
        </div>
      </Container>
    </section>
    <Container maxWidth="xl" className="py-10">
      <section>
        <h2 className="font-display text-2xl font-black uppercase">Partner options</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {partnerProducts.map(product=><article key={product.code} className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
            <h3 className="font-display text-xl font-black uppercase">{product.name}</h3>
            <p className="mt-2 text-3xl font-black">{product.price}</p>
            <p className="mt-3 text-sm leading-6 text-white/55">{product.tagline}</p>
            <ul className="mt-5 space-y-2 text-sm text-white/65">{product.features.map(feature=><li key={feature} className="flex gap-2"><FaCircleCheck className="mt-1 shrink-0 text-rcl-blue" aria-hidden="true"/>{feature}</li>)}</ul>
            <Link href={product.code==='community'?'/network/partners/apply':'/sponsors/start'} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-rcl-orange">Get started <FaArrowRight aria-hidden="true"/></Link>
          </article>)}
        </div>
      </section>
      <section className="mt-12">
        <h2 className="font-display text-2xl font-black uppercase">Advertising inventory</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {inventory.map(([name,copy])=><article key={name} className="rounded-xl border border-white/10 p-4"><h3 className="font-bold">{name}</h3><p className="mt-2 text-sm text-white/55">{copy}</p></article>)}
        </div>
      </section>
    </Container>
  </main>;
}

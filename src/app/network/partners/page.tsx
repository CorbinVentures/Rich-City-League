import Link from 'next/link';
import { Container } from '@/components/Container';
import {
  FaArrowRight, FaBolt, FaBullhorn, FaChartLine, FaCircleCheck, FaGlobe,
  FaHandshake, FaPeopleGroup, FaRectangleAd, FaTrophy,
} from 'react-icons/fa6';

export const metadata = {
  title: 'Community Partners & Advertising | Rich City Hoops',
  description: 'Join the RCH Community Network for free or promote your organization, event, or business through measurable Rich City Hoops advertising and sponsorship inventory.',
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
    <section className="border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_78%_15%,rgba(21,159,255,.14),transparent_30%),radial-gradient(circle_at_16%_88%,rgba(249,115,22,.08),transparent_28%),linear-gradient(145deg,#071522,#03070d)]">
      <Container maxWidth="xl" className="py-14 sm:py-20 lg:py-24">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-rcl-orange">RCH Community Network · Partnerships + Advertising</p>
        <h1 className="mt-4 max-w-5xl font-display text-5xl font-black uppercase leading-[.93] tracking-[-.045em] sm:text-7xl">Grow the community.<br/><span className="text-rcl-blue">Reach the audience.</span></h1>
        <p className="mt-6 max-w-3xl text-base leading-7 text-white/55 sm:text-lg">Community organizations can join Rich City Hoops without paying to belong. Businesses and partners can then buy clearly labeled distribution, advertising, and sponsorship inventory to reach the audience that network creates.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/network/partners/apply?plan=community" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-blue px-5 text-xs font-black uppercase tracking-wide text-[#03101a]">Join free <FaPeopleGroup/></Link>
          <Link href="#advertising" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-rcl-orange/35 bg-rcl-orange/[.06] px-5 text-xs font-black uppercase tracking-wide text-rcl-orange">Advertise with RCH <FaRectangleAd/></Link>
          <Link href="/community" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 text-xs font-black uppercase tracking-wide text-white/55">Explore community <FaArrowRight/></Link>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-10 sm:py-14">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Promise icon={<FaHandshake/>} title="Independent" copy="Your club, organization, business, events, and identity remain yours."/>
        <Promise icon={<FaGlobe/>} title="Connected" copy="Plug into the broader RCH audience without joining Rich City League competition."/>
        <Promise icon={<FaBullhorn/>} title="Promotable" copy="Boost the moments that matter instead of paying just to exist in the directory."/>
        <Promise icon={<FaChartLine/>} title="Measurable" copy="RCH is built to report impressions, views, clicks, shares, and campaign reach."/>
      </section>

      <section className="mt-14 rounded-3xl border border-rcl-orange/20 bg-rcl-orange/[.045] p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">The RCH model</p>
            <h2 className="mt-2 font-display text-4xl font-black uppercase sm:text-5xl">Community is not pay-to-play.</h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/50">Car clubs, run clubs, social groups, nonprofits, creators, basketball organizations, and other Virginia communities can be represented for free. Paid products buy additional distribution—not legitimacy, basketball credibility, rankings, REP, awards, or competitive outcomes.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-rcl-blue">Platform ≠ league competition</p>
            <p className="mt-3 text-sm leading-6 text-white/45">A group can partner with the Rich City Hoops platform without participating in, supporting, or competing with Rich City League. The Network is the distribution layer; the league is one competitive property inside the broader RCH ecosystem.</p>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">Community partner products</p>
          <h2 className="mt-2 font-display text-4xl font-black uppercase sm:text-5xl">Start free. Promote when it matters.</h2>
          <p className="mt-3 text-sm leading-6 text-white/45">The free layer grows the network. Paid promotion is there when an organization wants more distribution around a specific moment or recurring calendar.</p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">{partnerProducts.map(product=><ProductCard key={product.name} {...product}/>)}</div>
      </section>

      <section id="advertising" className="mt-16 scroll-mt-24">
        <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">For businesses + sponsors</p>
            <h2 className="mt-2 font-display text-4xl font-black uppercase sm:text-5xl">Reach Richmond culture through RCH.</h2>
            <p className="mt-4 text-sm leading-6 text-white/45">Instead of sponsoring only a basketball league, advertisers can reach a broader RCH audience built around basketball, cars, fitness, social life, creators, events, and local community culture.</p>
            <div className="mt-6 space-y-3">{advertiserProducts.map(product=><AdvertiserCard key={product.name} {...product}/>)}</div>
          </div>
          <div className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/65 p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">Advertising inventory</p>
            <h3 className="mt-2 font-display text-3xl font-black uppercase">Native placements people can understand.</h3>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">{inventory.map(([title,copy])=><div key={title} className="rounded-2xl border border-white/10 bg-black/15 p-5"><FaRectangleAd className="text-rcl-blue"/><b className="mt-3 block text-xs font-black uppercase tracking-wide">{title}</b><p className="mt-2 text-xs leading-5 text-white/40">{copy}</p></div>)}</div>
          </div>
        </div>
      </section>

      <section className="mt-14 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-rcl-blue/20 bg-rcl-blue/[.04] p-6 sm:p-8">
          <FaBolt className="text-2xl text-rcl-blue"/>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">Recurring opportunity</p>
          <h2 className="mt-2 font-display text-3xl font-black uppercase">RCH Weekend Guide</h2>
          <p className="mt-3 text-sm leading-6 text-white/45">The Community Network is being structured so RCH can package basketball, runs, car meets, social events, fitness, nightlife, and community activity into a recurring local guide. Partner events can be discovered organically; sponsors can own premium guide inventory.</p>
        </div>
        <div className="rounded-3xl border border-rcl-orange/20 bg-rcl-orange/[.045] p-6 sm:p-8">
          <FaTrophy className="text-2xl text-rcl-orange"/>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">Premium ownership</p>
          <h2 className="mt-2 font-display text-3xl font-black uppercase">“Presented by” sponsorships</h2>
          <p className="mt-3 text-sm leading-6 text-white/45">Major partners can discuss recurring category sponsorship around products such as RCH Runs, the Weekend Guide, Community Spotlight, RCH TV, or other RCH-owned experiences. Availability and exclusivity are handled individually.</p>
        </div>
      </section>

      <section className="mt-14 rounded-3xl border border-rcl-blue/20 bg-[linear-gradient(120deg,#071522,#08111b_55%,rgba(21,159,255,.08))] p-7 text-center sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">RCH Community Network</p>
        <h2 className="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">Tell us what you want to grow.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/50">Join free, promote an event, advertise a business, or discuss a major sponsorship. RCH can route the inquiry to the right kind of partnership without forcing every organization into the same package.</p>
        <Link href="/network/partners/apply" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase tracking-wide text-black">Become an RCH partner <FaArrowRight/></Link>
      </section>
    </Container>
  </main>;
}

function Promise({icon,title,copy}:{icon:React.ReactNode;title:string;copy:string}){
  return <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5"><span className="text-xl text-rcl-blue">{icon}</span><h3 className="mt-3 font-display text-2xl font-black uppercase">{title}</h3><p className="mt-2 text-xs leading-5 text-white/40">{copy}</p></div>;
}

function ProductCard({name,price,code,tagline,features,accent}:{name:string;price:string;code:string;tagline:string;features:string[];accent:'blue'|'orange'}){
  const orange=accent==='orange';
  return <article className={`rounded-2xl border p-6 ${orange?'border-rcl-orange/35 bg-rcl-orange/[.055]':'border-rcl-blue/20 bg-[#071522]/65'}`}>
    <p className={`text-[10px] font-black uppercase tracking-[.18em] ${orange?'text-rcl-orange':'text-rcl-blue'}`}>{name}</p>
    <strong className="mt-3 block font-display text-4xl font-black uppercase">{price}</strong>
    <p className="mt-3 min-h-16 text-sm leading-6 text-white/45">{tagline}</p>
    <div className="mt-5 space-y-3 border-t border-white/10 pt-5">{features.map(feature=><p key={feature} className="flex gap-2 text-xs leading-5 text-white/60"><FaCircleCheck className={`mt-1 shrink-0 ${orange?'text-rcl-orange':'text-rcl-blue'}`}/><span>{feature}</span></p>)}</div>
    <Link href={`/network/partners/apply?plan=${code}`} className={`mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wide ${orange?'bg-rcl-orange text-black':'bg-rcl-blue text-[#03101a]'}`}>Get started <FaArrowRight/></Link>
  </article>;
}

function AdvertiserCard({name,price,code,copy}:{name:string;price:string;code:string;copy:string}){
  return <Link href={`/network/partners/apply?plan=${code}`} className="group block rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-rcl-orange/30">
    <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-orange">{name}</p><strong className="mt-1 block font-display text-3xl font-black uppercase">{price}</strong></div><FaArrowRight className="mt-2 text-rcl-orange transition group-hover:translate-x-1"/></div>
    <p className="mt-3 text-xs leading-5 text-white/40">{copy}</p>
  </Link>;
}

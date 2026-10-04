import Link from 'next/link';
import { Container } from '@/components/Container';
import {
  FaArrowRight, FaBullseye, FaChartLine, FaCircleCheck, FaHandshake,
  FaRectangleAd, FaShieldHalved, FaTrophy,
} from 'react-icons/fa6';
import { SPONSOR_INVENTORY } from '@/lib/sponsorship';

export const metadata={
  title:'Sponsor Rich City Hoops | RCH Sponsor Center',
  description:'Advertise across Rich City Hoops or build a presenting sponsorship around RCH social, community, runs, media and Virginia basketball audiences.',
};

export default function SponsorsPage(){
  const featured=SPONSOR_INVENTORY.filter(item=>item.featured);
  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="overflow-hidden border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_82%_12%,rgba(21,159,255,.16),transparent_30%),radial-gradient(circle_at_12%_88%,rgba(249,115,22,.10),transparent_27%),linear-gradient(145deg,#071522,#03070d_72%)]">
      <Container maxWidth="xl" className="py-14 sm:py-20 lg:py-24">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-rcl-orange">RCH Sponsor Center</p>
        <h1 className="mt-4 max-w-6xl font-display text-5xl font-black uppercase leading-[.91] tracking-[-.045em] sm:text-7xl lg:text-8xl">Reach Richmond culture.<br/><span className="text-rcl-blue">Not just a basketball website.</span></h1>
        <p className="mt-6 max-w-3xl text-base leading-7 text-white/55 sm:text-lg">RCH combines basketball, social discovery, community organizations, runs, media, events and local culture into one growing Virginia network. Sponsors can buy measurable distribution or build a longer-term association with an RCH property.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sponsors/start" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wide text-black">Build a sponsorship <FaArrowRight/></Link>
          <Link href="/sponsors/dashboard" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-rcl-blue/30 bg-rcl-blue/[.05] px-5 text-xs font-black uppercase tracking-wide text-rcl-blue">Sponsor dashboard <FaChartLine/></Link>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Value icon={<FaRectangleAd/>} title="Campaign" copy="Buy a defined placement for a defined period around a clear objective."/>
          <Value icon={<FaHandshake/>} title="Featured Partner" copy="Build repeated brand visibility across a relevant RCH surface."/>
          <Value icon={<FaTrophy/>} title="Presenting Sponsor" copy="Attach your brand to an RCH-owned product such as Runs, RCH TV or the Weekend Guide."/>
          <Value icon={<FaShieldHalved/>} title="Exclusive Partner" copy="Discuss category ownership where availability and brand fit make sense."/>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-10 sm:py-14">
      <section className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/65 p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">What sponsors are buying</p>
          <h2 className="mt-2 font-display text-4xl font-black uppercase sm:text-5xl">Distribution + association + proof.</h2>
          <p className="mt-4 text-sm leading-6 text-white/45">RCH does not sell competitive influence. Sponsors buy clearly disclosed placement, association with an agreed RCH property, and performance reporting. When a campaign ends, the dashboard can show delivered impressions, views, outbound clicks and other eligible engagement generated inside the Network.</p>
        </div>
        <div className="rounded-3xl border border-rcl-orange/20 bg-rcl-orange/[.045] p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">Early-stage pricing discipline</p>
          <h2 className="mt-2 font-display text-3xl font-black uppercase">We sell the inventory we can actually deliver.</h2>
          <p className="mt-3 text-sm leading-6 text-white/45">Starting prices are based on placement, duration and association—not inflated impression promises. As the RCH audience grows, verified delivery data becomes the basis for stronger packages and larger commitments.</p>
        </div>
      </section>

      <section className="mt-16">
        <div className="mx-auto max-w-3xl text-center"><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">Available opportunities</p><h2 className="mt-2 font-display text-4xl font-black uppercase sm:text-5xl">Choose the outcome first.</h2><p className="mt-3 text-sm leading-6 text-white/45">Every placement remains subject to fit, availability and RCH approval. “From” pricing is a starting point, not a guaranteed media buy.</p></div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{SPONSOR_INVENTORY.map(item=><InventoryCard key={item.code} item={item}/>)}</div>
      </section>

      <section className="mt-16 rounded-3xl border border-rcl-blue/20 bg-[linear-gradient(120deg,rgba(21,159,255,.07),#071522_42%,rgba(249,115,22,.05))] p-7 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">Premium inventory</p><h2 className="mt-2 font-display text-4xl font-black uppercase sm:text-5xl">Own an RCH property, not a random banner.</h2><p className="mt-4 text-sm leading-6 text-white/45">The strongest sponsorships create a repeated association people can understand. Presenting and exclusive opportunities are negotiated individually so the brand, term, geography and category rights are explicit.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">{featured.map(item=><Link key={item.code} href={'/sponsors/start?product='+item.code} className="group rounded-2xl border border-white/10 bg-black/15 p-5 transition hover:border-rcl-orange/30"><p className="text-[9px] font-black uppercase tracking-[.16em] text-rcl-orange">{item.eyebrow}</p><h3 className="mt-2 font-display text-2xl font-black uppercase">{item.name}</h3><p className="mt-2 text-xs leading-5 text-white/40">{item.description}</p><div className="mt-4 flex items-center justify-between gap-3"><b className="text-xs text-white/70">{item.priceLabel}</b><FaArrowRight className="text-rcl-orange transition group-hover:translate-x-1"/></div></Link>)}</div>
        </div>
      </section>

      <section className="mt-16">
        <div className="grid gap-4 lg:grid-cols-3">
          <Step number="01" title="Choose the goal" copy="Traffic, awareness, event attendance, media views, community exposure or longer-term brand association."/>
          <Step number="02" title="RCH confirms inventory" copy="We review fit, dates, geography, creative, exclusivity conflicts and the exact commercial terms."/>
          <Step number="03" title="Launch + measure" copy="Approved placements run with disclosure and are measured through RCH Reach wherever the surface supports it."/>
        </div>
      </section>

      <section className="mt-16 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8"><FaBullseye className="text-2xl text-rcl-blue"/><p className="mt-4 text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">Built for local business</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Start small without looking small.</h2><p className="mt-3 text-sm leading-6 text-white/45">A local detailer, restaurant, barber, trainer, retailer or event promoter can run a focused campaign without committing to a major sponsorship. When the fit works, the relationship can grow into recurring inventory.</p></div>
        <div className="rounded-3xl border border-rcl-orange/20 bg-rcl-orange/[.045] p-6 sm:p-8"><FaCircleCheck className="text-2xl text-rcl-orange"/><p className="mt-4 text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">Competitive neutrality</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Money never buys basketball outcomes.</h2><p className="mt-3 text-sm leading-6 text-white/45">Sponsorship never changes REP, rankings, player ratings, stats, awards, editorial conclusions, game results or competitive selection. Sponsored inventory is labeled as sponsored.</p></div>
      </section>

      <section className="mt-16 rounded-3xl border border-rcl-orange/25 bg-[linear-gradient(120deg,rgba(249,115,22,.08),#071522_45%,rgba(21,159,255,.07))] p-8 text-center sm:p-11">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCH Sponsor Center</p>
        <h2 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">Tell us what you want to move.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/50">We can start with one campaign, a recurring feature, a presenting relationship or a custom major sponsorship.</p>
        <Link href="/sponsors/start" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase tracking-wide text-black">Start sponsorship brief <FaArrowRight/></Link>
      </section>
    </Container>
  </main>;
}

function InventoryCard({item}:{item:(typeof SPONSOR_INVENTORY)[number]}){
  return <article className={'rounded-2xl border p-5 '+(item.featured?'border-rcl-orange/30 bg-rcl-orange/[.045]':'border-rcl-blue/15 bg-[#071522]/55')}>
    <p className={'text-[9px] font-black uppercase tracking-[.16em] '+(item.featured?'text-rcl-orange':'text-rcl-blue')}>{item.eyebrow}</p>
    <h3 className="mt-2 font-display text-2xl font-black uppercase">{item.name}</h3>
    <strong className="mt-3 block text-sm text-white/75">{item.priceLabel}</strong>
    <p className="mt-3 min-h-[60px] text-xs leading-5 text-white/40">{item.description}</p>
    <div className="mt-4 space-y-2 border-t border-white/10 pt-4">{item.deliverables.slice(0,4).map(deliverable=><p key={deliverable} className="flex gap-2 text-[11px] leading-5 text-white/50"><FaCircleCheck className="mt-1 shrink-0 text-rcl-blue"/><span>{deliverable}</span></p>)}</div>
    <p className="mt-4 text-[10px] leading-5 text-white/30"><b className="text-white/50">Good for:</b> {item.idealFor}</p>
    <Link href={'/sponsors/start?product='+item.code} className={'mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-wide '+(item.featured?'bg-rcl-orange text-black':'bg-rcl-blue text-[#03101a]')}>Request this <FaArrowRight/></Link>
  </article>;
}

function Value({icon,title,copy}:{icon:React.ReactNode;title:string;copy:string}){return <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5"><span className="text-xl text-rcl-blue">{icon}</span><h3 className="mt-3 font-display text-2xl font-black uppercase">{title}</h3><p className="mt-2 text-xs leading-5 text-white/40">{copy}</p></div>;}
function Step({number,title,copy}:{number:string;title:string;copy:string}){return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6"><span className="font-display text-4xl font-black text-rcl-blue/35">{number}</span><h3 className="mt-4 font-display text-2xl font-black uppercase">{title}</h3><p className="mt-2 text-xs leading-5 text-white/40">{copy}</p></div>;}

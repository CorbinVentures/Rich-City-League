import Link from 'next/link';
import { Container } from '@/components/Container';
import { FaArrowRight, FaBullhorn, FaChartLine, FaCircleCheck, FaGlobe, FaNewspaper, FaPeopleGroup } from 'react-icons/fa6';

export const metadata = {
  title: 'For Organizations | RCL Network',
  description: 'Build visibility across Virginia basketball with RCL Network organization listings, event spotlights, content amplification, and exposure analytics.',
};

const plans = [
  {
    name: 'Network Listing',
    price: 'Free',
    tagline: 'Be represented where Virginia basketball is discovered.',
    accent: 'blue' as const,
    features: [
      'Official RCL Network organization page',
      'Virginia region and category discovery',
      'Website and social destination links',
      'Upcoming public event listings',
      'Standard Network content visibility',
      'Verification eligibility',
    ],
  },
  {
    name: 'Amplify',
    price: '$49/mo',
    tagline: 'Turn your Network presence into measurable audience growth.',
    accent: 'orange' as const,
    features: [
      'Everything in Network Listing',
      'Enhanced organization discovery',
      'Regional/category feature inventory',
      'Up to 2 event spotlight placements each month',
      'Selected content amplification',
      'Exposure reporting: impressions, views, clicks, shares, and audience growth',
    ],
  },
  {
    name: 'Premier Partner',
    price: '$149/mo',
    tagline: 'A recurring exposure partnership across the RCL basketball audience.',
    accent: 'blue' as const,
    features: [
      'Everything in Amplify',
      'Up to 4 featured event placements each month',
      'Rotating statewide feature inventory',
      'Priority consideration for RCL editorial and media coverage',
      'Cross-channel campaign distribution when inventory is available',
      'Advanced campaign and exposure reporting',
      'Premier Partner identity on your organization page',
    ],
  },
];

export default function NetworkPartnersPage() {
  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_78%_15%,rgba(59,130,246,.11),transparent_28%),linear-gradient(145deg,#071522,#03070d)]">
      <Container maxWidth="xl" className="py-14 sm:py-20">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-rcl-orange">RCL Network · For Organizations</p>
        <h1 className="mt-4 max-w-5xl font-display text-5xl font-black uppercase leading-[.94] tracking-[-.045em] sm:text-7xl">We don&apos;t run your organization.<br/><span className="text-rcl-blue">We help Virginia see it.</span></h1>
        <p className="mt-6 max-w-3xl text-base leading-7 text-white/55">Keep the systems, registration process, schedules, payments, and operations you already use. RCL Network focuses on discovery, media, promotion, audience growth, and measurable exposure.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/network/partners/apply" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wide text-black">Join the Network <FaArrowRight/></Link><Link href="/organizations" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-rcl-blue/25 px-5 text-xs font-black uppercase tracking-wide text-rcl-blue">See organizations <FaPeopleGroup/></Link></div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-10 sm:py-14">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Promise icon={<FaGlobe/>} title="Discovery" copy="Give your organization a permanent place inside Virginia basketball discovery."/>
        <Promise icon={<FaBullhorn/>} title="Distribution" copy="Put important events and stories in front of a relevant basketball audience."/>
        <Promise icon={<FaNewspaper/>} title="Media" copy="Create more opportunities for organization, player, coach, and event storytelling."/>
        <Promise icon={<FaChartLine/>} title="Measurement" copy="See the impressions, views, clicks, shares, and audience growth RCL generates."/>
      </section>

      <section className="mt-14">
        <div className="mx-auto max-w-3xl text-center"><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">Exposure levels</p><h2 className="mt-2 font-display text-4xl font-black uppercase sm:text-5xl">Start visible. Scale when it works.</h2><p className="mt-3 text-sm leading-6 text-white/45">Free listings help make the Network complete. Paid levels purchase additional distribution inventory and reporting—not basketball credibility.</p></div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">{plans.map((plan)=><PlanCard key={plan.name} {...plan}/>)}</div>
        <p className="mt-4 text-center text-xs leading-5 text-white/30">Launch pricing is introductory and may change as Network reach, inventory, and partner demand develop. Placement availability is subject to campaign capacity.</p>
      </section>

      <section className="mt-14 grid gap-6 rounded-3xl border border-rcl-blue/20 bg-[#071522]/65 p-6 sm:p-8 lg:grid-cols-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">What RCL will measure</p>
          <h2 className="mt-2 font-display text-4xl font-black uppercase">Make “exposure” accountable.</h2>
          <p className="mt-4 text-sm leading-6 text-white/45">The value proposition cannot stop at “we posted your flyer.” RCL is building reporting around outcomes organization operators can actually understand.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {['Impressions','Organization views','Event views','Outbound clicks','Shares','Audience growth','Media views','Campaign reach'].map((metric)=><div key={metric} className="rounded-xl border border-white/10 bg-black/15 p-4"><FaChartLine className="text-rcl-blue"/><b className="mt-2 block text-xs font-black uppercase tracking-wide text-white/70">{metric}</b></div>)}
        </div>
      </section>

      <section className="mt-14 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-rcl-orange/20 bg-rcl-orange/[.045] p-6"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-orange">Competitive neutrality</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Competitors can still belong here.</h2><p className="mt-3 text-sm leading-6 text-white/45">A league or tournament can compete directly with Rich City League and still be represented in RCL Network. Sponsored placement is labeled. Organic discovery remains available. Competitive results, REP, rankings, and awards are never for sale.</p></div>
        <div className="rounded-2xl border border-rcl-blue/20 bg-rcl-blue/[.04] p-6"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">Operational independence</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Your program stays yours.</h2><p className="mt-3 text-sm leading-6 text-white/45">RCL Network does not require organizations to transfer registration, payments, scheduling, rosters, standings, or team administration. Public exposure can link directly back to the destination the organization already controls.</p></div>
      </section>

      <section className="mt-14 rounded-3xl border border-rcl-orange/25 bg-[linear-gradient(120deg,rgba(59,130,246,.08),#071522)] p-7 text-center sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">Built for Virginia basketball</p>
        <h2 className="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">Put your organization on the Network.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/50">Start with a free presence or tell RCL what kind of audience growth you need. The first goal is simple: make it easier for the right basketball people to find you.</p>
        <Link href="/network/partners/apply" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase tracking-wide text-black">Request your organization page <FaArrowRight/></Link>
      </section>
    </Container>
  </main>;
}

function Promise({icon,title,copy}:{icon:React.ReactNode;title:string;copy:string}) { return <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5"><span className="text-xl text-rcl-blue">{icon}</span><h3 className="mt-3 font-display text-2xl font-black uppercase">{title}</h3><p className="mt-2 text-xs leading-5 text-white/40">{copy}</p></div>; }
function PlanCard({name,price,tagline,features,accent}:{name:string;price:string;tagline:string;features:string[];accent:'blue'|'orange'}) { const orange=accent==='orange'; return <article className={`rounded-2xl border p-6 ${orange?'border-rcl-orange/35 bg-rcl-orange/[.055]':'border-rcl-blue/20 bg-[#071522]/65'}`}><p className={`text-[10px] font-black uppercase tracking-[.18em] ${orange?'text-rcl-orange':'text-rcl-blue'}`}>{name}</p><div className="mt-3 flex items-baseline gap-2"><strong className="font-display text-4xl font-black uppercase">{price}</strong>{price!=='Free'&&<span className="text-xs text-white/30">introductory</span>}</div><p className="mt-3 min-h-12 text-sm leading-6 text-white/45">{tagline}</p><div className="mt-5 space-y-3 border-t border-white/10 pt-5">{features.map((feature)=><p key={feature} className="flex gap-2 text-xs leading-5 text-white/60"><FaCircleCheck className={`mt-1 shrink-0 ${orange?'text-rcl-orange':'text-rcl-blue'}`}/><span>{feature}</span></p>)}</div><Link href={`/network/partners/apply?plan=${encodeURIComponent(name.toLowerCase().replaceAll(' ','-'))}`} className={`mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wide ${orange?'bg-rcl-orange text-black':'bg-rcl-blue text-[#03101a]'}`}>Get started <FaArrowRight/></Link></article>; }

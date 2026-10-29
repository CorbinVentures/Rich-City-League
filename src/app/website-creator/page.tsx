import type {Metadata} from 'next';
import Link from 'next/link';
import {Container} from '@/components/Container';
import {FaArrowRight,FaBasketball,FaGlobe,FaLock} from 'react-icons/fa6';
import {RchSitePricingCards} from '@/components/sites/RchSitePricingCards';
import {rchSitesBillingEnabled} from '@/lib/rch-sites-stripe-billing';

export const dynamic='force-dynamic';

export const metadata:Metadata={
  title:'Website Creator | RCH Sites',
  description:'Create your own basketball website with Rich City Hoops. Start designing immediately: trainers, coaches, teams, leagues, AAU programs and organizers. Free, Amateur and Professional website plans.',
  alternates:{canonical:'/website-creator'},
};

const audiences=['Trainers','Coaches','AAU programs','Teams & leagues','Basketball organizers'];

export default function WebsiteCreatorPage(){
  const billingOpen=rchSitesBillingEnabled();
  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-sky-400/20 bg-[radial-gradient(ellipse_at_85%_20%,rgba(35,129,184,.27),transparent_55%),linear-gradient(140deg,#10263a,#03070d_75%)]">
      <Container maxWidth="xl" className="py-14 sm:py-20">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-sky-300"><FaGlobe aria-hidden="true"/> RCH Sites · Website Creator</p>
        <h1 className="mt-5 font-display text-5xl font-black uppercase leading-[.95] tracking-[-.045em] sm:text-7xl">Your brand.<br/><span className="text-sky-300">Your website.</span></h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-white/70">A website for your basketball business. Share training, coaching, programs and events under your own name — powered by Rich City Hoops, operated by you.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/website-creator/start" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-black text-[#071522]">Get Started <FaArrowRight aria-hidden="true"/></Link>
          <Link href="/website-creator/demo" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-sky-400/35 bg-sky-400/10 px-5 py-3 text-sm font-black text-sky-200">Explore an example <FaBasketball aria-hidden="true"/></Link>
          <Link href="#plans" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-black text-white">Compare plans</Link>
          <Link href="/network/dashboard/sites" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-black text-white">Already have a site? Open Studio</Link>
        </div>
        <p className="mt-5 text-xs text-white/50">Choose your design and save a draft first. Organization verification is only needed before publishing.</p>
      </Container>
    </section>
    <Container maxWidth="xl" className="py-14">
      <section aria-labelledby="audience-heading">
        <p className="text-xs font-black uppercase tracking-[.18em] text-sky-300">Everyone building basketball</p>
        <h2 id="audience-heading" className="mt-2 font-display text-3xl font-black uppercase">Who is it for?</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {audiences.map(name=><div key={name} className="flex min-h-20 items-center gap-3 rounded-2xl border border-white/15 bg-white/[.04] px-4 text-sm font-bold"><FaBasketball className="shrink-0 text-sky-300" aria-hidden="true"/>{name}</div>)}
        </div>
      </section>
      <section id="plans" aria-labelledby="plan-heading" className="mt-16 scroll-mt-24">
        <p className="text-xs font-black uppercase tracking-[.18em] text-sky-300">Website subscriptions</p>
        <h2 id="plan-heading" className="mt-2 font-display text-3xl font-black uppercase">Find your level.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">Free, Amateur and Professional are website subscription levels, not RCH Network advertising plans.</p>
        <RchSitePricingCards billingOpen={billingOpen}/>
        <p className="mt-5 max-w-3xl text-xs leading-6 text-white/50">{billingOpen
          ?'Amateur and Professional subscriptions are available to verified organization owners and managers in Website Studio. Choosing a plan here saves your preference—it does not charge you. Features marked planned are not yet released, and founding discounts are not open.'
          :'Paid website enrollment is not open yet. You can create and save a free website draft now. Current features are shown separately from upcoming modules and future paid plans.'}</p>
      </section>
      <section className="mt-16 grid gap-7 rounded-3xl border border-white/15 bg-[#0d2030] p-6 sm:p-10 md:grid-cols-2 md:items-center">
        <div><p className="text-xs font-black uppercase tracking-[.17em] text-sky-300">Your organization. Your rules.</p><h2 className="mt-3 font-display text-3xl font-black uppercase">Build with RCH. Stay independent.</h2><p className="mt-4 text-sm leading-7 text-white/65">Anyone operating a basketball business can start designing immediately. RCH verifies the applicant’s authorization before transferring a draft into organization Website Studio or publishing.</p><Link href="/website-creator/start?tier=free" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#071522]">Get Started <FaArrowRight aria-hidden="true"/></Link></div>
        <div className="space-y-4 text-sm leading-7 text-white/70"><p className="flex gap-3"><FaLock className="mt-1 shrink-0 text-sky-300" aria-hidden="true"/> You control your site within approved templates, never the main RCH platform or anyone else’s data.</p><p>Your customers pay through your own PayPal Business payment links. RCH website subscriptions are separate from your customer payments.</p><p>Existing owners can go directly to <Link href="/network/dashboard/sites" className="font-bold text-sky-300 underline">Website Studio</Link>.</p></div>
      </section>
    </Container>
  </main>;
}

import type {Metadata} from 'next';
import Link from 'next/link';
import {Container} from '@/components/Container';
import {FaArrowRight,FaBasketball,FaCircleCheck,FaGlobe,FaLock} from 'react-icons/fa6';

export const metadata:Metadata={
  title:'Website Creator | RCH Sites',
  description:'Create your own basketball website with Rich City Hoops. Public applications for trainers, coaches, teams, leagues, AAU programs and event organizers. Free, Amateur and Professional website plans.',
  alternates:{canonical:'/website-creator'},
};

const plans=[
  {id:'free',name:'Free',price:'$0 / month',subtitle:'Make your mark',features:['Branded RCH subsite','Customizable approved templates','Program info, media and contact details'],footnote:'Free access after organization verification.'},
  {id:'amateur',name:'Amateur',price:'Pricing to be announced',subtitle:'Build your business',features:['Expanded appointment and service tools','More client and media capabilities','Growing program workflows'],footnote:'Planned paid level. Register interest; no checkout yet.'},
  {id:'professional',name:'Professional',price:'Pricing to be announced',subtitle:'Scale your program',features:['Advanced program and team tools','Expanded reporting and site customization','Optional local SEO support'],footnote:'Planned paid level. Register interest; no checkout yet.'},
] as const;

const audiences=['Trainers','Coaches','AAU programs','Teams & leagues','Basketball organizers'];

export default function WebsiteCreatorPage(){
  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-sky-400/20 bg-[radial-gradient(ellipse_at_85%_20%,rgba(35,129,184,.27),transparent_55%),linear-gradient(140deg,#10263a,#03070d_75%)]">
      <Container maxWidth="xl" className="py-14 sm:py-20">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-sky-300"><FaGlobe aria-hidden="true"/> RCH Sites · Website Creator</p>
        <h1 className="mt-5 font-display text-5xl font-black uppercase leading-[.95] tracking-[-.045em] sm:text-7xl">Your brand.<br/><span className="text-sky-300">Your website.</span></h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-white/70">A website for your basketball business. Share training, coaching, programs and events under your own name — powered by Rich City Hoops, operated by you.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="#plans" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-black text-[#071522]">View website plans <FaArrowRight aria-hidden="true"/></Link>
          <Link href="/network/dashboard/sites" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-black text-white">Already approved? Open Studio</Link>
        </div>
        <p className="mt-5 text-xs text-white/50">Public applications welcome. You do not have to compete in Rich City League.</p>
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
        <div className="mt-7 grid gap-4 lg:grid-cols-3">{plans.map(plan=><article key={plan.id} className={'flex min-w-0 flex-col rounded-3xl border p-6 '+(plan.id==='amateur'?'border-sky-400/55 bg-[#10283a]':'border-white/15 bg-[#0b1723]')}>
          <p className="text-xs font-black uppercase tracking-[.17em] text-sky-300">{plan.name}</p>
          <h3 className="mt-3 font-display text-2xl font-black uppercase">{plan.subtitle}</h3>
          <p className="mt-5 text-lg font-black">{plan.price}</p>
          <ul className="mt-6 flex-1 space-y-3">{plan.features.map(item=><li key={item} className="flex gap-2 text-sm leading-6 text-white/75"><FaCircleCheck className="mt-1 shrink-0 text-sky-300" aria-hidden="true"/>{item}</li>)}</ul>
          <Link href={'/network/partners/apply?siteTier='+plan.id} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-3 text-sm font-black text-[#071522]">{plan.id==='free'?'Request free access':'Register interest'} <FaArrowRight aria-hidden="true"/></Link>
          <p className="mt-3 text-xs leading-5 text-white/50">{plan.footnote}</p>
        </article>)}</div>
        <p className="mt-5 text-xs leading-6 text-white/50">Amateur and Professional subscriptions are not yet available for purchase. Choosing a tier only records your preference. Pricing, final features and billing terms will be shown before any paid enrollment.</p>
      </section>
      <section className="mt-16 grid gap-7 rounded-3xl border border-white/15 bg-[#0d2030] p-6 sm:p-10 md:grid-cols-2 md:items-center">
        <div><p className="text-xs font-black uppercase tracking-[.17em] text-sky-300">Your organization. Your rules.</p><h2 className="mt-3 font-display text-3xl font-black uppercase">Build with RCH. Stay independent.</h2><p className="mt-4 text-sm leading-7 text-white/65">Anyone operating a basketball business can apply. RCH verifies the applicant’s authorization before unlocking website editing and publishing.</p><Link href="/network/partners/apply?siteTier=free" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#071522]">Get started <FaArrowRight aria-hidden="true"/></Link></div>
        <div className="space-y-4 text-sm leading-7 text-white/70"><p className="flex gap-3"><FaLock className="mt-1 shrink-0 text-sky-300" aria-hidden="true"/> You control your site within approved templates, never the main RCH platform or anyone else’s data.</p><p>Your customers pay through your own PayPal Business payment links. RCH website subscriptions are separate from your customer payments.</p><p>Existing owners can go directly to <Link href="/network/dashboard/sites" className="font-bold text-sky-300 underline">Website Studio</Link>.</p></div>
      </section>
    </Container>
  </main>;
}

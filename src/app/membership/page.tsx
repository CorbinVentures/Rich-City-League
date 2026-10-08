import type { Metadata } from 'next';
import Link from 'next/link';
import { FaArrowRight, FaBasketball, FaCalendarDays, FaChartLine, FaCircleCheck, FaCrown, FaMapLocationDot, FaShieldHalved } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { MEMBERSHIP_PLANS, formatMembershipPrice, type MembershipPlanCode } from '@/lib/membership';
import { stripeBillingConfigured } from '@/lib/stripe-billing';

export const metadata: Metadata = {
  title: 'RCL Memberships | Rich City League',
  description: 'RCL+ and RCL All Access organize your Virginia basketball world with personalized discovery, Basketball Passport tools, analytics and RCL member benefits.',
  alternates: { canonical: '/membership' },
};

const planOrder: MembershipPlanCode[] = ['free', 'rcl_plus', 'all_access'];
const valuePillars = [
  { icon: FaMapLocationDot, title: 'My Hoops', copy: 'Bring Virginia basketball opportunities, organizations, Runs and the things you follow into one personal command center.' },
  { icon: FaCalendarDays, title: 'Never miss the opportunity', copy: 'Save basketball activity, personalize what matters to you and export your RCL basketball calendar.' },
  { icon: FaChartLine, title: 'Know your reach', copy: 'See how your RCL identity and Basketball Passport are being discovered instead of posting into the dark.' },
  { icon: FaBasketball, title: 'Own your basketball history', copy: 'Use RCL Passport tools to organize and share the basketball identity you build across the platform.' },
];

export default function MembershipPage() {
  const billingReady = stripeBillingConfigured();
  return <main className="rcl-social-secondary min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-white/10 bg-[radial-gradient(circle_at_75%_15%,rgba(59,130,246,.18),transparent_32%),radial-gradient(circle_at_20%_20%,rgba(21,159,255,.13),transparent_30%),#050a10] py-16 sm:py-24">
      <Container maxWidth="xl">
        <div className="max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[.28em] text-rcl-orange">RCL Membership</p>
          <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[.9] sm:text-7xl">More value from <span className="text-rcl-blue">Virginia basketball.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">The free RCL community stays useful. Paid membership is for people who want their basketball world organized, measurable and easier to act on—not a paywall around the community.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/account/membership" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">View my membership <FaArrowRight /></Link><Link href="/my-hoops" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 px-5 text-xs font-black uppercase tracking-wider">Preview My Hoops</Link></div>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-12">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{valuePillars.map(({icon:Icon,title,copy})=><article key={title} className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><span className="grid h-11 w-11 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><Icon /></span><h2 className="mt-5 font-display text-xl font-black uppercase">{title}</h2><p className="mt-2 text-sm leading-6 text-white/45">{copy}</p></article>)}</section>

      <section className="mt-14 grid gap-5 lg:grid-cols-3">{planOrder.map((code)=>{const plan=MEMBERSHIP_PLANS[code];const paid=code!=='free';return <article key={code} className={`relative rounded-[2rem] border p-7 ${plan.highlighted?'border-rcl-orange/45 bg-rcl-orange/[.045]':'border-white/10 bg-[#071018]'}`}>
        {plan.highlighted&&<span className="absolute right-6 top-6 rounded-full bg-rcl-orange px-3 py-1 text-[9px] font-black uppercase tracking-widest text-black">Core value</span>}
        <p className="text-[10px] font-black uppercase tracking-[.24em] text-rcl-blue">{plan.shortName}</p>
        <h2 className="mt-3 font-display text-3xl font-black uppercase">{plan.tagline}</h2>
        <p className="mt-3 min-h-16 text-sm leading-6 text-white/45">{plan.description}</p>
        <div className="mt-6 flex items-end gap-2"><b className="font-display text-4xl">{paid?formatMembershipPrice(plan.monthlyPriceCents):'Free'}</b>{paid&&<span className="pb-1 text-xs text-white/35">/ month</span>}</div>
        {paid&&<p className="mt-1 text-xs text-white/35">or {formatMembershipPrice(plan.annualPriceCents)} annually</p>}
        <div className="mt-7 space-y-3">{plan.benefits.map((benefit)=><div key={benefit} className="flex gap-3 text-sm leading-5 text-white/70"><FaCircleCheck className="mt-0.5 shrink-0 text-rcl-orange"/><span>{benefit}</span></div>)}</div>
        <Link href="/account/membership" className={`mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider ${plan.highlighted?'bg-rcl-orange text-black':'border border-white/15 bg-white/[.04]'}`}>{code==='free'?'Use RCL free':billingReady?'Choose membership':'See membership'} <FaArrowRight /></Link>
      </article>})}</section>

      <section className="mt-12 grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[.04] p-7"><div className="flex gap-4"><FaShieldHalved className="mt-1 text-2xl text-emerald-300"/><div><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">Credibility stays earned</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Money never buys basketball status.</h2><p className="mt-3 text-sm leading-6 text-white/50">REP, competitive ratings, rankings, statistics, awards and earned badges are not subscription benefits. A paid member can buy better tools and controlled exposure—not achievement.</p></div></div></article>
        <article className="rounded-3xl border border-amber-300/20 bg-amber-300/[.035] p-7"><div className="flex gap-4"><FaCrown className="mt-1 text-2xl text-amber-300"/><div><p className="text-xs font-black uppercase tracking-[.2em] text-amber-300">All Access Spotlight</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Promotion, clearly separated from performance.</h2><p className="mt-3 text-sm leading-6 text-white/50">All Access includes one monthly Spotlight request for discovery. Spotlight never changes REP, rankings, player ratings, awards or competitive results and remains subject to RCL review.</p></div></div></article>
      </section>
    </Container>
  </main>;
}

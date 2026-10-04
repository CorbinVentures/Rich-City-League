import Link from 'next/link';
import { Container } from '@/components/Container';
import { PartnerInterestForm } from '@/components/network/PartnerInterestForm';
import { FaArrowLeft, FaCircleCheck } from 'react-icons/fa6';

export const metadata = {
  title: 'Become an RCH Partner | Community + Advertising',
  description: 'Join the RCH Community Network for free, promote an event, advertise a business, or discuss a major Rich City Hoops sponsorship.',
};

export default function PartnerApplyPage() {
  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_82%_12%,rgba(21,159,255,.12),transparent_30%),linear-gradient(145deg,#071522,#03070d)]">
      <Container maxWidth="lg" className="py-12 sm:py-16">
        <Link href="/network/partners" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white/45"><FaArrowLeft/> Partnership options</Link>
        <p className="mt-8 text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCH Community Network · Partner Interest</p>
        <h1 className="mt-3 font-display text-5xl font-black uppercase leading-[.95] tracking-[-.04em] sm:text-6xl">Bring your audience.<br/><span className="text-rcl-blue">Grow it with RCH.</span></h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-white/50">Tell us who you are and what you want to grow. Community organizations can start free. Businesses can request advertising inventory. Larger brands can discuss recurring or category sponsorships.</p>
      </Container>
    </section>

    <Container maxWidth="lg" className="py-10 sm:py-14">
      <div className="mb-7 grid gap-3 sm:grid-cols-3">
        <Benefit copy="Community participation can start free"/>
        <Benefit copy="Your organization stays independent"/>
        <Benefit copy="Paid exposure is clearly disclosed"/>
      </div>
      <PartnerInterestForm/>
    </Container>
  </main>;
}

function Benefit({copy}:{copy:string}) { return <div className="flex items-center gap-3 rounded-xl border border-rcl-blue/15 bg-rcl-blue/[.035] px-4 py-3 text-xs font-black uppercase tracking-wide text-white/60"><FaCircleCheck className="shrink-0 text-rcl-blue"/>{copy}</div>; }

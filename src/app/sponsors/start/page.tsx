import Link from 'next/link';
import { Container } from '@/components/Container';
import { SponsorInterestForm } from '@/components/sponsors/SponsorInterestForm';
import { FaArrowLeft, FaCircleCheck } from 'react-icons/fa6';

export const metadata={
  title:'Start an RCH Sponsorship | Sponsor Center',
  description:'Tell Rich City Hoops what your business wants to grow and request advertising or sponsorship inventory across RCH.',
};

export default async function SponsorStartPage({searchParams}:{searchParams:Promise<{product?:string}>}){
  const {product}=await searchParams;
  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_82%_12%,rgba(21,159,255,.13),transparent_30%),linear-gradient(145deg,#071522,#03070d)]">
      <Container maxWidth="lg" className="py-12 sm:py-16">
        <Link href="/sponsors" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white/45"><FaArrowLeft/> Sponsor Center</Link>
        <p className="mt-8 text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCH Sponsorship Brief</p>
        <h1 className="mt-3 font-display text-5xl font-black uppercase leading-[.94] tracking-[-.04em] sm:text-6xl">What do you want<br/><span className="text-rcl-blue">RCH to help move?</span></h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-white/50">Start with your objective, audience and budget. RCH will match the request to available inventory, confirm final pricing and make sure the sponsorship fits the platform before anything goes live.</p>
      </Container>
    </section>
    <Container maxWidth="lg" className="py-10 sm:py-14">
      <div className="mb-7 grid gap-3 sm:grid-cols-3">
        <Benefit copy="No payment when you submit"/>
        <Benefit copy="Inventory is confirmed before launch"/>
        <Benefit copy="Sponsored content stays disclosed"/>
      </div>
      <SponsorInterestForm initialProduct={product}/>
    </Container>
  </main>;
}

function Benefit({copy}:{copy:string}){return <div className="flex items-center gap-3 rounded-xl border border-rcl-blue/15 bg-rcl-blue/[.035] px-4 py-3 text-xs font-black uppercase tracking-wide text-white/60"><FaCircleCheck className="shrink-0 text-rcl-blue"/>{copy}</div>;}

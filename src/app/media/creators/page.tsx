import type { Metadata } from 'next';
import Link from 'next/link';
import { FaArrowLeft, FaArrowRight, FaCircleCheck, FaFilm, FaPlay, FaUsers } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';

export const metadata: Metadata = {
  title: { absolute: 'RCH TV Creator Pilot | Rich City Hoops' },
  description: 'Learn how the small, curated RCH TV creator pilot is intended to work for original Richmond and Virginia basketball programming.',
  alternates: { canonical: '/media/creators' },
};

const fits = [
  'Original basketball shows and recurring series',
  'Documentaries and behind-the-scenes storytelling',
  'Interviews, podcasts and basketball culture programming',
  'Film breakdowns and thoughtful basketball analysis',
];

const principles = [
  ['Small roster', 'The first creator group should stay intentionally small so RCH can support quality instead of chasing volume.'],
  ['Original work', 'The program is for work a creator owns or has the rights to publish—not repost pages or scraped highlights.'],
  ['Free discovery', 'Trailers, previews and selected episodes can stay public so creators can build an audience.'],
  ['Member originals', 'Full original series can become part of paid membership after RCH has enough programming to make the library valuable.'],
];

export default function RchTvCreatorsPage() {
  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow="RCH TV Creator Pilot"
      title="A small roster. Real local programming."
      accent="Quality before quantity."
      description="RCH TV is not trying to become an open video platform. The creator pilot is designed for a handful of Richmond and Virginia basketball voices who can make original programming that gives people a reason to come back."
      assetKey="media.cover"
      actions={<><Link href="/media" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-wider text-black"><FaArrowLeft/>RCH TV</Link><Link href="/membership" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-black uppercase tracking-wider">Membership vision <FaArrowRight/></Link></>}
    />

    <Container maxWidth="lg" className="py-10 sm:py-12">
      <section className="grid gap-4 md:grid-cols-2">{principles.map(([title,copy])=><article key={title} className="rounded-3xl border border-white/10 bg-[#071522]/50 p-6"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">Creator principle</p><h2 className="mt-2 font-display text-2xl font-black uppercase">{title}</h2><p className="mt-3 text-sm leading-6 text-white/45">{copy}</p></article>)}</section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <article className="rounded-3xl border border-rcl-orange/20 bg-rcl-orange/[.035] p-7"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-rcl-orange/10 text-rcl-orange"><FaFilm/></span><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">What fits RCH TV</p><h2 className="font-display text-2xl font-black uppercase">Original basketball programming</h2></div></div><div className="mt-6 space-y-3">{fits.map(item=><p key={item} className="flex gap-3 text-sm leading-6 text-white/60"><FaCircleCheck className="mt-1 shrink-0 text-rcl-orange"/><span>{item}</span></p>)}</div></article>

        <article className="rounded-3xl border border-rcl-blue/15 bg-[#071522]/55 p-7"><FaUsers className="text-2xl text-rcl-blue"/><p className="mt-4 text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">Pilot approach</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Start with a handful.</h2><p className="mt-3 text-sm leading-6 text-white/45">RCH can learn what audiences actually watch before opening the door wider. A creator does not need a massive existing following; consistency, ownership, quality and a real connection to basketball matter more.</p></article>
      </section>

      <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#071018]">
        <div className="border-b border-white/10 p-6 sm:p-7"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">Future compensation model</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Pay for member value, not empty clicks.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Creator revenue sharing is a future phase, not a live payout program today. When it is activated, RCH should define a monthly creator pool and distribute it using qualified subscriber consumption so platform costs remain predictable.</p></div>
        <div className="grid gap-px bg-white/10 md:grid-cols-4">{[['1','Subscriber revenue','A defined share funds the monthly creator pool.'],['2','Qualified viewing','Watch time, unique paying viewers and completion matter more than raw starts.'],['3','Creator share','Each eligible creator earns a percentage of the pool based on qualified consumption.'],['4','Transparent dashboard','Creators should eventually see qualified views, watch time, pool share and estimated earnings.']].map(([num,title,copy])=><div key={num} className="bg-[#071018] p-6"><span className="grid h-9 w-9 place-items-center rounded-full bg-rcl-blue/10 text-xs font-black text-rcl-blue">{num}</span><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-xs leading-5 text-white/40">{copy}</p></div>)}</div>
      </section>

      <section className="mt-8 rounded-3xl border border-rcl-blue/15 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,.12),transparent_38%),#071522] p-7 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-6"><div className="max-w-2xl"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue"><FaPlay className="mr-2 inline"/>Programming first</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Build the audience before building a marketplace.</h2><p className="mt-3 text-sm leading-6 text-white/45">The immediate job is simple: stream RCL games free, publish strong public highlights, build RCH Originals and identify a few creators worth developing with. Applications and revenue sharing can expand only when the audience justifies it.</p></div><Link href="/media" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Back to RCH TV <FaArrowRight/></Link></div></section>
    </Container>
  </main>;
}

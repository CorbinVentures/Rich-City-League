import type { Metadata } from 'next';
import Link from 'next/link';
import { FaArrowLeft, FaArrowRight, FaFilm, FaHandshake, FaVideo } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { RCH_MEDIA_OFFERS } from '@/lib/rch-media-offers';
import { RchMediaInterestForm } from '@/components/media/RchMediaInterestForm';

export const metadata: Metadata = {
  title: 'RCH Studios | Basketball Coverage & Media Partnerships',
  description: 'Discuss filming, basketball event coverage, original programming and sponsorships with RCH Media. Pilot commercial proposals are reviewed individually.',
  alternates: { canonical: '/media/studios' },
};

export default function RchStudiosPage() {
  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <Container maxWidth="xl" className="py-10 sm:py-14">
      <Link href="/media" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-rcl-blue"><FaArrowLeft/> Back to RCH TV</Link>
      <div className="mt-8 max-w-4xl">
        <p className="text-xs font-black uppercase tracking-[.25em] text-rcl-orange">RCH MEDIA · PRODUCTION & PARTNERSHIPS</p>
        <h1 className="mt-4 font-display text-4xl font-black uppercase leading-tight sm:text-6xl">Your basketball story deserves a real production.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">RCH Studios is developing coverage and storytelling services for local leagues, tournaments, trainers and brands. Request a custom quote for filming or explore opportunities to support Virginia basketball media.</p>
        <a href="#request" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-sm font-black text-black">Discuss your project <FaArrowRight/></a>
      </div>
      <section className="mt-14" aria-labelledby="studio-offerings">
        <div className="flex items-center gap-3"><FaVideo className="text-rcl-blue"/><h2 id="studio-offerings" className="font-display text-3xl font-black uppercase">Commercial pilot offerings</h2></div>
        <p className="mt-3 max-w-2xl text-sm text-white/55">Packages are proposals, not active self-service purchases. Availability and deliverables depend on event scope, staffing, production rights, and written approval.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {RCH_MEDIA_OFFERS.map(offer => <article key={offer.code} className="rounded-3xl border border-white/15 bg-[#071522] p-6">
            <p className="text-xs font-black uppercase tracking-widest text-rcl-orange">{offer.type === 'sponsorship' ? 'Sponsor partnership' : 'Production service'}</p>
            <h3 className="mt-3 font-display text-2xl font-black uppercase">{offer.name}</h3>
            <p className="mt-3 text-xl font-bold text-rcl-blue">{offer.label}</p>
            <p className="mt-4 text-sm leading-6 text-white/60">{offer.description}</p>
            <ul className="mt-5 space-y-2 text-sm text-white/75">{offer.includes.map(item => <li key={item}>• {item}</li>)}</ul>
            <a className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-bold" href="#request">Ask about availability <FaArrowRight/></a>
          </article>)}
        </div>
      </section>
      <section className="mt-12 grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 p-6">
          <FaFilm className="text-2xl text-rcl-orange"/>
          <h2 className="mt-4 text-xl font-black">One event. Multiple useful assets.</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">Depending on the contract: a full recording, short vertical clips, highlights, a recap and sponsor deliverables. Publishing on RCH TV is a separate rights-cleared decision.</p>
        </article>
        <article className="rounded-3xl border border-white/10 p-6">
          <FaHandshake className="text-2xl text-rcl-orange"/>
          <h2 className="mt-4 text-xl font-black">Sponsor the culture, not the scoreboard.</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">All paid placements are disclosed. Advertising cannot purchase competitive rankings, official statistics, player evaluations or editorial conclusions.</p>
        </article>
      </section>
      <section id="request" className="mt-14 scroll-mt-24 grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        <div><p className="text-xs font-black uppercase tracking-[.24em] text-rcl-orange">Let&apos;s work</p><h2 className="mt-3 font-display text-3xl font-black uppercase">Build your project with RCH</h2><p className="mt-4 text-sm leading-7 text-white/60">Submit your inquiry to our existing partnerships review pipeline. RCH will confirm availability, scope, production costs, rights and commercial terms before accepting any assignment.</p>
          <p className="mt-4 text-sm text-white/55">Prefer email? <a href="mailto:info@richcityhoops.com?subject=RCH%20Studios%20inquiry" className="underline text-rcl-blue">info@richcityhoops.com</a></p>
          <p className="mt-4 text-sm text-white/55">Are you a filmmaker instead? <Link href="/media/creators" className="underline text-rcl-blue">Explore the Creator Network</Link>.</p></div>
        <RchMediaInterestForm/>
      </section>
    </Container>
  </main>;
}

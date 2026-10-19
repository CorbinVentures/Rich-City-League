import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/Container';

export const metadata: Metadata = {
  title: { absolute: 'Pickup Basketball Runs Richmond VA | Rich City Hoops' },
  description: 'Find pickup basketball runs and 1v1–5v5 games in Richmond, Virginia with Rich City Hoops. Discover courts, join crews and connect with RVA hoopers for free.',
  alternates: { canonical: '/richmond-basketball-runs' },
  openGraph: { images: [{ url: 'https://www.richcityhoops.com/opengraph-image?v=20261014', width: 1200, height: 630, alt: 'Rich City Hoops — Richmond pickup basketball' }], url: '/richmond-basketball-runs', title: 'Pickup Basketball Runs Richmond VA | Rich City Hoops', description: 'Find Richmond pickup basketball runs, challenge other players and discover local courts with Rich City Hoops.' },
};

export default function RichmondBasketballRunsPage() {
  const breadcrumb = {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
    {'@type':'ListItem',position:1,name:'Rich City Hoops',item:'https://www.richcityhoops.com/'},
    {'@type':'ListItem',position:2,name:'Richmond Basketball Runs',item:'https://www.richcityhoops.com/richmond-basketball-runs'}
  ]};
  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumb)}}/>
    <section className="border-b border-white/10 bg-[radial-gradient(circle_at_80%_10%,rgba(59,130,246,.18),transparent_35%),linear-gradient(180deg,#07111d,#02060b)]">
      <Container maxWidth="xl" className="py-20 md:py-28">
        <p className="text-xs font-black uppercase tracking-[.28em] text-rcl-orange">804 · Richmond, Virginia</p>
        <h1 className="mt-5 max-w-5xl font-display text-5xl font-black uppercase leading-[.92] md:text-8xl">Find your next<br/><span className="text-rcl-orange">Richmond run.</span></h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-white/65">RCH Runs gives Richmond hoopers a basketball-first place to find pickup games beyond league night. Discover 1v1–5v5 runs, connect with local players, form crews and compete at courts across the 804.</p>
        <div className="mt-9 flex flex-wrap gap-3"><Link href="/runs" className="rounded-full bg-rcl-orange px-7 py-4 text-sm font-black uppercase tracking-wider text-black">Browse RCH Runs →</Link><Link href="/auth/sign-up" className="rounded-full border border-white/15 px-7 py-4 text-sm font-black uppercase tracking-wider">Create Free RCH Profile</Link></div>
      </Container>
    </section>
    <Container maxWidth="xl" className="py-16">
      <section className="grid gap-4 md:grid-cols-3">
        {[['FIND RUNS','See upcoming basketball activity created by the RCL community.'],['JOIN THE COMMUNITY','Build your RCH profile, connect with Richmond players and join the basketball community.'],['HOST A RUN','Signed-in members can create runs with a court, date, time, format, skill level and player limit.']].map(([t,d])=><article key={t} className="border border-white/10 bg-white/[.025] p-6"><h2 className="font-display text-2xl font-black uppercase">{t}</h2><p className="mt-3 text-sm leading-7 text-white/55">{d}</p></article>)}
      </section>
      <section className="mt-16 border-y border-white/10 py-12"><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-gold">One Virginia basketball ecosystem</p><h2 className="mt-3 max-w-3xl font-display text-4xl font-black uppercase md:text-6xl">Runs are only one part of RCH.</h2><p className="mt-5 max-w-3xl leading-8 text-white/60">Follow basketball highlights, player profiles, rankings and Richmond stories, or explore organized Rich City League competition.</p><div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold"><Link href="/richmond-basketball-league" className="text-rcl-gold">Richmond basketball league →</Link><Link href="/players" className="text-rcl-gold">Players →</Link><Link href="/games" className="text-rcl-gold">Games →</Link><Link href="/news" className="text-rcl-gold">News →</Link><Link href="/register" className="text-rcl-gold">League registration →</Link></div></section>
    </Container>
  </main>;
}

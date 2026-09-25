import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/Container';

export const metadata: Metadata = {
  title: { absolute: 'Basketball Runs Richmond VA | RCL Open Runs' },
  description: 'Find basketball runs in Richmond, Virginia through Rich City League. Discover the RCL Runs community, then sign in to host or join local basketball activity.',
  alternates: { canonical: '/richmond-basketball-runs' },
  openGraph: { url: '/richmond-basketball-runs', title: 'Basketball Runs Richmond VA | RCL', description: 'A Richmond basketball home for finding, hosting and joining runs through the RCL community.' },
};

export default function RichmondBasketballRunsPage() {
  const breadcrumb = {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
    {'@type':'ListItem',position:1,name:'Rich City League',item:'https://richcityhoops.com/'},
    {'@type':'ListItem',position:2,name:'Richmond Basketball Runs',item:'https://richcityhoops.com/richmond-basketball-runs'}
  ]};
  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumb)}}/>
    <section className="border-b border-white/10 bg-[radial-gradient(circle_at_80%_10%,rgba(249,115,22,.18),transparent_35%),linear-gradient(180deg,#07111d,#02060b)]">
      <Container maxWidth="xl" className="py-20 md:py-28">
        <p className="text-xs font-black uppercase tracking-[.28em] text-rcl-orange">804 · Richmond, Virginia</p>
        <h1 className="mt-5 max-w-5xl font-display text-5xl font-black uppercase leading-[.92] md:text-8xl">Find your next<br/><span className="text-rcl-orange">Richmond run.</span></h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-white/65">RCL Runs gives Richmond hoopers a basketball-first place to find activity beyond league night. Browse upcoming runs, connect with the community, or sign in to host and join runs across the 804.</p>
        <div className="mt-9 flex flex-wrap gap-3"><Link href="/runs" className="rounded-full bg-rcl-orange px-7 py-4 text-sm font-black uppercase tracking-wider text-black">Browse RCL Runs →</Link><Link href="/auth/sign-up" className="rounded-full border border-white/15 px-7 py-4 text-sm font-black uppercase tracking-wider">Create RCL Profile</Link></div>
      </Container>
    </section>
    <Container maxWidth="xl" className="py-16">
      <section className="grid gap-4 md:grid-cols-3">
        {[['FIND RUNS','See upcoming basketball activity created by the RCL community.'],['JOIN THE COMMUNITY','Build your RCL identity and connect with Richmond players, coaches and hoop culture.'],['HOST A RUN','Signed-in members can create runs with a court, date, time, format, skill level and player limit.']].map(([t,d])=><article key={t} className="border border-white/10 bg-white/[.025] p-6"><h2 className="font-display text-2xl font-black uppercase">{t}</h2><p className="mt-3 text-sm leading-7 text-white/55">{d}</p></article>)}
      </section>
      <section className="mt-16 border-y border-white/10 py-12"><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-gold">One Richmond basketball ecosystem</p><h2 className="mt-3 max-w-3xl font-display text-4xl font-black uppercase md:text-6xl">Runs are only one part of RCL.</h2><p className="mt-5 max-w-3xl leading-8 text-white/60">Follow official games, player profiles, standings and Richmond basketball stories, or take the next step into organized Rich City League competition.</p><div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold"><Link href="/richmond-basketball-league" className="text-rcl-gold">Richmond basketball league →</Link><Link href="/players" className="text-rcl-gold">Players →</Link><Link href="/games" className="text-rcl-gold">Games →</Link><Link href="/news" className="text-rcl-gold">News →</Link><Link href="/register" className="text-rcl-gold">League registration →</Link></div></section>
    </Container>
  </main>;
}

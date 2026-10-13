import Link from 'next/link';
import { Container } from '@/components/Container';

const pillars = [
  { number: '01', title: 'A team worth representing.', copy: 'The vision: teams rooted in communities across the Commonwealth, with distinctive identities, professional uniforms and dedicated team sites.' },
  { number: '02', title: 'A standard worth earning.', copy: 'Professional basketball built on preparation: organized practices, coaching, accountable team operations and professionally presented games.' },
  { number: '03', title: 'A story worth following.', copy: 'Player journeys, emerging rivalries, comeback seasons and championship ambition. Cinematic storytelling built around what happens on the court.' },
];

export function LeagueVision() {
  return <Container maxWidth="xl" className="py-8 sm:py-12">
    <section aria-labelledby="league-vision-title" className="relative overflow-hidden rounded-3xl border border-blue-300/25 bg-gradient-to-br from-[#132f50] via-[#0b1e34] to-[#07111f] p-6 sm:p-10">
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-200">The next chapter · Our league vision</p>
          <h2 id="league-vision-title" className="mt-5 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">One Commonwealth.<br/>Every city has a story.</h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200">We are building Rich City League to become Virginia’s premier professional basketball league. City pride, professional standards and unforgettable game nights—connected through Rich City Hoops.</p>
          <Link href="/teams" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl border border-blue-300/40 bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300">Explore the league’s teams <span aria-hidden="true" className="ml-3">→</span></Link>
        </div>
        <aside className="min-w-0 rounded-2xl border border-white/15 bg-black/20 p-6">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-blue-200">The season is the story</p>
          <p className="mt-4 font-display text-2xl font-semibold leading-snug">The buildup. The battle.<br/>The aftermath.</p>
          <p className="mt-4 text-sm leading-6 text-slate-200">From practice to player introductions, from a rivalry’s first spark to the final buzzer. Give every matchup context and every fan a reason to come back.</p>
          <p className="mt-4 text-xs leading-5 text-slate-300">Statewide expansion and professional operations are the direction we are building toward. Confirmed teams, venues and season details will be announced through official league updates.</p>
        </aside>
      </div>
    </section>
    <section aria-label="The Rich City League standard" className="mt-6 grid gap-4 md:grid-cols-3">
      {pillars.map(pillar => <article key={pillar.number} className="min-w-0 rounded-2xl border border-white/15 bg-[#0b1e34] p-6">
        <p className="text-sm font-semibold text-blue-200">{pillar.number} / THE RCL STANDARD</p>
        <h3 className="mt-4 text-xl font-semibold">{pillar.title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-200">{pillar.copy}</p>
      </article>)}
    </section>
    <section aria-labelledby="league-stories-title" className="mt-8 rounded-2xl border border-white/15 p-6 sm:p-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-blue-200">Beyond the final buzzer</p><h2 id="league-stories-title" className="mt-3 font-display text-3xl font-semibold">Meet the people behind the jersey.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-slate-200">Our storytelling vision brings player interviews, practice access, rivalry previews and postgame reactions together with professional broadcasts. Follow the journey through league news and RCH TV.</p></div>
        <nav aria-label="Follow Rich City League" className="grid content-center gap-3 sm:grid-cols-2">
          {[
            { href: '/media', title: 'RCH TV', label: 'Explore the viewing platform' },
            { href: '/news', title: 'League stories', label: 'Read the latest coverage' },
            { href: '/players', title: 'Meet the players', label: 'Explore basketball identities' },
            { href: '/standings', title: 'The title race', label: 'Follow official standings' },
          ].map(item => <Link key={item.href} href={item.href} className="min-w-0 rounded-xl border border-white/15 bg-[#0b1e34] p-4 transition hover:border-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"><span className="block text-base font-semibold">{item.title} <span aria-hidden="true">↗</span></span><span className="mt-1 block text-sm text-slate-200">{item.label}</span></Link>)}
        </nav>
      </div>
    </section>
  </Container>;
}

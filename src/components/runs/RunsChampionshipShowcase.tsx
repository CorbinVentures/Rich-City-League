import Link from 'next/link';

const cards = [
  { title: 'Rich City League Championship', label: 'OFFICIAL LEAGUE · NOVEMBER 2027', image: '/runs/championships/rich-city-league-belt.webp', alt: 'Gold Rich City League championship belt concept render', href: '/league', copy: 'The title at the top of Virginia’s pro basketball journey.' },
  { title: 'BMF Championship', label: 'RCH RUNS · JANUARY 2, 2027', image: '/runs/championships/bmf-belt.webp', alt: 'Silver, white, graphite and green BMF championship belt concept render', href: '/runs/bmf-championship', copy: 'A traveling 1v1 title built for the hardest matchup in the city.' },
];

export function RunsChampionshipShowcase() {
  return <section aria-labelledby="runs-championships" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#c9a64b]">Earned on the court</p><h2 id="runs-championships" className="mt-2 font-display text-3xl font-black uppercase text-white sm:text-4xl">Championships in sight</h2></div><span className="text-xs text-white/55">Concept renders</span></div>
    <div className="grid gap-4 lg:grid-cols-2">{cards.map(card=><article key={card.title} className="overflow-hidden rounded-3xl border border-white/10 bg-[#07110b] transition duration-300 hover:-translate-y-1 hover:border-[#c9a64b]/40 motion-reduce:transform-none motion-reduce:transition-none">
      <div className="flex min-h-52 items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(201,166,75,.12),transparent_65%),#040806] p-4 sm:min-h-64 sm:p-7"><img src={card.image} alt={card.alt} className="max-h-52 w-full object-contain drop-shadow-[0_18px_32px_rgba(0,0,0,.55)] sm:max-h-64" loading="lazy"/></div>
      <div className="p-5 sm:p-6"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#c9a64b]">{card.label}</p><h3 className="mt-2 font-display text-2xl font-black uppercase text-white sm:text-3xl">{card.title}</h3><p className="mt-2 text-sm leading-6 text-white/60">{card.copy}</p><Link href={card.href} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#c9a64b] px-5 text-xs font-black uppercase tracking-wide text-black transition hover:bg-[#e6ca78] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">View championship <span aria-hidden="true" className="ml-2">→</span></Link></div>
    </article>)}</div>
  </section>;
}

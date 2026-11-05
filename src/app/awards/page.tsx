import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { FaArrowRight, FaCrown, FaTrophy } from 'react-icons/fa6';
import { Container } from '@/components/Container';

export const metadata: Metadata = {
  title: 'Championship Awards | Rich City Hoops',
  description: 'Meet the two Rich City Hoops championship titles: RCH Runs BMF Champion and Rich City League World Champion.',
  alternates: { canonical: '/awards' },
};

const championships = [
  {
    eyebrow: 'RCH RUNS',
    title: 'BMF Champion',
    subtitle: 'RCH Runs BMF Championship',
    image: '/runs/championships/bmf-belt.webp',
    alt: 'Official RCH Runs BMF Champion gold championship belt',
    href: '/runs/bmf-championship',
    action: 'Explore the BMF Championship',
    accent: 'gold',
  },
  {
    eyebrow: 'RICH CITY LEAGUE',
    title: 'World Champion',
    subtitle: 'Rich City League World Championship',
    image: '/runs/championships/rich-city-league-belt.webp',
    alt: 'Official Rich City League World Champion gold championship belt with Virginia details',
    href: '/league',
    action: 'Explore Rich City League',
    accent: 'red',
  },
] as const;

export default function AwardsPage() {
  return <main className="min-h-screen bg-[#050607] pb-24 text-white">
    <section className="relative overflow-hidden border-b border-[#b88b3d]/20 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(184,139,61,.2),transparent_58%),linear-gradient(155deg,#15120d,#070809_60%)]">
      <Container maxWidth="xl" className="py-14 sm:py-20">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.24em] text-[#f0c976]"><FaTrophy aria-hidden="true"/> Rich City Hoops · Championship Awards</p>
        <h1 className="mt-4 max-w-4xl font-display text-5xl font-black uppercase leading-[.93] sm:text-7xl">Two titles.<br/><span className="text-[#e8bd68]">One legacy.</span></h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#ded7ca]">The championship belts that define two distinct paths: RCH Runs and the Rich City League.</p>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-8 sm:py-12">
      <section aria-label="Championship titles" className="grid gap-6 lg:grid-cols-2">
        {championships.map((award) => <article key={award.title} className="overflow-hidden rounded-3xl border border-[#b88b3d]/25 bg-[linear-gradient(150deg,#171512,#090a0b_60%)] shadow-[0_18px_60px_rgba(0,0,0,.35)]">
          <div className="relative grid aspect-[1.48] place-items-center overflow-hidden border-b border-white/10 bg-[radial-gradient(ellipse_at_center,rgba(184,139,61,.16),transparent_68%),#090909] p-3 sm:p-6">
            <Image src={award.image} alt={award.alt} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-3 sm:p-5"/>
          </div>
          <div className="p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[.22em] text-[#edc36f]">{award.eyebrow}</p>
            <h2 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">{award.title}</h2>
            <p className="mt-2 text-sm font-semibold text-white/70">{award.subtitle}</p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/60">{award.title === 'BMF Champion' ? 'The traveling title awarded through the RCH Runs BMF Championship.' : 'The championship title of the Rich City League, representing the league’s highest honor.'}</p>
            <Link href={award.href} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e8bd68] px-5 text-center text-xs font-black uppercase tracking-wide text-[#17120a] transition hover:bg-[#f6d995] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto">
              {award.action}<FaArrowRight aria-hidden="true"/>
            </Link>
          </div>
        </article>)}
      </section>

      <aside className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3"><FaCrown className="mt-1 shrink-0 text-[#edc36f]" aria-hidden="true"/><div><h2 className="font-display text-xl font-black uppercase">Earned. Defended. Remembered.</h2><p className="mt-1 text-sm leading-6 text-white/60">Each belt belongs to its own competition and champion path.</p></div></div>
        <Link href="/runs/bmf-championship/register" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl border border-[#e8bd68]/50 px-5 text-xs font-black uppercase text-[#f3d28e] transition hover:bg-[#e8bd68]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Register BMF interest <FaArrowRight className="ml-2" aria-hidden="true"/></Link>
      </aside>
    </Container>
  </main>;
}

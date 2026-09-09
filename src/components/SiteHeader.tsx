import Link from 'next/link';
import { Container } from '@/components/Container';

const links = [
  ['Games', '/games'],
  ['Standings', '/standings'],
  ['Teams', '/teams'],
  ['Seasons', '/seasons'],
  ['News', '/news'],
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-rcl-black/95 backdrop-blur">
      <Container maxWidth="xl" className="flex min-h-16 items-center justify-between gap-6">
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-white">
          RICH CITY <span className="text-rcl-gold">LEAGUE</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="text-sm text-gray-300 transition hover:text-rcl-gold">
              {label}
            </Link>
          ))}
        </nav>
        <Link
          href="/register"
          className="rounded-full bg-rcl-gold px-4 py-2 text-sm font-bold text-rcl-black transition hover:bg-white"
        >
          Register
        </Link>
      </Container>
      <nav aria-label="Mobile navigation" className="border-t border-white/10 md:hidden">
        <Container className="flex gap-5 overflow-x-auto py-3">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="whitespace-nowrap text-sm text-gray-300">
              {label}
            </Link>
          ))}
        </Container>
      </nav>
    </header>
  );
}

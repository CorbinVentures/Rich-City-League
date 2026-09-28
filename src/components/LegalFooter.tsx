import Link from 'next/link';

const links=[
  ['Legal Center','/legal'],
  ['Privacy','/legal/privacy'],
  ['Terms','/legal/terms'],
  ['Safety','/legal/safety'],
];

export function LegalFooter(){
  return <footer className="rcl-legal-footer border-t px-5 py-8 text-white">
    <div className="mx-auto flex max-w-7xl flex-col gap-5 text-xs sm:flex-row sm:items-center sm:justify-between">
      <div><b className="font-display text-sm uppercase tracking-[.14em] text-white">Rich City League</b><p className="mt-1 text-white/45">© {new Date().getFullYear()} · Richmond, Virginia · 804</p></div>
      <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legal and safety">{links.map(([label,href])=><Link key={href} href={href} className="inline-flex min-h-11 items-center text-white/55">{label}</Link>)}</nav>
    </div>
  </footer>;
}

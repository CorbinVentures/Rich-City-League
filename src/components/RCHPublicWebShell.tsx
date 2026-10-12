import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Public, crawlable site shell for normal browsers. Member tools, notifications,
 * calls and social app chrome are intentionally not mounted here.
 */
export function RCHPublicWebShell({ children }: { children: ReactNode }) {
  return (
    <div className="rcl-platform-root rch-public-web min-h-svh bg-[#07172a] text-white">
      <header className="rch-public-header sticky top-0 z-40 border-b border-white/10 bg-[#07121e]/95 backdrop-blur-lg">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Link href="/" className="flex items-center gap-3 text-white" aria-label="Rich City Hoops home">
            <span className="rch-public-brand-mark grid h-10 w-10 place-items-center rounded-lg border border-white/15 bg-white text-2xl font-black text-[#07121e]">R</span>
            <span className="text-sm font-black uppercase tracking-[.14em]">Rich City Hoops</span>
          </Link>
          <nav aria-label="Public basketball navigation" className="rch-public-nav flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-white/80 sm:text-sm">
            <Link href="/league" className="hover:text-white">League</Link>
            <Link href="/richmond-basketball-runs" className="hover:text-white">Runs</Link>
            <Link href="/teams" className="hover:text-white">Teams</Link>
            <Link href="/news" className="hover:text-white">News</Link>
            <Link href="/organizations" className="hover:text-white">Organizations</Link>
          </nav>
          <Link href="/app" className="rch-public-app-cta inline-flex min-h-10 items-center rounded-lg bg-[#286fbd] px-4 text-xs font-black uppercase tracking-wide text-white hover:bg-[#307acb]">
            Get the RCH app
          </Link>
        </div>
      </header>
      <div id="rch-public-content">{children}</div>
      <footer className="rch-public-footer border-t border-white/10 bg-[#07121e] px-5 py-10 text-white/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 text-sm">
          <p>Rich City Hoops · Richmond, Virginia · Basketball across the Commonwealth.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/auth/sign-up" className="hover:text-white">Join free</Link>
            <Link href="/membership" className="hover:text-white">Membership</Link>
            <Link href="/app" className="hover:text-white">Install the app</Link>
            <Link href="/legal/privacy" className="hover:text-white">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RCHPublicRouteGuide } from '@/components/RCHPublicRouteGuide';
import type { ReactNode } from 'react';
import {
  FaArrowRight, FaBars, FaMagnifyingGlass,
  FaBasketball, FaCompass,
} from 'react-icons/fa6';

/** Searchable public browser shell. Installed mobile PWA uses PlatformChrome. */
const nav = [
  { name: 'Home', href: '/' },
  { name: 'Discover', href: '/discover' },
  { name: 'Runs', href: '/runs' },
  { name: 'Leagues', href: '/league' },
  { name: 'Social', href: '/pulse' },
  { name: 'News', href: '/news' },
  { name: 'RCH TV', href: '/media' },
];

export function RCHPublicWebShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  return <div className="rcl-platform-root rch-public-web min-h-svh">
    <a className="rcl-skip-link" href="#rch-public-content">Skip to content</a>
    <header className="rch-public-header">
      <div className="rch-public-header-inner">
        <Link href="/" className="rch-public-logo" aria-label="Rich City Hoops home"><span>RCH</span></Link>
        <nav aria-label="Public basketball navigation" className="rch-public-nav">
          {nav.map(item => <Link key={item.href} href={item.href} aria-current={pathname===item.href || (item.href!=='/' && pathname.startsWith(item.href+'/'))?'page':undefined}>{item.name}</Link>)}
        </nav>
        <div className="rch-public-header-actions">
          <Link href="/search" className="rch-public-search" aria-label="Search players, teams, runs and events"><FaMagnifyingGlass/><span>Search basketball...</span></Link>
          <Link href="/auth/sign-in" className="rch-public-signin">Sign in</Link>
          <Link href="/auth/sign-up" className="rch-public-join">Join Free <FaArrowRight/></Link>
        </div>
        <details className="rch-public-mobile-menu">
          <summary aria-label="Open navigation menu"><FaBars/></summary>
          <nav aria-label="Mobile public navigation">
            {nav.map(item => <Link key={item.href} href={item.href}>{item.name}</Link>)}
            <Link href="/search"><FaMagnifyingGlass/> Search basketball</Link>
            <Link href="/app"><FaBasketball/> Get the RCH App</Link>
          </nav>
        </details>
      </div>
    </header>
    <RCHPublicRouteGuide />
    <div id="rch-public-content" tabIndex={-1}>{children}</div>
    <aside className="rch-browser-web-to-app" aria-label="Explore the RCH app"><div><b>RCH IS BETTER WHEN YOU&apos;RE PART OF IT.</b><span>Browse freely on the web. Create your free profile to save, connect and compete.</span></div><Link href="/app">Explore the app <FaArrowRight aria-hidden="true"/></Link></aside>
    <footer className="rch-public-footer">
      <div className="rch-public-footer-inner">
        <div><Link href="/" className="rch-public-footer-brand">RCH</Link><p>Rich City Hoops · Virginia basketball, connected.</p></div>
        <nav aria-label="Footer navigation">
          <Link href="/discover"><FaCompass/> Discover</Link>
          <Link href="/runs">Runs</Link>
          <Link href="/league">Rich City League</Link>
          <Link href="/pulse">Social</Link>
          <Link href="/news">News</Link>
          <Link href="/app">Get the PWA</Link>
          <Link href="/legal/privacy">Privacy</Link>
        </nav>
      </div>
    </footer>
  </div>;
}

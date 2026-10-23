'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { RCHPublicRouteGuide } from '@/components/RCHPublicRouteGuide';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { ReactNode } from 'react';
import {
  FaArrowRight, FaBars, FaXmark, FaMagnifyingGlass,
  FaBasketball, FaCompass, FaHouse, FaPeopleGroup, FaUser,
} from 'react-icons/fa6';

/** Searchable public browser shell. Installed mobile PWA uses PlatformChrome. */
const nav = [
  { name: 'Home', href: '/' },
  { name: 'Discover', href: '/discover' },
  { name: 'Living World', href: '/world' },
  { name: 'Runs', href: '/runs' },
  { name: 'Leagues', href: '/league' },
  { name: 'Social', href: '/pulse' },
  { name: 'News', href: '/news' },
  { name: 'RCH TV', href: '/media' },
];

function browserNavHref(href: string, signedIn: boolean) {
  return signedIn && href === '/pulse' ? '/social' : href;
}

export function RCHPublicWebShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const { user, profile, loading: authLoading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  // Browser menu lives in a viewport-level overlay, not in the tiny header
  // <details> box. Safari constrained that descendant to the trigger width.
  const [openOnPath, setOpenOnPath] = useState<string | null>(null);
  const menuOpen = openOnPath === pathname;
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeMenu = () => setOpenOnPath(null);

  useEffect(() => {
    if (!menuOpen) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpenOnPath(null);
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const controls = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]),a[href]:not([aria-disabled="true"])',
      ));
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = oldOverflow;
    };
  }, [menuOpen]);

  async function handleBrowserSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError('');
    const client = getSupabaseClient();
    if (!client) {
      setSignOutError('Sign out is temporarily unavailable.');
      setSigningOut(false);
      return;
    }
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      window.location.assign('/');
    } catch {
      setSignOutError('Could not sign out. Please try again.');
      setSigningOut(false);
    }
  }

  const closeAndRestore = () => {
    closeMenu();
    menuButtonRef.current?.focus();
  };
  return <div className="rcl-platform-root rch-public-web min-h-svh">
    <a className="rcl-skip-link" href="#rch-public-content">Skip to content</a>
    <header className="rch-public-header">
      <div className="rch-public-header-inner">
        <Link href="/" className="rch-public-logo" aria-label="Rich City Hoops home"><span>RCH</span></Link>
        <nav aria-label="Public basketball navigation" className="rch-public-nav">
          {nav.map(item => {
            const href = browserNavHref(item.href, Boolean(user));
            return <Link key={item.href} href={href} aria-current={pathname===href || (href!=='/' && pathname.startsWith(href+'/'))?'page':undefined}>{item.name}</Link>;
          })}
        </nav>
        <div className="rch-public-header-actions">
          <Link href="/search" className="rch-public-search" aria-label="Search players, teams, runs and events"><FaMagnifyingGlass/><span>Search basketball...</span></Link>
          {authLoading ? <span className="rch-public-signin" role="status">Checking account…</span> : user ? <>
            <Link href="/profile" className="rch-public-signin" aria-label="My RCH profile">My Profile</Link>
            <button type="button" className="rch-public-signin" disabled={signingOut} onClick={() => void handleBrowserSignOut()}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
          </> : <>
            <Link href="/auth/sign-in" className="rch-public-signin">Sign in</Link>
            <Link href="/auth/sign-up" className="rch-public-join">Join Free <FaArrowRight/></Link>
          </>}
        </div>
        <button
          ref={menuButtonRef}
          type="button"
          className="rch-public-mobile-toggle"
          aria-label="Open site menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-controls="rch-public-mobile-drawer"
          onClick={() => setOpenOnPath(menuOpen ? null : pathname)}
        ><FaBars aria-hidden="true" /></button>
      </div>
    </header>
    {menuOpen && <div className="rch-public-mobile-overlay">
      <button
        className="rch-public-mobile-backdrop"
        aria-label="Close site menu"
        type="button"
        onClick={closeAndRestore}
      />
      <div
        ref={drawerRef}
        id="rch-public-mobile-drawer"
        className="rch-public-mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Rich City Hoops site navigation"
      >
        <div className="rch-public-mobile-drawer-head">
          <div><small>RICH CITY HOOPS</small><strong>Explore RCH</strong></div>
          <button ref={closeButtonRef} type="button" onClick={closeAndRestore} aria-label="Close site menu">
            <FaXmark aria-hidden="true"/>
          </button>
        </div>
        <nav aria-label="Mobile public navigation" className="rch-public-mobile-drawer-links">
          {nav.map(item => <Link key={item.href} href={browserNavHref(item.href, Boolean(user))} aria-current={pathname===browserNavHref(item.href, Boolean(user))?'page':undefined} onClick={closeMenu}>
            <span>{item.name}</span><FaArrowRight aria-hidden="true"/>
          </Link>)}
          <Link href="/search" onClick={closeMenu}><span><FaMagnifyingGlass aria-hidden="true"/> Search basketball</span><FaArrowRight aria-hidden="true"/></Link>
          {user && <>
            <Link href="/my-hoops" onClick={closeMenu}><span>My Hoops</span><FaArrowRight aria-hidden="true"/></Link>
            <Link href="/messages" onClick={closeMenu}><span>Messages</span><FaArrowRight aria-hidden="true"/></Link>
            <Link href="/notifications" onClick={closeMenu}><span>Notifications</span><FaArrowRight aria-hidden="true"/></Link>
            <Link href="/professional" onClick={closeMenu}><span>Professional Dashboard</span><FaArrowRight aria-hidden="true"/></Link>
            {profile?.role === 'admin' && <>
              <Link href="/admin" onClick={closeMenu}><span>Admin Tools</span><FaArrowRight aria-hidden="true"/></Link>
              <Link href="/command" onClick={closeMenu}><span>Command Center</span><FaArrowRight aria-hidden="true"/></Link>
            </>}
          </>}
          <Link href="/app" onClick={closeMenu}><span><FaBasketball aria-hidden="true"/> Get the RCH App</span><FaArrowRight aria-hidden="true"/></Link>
        </nav>
        <div className="rch-public-mobile-drawer-actions">
          {authLoading ? <span role="status" className="rch-browser-auth-loading">Checking account…</span> : user ? <>
            <Link href="/profile" onClick={closeMenu}>My Profile <FaArrowRight aria-hidden="true"/></Link>
            <button type="button" disabled={signingOut} onClick={() => void handleBrowserSignOut()}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
          </> : <>
            <Link href="/auth/sign-up" onClick={closeMenu}>Join Free <FaArrowRight aria-hidden="true"/></Link>
            <Link href="/auth/sign-in" onClick={closeMenu}>Sign in</Link>
          </>}
        </div>
      </div>
    </div>}
    {user && pathname === '/' && <div className="rch-browser-signed-in" role="status"><span><strong>WELCOME BACK.</strong> You are signed in to Rich City Hoops.</span><Link href="/profile">My Profile <FaArrowRight aria-hidden="true"/></Link></div>}
    {signOutError && <p role="alert" className="rch-browser-auth-error">{signOutError}</p>}
    <nav className="rch-mockup-mobile-nav" aria-label="RCH mobile navigation">
      {[
        { label: 'Home', href: '/', icon: FaHouse, selected: pathname === '/' || pathname === '/social' },
        { label: 'Runs', href: '/runs', icon: FaBasketball, selected: pathname === '/runs' || pathname.startsWith('/runs/') },
        { label: 'Community', href: '/community', icon: FaPeopleGroup, selected: ['/community','/communities','/crews','/friends'].some(p => pathname === p || pathname.startsWith(p + '/')) },
        { label: 'Profile', href: user ? '/profile' : '/auth/sign-up', icon: FaUser, selected: pathname === '/profile' || pathname.startsWith('/social/profile/') },
      ].map(item => <Link key={item.label} href={item.href} aria-current={item.selected ? 'page' : undefined}><item.icon aria-hidden="true"/><span>{item.label}</span></Link>)}
    </nav>
    <RCHPublicRouteGuide />
    <div id="rch-public-content" tabIndex={-1}>{children}</div>
    <aside className="rch-browser-web-to-app" aria-label="Explore the RCH app"><div><b>RCH IS BETTER WHEN YOU&apos;RE PART OF IT.</b><span>{user ? 'Your RCH account is active. Keep exploring the website or install the app for the standalone experience.' : 'Browse freely on the web. Create your free profile to save, connect and compete.'}</span></div><Link href={user ? '/my-hoops' : '/app'}>{user ? 'Open My Hoops' : 'Explore the app'} <FaArrowRight aria-hidden="true"/></Link></aside>
    <footer className="rch-public-footer">
      <div className="rch-public-footer-inner">
        <div><Link href="/" className="rch-public-footer-brand">RCH</Link><p>Rich City Hoops · Virginia basketball, connected.</p></div>
        <nav aria-label="Footer navigation">
          <Link href="/discover"><FaCompass/> Discover</Link>
          <Link href="/runs">Runs</Link>
          <Link href="/league">Rich City League</Link>
          <Link href={user ? '/social' : '/pulse'}>Social</Link>
          <Link href="/news">News</Link>
          <a href="https://www.instagram.com/richcityhoops/" target="_blank" rel="noopener noreferrer" aria-label="Rich City Hoops on Instagram">Instagram</a>
          {user && <Link href="/messages">Messages</Link>}
          <Link href="/app">Get the PWA</Link>
          <Link href="/legal/privacy">Privacy</Link>
        </nav>
      </div>
    </footer>
  </div>;
}
